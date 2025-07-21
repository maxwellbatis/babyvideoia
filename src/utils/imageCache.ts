import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { log, logPerf } from './logger';

interface CacheEntry {
  hash: string;
  filePath: string;
  timestamp: number;
  size: number;
  accessCount: number;
  lastAccessed: number;
}

class ImageCache {
  private cacheDir: string;
  private cacheIndex: Map<string, CacheEntry> = new Map();
  private maxCacheSize: number = 500 * 1024 * 1024; // 500MB
  private maxAge: number = 24 * 60 * 60 * 1000; // 24 horas
  private cleanupThreshold: number = 100; // Limpar a cada 100 operações
  
  constructor() {
    this.cacheDir = path.join('output', 'cache', 'images');
    this.ensureCacheDir();
    this.loadCacheIndex();
    log(`📦 Cache de imagens inicializado: ${this.cacheDir}`);
  }
  
  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
      log(`📁 Diretório de cache criado: ${this.cacheDir}`);
    }
  }
  
  private generateHash(prompt: string, options: any): string {
    const startTime = Date.now();
    const data = JSON.stringify({ prompt, options });
    const hash = crypto.createHash('md5').update(data).digest('hex');
    logPerf('Geração de hash do cache', startTime);
    return hash;
  }
  
  private loadCacheIndex(): void {
    const startTime = Date.now();
    const indexFile = path.join(this.cacheDir, 'index.json');
    if (fs.existsSync(indexFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
        this.cacheIndex = new Map(Object.entries(data));
        log(`📦 Cache carregado: ${this.cacheIndex.size} entradas`);
        logPerf('Carregamento do cache', startTime);
      } catch (error) {
        log(`⚠️ Erro ao carregar cache: ${error}`);
      }
    }
  }
  
  private saveCacheIndex(): void {
    const startTime = Date.now();
    const indexFile = path.join(this.cacheDir, 'index.json');
    try {
      const data = Object.fromEntries(this.cacheIndex);
      fs.writeFileSync(indexFile, JSON.stringify(data, null, 2));
      logPerf('Salvamento do cache', startTime);
    } catch (error) {
      log(`⚠️ Erro ao salvar cache: ${error}`);
    }
  }
  
  private cleanup(): void {
    const startTime = Date.now();
    const now = Date.now();
    const entries = Array.from(this.cacheIndex.entries());
    let removedCount = 0;
    
    // Remover entradas expiradas
    for (const [hash, entry] of entries) {
      if (now - entry.timestamp > this.maxAge) {
        try {
          if (fs.existsSync(entry.filePath)) {
            fs.unlinkSync(entry.filePath);
            removedCount++;
          }
          this.cacheIndex.delete(hash);
        } catch (error) {
          log(`⚠️ Erro ao remover cache expirado: ${error}`);
        }
      }
    }
    
    // Se ainda estiver muito grande, remover as menos acessadas
    if (this.getCacheSize() > this.maxCacheSize) {
      const sortedEntries = entries
        .sort(([, a], [, b]) => a.accessCount - b.accessCount || a.lastAccessed - b.lastAccessed);
      
      for (const [hash, entry] of sortedEntries) {
        try {
          if (fs.existsSync(entry.filePath)) {
            fs.unlinkSync(entry.filePath);
            removedCount++;
          }
          this.cacheIndex.delete(hash);
          
          if (this.getCacheSize() <= this.maxCacheSize) break;
        } catch (error) {
          log(`⚠️ Erro ao remover cache antigo: ${error}`);
        }
      }
    }
    
    if (removedCount > 0) {
      log(`🗑️ Limpeza do cache: ${removedCount} entradas removidas`);
    }
    
    this.saveCacheIndex();
    logPerf('Limpeza do cache', startTime);
  }
  
  private getCacheSize(): number {
    let totalSize = 0;
    for (const entry of this.cacheIndex.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }
  
  // Verificar se imagem existe no cache
  get(prompt: string, options: any = {}): string | null {
    const startTime = Date.now();
    const hash = this.generateHash(prompt, options);
    const entry = this.cacheIndex.get(hash);
    
    if (entry && fs.existsSync(entry.filePath)) {
      // Verificar se não expirou
      if (Date.now() - entry.timestamp <= this.maxAge) {
        // Atualizar estatísticas de acesso
        entry.accessCount++;
        entry.lastAccessed = Date.now();
        
        log(`🎯 Cache hit: ${hash.substring(0, 8)}... (acessos: ${entry.accessCount})`);
        logPerf('Cache hit', startTime);
        return entry.filePath;
      } else {
        // Remover entrada expirada
        this.cacheIndex.delete(hash);
        try {
          fs.unlinkSync(entry.filePath);
        } catch (error) {
          log(`⚠️ Erro ao remover cache expirado: ${error}`);
        }
      }
    }
    
    log(`❌ Cache miss: ${hash.substring(0, 8)}...`);
    logPerf('Cache miss', startTime);
    return null;
  }
  
  // Adicionar imagem ao cache
  set(prompt: string, filePath: string, options: any = {}): void {
    const startTime = Date.now();
    if (!fs.existsSync(filePath)) {
      log(`⚠️ Arquivo não existe para cache: ${filePath}`);
      return;
    }
    
    const hash = this.generateHash(prompt, options);
    const stats = fs.statSync(filePath);
    
    const entry: CacheEntry = {
      hash,
      filePath,
      timestamp: Date.now(),
      size: stats.size,
      accessCount: 0,
      lastAccessed: Date.now()
    };
    
    this.cacheIndex.set(hash, entry);
    log(`💾 Cache miss: ${hash.substring(0, 8)}... adicionado (${(stats.size / 1024 / 1024).toFixed(2)}MB)`);
    
    // Limpeza periódica
    if (this.cacheIndex.size % this.cleanupThreshold === 0) {
      this.cleanup();
    }
    
    logPerf('Adição ao cache', startTime);
  }
  
  // Limpar cache completamente
  clear(): void {
    const startTime = Date.now();
    let removedCount = 0;
    
    for (const entry of this.cacheIndex.values()) {
      try {
        if (fs.existsSync(entry.filePath)) {
          fs.unlinkSync(entry.filePath);
          removedCount++;
        }
      } catch (error) {
        log(`⚠️ Erro ao remover arquivo de cache: ${error}`);
      }
    }
    
    this.cacheIndex.clear();
    this.saveCacheIndex();
    log(`🧹 Cache completamente limpo: ${removedCount} arquivos removidos`);
    logPerf('Limpeza completa do cache', startTime);
  }
  
  // Estatísticas do cache
  getStats(): { size: number; entries: number; maxSize: number; hitRate: number; avgAccessCount: number } {
    const entries = Array.from(this.cacheIndex.values());
    const totalAccessCount = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    const avgAccessCount = entries.length > 0 ? totalAccessCount / entries.length : 0;
    
    return {
      size: this.getCacheSize(),
      entries: this.cacheIndex.size,
      maxSize: this.maxCacheSize,
      hitRate: 0, // Será calculado dinamicamente
      avgAccessCount: Math.round(avgAccessCount * 100) / 100
    };
  }
  
  // Pré-carregar cache com imagens populares
  async preloadPopularImages(): Promise<void> {
    log(`🔄 Pré-carregando imagens populares...`);
    // Implementar lógica de pré-carregamento baseada em uso frequente
  }
}

// Instância global
export const imageCache = new ImageCache(); 