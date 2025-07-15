import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { getCredential } from './credentials';

const prisma = new PrismaClient();

export interface ImageSearchCriteria {
  sceneDescription?: string;
  tema?: string;
  tipo?: string;
  publico?: string;
  resolution?: string;
  generationMethod?: string;
  tags?: string[];
  limit?: number;
}

export interface GeneratedImageData {
  filename: string;
  prompt: string;
  sceneDescription: string;
  sceneNumber: number;
  imageNumber: number;
  generationMethod: string;
  resolution: string;
  tema: string;
  tipo: string;
  publico: string;
  tags: string[];
  localPath: string;
  size: number;
}

export class GeneratedImageManager {
  
  /**
   * Busca imagens existentes que correspondam aos critérios
   */
  static async findSimilarImages(criteria: ImageSearchCriteria): Promise<any[]> {
    try {
      const where: any = {
        isReusable: true
      };

      if (criteria.sceneDescription) {
        where.sceneDescription = {
          contains: criteria.sceneDescription,
          mode: 'insensitive'
        };
      }

      if (criteria.tema) {
        where.tema = criteria.tema;
      }

      if (criteria.tipo) {
        where.tipo = criteria.tipo;
      }

      if (criteria.publico) {
        where.publico = criteria.publico;
      }

      if (criteria.resolution) {
        where.resolution = criteria.resolution;
      }

      if (criteria.generationMethod) {
        where.generationMethod = criteria.generationMethod;
      }

      if (criteria.tags && criteria.tags.length > 0) {
        where.tags = {
          hasSome: criteria.tags
        };
      }

      const images = await prisma.generatedImage.findMany({
        where,
        orderBy: [
          { performance: 'desc' },
          { usageCount: 'desc' },
          { createdAt: 'desc' }
        ],
        take: criteria.limit || 5
      });

      return images;
    } catch (error) {
      console.error('Erro ao buscar imagens similares:', error);
      return [];
    }
  }

  /**
   * Salva uma imagem gerada no banco de dados
   */
  static async saveGeneratedImage(imageData: GeneratedImageData): Promise<number> {
    try {
      // Upload para Cloudinary se configurado
      let cloudinaryUrl = null;
      let cloudinaryPublicId = null;

      try {
        const cloudName = await getCredential('CLOUDINARY_CLOUD_NAME');
        const apiKey = await getCredential('CLOUDINARY_API_KEY');
        const apiSecret = await getCredential('CLOUDINARY_API_SECRET');

        if (cloudName && apiKey && apiSecret) {
          cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
          
          const uploadResult = await cloudinary.uploader.upload(imageData.localPath, {
            resource_type: 'image',
            folder: 'baby-diary-generated-images',
            public_id: `gen_${Date.now()}_${imageData.sceneNumber}_${imageData.imageNumber}`,
            tags: imageData.tags
          });

          cloudinaryUrl = uploadResult.secure_url;
          cloudinaryPublicId = uploadResult.public_id;
        }
      } catch (cloudinaryError) {
        console.warn('Erro no upload para Cloudinary:', cloudinaryError);
      }

      // Salvar no banco de dados
      const savedImage = await prisma.generatedImage.create({
        data: {
          filename: imageData.filename,
          cloudinaryUrl,
          cloudinaryPublicId,
          prompt: imageData.prompt,
          sceneDescription: imageData.sceneDescription,
          sceneNumber: imageData.sceneNumber,
          imageNumber: imageData.imageNumber,
          generationMethod: imageData.generationMethod,
          resolution: imageData.resolution,
          tema: imageData.tema,
          tipo: imageData.tipo,
          publico: imageData.publico,
          tags: imageData.tags,
          size: imageData.size,
          localPath: imageData.localPath
        }
      });

      console.log(`✅ Imagem salva no banco com ID: ${savedImage.id}`);
      return savedImage.id;
    } catch (error) {
      console.error('Erro ao salvar imagem gerada:', error);
      throw error;
    }
  }

  /**
   * Incrementa o contador de uso de uma imagem
   */
  static async incrementUsage(imageId: number): Promise<void> {
    try {
      await prisma.generatedImage.update({
        where: { id: imageId },
        data: {
          usageCount: {
            increment: 1
          }
        }
      });
    } catch (error) {
      console.error('Erro ao incrementar uso da imagem:', error);
    }
  }

  /**
   * Busca a melhor imagem para uma cena específica
   */
  static async findBestImageForScene(
    sceneDescription: string,
    tema: string,
    tipo: string,
    publico: string,
    resolution: string,
    imageNumber: number
  ): Promise<any | null> {
    try {
      // Buscar imagens similares
      const similarImages = await this.findSimilarImages({
        sceneDescription,
        tema,
        tipo,
        publico,
        resolution,
        limit: 10
      });

      if (similarImages.length === 0) {
        return null;
      }

      // Filtrar por número da imagem na cena
      const matchingImages = similarImages.filter(img => img.imageNumber === imageNumber);

      if (matchingImages.length === 0) {
        // Se não encontrar exato, usar a melhor imagem geral
        return similarImages[0];
      }

      // Retornar a imagem com melhor performance
      return matchingImages.reduce((best, current) => 
        current.performance > best.performance ? current : best
      );
    } catch (error) {
      console.error('Erro ao buscar melhor imagem para cena:', error);
      return null;
    }
  }

  /**
   * Gera tags semânticas para uma descrição de cena
   */
  static generateTags(sceneDescription: string, tema: string, tipo: string): string[] {
    const tags = new Set<string>();

    // Tags baseadas no tema
    tags.add(tema.toLowerCase());
    tags.add(tipo.toLowerCase());

    // Tags baseadas na descrição da cena
    const description = sceneDescription.toLowerCase();
    
    // Emoções
    if (description.includes('amor') || description.includes('carinho')) tags.add('amor');
    if (description.includes('cansada') || description.includes('cansado')) tags.add('cansada');
    if (description.includes('feliz') || description.includes('sorrindo')) tags.add('feliz');
    if (description.includes('triste') || description.includes('chorando')) tags.add('triste');
    if (description.includes('determinada') || description.includes('foco')) tags.add('determinada');

    // Elementos visuais
    if (description.includes('bebê') || description.includes('bebe')) tags.add('bebe');
    if (description.includes('mãe') || description.includes('mae')) tags.add('mae');
    if (description.includes('família') || description.includes('familia')) tags.add('familia');
    if (description.includes('casa') || description.includes('lar')) tags.add('casa');
    if (description.includes('natureza') || description.includes('exterior')) tags.add('natureza');
    if (description.includes('luz') || description.includes('iluminação')) tags.add('luz');
    if (description.includes('close') || description.includes('close-up')) tags.add('close-up');
    if (description.includes('vista') || description.includes('perspectiva')) tags.add('perspectiva');

    // Estilos
    if (description.includes('realista') || description.includes('fotográfico')) tags.add('realista');
    if (description.includes('ilustração') || description.includes('desenho')) tags.add('ilustracao');
    if (description.includes('profissional') || description.includes('alta qualidade')) tags.add('profissional');

    return Array.from(tags);
  }
} 