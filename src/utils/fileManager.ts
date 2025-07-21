import fs from 'fs';
import path from 'path';
import { log } from './logger';

export class FileManager {
  private tempFiles: Set<string> = new Set();
  private tempDirs: Set<string> = new Set();
  
  constructor() {
    // Limpar arquivos ao sair do processo
    process.on('exit', () => this.cleanup());
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }
  
  // Adicionar arquivo temporário
  addTempFile(filePath: string): void {
    this.tempFiles.add(filePath);
  }
  
  // Adicionar diretório temporário
  addTempDir(dirPath: string): void {
    this.tempDirs.add(dirPath);
  }
  
  // Criar arquivo temporário com nome único
  createTempFile(extension: string = '.tmp', prefix: string = 'temp'): string {
    const tempPath = path.join('output', 'temp', `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${extension}`);
    
    // Criar diretório se não existir
    const dir = path.dirname(tempPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      this.addTempDir(dir);
    }
    
    this.addTempFile(tempPath);
    return tempPath;
  }
  
  // Limpeza automática
  cleanup(): void {
    log('🧹 Iniciando limpeza automática de arquivos temporários...');
    
    let cleanedCount = 0;
    
    // Limpar arquivos
    for (const file of this.tempFiles) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
          cleanedCount++;
        }
      } catch (error) {
        log(`⚠️ Erro ao remover arquivo ${file}: ${error}`);
      }
    }
    
    // Limpar diretórios (em ordem reversa para não quebrar dependências)
    const sortedDirs = Array.from(this.tempDirs).sort().reverse();
    for (const dir of sortedDirs) {
      try {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          if (files.length === 0) {
            fs.rmdirSync(dir);
            cleanedCount++;
          }
        }
      } catch (error) {
        log(`⚠️ Erro ao remover diretório ${dir}: ${error}`);
      }
    }
    
    log(`✅ Limpeza concluída. ${cleanedCount} itens removidos.`);
    
    // Limpar sets
    this.tempFiles.clear();
    this.tempDirs.clear();
  }
  
  // Limpeza manual específica
  removeFile(filePath: string): boolean {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.tempFiles.delete(filePath);
        return true;
      }
    } catch (error) {
      log(`⚠️ Erro ao remover arquivo ${filePath}: ${error}`);
    }
    return false;
  }
  
  // Verificar se arquivo existe e tem tamanho > 0
  isValidFile(filePath: string): boolean {
    try {
      return fs.existsSync(filePath) && fs.statSync(filePath).size > 0;
    } catch {
      return false;
    }
  }
}

// Instância global
export const fileManager = new FileManager(); 