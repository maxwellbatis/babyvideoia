import fs from 'fs';
import path from 'path';
import { log } from './logger';

export interface VideoMetadata {
  id: string;
  tema: string;
  tipo: string;
  publico: string;
  formato: string;
  titulo: string;
  hashtags: string;
  videoPath: string;
  thumbnailPath: string;
  cloudinaryVideoUrl?: string;
  cloudinaryThumbnailUrl?: string;
  duracao?: number;
  tamanho?: number;
  createdAt: string;
  updatedAt: string;
  caption?: string; // Legenda do Instagram
}

export interface VideoMetadataFile {
  videos: VideoMetadata[];
}

class VideoMetadataManager {
  private metadataPath: string;
  private metadata: VideoMetadataFile;

  constructor() {
    this.metadataPath = path.join('./output', 'video_metadata.json');
    this.metadata = this.loadMetadata();
  }

  private loadMetadata(): VideoMetadataFile {
    try {
      if (fs.existsSync(this.metadataPath)) {
        const data = fs.readFileSync(this.metadataPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      log(`❌ Erro ao carregar metadados: ${error}`);
    }
    
    return { videos: [] };
  }

  private saveMetadata(): void {
    try {
      // Garantir que o diretório existe
      const dir = path.dirname(this.metadataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(this.metadataPath, JSON.stringify(this.metadata, null, 2));
      log(`✅ Metadados salvos: ${this.metadataPath}`);
    } catch (error) {
      log(`❌ Erro ao salvar metadados: ${error}`);
    }
  }

  // Adicionar novo vídeo
  addVideo(metadata: Omit<VideoMetadata, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = this.generateId();
    const now = new Date().toISOString();
    
    const videoMetadata: VideoMetadata = {
      ...metadata,
      id,
      createdAt: now,
      updatedAt: now
    };

    this.metadata.videos.push(videoMetadata);
    this.saveMetadata();
    
    log(`✅ Vídeo adicionado aos metadados: ${id}`);
    return id;
  }

  // Atualizar vídeo existente
  updateVideo(id: string, updates: Partial<VideoMetadata>): boolean {
    const videoIndex = this.metadata.videos.findIndex(v => v.id === id);
    
    if (videoIndex === -1) {
      log(`❌ Vídeo não encontrado: ${id}`);
      return false;
    }

    this.metadata.videos[videoIndex] = {
      ...this.metadata.videos[videoIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.saveMetadata();
    log(`✅ Vídeo atualizado: ${id}`);
    return true;
  }

  // Buscar vídeo por ID
  getVideo(id: string): VideoMetadata | null {
    return this.metadata.videos.find(v => v.id === id) || null;
  }

  // Listar todos os vídeos
  getAllVideos(): VideoMetadata[] {
    return this.metadata.videos.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  // Buscar vídeos por formato
  getVideosByFormat(formato: string): VideoMetadata[] {
    return this.metadata.videos.filter(v => v.formato === formato);
  }

  // Remover vídeo
  removeVideo(id: string): boolean {
    const videoIndex = this.metadata.videos.findIndex(v => v.id === id);
    
    if (videoIndex === -1) {
      log(`❌ Vídeo não encontrado: ${id}`);
      return false;
    }

    const video = this.metadata.videos[videoIndex];
    
    // Tentar remover arquivos físicos
    try {
      if (fs.existsSync(video.videoPath)) {
        fs.unlinkSync(video.videoPath);
        log(`🗑️ Arquivo de vídeo removido: ${video.videoPath}`);
      }
      
      if (video.thumbnailPath && fs.existsSync(video.thumbnailPath)) {
        fs.unlinkSync(video.thumbnailPath);
        log(`🗑️ Thumbnail removido: ${video.thumbnailPath}`);
      }
    } catch (error) {
      log(`⚠️ Erro ao remover arquivos físicos: ${error}`);
    }

    this.metadata.videos.splice(videoIndex, 1);
    this.saveMetadata();
    
    log(`✅ Vídeo removido dos metadados: ${id}`);
    return true;
  }

  // Limpar vídeos antigos (mais de X dias)
  cleanOldVideos(daysOld: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const initialCount = this.metadata.videos.length;
    this.metadata.videos = this.metadata.videos.filter(video => {
      const videoDate = new Date(video.createdAt);
      return videoDate > cutoffDate;
    });
    
    const removedCount = initialCount - this.metadata.videos.length;
    if (removedCount > 0) {
      this.saveMetadata();
      log(`🧹 ${removedCount} vídeos antigos removidos (mais de ${daysOld} dias)`);
    }
    
    return removedCount;
  }

  // Gerar ID único
  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }

  // Verificar integridade dos arquivos
  verifyFileIntegrity(): { valid: VideoMetadata[], invalid: VideoMetadata[] } {
    const valid: VideoMetadata[] = [];
    const invalid: VideoMetadata[] = [];

    for (const video of this.metadata.videos) {
      const videoExists = fs.existsSync(video.videoPath);
      const thumbnailExists = video.thumbnailPath ? fs.existsSync(video.thumbnailPath) : true;
      
      if (videoExists && thumbnailExists) {
        valid.push(video);
      } else {
        invalid.push(video);
        log(`⚠️ Arquivos inválidos para vídeo ${video.id}: vídeo=${videoExists}, thumbnail=${thumbnailExists}`);
      }
    }

    return { valid, invalid };
  }
}

// Instância singleton
export const videoMetadataManager = new VideoMetadataManager();

// Funções utilitárias
export function createVideoMetadata(
  tema: string,
  tipo: string,
  publico: string,
  formato: string,
  titulo: string,
  hashtags: string,
  videoPath: string,
  thumbnailPath: string,
  duracao?: number,
  tamanho?: number,
  caption?: string // Legenda do Instagram
): Omit<VideoMetadata, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    tema,
    tipo,
    publico,
    formato,
    titulo,
    hashtags,
    videoPath,
    thumbnailPath,
    duracao,
    tamanho,
    caption
  };
} 