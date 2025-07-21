import { getCredential } from '../utils/credentials';
import { videoMetadataManager } from '../utils/videoMetadata';
import { GeneratedImageManager } from '../utils/generatedImageManager';
import { generateSceneImageSuggestions } from '../utils/sceneImageGenerator';
import { log, logPerf, logApi } from '../utils/logger';
import { generateWithFallback } from '../text/gemini-groq';
import { gerarImagemColabSD } from '../image/stabledefusion';
import { generateImageFreepik } from '../image/freepik';
import path from 'path';
import fs from 'fs';
import { gerarNarracaoElevenLabs } from '../tts/elevenlabs';
import { verificarDuracaoAudio } from '../utils/audioUtils';
import { createKenBurnsAnimation, addAudioToVideo, concatenateVideos, addSubtitlesToVideo } from '../video/ffmpeg';
import { generateProgressiveSubtitlesWithAudio } from '../subtitles/aligner';
import { generateScript } from '../text/gemini-groq';
import JSON5 from 'json5'; // Adicionar no topo do arquivo
import axios from 'axios';
import { fileManager } from '../utils/fileManager';
import { imageCache } from '../utils/imageCache';
import { getConfig, isOptimizationEnabled } from '../config/performance';
import { canUseFreepik, getFreepikStats } from '../utils/freepikUsage';
import { performanceMonitor, measureApiPerformance } from '../utils/performanceMonitor';

// Função utilitária para gerar CTA visual personalizado
function gerarCTAPersonalizado(tema: string, tipo: string, publico: string): string {
  // Exemplos de CTA por tipo
  if (tipo.toLowerCase().includes('anúncio') || tipo.toLowerCase().includes('publicidade')) {
    return 'Clique no link e descubra mais!';
  }
  if (tipo.toLowerCase().includes('educativo')) {
    return 'Compartilhe este vídeo com outras mães!';
  }
  if (tipo.toLowerCase().includes('story') || tipo.toLowerCase().includes('reels')) {
    return 'Arraste para cima e saiba mais!';
  }
  if (tipo.toLowerCase().includes('tutorial')) {
    return 'Experimente agora mesmo!';
  }
  if (tipo.toLowerCase().includes('inspiracional')) {
    return 'Siga para mais dicas e inspiração!';
  }
  // CTA padrão
  return `Não perca! Saiba tudo sobre ${tema}`;
}

// Função para upload para Cloudinary
async function uploadToCloudinary(filePath: string, folder: string = 'babyvideoia'): Promise<string> {
  try {
    // Verificar se o arquivo existe
    if (!fs.existsSync(filePath)) {
      log(`❌ Arquivo não encontrado para upload: ${filePath}`);
      return '';
    }

    const { v2: cloudinary } = require('cloudinary');
    
    // Buscar credenciais do banco
    const cloudName = await getCredential('CLOUDINARY_CLOUD_NAME');
    const apiKey = await getCredential('CLOUDINARY_API_KEY');
    const apiSecret = await getCredential('CLOUDINARY_API_SECRET');
    
    if (!cloudName || !apiKey || !apiSecret) {
      log('⚠️ Credenciais do Cloudinary não configuradas no banco. Pulando upload.');
      return '';
    }
    
    // Configurar Cloudinary
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret
    });
    
    // Determinar o tipo de recurso baseado na extensão
    const ext = path.extname(filePath).toLowerCase();
    const resourceType = ext === '.mp4' || ext === '.avi' || ext === '.mov' ? 'video' : 'image';
    
    // Upload do arquivo
    const result = await cloudinary.uploader.upload(filePath, {
      folder: folder,
      resource_type: resourceType,
      public_id: `video_${Date.now()}`,
      overwrite: true,
      eager: resourceType === 'video' ? [
        { width: 320, height: 568, crop: 'fill', format: 'jpg' }
      ] : undefined
    });
    
    log(`✅ Upload para Cloudinary: ${result.secure_url}`);
    return result.secure_url;
  } catch (error) {
    log(`❌ Erro no upload para Cloudinary: ${error.message || error}`);
    return '';
  }
}

// Função para gerar thumbnail
async function generateThumbnail(videoPath: string): Promise<string> {
  try {
    const thumbnailPath = videoPath.replace('.mp4', '_thumb.jpg');
    const { generateThumbnail } = require('../video/ffmpeg');
    
    // Usar o padrão correto do FFmpeg para evitar avisos
    const tempThumbPath = thumbnailPath.replace('.jpg', '_%03d.jpg');
    generateThumbnail(videoPath, tempThumbPath, '00:00:02');
    
    // Renomear o primeiro frame para o nome final
    const finalThumbPath = thumbnailPath;
    if (fs.existsSync(tempThumbPath.replace('%03d', '001'))) {
      fs.renameSync(tempThumbPath.replace('%03d', '001'), finalThumbPath);
      
      // Limpar arquivos temporários
      const tempFiles = fs.readdirSync(path.dirname(tempThumbPath))
        .filter(f => f.includes('_thumb_') && f.endsWith('.jpg'));
      tempFiles.forEach(f => {
        try {
          fs.unlinkSync(path.join(path.dirname(tempThumbPath), f));
        } catch (e) {
          // Ignorar erros de limpeza
        }
      });
      
      log(`✅ Thumbnail gerado: ${finalThumbPath}`);
      return finalThumbPath;
    }
  } catch (error) {
    log(`❌ Erro ao gerar thumbnail: ${error.message || error}`);
  }
  
  // Fallback: criar thumbnail simples
  const fallbackThumb = `output/thumbnails/thumb_${Date.now()}.jpg`;
  if (!fs.existsSync('output/thumbnails')) {
    fs.mkdirSync('output/thumbnails', { recursive: true });
  }
  criarPlaceholderValido(fallbackThumb, 320, 568);
  return fallbackThumb;
}

// Tipos principais
export interface CenaPayload {
  descricao: string;
  imagens?: string[]; // URLs ou caminhos das imagens enviadas pelo usuário
}

export interface ImagemComDescricao {
  url: string;
  descricao: string;
  categoria: 'funcionalidade' | 'painel_admin' | 'user_interface' | 'pagamento' | 'loja' | 'atividades' | 'diario' | 'outros';
}

export interface GenerateVideoPayload {
  tema: string;
  tipo: string;
  publico: string;
  tom: string;
  duracao: number;
  cenas: CenaPayload[];
  useStableDiffusion?: boolean;
  formato?: string; // Adicionado para suportar o campo formato
  titulo?: string; // Novo campo para título do vídeo
  gerarLegenda?: boolean; // Novo campo para gerar legenda de redes sociais
  plataformaLegenda?: 'instagram' | 'facebook' | 'tiktok' | 'youtube'; // Novo campo para escolher plataforma
  musica?: string; // URL da música
  imagensComDescricao?: ImagemComDescricao[]; // Novo campo para imagens com descrições
  configuracoes?: {
    duracao?: number;
    qualidade?: string;
    estilo?: string;
    volumeMusica?: number;
    fadeInMusica?: number;
    fadeOutMusica?: number;
    loopMusica?: boolean;
  };
  cta?: string; // Novo campo para CTA visual
  roteiro?: string; // Novo campo para roteiro
}

export interface VideoResult {
  videoPath: string;
  thumbnailPath: string;
  legendasPath: string;
  metadados: any;
}

export interface RoteiroGerado {
  cenas: Array<{
    narracao: string;
    visual: string | string[]; // Pode ser string ou array de prompts visuais
  }>;
}

// Função para gerar prompts melhorados para evitar bebês "monstros"
function gerarPromptMelhorado(promptOriginal: string, tipo: string, publico: string): string {
  // Prompts específicos para evitar problemas de qualidade
  const promptsSeguros = {
    bebe: 'cute baby, healthy baby, natural baby, soft features, gentle expression, baby with normal proportions, baby with natural skin tone, baby with proper anatomy, baby with realistic features, no deformities, no adult features, baby-like proportions',
    mae: 'beautiful mother, caring mother, gentle mother, mother with natural features, mother with soft expression, mother with proper anatomy, mother with realistic features, no deformities, natural skin tone, mother-like proportions',
    familia: 'happy family, loving family, natural family, family with proper anatomy, family with realistic features, no deformities, natural skin tones, family-like proportions',
    cuidado: 'gentle care, loving care, natural care, proper anatomy, realistic features, no deformities, natural skin tones, proper proportions'
  };

  // Adicionar prompts de segurança baseados no tipo
  let promptSeguro = '';
  if (tipo.includes('bebê') || tipo.includes('baby') || promptOriginal.toLowerCase().includes('bebê') || promptOriginal.toLowerCase().includes('baby')) {
    promptSeguro = promptsSeguros.bebe;
  } else if (tipo.includes('mãe') || tipo.includes('mother') || promptOriginal.toLowerCase().includes('mãe') || promptOriginal.toLowerCase().includes('mother')) {
    promptSeguro = promptsSeguros.mae;
  } else if (tipo.includes('família') || tipo.includes('family') || promptOriginal.toLowerCase().includes('família') || promptOriginal.toLowerCase().includes('family')) {
    promptSeguro = promptsSeguros.familia;
  } else {
    promptSeguro = promptsSeguros.cuidado;
  }

  // Combinar prompt original com prompts de segurança
  const promptFinal = `${promptOriginal}, ${promptSeguro}, high quality, professional photography, natural lighting, soft shadows, warm colors, detailed, sharp focus, 4k, ultra realistic, no artifacts, no distortions, no blur, no noise`;

  return promptFinal;
}

// Função auxiliar: Monta o prompt para IA com base nas descrições das cenas
function montarPromptIA(payload: GenerateVideoPayload): string {
  const { tema, tipo, publico, tom, duracao } = payload;
  let numeroCenas = 5;
  if (Array.isArray(payload.cenas)) {
    numeroCenas = payload.cenas.length > 0 ? payload.cenas.length : 5;
  } else if (typeof payload.cenas === 'number') {
    numeroCenas = payload.cenas;
  }
  const cenasText = Array.isArray(payload.cenas) && payload.cenas.length > 0 
    ? payload.cenas.map((cena, idx) => `Cena ${idx + 1}: ${cena.descricao}`).join('\n')
    : `Gerar ${numeroCenas} cenas automaticamente`;

  // Adicionar contexto das imagens enviadas pelo usuário
  let contextoImagens = '';
  if (payload.imagensComDescricao && payload.imagensComDescricao.length > 0) {
    contextoImagens = `\n\nIMAGENS ENVIADAS PELO USUÁRIO (use estas descrições como contexto visual):\n${payload.imagensComDescricao.map((img, idx) => 
      `Cena ${idx + 1}: ${img.descricao} (Categoria: ${img.categoria})`
    ).join('\n')}\n\nIMPORTANTE: Se o usuário enviou imagens, use as descrições delas como base para o roteiro. Incorpore os elementos visuais descritos nas narrações e mantenha a coerência com o contexto das imagens.`;
  }

  return `Você é um roteirista especialista em vídeos verticais para redes sociais sobre maternidade e bebês.\n\nGere um roteiro VSL dividido em ${numeroCenas} cenas, cada uma baseada na descrição abaixo.\n\nPara cada cena, gere:\n- a narração (SSML)\n- a descrição visual resumida\n- 3 descrições detalhadas e diferentes para imagens da cena (varie ângulo, foco, emoção, ação, iluminação, etc)\n\nATENÇÃO: O campo \"visual\" deve ser um array com exatamente 3 strings, cada uma descrevendo uma imagem diferente da cena. NÃO retorne menos de 3 descrições. Se não conseguir, repita a última até completar 3.\n\nNÃO use blocos markdown (não coloque \`\`\`json ou \`\`\` no início/fim da resposta). Apenas retorne o JSON puro.\n\nTema: ${tema}\nTipo: ${tipo}\nPúblico: ${publico}\nTom: ${tom}\nDuração total: ${duracao} segundos${contextoImagens}\n\nCENAS:\n${cenasText}\n\nExemplo de resposta:\n{\n  \"cenas\": [\n    {\n      \"narracao\": \"...\",\n      \"visual\": [\n        \"Prompt detalhado para imagem 1\",\n        \"Prompt detalhado para imagem 2\",\n        \"Prompt detalhado para imagem 3\"\n      ]\n    }\n  ],\n  \"caption\": \"Legenda para Instagram com hashtags e call-to-action\"\n}`;
}

// Tornar o parser de JSON robusto contra blocos markdown
async function gerarRoteiroComSSML(prompt: string, apiKey?: string): Promise<RoteiroGerado> {
  const resposta = await generateWithFallback(prompt, undefined, async (name: string) => {
    if (apiKey && name === 'GEMINI_KEY') return apiKey;
    return await getCredential(name);
  });
  // Garantir que resposta é string
  let respostaLimpa = typeof resposta === 'string' ? resposta.trim() : String(resposta).trim();
  respostaLimpa = respostaLimpa.replace(/^```json/gm, '').replace(/^```/gm, '').replace(/```$/gm, '').trim();
  // Tenta extrair JSON da resposta
  let jsonMatch = respostaLimpa.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const jsonObj = JSON.parse(jsonMatch[0]);
      if (Array.isArray(jsonObj.cenas)) {
        return { cenas: jsonObj.cenas.map(c => ({
          narracao: c.narracao,
          visual: c.visual,
          imagens: Array.isArray(c.imagens) ? c.imagens : []
        })) };
      }
    } catch (e) {
      log('❌ Erro ao fazer parse do JSON do roteiro IA: ' + e);
      // Fallback: tentar corrigir JSON malformado
      try {
        let corrigido = jsonMatch[0]
          .replace(/,\s*}/g, '}') // Remove vírgula antes de }
          .replace(/,\s*]/g, ']') // Remove vírgula antes de ]
          .replace(/\n/g, ' ');
        // Remove qualquer linha antes do primeiro {
        corrigido = corrigido.substring(corrigido.indexOf('{'));
        // Remove qualquer coisa depois do último }
        corrigido = corrigido.substring(0, corrigido.lastIndexOf('}') + 1);
        // Tenta JSON5
        const jsonObj = JSON5.parse(corrigido);
        if (Array.isArray(jsonObj.cenas)) {
          log('✅ JSON corrigido com fallback!');
          return { cenas: jsonObj.cenas.map(c => ({
            narracao: c.narracao,
            visual: c.visual,
            imagens: Array.isArray(c.imagens) ? c.imagens : []
          })) };
        }
      } catch (e2) {
        log('❌ Fallback de JSON também falhou: ' + e2);
      }
    }
  }
  // Fallback: retorna roteiro vazio
  return { cenas: [] };
}

// Função para criar placeholder PNG válido
function criarPlaceholderValido(outputPath: string, largura: number = 720, altura: number = 1280): void {
  try {
    // Criar um canvas simples com Node.js
    const { createCanvas } = require('canvas');
    const canvas = createCanvas(largura, altura);
    const ctx = canvas.getContext('2d');
    
    // Fundo gradiente moderno
    const gradient = ctx.createLinearGradient(0, 0, 0, altura);
    gradient.addColorStop(0, '#667eea');
    gradient.addColorStop(1, '#764ba2');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, largura, altura);
    
    // Adicionar elementos visuais
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.arc(largura * 0.8, altura * 0.2, 100, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(largura * 0.2, altura * 0.8, 80, 0, Math.PI * 2);
    ctx.fill();
    
    // Texto central com sombra
    ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('BabyVideoIA', largura / 2, altura / 2 - 30);
    
    ctx.font = '18px Arial';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText('Gerando Vídeo...', largura / 2, altura / 2 + 10);
    
    // Remover sombra
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    
    // Salvar como PNG
    const fs = require('fs');
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(outputPath, buffer);
    
    // Verificar se o arquivo foi criado corretamente
    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
      throw new Error('Arquivo placeholder não foi criado corretamente');
    }
    
    log(`✅ Placeholder criado com sucesso: ${outputPath} (${fs.statSync(outputPath).size} bytes)`);
  } catch (e) {
    log(`❌ Erro ao criar placeholder com canvas: ${e}`);
    
    // Fallback melhorado: copiar uma imagem de placeholder existente
    try {
      const fs = require('fs');
      const path = require('path');
      
      // Tentar copiar uma imagem de placeholder existente
      const placeholderDir = path.join(process.cwd(), 'assets', 'templates');
      const placeholderFiles = ['placeholder.png', 'default.png', 'template.png'];
      
      for (const file of placeholderFiles) {
        const placeholderPath = path.join(placeholderDir, file);
        if (fs.existsSync(placeholderPath)) {
          fs.copyFileSync(placeholderPath, outputPath);
          log(`✅ Placeholder copiado de: ${placeholderPath}`);
          return;
        }
      }
      
      // Se não encontrar placeholder existente, criar um PNG válido simples
      log(`⚠️ Criando PNG válido simples como fallback...`);
      
      // Criar um PNG válido com fundo sólido
      const { createCanvas } = require('canvas');
      const canvas = createCanvas(largura, altura);
      const ctx = canvas.getContext('2d');
      
      // Fundo azul simples
      ctx.fillStyle = '#4A90E2';
      ctx.fillRect(0, 0, largura, altura);
      
      // Texto simples
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('BabyVideoIA', largura / 2, altura / 2);
      
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(outputPath, buffer);
      
      log(`✅ PNG válido criado como fallback: ${outputPath}`);
    } catch (fallbackError) {
      log(`❌ Erro no fallback: ${fallbackError}`);
      
      // Último recurso: criar um arquivo de imagem mínima
      const fs = require('fs');
      const minimalPng = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
        0x49, 0x48, 0x44, 0x52, // IHDR
        0x00, 0x00, 0x02, 0xD0, // width: 720
        0x00, 0x00, 0x05, 0x00, // height: 1280
        0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, etc.
        0x00, 0x00, 0x00, 0x00, // CRC placeholder
        0x00, 0x00, 0x00, 0x00, // IEND chunk length
        0x49, 0x45, 0x4E, 0x44, // IEND
        0xAE, 0x42, 0x60, 0x82  // CRC
      ]);
      fs.writeFileSync(outputPath, minimalPng);
      log(`⚠️ PNG mínimo criado como último recurso: ${outputPath}`);
    }
  }
}

// Função para verificar se uma imagem é válida
function verificarImagemValida(imagePath: string): boolean {
  try {
    const fs = require('fs');
    if (!fs.existsSync(imagePath)) {
      log(`❌ Imagem não existe: ${imagePath}`);
      return false;
    }
    
    const stats = fs.statSync(imagePath);
    if (stats.size === 0) {
      log(`❌ Imagem vazia: ${imagePath}`);
      return false;
    }
    
    // Verificar se é um PNG válido (verificar assinatura)
    const buffer = fs.readFileSync(imagePath);
    if (buffer.length < 8) {
      log(`❌ Imagem muito pequena: ${imagePath}`);
      return false;
    }
    
    // Verificar assinatura PNG
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    if (!buffer.slice(0, 8).equals(pngSignature)) {
      log(`❌ Imagem não é PNG válido: ${imagePath}`);
      return false;
    }
    
    log(`✅ Imagem válida: ${imagePath} (${stats.size} bytes)`);
    return true;
  } catch (error) {
    log(`❌ Erro ao verificar imagem: ${error}`);
    return false;
  }
}

async function gerarImagemComFallbackMelhorado(
  prompt: string, 
  payload: GenerateVideoPayload, 
  numeroCena: number, 
  numeroImagem: number
): Promise<string> {
  const outputPath = `output/generated_images/scene${numeroCena}_img${numeroImagem}.png`;
  
  log(`🎯 INÍCIO: Gerando imagem ${numeroImagem} da cena ${numeroCena} com prompt: "${prompt}"`);
  
  // 1. PRIMEIRO: Verificar se Freepik pode ser usado (modo ilimitado)
  const freepikStatus = canUseFreepik();
  if (freepikStatus.canUse) {
    try {
      log(`🎨 ETAPA 1: Tentando Freepik para imagem ${numeroImagem} da cena ${numeroCena}...`);
      log(`📊 Status Freepik: ${JSON.stringify(freepikStatus.usage)}`);
      
      // Usar o prompt diretamente, o Freepik já tem sua própria lógica de melhoria
      const imgPath = await generateImageFreepik(prompt, outputPath, { resolution: 'vertical' });
      log(`✅ SUCESSO: Imagem ${numeroImagem} gerada com Freepik: ${imgPath}`);
      
      // Persistir imagem gerada
      try {
        const { GeneratedImageManager } = require('../utils/generatedImageManager');
        const fs = require('fs');
        const tags = GeneratedImageManager.generateTags(prompt, payload.tema, payload.tipo);
        const stats = fs.existsSync(imgPath) ? fs.statSync(imgPath) : { size: 0 };
        await GeneratedImageManager.saveGeneratedImage({
          filename: imgPath.split('/').pop() || imgPath,
          prompt: prompt,
          sceneDescription: prompt,
          sceneNumber: numeroCena,
          imageNumber: numeroImagem,
          generationMethod: 'freepik',
          resolution: '576x1024',
          tema: payload.tema,
          tipo: payload.tipo,
          publico: payload.publico,
          tags,
          localPath: imgPath,
          size: stats.size || 0
        });
        log(`💾 Imagem Freepik persistida no banco/Cloudinary.`);
      } catch (err) {
        log(`⚠️ Falha ao persistir imagem Freepik: ${err}`);
      }
      log(`🎯 FIM: Retornando imagem Freepik gerada: ${imgPath}`);
      return imgPath;
    } catch (e) {
      log(`❌ FALHA: Freepik falhou para imagem ${numeroImagem}: ${e}`);
      // Se falhar por rate limit ou chave inválida, sugerir adicionar nova chave
      if (e.message && (e.message.includes('rate limit') || e.message.includes('401') || e.message.includes('invalid'))) {
        log(`💡 DICA: Considere adicionar uma nova chave Freepik se o erro persistir`);
      }
    }
  } else {
    log(`⚠️ Freepik não disponível: ${freepikStatus.reason}`);
    log(`📊 Estatísticas Freepik: ${JSON.stringify(freepikStatus.usage)}`);
  }
  
  // 2. SEGUNDO: Tentar Stable Diffusion (se configurado)
  const useSD = payload.useStableDiffusion || process.env.USE_STABLE_DIFFUSION === 'true' || process.env.COLAB_URL;
  if (useSD) {
    try {
      log(`🎨 ETAPA 2: Tentando SD para imagem ${numeroImagem} da cena ${numeroCena}...`);
      const promptMelhorado = gerarPromptMelhorado(prompt, payload.tipo, payload.publico);
      // Usar modo lento para melhor qualidade e controle
      const imgPath = await gerarImagemColabSD(promptMelhorado, outputPath, { 
        resolution: 'vertical',
        slowMode: true // Ativar modo lento
      });
      log(`✅ SUCESSO: Imagem ${numeroImagem} gerada com SD (modo lento): ${imgPath}`);
      // Persistir imagem gerada
      try {
        const { GeneratedImageManager } = require('../utils/generatedImageManager');
        const fs = require('fs');
        const tags = GeneratedImageManager.generateTags(prompt, payload.tema, payload.tipo);
        const stats = fs.existsSync(imgPath) ? fs.statSync(imgPath) : { size: 0 };
        await GeneratedImageManager.saveGeneratedImage({
          filename: imgPath.split('/').pop() || imgPath,
          prompt: promptMelhorado,
          sceneDescription: prompt,
          sceneNumber: numeroCena,
          imageNumber: numeroImagem,
          generationMethod: 'stable-diffusion',
          resolution: '576x1024',
          tema: payload.tema,
          tipo: payload.tipo,
          publico: payload.publico,
          tags,
          localPath: imgPath,
          size: stats.size || 0
        });
        log(`💾 Imagem SD persistida no banco/Cloudinary.`);
      } catch (err) {
        log(`⚠️ Falha ao persistir imagem SD: ${err}`);
      }
      log(`🎯 FIM: Retornando imagem SD gerada: ${imgPath}`);
      return imgPath;
    } catch (e) {
      log(`❌ FALHA: SD falhou para imagem ${numeroImagem}: ${e}`);
    }
  } else {
    log(`⏭️ SD desabilitado, pulando ETAPA 2...`);
  }
  
  // 3. TERCEIRO: Tentar encontrar imagem similar no banco (APENAS se as anteriores falharam)
  try {
    log(`🔍 ETAPA 3: Procurando imagem similar no banco para cena ${numeroCena} (apenas se geração falhou)...`);
    const { GeneratedImageManager } = require('../utils/generatedImageManager');
    const imagemSimilar = await GeneratedImageManager.findBestImageForScene(
      prompt,
      payload.tema,
      payload.tipo,
      payload.publico,
      '576x1024',
      numeroImagem
    );
    
    if (imagemSimilar && imagemSimilar.cloudinaryUrl) {
      log(`✅ FALLBACK: Imagem encontrada no banco (Cloudinary): ${imagemSimilar.filename}`);
      log(`🎯 FIM: Retornando imagem do banco: ${imagemSimilar.cloudinaryUrl}`);
      return imagemSimilar.cloudinaryUrl;
    } else if (imagemSimilar && imagemSimilar.localPath && fs.existsSync(imagemSimilar.localPath)) {
      log(`✅ FALLBACK: Imagem local encontrada no banco: ${imagemSimilar.filename}`);
      log(`🎯 FIM: Retornando imagem local do banco: ${imagemSimilar.localPath}`);
      return imagemSimilar.localPath;
    } else {
      log(`❌ FALHA: Nenhuma imagem similar encontrada no banco.`);
    }
  } catch (e) {
    log(`⚠️ Erro ao buscar no banco: ${e}`);
  }
  
  // 4. QUARTO: Se nada funcionou, criar placeholder automático
  try {
    log(`🔄 ETAPA 4: Criando placeholder automático para cena ${numeroCena}, imagem ${numeroImagem}...`);
    const placeholderPath = `output/generated_images/placeholder_auto_scene${numeroCena}_img${numeroImagem}.png`;
    
    // Criar placeholder com dimensões corretas
    criarPlaceholderValido(placeholderPath, 720, 1280);
    
    // Persistir placeholder no banco
    try {
      const { GeneratedImageManager } = require('../utils/generatedImageManager');
      const fs = require('fs');
      const tags = GeneratedImageManager.generateTags(prompt, payload.tema, payload.tipo);
      const stats = fs.existsSync(placeholderPath) ? fs.statSync(placeholderPath) : { size: 0 };
      await GeneratedImageManager.saveGeneratedImage({
        filename: placeholderPath.split('/').pop() || placeholderPath,
        prompt: `Placeholder automático: ${prompt}`,
        sceneDescription: prompt,
        sceneNumber: numeroCena,
        imageNumber: numeroImagem,
        generationMethod: 'placeholder',
        resolution: '720x1280',
        tema: payload.tema,
        tipo: payload.tipo,
        publico: payload.publico,
        tags,
        localPath: placeholderPath,
        size: stats.size || 0
      });
      log(`💾 Placeholder persistido no banco.`);
    } catch (err) {
      log(`⚠️ Falha ao persistir placeholder: ${err}`);
    }
    
    log(`✅ FALLBACK: Placeholder criado: ${placeholderPath}`);
    log(`🎯 FIM: Retornando placeholder: ${placeholderPath}`);
    return placeholderPath;
  } catch (e) {
    log(`❌ FALHA: Erro ao criar placeholder: ${e}`);
    // Último recurso: retornar caminho de placeholder básico
    const fallbackPath = `output/generated_images/placeholder_basic_scene${numeroCena}_img${numeroImagem}.png`;
    criarPlaceholderValido(fallbackPath, 720, 1280);
    log(`🎯 FIM: Retornando placeholder básico: ${fallbackPath}`);
    return fallbackPath;
  }
}

// Função para processar imagens de uma cena sequencialmente (uma por vez)
async function processarImagensCenaSequencial(
  cenaRoteiro: { trecho?: string; narracao?: string; visual: string | string[] },
  payload: GenerateVideoPayload,
  numeroCena: number,
  arquivosTemporarios?: string[] // Adicionar parâmetro opcional
): Promise<string[]> {
  // Garantir que visual é um array de 3 descrições
  const promptsVisuais = Array.isArray(cenaRoteiro.visual) ? cenaRoteiro.visual : [cenaRoteiro.visual];
  if (promptsVisuais.length !== 3) {
    throw new Error(`A cena ${numeroCena} não possui exatamente 3 descrições visuais no roteiro IA. Foram encontradas: ${promptsVisuais.length}. Corrija o template do roteiro ou a IA.`);
  }
  log(`🚀 Iniciando geração de 3 imagens para cena ${numeroCena} usando descrições individuais do roteiro...`);
  const imagens: string[] = [];
  for (let i = 0; i < 3; i++) {
    const prompt = promptsVisuais[i];
    log(`📸 Gerando imagem ${i + 1}/3 para cena ${numeroCena} com descrição: ${prompt}`);
    

    
    const imagem = await gerarImagemComFallbackMelhorado(prompt, payload, numeroCena, i + 1);
    
    // Verificar se a imagem foi gerada corretamente
    if (!imagem || !fs.existsSync(imagem)) {
      log(`❌ Imagem ${i + 1} não foi gerada corretamente, tentando novamente...`);
      // Tentar uma vez mais
      await new Promise(resolve => setTimeout(resolve, 5000));
      const imagemRetry = await gerarImagemComFallbackMelhorado(prompt, payload, numeroCena, i + 1);
      if (imagemRetry && fs.existsSync(imagemRetry)) {
        imagens.push(imagemRetry);
        log(`✅ Imagem ${i + 1} gerada na segunda tentativa: ${imagemRetry}`);
      } else {
        log(`❌ Falha na segunda tentativa, usando placeholder...`);
        const placeholderPath = `output/generated_images/placeholder_scene${numeroCena}_img${i + 1}.png`;
        criarPlaceholderValido(placeholderPath, 720, 1280);
        imagens.push(placeholderPath);
      }
    } else {
      imagens.push(imagem);
      log(`✅ Imagem ${i + 1} gerada com sucesso: ${imagem}`);
    }
    
    // Adicionar imagem ao array de arquivos temporários se fornecido
    if (arquivosTemporarios && imagem) {
      arquivosTemporarios.push(imagem);
      log(`📝 Imagem adicionada à lista de limpeza: ${imagem}`);
    }
    
    if (i < 2) {
      log(`⏳ Aguardando 10 segundos antes da próxima imagem para evitar rate limit...`);
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
  }
  log(`✅ Todas as 3 imagens da cena ${numeroCena} foram processadas!`);
  return imagens;
}

// Função para limpar arquivos temporários
function limparArquivosTemporarios(arquivos: string[]) {
  log('🧹 Limpando arquivos temporários...');
  
  // Lista de arquivos para limpar
  const arquivosParaLimpar = [...arquivos];
  
  // Adicionar imagens geradas automaticamente
  try {
    const imagesDir = 'output/generated_images';
    if (fs.existsSync(imagesDir)) {
      const imageFiles = fs.readdirSync(imagesDir);
      imageFiles.forEach(file => {
        if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
          const imagePath = path.join(imagesDir, file);
          arquivosParaLimpar.push(imagePath);
        }
      });
    }
  } catch (e) {
    log(`⚠️ Erro ao listar imagens para limpeza: ${e}`);
  }
  
  // Limpar cada arquivo
  arquivosParaLimpar.forEach(arquivo => {
    try {
      if (fs.existsSync(arquivo)) {
        fs.unlinkSync(arquivo);
        log(`🗑️ Removido: ${arquivo}`);
      }
    } catch (e) {
      log(`⚠️ Erro ao remover ${arquivo}: ${e}`);
    }
  });
  
  // Limpar diretórios vazios
  try {
    const dirsToClean = ['output/generated_images', 'output/final_videos', 'output'];
    dirsToClean.forEach(dir => {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        if (files.length === 0) {
          fs.rmdirSync(dir);
          log(`🗑️ Diretório vazio removido: ${dir}`);
        }
      }
    });
  } catch (e) {
    log(`⚠️ Erro ao limpar diretórios vazios: ${e}`);
  }
  
  log(`✅ Limpeza concluída. ${arquivosParaLimpar.length} arquivos processados.`);
}

// Função utilitária para sugerir CTA conforme o público
function sugerirCTAAutomatico(publico: string): string {
  const publicoLower = publico.toLowerCase();
  if (
    publicoLower.includes('mãe') ||
    publicoLower.includes('mae') ||
    publicoLower.includes('gestante') ||
    publicoLower.includes('pai') ||
    publicoLower.includes('familia') ||
    publicoLower.includes('família')
  ) {
    return 'Baixe agora o app Baby Diary e registre cada momento especial do seu bebê!';
  }
  if (
    publicoLower.includes('afiliado') ||
    publicoLower.includes('empreendedor') ||
    publicoLower.includes('agência') ||
    publicoLower.includes('agencia') ||
    publicoLower.includes('consultor') ||
    publicoLower.includes('revendedor') ||
    publicoLower.includes('startup') ||
    publicoLower.includes('influenciador') ||
    publicoLower.includes('influenciadora') ||
    publicoLower.includes('parceiro') ||
    publicoLower.includes('criador') ||
    publicoLower.includes('infoproduto') ||
    publicoLower.includes('educador')
  ) {
    return 'Descubra como lucrar com o Baby Diary White Label! Solicite uma demonstração exclusiva.';
  }
  return 'Conheça o Baby Diary: o app que transforma memórias em histórias inesquecíveis. Baixe agora!';
}

// Função principal do pipeline VSL otimizada
export async function generateVideoVSL(payload: GenerateVideoPayload): Promise<VideoResult> {
  const pipelineId = performanceMonitor.start('generateVideoVSL', { 
    tema: payload.tema, 
    tipo: payload.tipo, 
    publico: payload.publico 
  });
  
  const arquivosTemporarios: string[] = [];
  
  try {
    log('🚀 Iniciando pipeline VSL otimizado...');
    log(`📋 Payload recebido: ${JSON.stringify(payload, null, 2)}`);

    // Padronização e validação dos valores de tipo e público
    const tiposValidos = [
      'Anúncio/Publicidade', 'Dica Rápida', 'Educativo', 'Story/Reels', 'Tutorial', 'Inspiracional'
    ];
    const publicosValidos = [
      'Mães de primeira viagem', 'Gestantes', 'Mães experientes', 'Pais em geral', 'Familiares',
      'Influenciadoras digitais', 'Afiliados e parceiros', 'Criadores de infoprodutos', 'Empreendedores',
      'Agências de marketing', 'Consultores e coaches', 'Revendedores', 'Startups', 'Profissionais liberais', 'Educadores'
    ];
    let tipo = payload.tipo;
    let publico = payload.publico;
    if (!tiposValidos.includes(tipo)) {
      log(`⚠️ Tipo inválido recebido: ${tipo}. Usando 'Anúncio/Publicidade' como padrão.`);
      tipo = 'Anúncio/Publicidade';
    }
    if (!publicosValidos.includes(publico)) {
      log(`⚠️ Público inválido recebido: ${publico}. Usando 'Mães de primeira viagem' como padrão.`);
      publico = 'Mães de primeira viagem';
    }

    // Mapeamento inteligente de público
    const publicoConfig: Record<string, { modo: string; foco: string; funcionalidades: string; argumentos: string }> = {
      'Mães de primeira viagem': {
        modo: 'app',
        foco: 'emoção, memórias, praticidade',
        funcionalidades: 'diário digital, lembretes de vacinas, exportação de memórias, acompanhamento de sono e alimentação, IA personalizada',
        argumentos: 'Nunca perca um momento especial, tudo organizado para consultas, dicas personalizadas, memórias eternas'
      },
      'Gestantes': {
        modo: 'app',
        foco: 'preparação, saúde, emoção',
        funcionalidades: 'diário de gravidez, calendário de consultas, dicas de especialistas, IA para dúvidas',
        argumentos: 'Acompanhe cada fase da gestação, registre emoções, receba dicas para cada trimestre'
      },
      'Mães experientes': {
        modo: 'app',
        foco: 'organização, praticidade, memórias',
        funcionalidades: 'linha do tempo, múltiplos perfis de filhos, exportação de dados, gamificação',
        argumentos: 'Organize a rotina de todos os filhos, registre conquistas, compartilhe com a família'
      },
      'Pais em geral': {
        modo: 'app',
        foco: 'inclusão, praticidade, participação',
        funcionalidades: 'acesso multiusuário, lembretes compartilhados, diário colaborativo',
        argumentos: 'Participe ativamente, compartilhe tarefas, acompanhe o desenvolvimento juntos'
      },
      'Familiares': {
        modo: 'app',
        foco: 'união, memórias, colaboração',
        funcionalidades: 'álbum compartilhado, convites para familiares, comentários em fotos',
        argumentos: 'Toda a família conectada, memórias compartilhadas, participação ativa'
      },
      'Influenciadoras digitais': {
        modo: 'white-label',
        foco: 'negócio, comissão, autoridade',
        funcionalidades: 'personalização do app, painel de vendas, comissões recorrentes, branding próprio',
        argumentos: 'Transforme sua audiência em renda, tenha seu próprio app, comissão vitalícia, autoridade no nicho materno'
      },
      'Afiliados e parceiros': {
        modo: 'white-label',
        foco: 'negócio, comissão, facilidade',
        funcionalidades: 'painel de afiliados, links personalizados, relatórios de vendas',
        argumentos: 'Venda sem esforço, comissões altas, produto pronto, suporte total'
      },
      'Criadores de infoprodutos': {
        modo: 'white-label',
        foco: 'escala, automação, autoridade',
        funcionalidades: 'integração com cursos, área de membros, automação de marketing',
        argumentos: 'Escale seu negócio, produto inovador, automação total, aumente o ticket médio'
      },
      'Empreendedores': {
        modo: 'white-label',
        foco: 'escala, lucro, inovação',
        funcionalidades: 'painel admin completo, múltiplos produtos, analytics avançado',
        argumentos: 'Construa seu império digital, alta margem, produto inovador, crescimento sem limites'
      },
      'Agências de marketing': {
        modo: 'white-label',
        foco: 'resultado, inovação, portfólio',
        funcionalidades: 'gestão de múltiplos clientes, branding personalizado, relatórios automáticos',
        argumentos: 'Ofereça inovação aos clientes, aumente o portfólio, resultados comprovados'
      },
      'Consultores e coaches': {
        modo: 'white-label',
        foco: 'autoridade, recorrência, diferenciação',
        funcionalidades: 'conteúdo personalizado, área de membros, relatórios de progresso',
        argumentos: 'Destaque-se no mercado, gere recorrência, entregue valor contínuo'
      },
      'Revendedores': {
        modo: 'white-label',
        foco: 'lucro, facilidade, automação',
        funcionalidades: 'painel de revenda, automação de vendas, suporte dedicado',
        argumentos: 'Venda fácil, alta margem, suporte total, produto desejado'
      },
      'Startups': {
        modo: 'white-label',
        foco: 'inovação, agilidade, escala',
        funcionalidades: 'API aberta, integração fácil, escalabilidade',
        argumentos: 'Lance rápido, escale fácil, tecnologia de ponta'
      },
      'Profissionais liberais': {
        modo: 'white-label',
        foco: 'autoridade, diferenciação, valor',
        funcionalidades: 'branding próprio, relatórios para clientes, área exclusiva',
        argumentos: 'Destaque-se, entregue valor, fidelize clientes'
      },
      'Educadores': {
        modo: 'white-label',
        foco: 'educação, engajamento, inovação',
        funcionalidades: 'conteúdo educativo, gamificação, relatórios de progresso',
        argumentos: 'Engaje alunos, inove no ensino, acompanhe resultados'
      }
    };
    const publicoInfo = publicoConfig[publico] || publicoConfig['Mães de primeira viagem'];

    // Sugerir CTA automaticamente se não vier do frontend
    let ctaFinal = payload.cta && payload.cta.trim() !== '' ? payload.cta : sugerirCTAAutomatico(publico);

    // Função para identificar se é público de negócio
    function isPublicoNegocio(publico: string): boolean {
      const negocios = [
        'Influenciadoras digitais',
        'Afiliados e parceiros',
        'Criadores de infoprodutos',
        'Empreendedores',
        'Agências de marketing',
        'Consultores e coaches',
        'Revendedores',
        'Startups',
        'Profissionais liberais',
        'Educadores'
      ];
      return negocios.includes(publico);
    }

    // Prompt dinâmico para IA - versão VSL contínua e natural
    let promptIA = '';
    // Adicionar contexto das imagens enviadas pelo usuário
    let contextoImagens = '';
    if (payload.imagensComDescricao && payload.imagensComDescricao.length > 0) {
      contextoImagens = `\n\nIMAGENS ENVIADAS PELO USUÁRIO (use estas descrições como contexto visual):\n${payload.imagensComDescricao.map((img, idx) => 
        `Cena ${idx + 1}: ${img.descricao} (Categoria: ${img.categoria})`
      ).join('\n')}\n\nIMPORTANTE: Se o usuário enviou imagens, use as descrições delas como base para o roteiro. Incorpore os elementos visuais descritos nas narrações e mantenha a coerência com o contexto das imagens.`;
    }
    promptIA = `Gere um roteiro VSL para vídeo sobre "${payload.tema}".\n\nREQUISITOS:\n- Crie um campo \"roteiro\" (ou \"script_audio\") com o texto completo, FLUIDO, HUMANO, direcionado diretamente ao público-alvo, SEM SSML, SEM blocos curtos, para ser usado na narração principal do vídeo (áudio ElevenLabs). O texto deve ser natural, envolvente, com tom adaptado ao público e ao tipo de vídeo.\n- No FINAL do campo \"roteiro\", inclua um call-to-action (CTA) natural e persuasivo, adaptando a mensagem ao público.\n- Crie um campo \"cenas\", que é um array de objetos, cada um com:\n  - \"narracao\": frase curta (pode usar SSML para emoção, pausa, ênfase) para servir de referência visual para a cena.\n  - \"visual\": array de 3 descrições detalhadas para imagens da cena (varie ângulo, foco, emoção, ação, iluminação, etc).\n- NÃO use blocos markdown (não coloque codigo json ou codigo no início/fim da resposta). Apenas retorne o JSON puro.\n- O campo \"roteiro\" será usado para gravar o áudio principal no ElevenLabs, então deve ser um texto contínuo, natural, sem SSML.\n${contextoImagens}\n\nIMPORTANTE: Se não retornar o campo 'roteiro', tente novamente e seja ainda mais explícito para garantir que o campo 'roteiro' venha preenchido como texto corrido, fluido, humano, para narração principal.`;
    log(`🧠 Prompt dinâmico para IA (robusto): ${promptIA}`);

    // Criar diretórios necessários
    const imagesOutputDir = 'output/generated_images';
    const outputDir = 'output/final_videos';
    if (!fs.existsSync(imagesOutputDir)) {
      fs.mkdirSync(imagesOutputDir, { recursive: true });
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Definir apiKey antes do bloco para evitar erro de escopo
    const apiKey = await getCredential('GEMINI_KEY');
    if (!apiKey) throw new Error('GEMINI_KEY não configurada no banco.');
    // NOVO: Usar roteiro e cenas do payload, se vierem prontos
    let roteiroIA: any = null;
    if (payload.roteiro && Array.isArray(payload.cenas) && payload.cenas.length > 0) {
      // Se já veio roteiro e cenas aprovados, usar direto
      roteiroIA = {
        roteiro: payload.roteiro,
        cenas: payload.cenas
      };
      log('✅ Usando roteiro e cenas enviados pelo frontend (aprovados pelo usuário).');
    } else {
      // Se não veio, gerar normalmente
      // ... código existente de geração de roteiro ...
      // (copiar o trecho de geração de roteiro/cenas IA daqui para baixo)

      // 1. Gerar roteiro via IA
      log('🤖 Gerando roteiro completo via IA...');
      const numeroCenas = typeof payload.cenas === 'number' ? payload.cenas : 5;
      let roteiroIAString = await generateScript(promptIA, apiKey);
      log('🟢 RESPOSTA BRUTA DA IA: ' + roteiroIAString);
      
      // Pós-processamento: se público de negócio e roteiro mencionar "baixe o app" ou "registre memórias", tentar novamente
      if (isPublicoNegocio(publico) && /baixe o app|registre memórias|mãe|bebê/i.test(roteiroIAString)) {
        log('⚠️ Roteiro gerado para público de negócio contém termos de uso pessoal. Tentando novamente com prompt ainda mais explícito.');
        promptIA += '\n\nATENÇÃO: NÃO FALE SOBRE USO PESSOAL DO APP, NÃO FALE PARA MÃES. FOQUE APENAS EM VENDER O SAAS, LUCRO, ESCALABILIDADE, ETC.';
        roteiroIAString = await generateScript(promptIA, apiKey);
        log('🟢 RESPOSTA BRUTA DA IA (tentativa 2): ' + roteiroIAString);
        if (/baixe o app|registre memórias|mãe|bebê/i.test(roteiroIAString)) {
          log('❌ Ainda gerou roteiro errado para público de negócio. Alerta: revise o prompt ou edite manualmente.');
          // Aqui pode-se lançar um erro, alertar o usuário ou permitir edição manual no frontend
        }
      }
      
      // Parse do JSON com correção automática mais robusta
      let roteiroIA: any;
      try {
        roteiroIA = JSON.parse(roteiroIAString);
        // NOVO: Se for array direto, transformar em objeto com cenas
        if (Array.isArray(roteiroIA)) {
          // Se for array de objetos com chave 'cenas', juntar todas as cenas
          if (roteiroIA.length > 0 && roteiroIA.every(item => typeof item === 'object' && item.cenas && Array.isArray(item.cenas))) {
            const cenasUnificadas = roteiroIA.flatMap(item => item.cenas);
            roteiroIA = { cenas: cenasUnificadas };
            log('✅ JSON reconhecido como array de objetos com cenas, unificado para objeto com todas as cenas.');
          } else {
            roteiroIA = { cenas: roteiroIA };
            log('✅ JSON reconhecido como array direto, convertido para objeto com cenas.');
          }
        }
        // NOVO: Se não tiver roteiro contínuo, criar a partir das cenas (fallback)
        if (!roteiroIA.roteiro && roteiroIA.cenas) {
          roteiroIA.roteiro = roteiroIA.cenas.map(cena => cena.trecho || cena.narracao || '').join(' ');
          log('✅ Roteiro contínuo criado a partir das cenas (fallback).');
        }
        log(`✅ JSON parseado com sucesso na primeira tentativa`);
      } catch (e) {
        log(`⚠️ Erro no JSON original: ${e.message}`);
        log(`🔧 Tentando corrigir JSON...`);
        log(`📋 Resposta bruta da IA: ${roteiroIAString.substring(0, 200)}...`);
        // NOVO: tentar corrigir JSON malformado
        try {
          const jsonCorrigido = corrigirJsonMalformado(roteiroIAString);
          log('🛠️ JSON corrigido automaticamente:\n' + jsonCorrigido.substring(0, 400));
          roteiroIA = JSON.parse(jsonCorrigido);
          log('✅ JSON corrigido parseado com sucesso!');
        } catch (e2) {
          log(`❌ Falha ao corrigir JSON: ${e2.message}`);
          // Fallback: tenta extrair cenas individualmente (como já faz)
          // ...restante do código de fallback...
        }
      }
      
      if (!roteiroIA || !Array.isArray(roteiroIA.cenas)) {
        log(`❌ Roteiro inválido após todas as tentativas. RoteiroIA: ${JSON.stringify(roteiroIA)}`);
        throw new Error('Falha ao gerar roteiro: resposta inválida da IA.');
      }

      // Após o parse do roteiroIA, garantir que todas as cenas tenham 3 descrições visuais
      let tentativasRoteiro = 0;
      while (tentativasRoteiro < 3) {
        let precisaReenviar = false;
        for (let i = 0; i < roteiroIA.cenas.length; i++) {
          let visual = roteiroIA.cenas[i].visual;
          let visuais = Array.isArray(visual) ? visual : [visual];
          if (visuais.length < 3) {
            precisaReenviar = true;
            break;
          }
        }
        if (!precisaReenviar) break;
        // Se precisar reenviar, pede novamente para a IA
        tentativasRoteiro++;
        log(`⚠️ Roteiro IA veio com menos de 3 descrições visuais em alguma cena. Tentando novamente (${tentativasRoteiro}/3)...`);
        roteiroIAString = await generateScript(promptIA, apiKey);
        try {
          roteiroIA = JSON.parse(roteiroIAString);
        } catch (e) {
          log('❌ Erro ao parsear novo roteiro IA, usando fallback.');
          roteiroIA = { cenas: [] };
        }
      }
      // Se mesmo assim não vier, completa localmente
      for (let i = 0; i < roteiroIA.cenas.length; i++) {
        let visual = roteiroIA.cenas[i].visual;
        let visuais = Array.isArray(visual) ? visual : [visual];
        while (visuais.length < 3) {
          visuais.push(visuais[visuais.length - 1] || `Imagem extra da cena ${i + 1}`);
        }
        roteiroIA.cenas[i].visual = visuais;
      }

      // --- INÍCIO DO FLUXO DE FALLBACK INTELIGENTE PARA DESCRIÇÕES VISUAIS ---
      for (let i = 0; i < roteiroIA.cenas.length; i++) {
        let visual = roteiroIA.cenas[i].visual;
        // Garante que visual é array
        let visuais = Array.isArray(visual) ? visual : [visual];
        
        // Se não tem 3 descrições, completar automaticamente
        if (visuais.length < 3) {
          log(`⚠️ Cena ${i + 1} veio com apenas ${visuais.length} descrições visuais. Completando automaticamente...`);
          
          // Fallback local: completar automaticamente com descrições contextuais
          while (visuais.length < 3) {
            const contexto = `${payload.tema}, ${payload.tipo}, ${payload.publico}`;
            const variacoes = [
              `Imagem relacionada ao tema: ${contexto}`,
              `Variação da cena: ${contexto} (ângulo diferente)`,
              `Elemento visual complementar: ${contexto}`
            ];
            visuais.push(variacoes[visuais.length] || `Imagem extra: ${contexto} (variação ${visuais.length + 1})`);
          }
          roteiroIA.cenas[i].visual = visuais;
          log(`✅ Cena ${i + 1} completada com ${visuais.length} descrições visuais.`);
        }
        
        // Garantir que não há descrições vazias
        visuais = visuais.map((desc, idx) => {
          if (!desc || desc.trim() === '') {
            const contexto = `${payload.tema}, ${payload.tipo}, ${payload.publico}`;
            return `Imagem ${idx + 1} da cena ${i + 1}: ${contexto}`;
          }
          return desc;
        });
        
        roteiroIA.cenas[i].visual = visuais;
      }
      // --- FIM DO FLUXO DE FALLBACK INTELIGENTE ---

      log(`✅ Roteiro IA válido com ${roteiroIA.cenas.length} cenas`);
    }

    // 2. Gerar título do vídeo (se não fornecido)
    let tituloFinal = payload.titulo;
    if (!tituloFinal || tituloFinal.trim() === '') {
      log('📝 Gerando título automático para o vídeo...');
      try {
        const { generateVideoTitle } = require('../text/gemini-groq');
        tituloFinal = await generateVideoTitle(payload.tema, payload.tipo, payload.publico, apiKey);
        log(`✅ Título gerado: "${tituloFinal}"`);
      } catch (e) {
        log(`⚠️ Erro ao gerar título: ${e.message}`);
        tituloFinal = `Vídeo sobre ${payload.tema}`;
      }
    } else {
      log(`✅ Usando título fornecido: "${tituloFinal}"`);
    }

    // 3. Gerar legenda de redes sociais (se solicitado)
    let legendaRedesSociais = '';
    if (payload.gerarLegenda) {
      log(`📱 Gerando legenda para ${payload.plataformaLegenda || 'Instagram'}...`);
      try {
        const { generateSocialMediaCaptionPersonalizada } = require('../text/gemini-groq');
        legendaRedesSociais = await generateSocialMediaCaptionPersonalizada({
          tema: payload.tema,
          tipo: tipo,
          publico: publico,
          cta: ctaFinal,
          plataforma: payload.plataformaLegenda || 'instagram',
          apiKey
        });
        log(`✅ Legenda gerada: "${legendaRedesSociais.substring(0, 100)}..."`);
      } catch (e) {
        log(`⚠️ Erro ao gerar legenda: ${e.message}`);
        legendaRedesSociais = `Confira este vídeo incrível sobre ${payload.tema}! #${payload.tema.replace(/\s+/g, '')} #babyvideoia`;
      }
    }

    // 4. Gerar imagens para todas as cenas (OTIMIZADO)
    const imageGenerationId = performanceMonitor.start('imageGeneration');
    const startTime = Date.now();
    log('🎨 Iniciando geração de imagens (OTIMIZADO)...');
    
    const imagensPorCena: string[][] = [];
    const imagensComDescricao = Array.isArray(payload.imagensComDescricao) ? payload.imagensComDescricao : [];
    const useSD = payload.useStableDiffusion || process.env.USE_STABLE_DIFFUSION === 'true' || process.env.COLAB_URL;
    
    const config = getConfig();
    const useParallel = isOptimizationEnabled('enableParallelProcessing');
    
    // Verificar status do Freepik antes de começar
    const freepikStats = getFreepikStats();
    log(`📊 Status Freepik: ${JSON.stringify(freepikStats)}`);
    
    if (!useSD) {
      if (useParallel && roteiroIA.cenas.length > 1) {
        // Processamento paralelo de cenas com controle de concorrência
        log(`🚀 Processamento PARALELO: ${roteiroIA.cenas.length} cenas`);
        
        // Limitar concorrência para não sobrecarregar APIs
        const maxConcurrent = Math.min(config.maxConcurrentScenes, roteiroIA.cenas.length);
        log(`⚙️ Concorrência máxima: ${maxConcurrent} cenas simultâneas`);
        
        // Processar cenas em lotes para controlar concorrência
        const processSceneBatch = async (sceneBatch: any[], batchIndex: number) => {
          log(`📦 Processando lote ${batchIndex + 1} com ${sceneBatch.length} cenas...`);
          
          const batchPromises = sceneBatch.map(async (cena, i) => {
            const sceneIndex = batchIndex * maxConcurrent + i;
            log(`🎨 Iniciando cena ${sceneIndex + 1}/${roteiroIA.cenas.length}...`);
            
            try {
              let imagensCena: string[] = [];
              const visuais = Array.isArray(cena.visual) ? cena.visual : [cena.visual];
              
              // Processar imagens da cena em paralelo com cache
              const imagePromises = visuais.map(async (visual, imgIndex) => {
                // Verificar cache primeiro
                if (isOptimizationEnabled('enableImageCache')) {
                  const cachedImage = imageCache.get(visual, { cena: sceneIndex + 1, imagem: imgIndex + 1 });
                  if (cachedImage) {
                    log(`🎯 Cache hit para imagem ${imgIndex + 1} da cena ${sceneIndex + 1}`);
                    return cachedImage;
                  }
                }
                
                // Gerar nova imagem
                const imagePath = await gerarImagemComFallbackMelhorado(visual, payload, sceneIndex + 1, imgIndex + 1);
                
                // Adicionar ao cache
                if (isOptimizationEnabled('enableImageCache') && imagePath) {
                  imageCache.set(visual, imagePath, { cena: sceneIndex + 1, imagem: imgIndex + 1 });
                }
                
                return imagePath;
              });
              
              imagensCena = await Promise.all(imagePromises);
              
              // Adicionar imagens do usuário se disponíveis
              if (imagensComDescricao.length > 0 && imagensCena.length >= 2) {
                const idxUserImg = sceneIndex % imagensComDescricao.length;
                let imgUrl = imagensComDescricao[idxUserImg].url;
                if (imgUrl.startsWith('http')) {
                  const ext = path.extname(imgUrl).split('?')[0] || '.png';
                  const localPath = fileManager.createTempFile(ext, `user_img_${sceneIndex + 1}`);
                  await baixarImagemParaLocal(imgUrl, localPath);
                  imagensCena[1] = localPath; // Substituir segunda imagem
                } else {
                  imagensCena[1] = imgUrl;
                }
              }
              
              return { index: sceneIndex, imagens: imagensCena };
            } catch (error) {
              log(`❌ Erro na cena ${sceneIndex + 1}: ${error}`);
              // Retornar placeholders em caso de erro
              const placeholders = Array(3).fill(null).map((_, j) => {
                const placeholderPath = fileManager.createTempFile('.png', `placeholder_error_${sceneIndex + 1}_${j + 1}`);
                criarPlaceholderValido(placeholderPath);
                return placeholderPath;
              });
              return { index: sceneIndex, imagens: placeholders };
            }
          });
          
          const batchResults = await Promise.all(batchPromises);
          
          // Pequeno delay entre lotes para não sobrecarregar APIs
          if (batchIndex < Math.ceil(roteiroIA.cenas.length / maxConcurrent) - 1) {
            log(`⏳ Aguardando 2 segundos entre lotes...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
          
          return batchResults;
        };
        
        // Dividir cenas em lotes
        const sceneBatches = [];
        for (let i = 0; i < roteiroIA.cenas.length; i += maxConcurrent) {
          sceneBatches.push(roteiroIA.cenas.slice(i, i + maxConcurrent));
        }
        
        // Processar lotes sequencialmente
        const allResults = [];
        for (let i = 0; i < sceneBatches.length; i++) {
          const batchResults = await processSceneBatch(sceneBatches[i], i);
          allResults.push(...batchResults);
        }
        
        // Ordenar resultados por índice
        allResults.sort((a, b) => a.index - b.index);
        imagensPorCena.push(...allResults.map(r => r.imagens));
        
        log(`✅ Processamento paralelo concluído: ${allResults.length} cenas processadas`);
      } else {
        // Processamento sequencial otimizado
        log(`🐌 Processamento SEQUENCIAL: ${roteiroIA.cenas.length} cenas`);
        for (let i = 0; i < roteiroIA.cenas.length; i++) {
          let imagensCena: string[] = [];
          const cena = roteiroIA.cenas[i];
          const visuais = Array.isArray(cena.visual) ? cena.visual : [cena.visual];
          
          // Processar imagens da cena em paralelo
          const imagePromises = visuais.map(async (visual, imgIndex) => {
            // Verificar cache primeiro
            if (isOptimizationEnabled('enableImageCache')) {
              const cachedImage = imageCache.get(visual, { cena: i + 1, imagem: imgIndex + 1 });
              if (cachedImage) {
                log(`🎯 Cache hit para imagem ${imgIndex + 1} da cena ${i + 1}`);
                return cachedImage;
              }
            }
            
            // Gerar nova imagem
            const imagePath = await gerarImagemComFallbackMelhorado(visual, payload, i + 1, imgIndex + 1);
            
            // Adicionar ao cache
            if (isOptimizationEnabled('enableImageCache') && imagePath) {
              imageCache.set(visual, imagePath, { cena: i + 1, imagem: imgIndex + 1 });
            }
            
            return imagePath;
          });
          
          imagensCena = await Promise.all(imagePromises);
          
          // Adicionar imagens do usuário se disponíveis
          if (imagensComDescricao.length > 0 && imagensCena.length >= 2) {
            const idxUserImg = i % imagensComDescricao.length;
            let imgUrl = imagensComDescricao[idxUserImg].url;
            if (imgUrl.startsWith('http')) {
              const ext = path.extname(imgUrl).split('?')[0] || '.png';
              const localPath = fileManager.createTempFile(ext, `user_img_${i + 1}`);
              await baixarImagemParaLocal(imgUrl, localPath);
              imagensCena[1] = localPath; // Substituir segunda imagem
            } else {
              imagensCena[1] = imgUrl;
            }
          }
          
          imagensPorCena.push(imagensCena);
          
          // Pequeno delay para não sobrecarregar a Freepik (mesmo sem limites)
          if (i < roteiroIA.cenas.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1200)); // 1,2 segundos
          }
        }
      }
      log('✅ Todas as imagens foram geradas com sucesso!');
      
      performanceMonitor.end(imageGenerationId, true);
      logPerf('Geração de imagens', startTime);
    } else {
      // Stable Diffusion: manter sequencial e delays
      for (let i = 0; i < roteiroIA.cenas.length; i++) {
        const cena = roteiroIA.cenas[i];
        log(`🎬 Processando cena ${i + 1}/${roteiroIA.cenas.length}...`);
        let imagensCena: string[] = [];
        const visuais = Array.isArray(cena.visual) ? cena.visual : [cena.visual];
        // 1ª imagem: gerada pela IA
        const img1 = await gerarImagemComFallbackMelhorado(visuais[0], payload, i + 1, 1);
        imagensCena.push(img1);
        // 2ª imagem: enviada pelo usuário (se houver)
        if (imagensComDescricao.length > 0) {
          const idxUserImg = i % imagensComDescricao.length;
          let imgUrl = imagensComDescricao[idxUserImg].url;
          if (imgUrl.startsWith('http')) {
            const ext = path.extname(imgUrl).split('?')[0] || '.png';
            const localPath = `output/generated_images/user_img_${i + 1}${ext}`;
            await baixarImagemParaLocal(imgUrl, localPath);
            imagensCena.push(localPath);
          } else {
            imagensCena.push(imgUrl);
          }
        } else {
          // Se não houver imagem do usuário, gerar pela IA
          const img2 = await gerarImagemComFallbackMelhorado(visuais[1], payload, i + 1, 2);
          imagensCena.push(img2);
        }
        // 3ª imagem: gerada pela IA
        const img3 = await gerarImagemComFallbackMelhorado(visuais[2], payload, i + 1, 3);
        imagensCena.push(img3);
        imagensPorCena.push(imagensCena);
        if (i < roteiroIA.cenas.length - 1) {
          log(`⏳ Aguardando 3 segundos antes da próxima cena...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      log('✅ Todas as imagens SD foram geradas de forma sequencial!');
    }

    // 5. Gerar narração ElevenLabs
    const ttsId = performanceMonitor.start('textToSpeech');
    log('🎤 Gerando narração ElevenLabs...');
    // Usar texto limpo sem SSML para narração natural
    const narracaoCompleta = roteiroIA.roteiro;
    const audioPath = `output/narracao_${Date.now()}.mp3`;
    arquivosTemporarios.push(audioPath);
    
    try {
      await gerarNarracaoElevenLabs(narracaoCompleta, audioPath);
      log(`✅ Narração ElevenLabs gerada: ${audioPath}`);
    } catch (e) {
      log(`❌ ElevenLabs falhou: ${e.message}`);
      log(`🔄 Tentando TTS gratuito como fallback...`);
      
      try {
        const { gerarNarracaoTTSGratuito } = require('../tts/elevenlabs');
        await gerarNarracaoTTSGratuito(narracaoCompleta, audioPath);
        log(`✅ Narração TTS gratuito gerada: ${audioPath}`);
      } catch (e2) {
        log(`❌ TTS gratuito também falhou: ${e2.message}`);
        log(`⚠️ Criando áudio silencioso como último recurso...`);
        
        // Criar um arquivo de áudio silencioso
        const { exec } = require('child_process');
        await new Promise((resolve, reject) => {
          exec(`ffmpeg -y -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -t 30 "${audioPath}"`, (error) => {
            if (error) {
              log(`❌ Erro ao criar áudio silencioso: ${error.message}`);
              reject(error);
            } else {
              log(`✅ Áudio silencioso criado: ${audioPath}`);
              resolve(null);
            }
          });
        });
      }
    }

    performanceMonitor.end(ttsId, true);

    // 6. Sincronizar áudio e imagens
    const duracaoAudio = await verificarDuracaoAudio(audioPath);
    const tempoPorCena = duracaoAudio / roteiroIA.cenas.length;
    
    log('🔗 Preparando sincronização...');
    const sincronizacao: Array<{
      imagens: string[];
      tempoPorImagem: number;
      inicio: number;
      fim: number;
    }> = [];
    
    let tempoAtual = 0;
    for (let i = 0; i < roteiroIA.cenas.length; i++) {
      const imagens = imagensPorCena[i];
      const tempoPorImagem = tempoPorCena / imagens.length;
      sincronizacao.push({
        imagens,
        tempoPorImagem,
        inicio: tempoAtual,
        fim: tempoAtual + tempoPorCena
      });
      tempoAtual += tempoPorCena;
    }

    // 7. Montagem do vídeo final
    log('🎬 Montando vídeo final...');
    const videoParts: string[] = [];
    let partIndex = 1;
    
    for (const sync of sincronizacao) {
      for (let i = 0; i < sync.imagens.length; i++) {
        let img = sync.imagens[i];

        // NOVO: Se for URL remota, baixar para local
        if (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://'))) {
          const ext = path.extname(img).split('?')[0] || '.png';
          const localPath = path.join(imagesOutputDir, `remote_img_${partIndex}${ext}`);
          try {
            await baixarImagemParaLocal(img, localPath);
            arquivosTemporarios.push(localPath);
            img = localPath;
            log(`🌐 Imagem remota baixada para uso local: ${img}`);
          } catch (e) {
            log(`❌ Falha ao baixar imagem remota (${img}): ${e}`);
            // Se falhar, cria um placeholder para não quebrar o pipeline
            criarPlaceholderValido(localPath);
            arquivosTemporarios.push(localPath);
            img = localPath;
          }
        }

        // Verificar se a imagem existe
        if (!fs.existsSync(img)) {
          log(`⚠️ Imagem não encontrada: ${img}, criando placeholder...`);
          criarPlaceholderValido(img);
        }
        
        const partPath = path.join(outputDir, `part_${partIndex}.mp4`);
        
        try {
          createKenBurnsAnimation(img, partPath, sync.tempoPorImagem, 'vertical');
          
          // Verificar se o arquivo foi criado com sucesso
          if (fs.existsSync(partPath) && fs.statSync(partPath).size > 0) {
            videoParts.push(partPath);
            arquivosTemporarios.push(partPath);
            log(`✅ Parte ${partIndex} criada: ${partPath}`);
          } else {
            log(`❌ Falha ao criar parte ${partIndex}, tentando novamente...`);
            // Tentar novamente com placeholder
            const placeholderPath = `output/generated_images/placeholder_fallback_${partIndex}.png`;
            criarPlaceholderValido(placeholderPath, 720, 1280);
            createKenBurnsAnimation(placeholderPath, partPath, sync.tempoPorImagem, 'vertical');
            videoParts.push(partPath);
            arquivosTemporarios.push(partPath);
            log(`✅ Parte ${partIndex} criada com placeholder: ${partPath}`);
          }
        } catch (e) {
          log(`❌ Erro ao criar parte ${partIndex}: ${e}`);
          // Criar parte simples com placeholder
          const placeholderPath = `output/generated_images/placeholder_error_${partIndex}.png`;
          criarPlaceholderValido(placeholderPath, 720, 1280);
          createKenBurnsAnimation(placeholderPath, partPath, sync.tempoPorImagem, 'vertical');
          videoParts.push(partPath);
          arquivosTemporarios.push(partPath);
          log(`✅ Parte ${partIndex} criada com placeholder de erro: ${partPath}`);
        }
        
        partIndex++;
      }
    }
    
    // Verificar se temos partes válidas
    if (videoParts.length === 0) {
      throw new Error('Nenhuma parte de vídeo foi criada com sucesso');
    }
    
    log(`✅ ${videoParts.length} partes de vídeo criadas com sucesso`);
    
    // Concatenar vídeo
    const concatListPath = path.join(outputDir, 'concat_list.txt');
    const concatContent = videoParts.map(p => `file '${path.resolve(p)}'`).join('\n');
    fs.writeFileSync(concatListPath, concatContent);
    arquivosTemporarios.push(concatListPath);
    
    const videoSemAudio = path.join(outputDir, `video_sem_audio_${Date.now()}.mp4`);
    
    try {
      concatenateVideos(concatListPath, videoSemAudio, 'vertical');
      
      // Verificar se o vídeo foi criado
      if (!fs.existsSync(videoSemAudio) || fs.statSync(videoSemAudio).size === 0) {
        throw new Error('Vídeo sem áudio não foi criado corretamente');
      }
      
      arquivosTemporarios.push(videoSemAudio);
      log(`✅ Vídeo sem áudio criado: ${videoSemAudio}`);
    } catch (e) {
      log(`❌ Erro ao concatenar vídeos: ${e}`);
      throw new Error(`Falha na montagem do vídeo: ${e}`);
    }
    
    // Adicionar áudio
    const videoFinal = path.join(outputDir, `video_final_${Date.now()}.mp4`);
    
    try {
      addAudioToVideo(videoSemAudio, audioPath, videoFinal, false);
      
      // Verificar se o vídeo final foi criado
      if (!fs.existsSync(videoFinal) || fs.statSync(videoFinal).size === 0) {
        throw new Error('Vídeo final não foi criado corretamente');
      }
      
      log(`✅ Vídeo final criado: ${videoFinal}`);
    } catch (e) {
      log(`❌ Erro ao adicionar áudio: ${e}`);
      throw new Error(`Falha ao adicionar áudio ao vídeo: ${e}`);
    }

    // Adicionar música de fundo (se especificada)
    let videoComMusica = videoFinal;
    if (payload.musica) {
      log('🎵 Adicionando música de fundo...');
      log(`🎵 Música recebida do frontend: ${payload.musica}`);
      
      try {
        const { addBackgroundMusic } = require('../video/ffmpeg');
        log(`✅ Função addBackgroundMusic importada: ${typeof addBackgroundMusic}`);
        
        const videoComMusicaPath = path.join(outputDir, `video_com_musica_${Date.now()}.mp4`);
        
        // Converter URL da música para caminho do arquivo
        let musicPath = payload.musica;
        log(`🎵 URL original: ${musicPath}`);
        
        if (musicPath && musicPath.includes('/api/music/file/')) {
          const idx = musicPath.indexOf('/api/music/file/');
          musicPath = musicPath.substring(idx);
          log(`🎵 URL após substring: ${musicPath}`);
        }
        
        if (musicPath && musicPath.startsWith('/api/music/file/')) {      // Converter URL da API para caminho do arquivo
          const urlParts = musicPath.replace('/api/music/file/', '').split('/');
          log(`🎵 URL parts: ${JSON.stringify(urlParts)}`);
          if (urlParts.length === 2) {
            const category = urlParts[0];
            const filename = decodeURIComponent(urlParts[1]);
            // Usar caminho correto do projeto
            musicPath = path.join(process.cwd(), 'assets', 'music', category, filename);
            log(`🎵 Convertendo URL para caminho: ${musicPath}`);
          }
        }
        
        // Verificar se o arquivo de música existe
        if (!fs.existsSync(musicPath)) {
          log(`⚠️ Arquivo de música não encontrado: ${musicPath}`);
          log(`🔄 Tentando buscar na pasta assets/music...`);
          
          // Tentar encontrar na pasta assets/music (busca manual nas subpastas)
          const musicDir = path.join(process.cwd(), 'assets', 'music');
          const musicFiles: string[] = [];
          
          // Buscar em todas as subpastas manualmente
          const categories = ['ambient', 'energetic', 'emotional', 'corporate', 'cinematografica'];
          for (const category of categories) {
            const categoryPath = path.join(musicDir, category);
            if (fs.existsSync(categoryPath)) {
              try {
                const files = fs.readdirSync(categoryPath);
                for (const file of files) {
                  if (file.endsWith('.mp3') || file.endsWith('.wav')) {
                    musicFiles.push(path.join(categoryPath, file));
                  }
                }
              } catch (e) {
                log(`⚠️ Erro ao ler pasta ${category}: ${e}`);
              }
            }
          }
          
          if (musicFiles.length > 0) {
            const randomMusic = musicFiles[Math.floor(Math.random() * musicFiles.length)];
            log(`🎵 Usando música aleatória: ${randomMusic}`);
            musicPath = randomMusic;
          } else {
            log(`⚠️ Nenhuma música encontrada na biblioteca, mantendo vídeo sem música`);
            // Continuar sem música
          }
        }
        
        // Se temos um caminho válido de música, adicionar ao vídeo
        if (musicPath && fs.existsSync(musicPath)) {
          log(`✅ Arquivo de música encontrado e válido: ${musicPath}`);
          log(`✅ Tamanho do arquivo: ${fs.statSync(musicPath).size} bytes`);
          
          // Usar configurações do frontend ou valores padrão
          const musicConfig = {
            volume: payload.configuracoes?.volumeMusica || 0.2,
            loop: payload.configuracoes?.loopMusica !== false,
            fadeIn: payload.configuracoes?.fadeInMusica || 2,
            fadeOut: payload.configuracoes?.fadeOutMusica || 2
          };
          
          log(`🎵 Configurações de música: volume=${musicConfig.volume}, loop=${musicConfig.loop}, fadeIn=${musicConfig.fadeIn}, fadeOut=${musicConfig.fadeOut}`);
          log(`🎵 Vídeo de entrada: ${videoFinal}`);
          log(`🎵 Vídeo de saída: ${videoComMusicaPath}`);
          
          try {
            addBackgroundMusic(
              videoFinal,
              musicPath,
              videoComMusicaPath,
              musicConfig
            );
            
            // Verificar se o arquivo foi criado com sucesso
            if (fs.existsSync(videoComMusicaPath) && fs.statSync(videoComMusicaPath).size > 0) {
              log(`✅ Música de fundo adicionada com sucesso: ${videoComMusicaPath}`);
              log(`✅ Tamanho do vídeo com música: ${fs.statSync(videoComMusicaPath).size} bytes`);
              videoComMusica = videoComMusicaPath;
              arquivosTemporarios.push(videoComMusicaPath);
            } else {
              log(`❌ Vídeo com música não foi criado corretamente`);
              throw new Error('Vídeo com música não foi criado');
            }
          } catch (musicError) {
            log(`❌ Erro ao adicionar música: ${musicError}`);
            throw musicError;
          }
        } else {
          log(`❌ Música não encontrada ou arquivo inválido: ${musicPath}`);
          log(`❌ Arquivo existe: ${fs.existsSync(musicPath || '')}`);
          if (musicPath && fs.existsSync(musicPath)) {
            log(`❌ Tamanho do arquivo: ${fs.statSync(musicPath).size} bytes`);
          }
        }
      } catch (e) {
        log(`❌ Erro ao adicionar música de fundo: ${e}`);
        log(`⚠️ Mantendo vídeo sem música de fundo`);
      }
    }

    // 8. Gerar legendas
    log('📝 Gerando legendas...');
    // Limpar texto de SSML para legendas
    const textoLimpoParaLegendas = roteiroIA.roteiro;
    const subtitlesPath = path.join(outputDir, `legenda_video_final.srt`);
    
    try {
      const subtitles = await generateProgressiveSubtitlesWithAudio(textoLimpoParaLegendas, audioPath, 'word');
      fs.writeFileSync(subtitlesPath, subtitles.join('\n'));
    } catch (err) {
      log(`❌ Erro ao gerar legendas: ${err}`);
      fs.writeFileSync(subtitlesPath, textoLimpoParaLegendas);
    }

    // 9. Adicionar legendas ao vídeo
    const videoFinalLegendado = path.join(outputDir, `video_final_legendado_${Date.now()}.mp4`);
    await addSubtitlesToVideo(videoComMusica, subtitlesPath, videoFinalLegendado);
    arquivosTemporarios.push(videoFinal);

    log(`✅ Vídeo final legendado salvo em: ${videoFinalLegendado}`);

    // 9.5 Adicionar CTA visual ao vídeo
    log('📢 Adicionando Call-to-Action visual...');
    const { applyVideoStyle } = require('../video/ffmpeg');
    const videoComCTA = path.join(outputDir, `video_com_cta_${Date.now()}.mp4`);
    
    try {
      // Usar o CTA enviado pelo frontend (payload.cta), se existir
      const ctaText = payload.cta || '';
      if (ctaText && ctaText.trim().length > 0) {
        await applyVideoStyle(videoFinalLegendado, videoComCTA, {
          callToActionText: ctaText,
          resolution: payload.formato || 'portrait'
        });
        arquivosTemporarios.push(videoComCTA);
        log(`✅ CTA visual adicionado: ${ctaText}`);
      } else {
        // Se não houver CTA, apenas copia o vídeo legendado
        fs.copyFileSync(videoFinalLegendado, videoComCTA);
        log('ℹ️ Nenhum CTA visual adicionado (campo vazio).');
      }
    } catch (e) {
      log(`❌ Erro ao adicionar CTA visual: ${e}`);
      log(`⚠️ Mantendo vídeo sem CTA visual`);
      // Usar vídeo sem CTA se falhar
      fs.copyFileSync(videoFinalLegendado, videoComCTA);
    }

    // 10. Gerar thumbnail
    log('🖼️ Gerando thumbnail...');
    const thumbnailPath = await generateThumbnail(videoComCTA);

    // 11. Upload para Cloudinary
    log('☁️ Fazendo upload para Cloudinary...');
    const cloudinaryVideoUrl = await uploadToCloudinary(videoFinalLegendado, 'videos');
    const cloudinaryThumbnailUrl = await uploadToCloudinary(thumbnailPath, 'thumbnails');

    // 12. Salvar nos metadados
    log('💾 Salvando metadados...');
    const videoId = videoMetadataManager.addVideo({
      tema: payload.tema,
      tipo: payload.tipo,
      publico: payload.publico,
      formato: payload.formato || 'portrait', // Usar o formato do payload ou padrão
      titulo: tituloFinal, // Usar o título final
      hashtags: `#${payload.tema.replace(/\s+/g, '')} #babyvideoia #${payload.tipo}`,
      videoPath: videoFinalLegendado,
      thumbnailPath: thumbnailPath,
      cloudinaryVideoUrl: cloudinaryVideoUrl,
      cloudinaryThumbnailUrl: cloudinaryThumbnailUrl,
      duracao: duracaoAudio,
      tamanho: fs.existsSync(videoFinalLegendado) ? fs.statSync(videoFinalLegendado).size : 0,
      caption: legendaRedesSociais || `Vídeo gerado automaticamente sobre ${payload.tema}`,
      cta: ctaFinal,
    });

    log(`✅ Vídeo salvo com ID: ${videoId}`);

    // 13. Limpar arquivos temporários
    const cleanupId = performanceMonitor.start('cleanup');
    limparArquivosTemporarios(arquivosTemporarios);
    performanceMonitor.end(cleanupId, true);

    // Gerar relatório final de performance
    const report = performanceMonitor.generateReport();
    log(`📊 Relatório de Performance:\n${report}`);

    performanceMonitor.end(pipelineId, true);
    
    return {
      videoPath: videoFinalLegendado,
      thumbnailPath: thumbnailPath,
      legendasPath: subtitlesPath,
      metadados: {
        id: videoId,
        audioPath,
        sincronizacao,
        roteiro: roteiroIA,
        videoParts,
        cloudinaryVideoUrl,
        cloudinaryThumbnailUrl,
        titulo: tituloFinal,
        legendaRedesSociais: legendaRedesSociais,
        plataformaLegenda: payload.plataformaLegenda,
        performanceReport: report
      }
    };
    
  } catch (error) {
    log(`❌ Erro no pipeline VSL: ${error}`);
    console.error('[VSL] Erro detalhado:', error);
    
    // Limpar arquivos temporários mesmo em caso de erro
    const cleanupId = performanceMonitor.start('cleanup');
    limparArquivosTemporarios(arquivosTemporarios);
    performanceMonitor.end(cleanupId, true);
    
    performanceMonitor.end(pipelineId, false, error.message);
    
    throw error;
  }
}

// Funções auxiliares mantidas para compatibilidade
async function processarImagensCena(
  cenaPayload: CenaPayload,
  cenaRoteiro: { narracao: string; visual: string; imagens?: string[] },
  contextoVideo: GenerateVideoPayload,
  numeroCena: number,
  arquivosTemporarios?: string[]
): Promise<string[]> {
  return processarImagensCenaSequencial(cenaRoteiro, contextoVideo, numeroCena, arquivosTemporarios);
}

async function gerarDescricaoVisualIA(payload: any, i: number) { 
  return 'Descrição visual gerada pela IA'; 
}

async function gerarPromptImagemIA(payload: any, descricaoVisual: string, numImagem: number, i: number, tom: string) { 
  return 'Prompt de imagem gerado pela IA'; 
}

async function gerarImagemComFallback(prompt: string, payload: any, i: number, numImagem: number) { 
  return gerarImagemComFallbackMelhorado(prompt, payload as GenerateVideoPayload, i + 1, numImagem);
}

async function gerarNarracaoCenaIA(payload: any, descricaoVisual: string, tom: string, i: number) { 
  return 'Narração SSML gerada pela IA'; 
}

interface CenaComImagens {
  narracao: string;
  visual: string;
  imagens: string[];
}

// Função utilitária para baixar imagem de URL para arquivo local
async function baixarImagemParaLocal(url: string, outputPath: string): Promise<string> {
  const writer = fs.createWriteStream(outputPath);
  const response = await axios.get(url, { responseType: 'stream' });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', () => resolve(outputPath));
    writer.on('error', reject);
  });
}

// Função utilitária para CTA do Baby Diary
function gerarCTABabyDiary(publico: string): string {
  if (publico.toLowerCase().includes('mãe') || publico.toLowerCase().includes('gestante')) {
    return '\n\nBaixe agora o app Baby Diary e registre cada momento especial do seu bebê! Praticidade, segurança e memórias para toda a família.';
  }
  if (publico.toLowerCase().includes('afiliado') || publico.toLowerCase().includes('empreendedor') || publico.toLowerCase().includes('agência') || publico.toLowerCase().includes('consultor') || publico.toLowerCase().includes('revendedor') || publico.toLowerCase().includes('startup')) {
    return '\n\nDescubra como lucrar com o Baby Diary White Label! Tenha seu próprio app, comissionamento recorrente e tecnologia pronta para escalar.';
  }
  return '\n\nConheça o Baby Diary: o app que transforma memórias em histórias inesquecíveis. Baixe agora!';
}

// Função utilitária para corrigir JSON malformado vindo da IA
function corrigirJsonMalformado(jsonString: string): string {
  // Remove espaços e quebras de linha no início/fim
  jsonString = jsonString.trim();

  // Remove qualquer texto antes do primeiro {
  const firstBrace = jsonString.indexOf('{');
  if (firstBrace > 0) jsonString = jsonString.slice(firstBrace);

  // Remove qualquer texto depois do último }
  const lastBrace = jsonString.lastIndexOf('}');
  if (lastBrace > 0) jsonString = jsonString.slice(0, lastBrace + 1);

  // Se termina com "..." e não fecha com }, adiciona }
  if (!jsonString.trim().endsWith('}')) {
    jsonString = jsonString.trim() + '}';
  }

  // Remove vírgula extra antes de fechar
  jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');

  return jsonString;
}

async function processarImagensCenaParalelo(
  cenaRoteiro: { trecho?: string; narracao?: string; visual: string | string[] },
  payload: GenerateVideoPayload,
  numeroCena: number,
  arquivosTemporarios?: string[]
): Promise<string[]> {
  // Garantir que visual é um array de 3 descrições
  const promptsVisuais = Array.isArray(cenaRoteiro.visual) ? cenaRoteiro.visual : [cenaRoteiro.visual];
  if (promptsVisuais.length !== 3) {
    throw new Error(`A cena ${numeroCena} não possui exatamente 3 descrições visuais no roteiro IA. Foram encontradas: ${promptsVisuais.length}. Corrija o template do roteiro ou a IA.`);
  }
  
  log(`🚀 Iniciando geração PARALELA de 3 imagens para cena ${numeroCena}...`);
  
  // Criar array de promises para processamento paralelo
  const promises = promptsVisuais.map(async (prompt, index) => {
    log(`📸 Iniciando geração da imagem ${index + 1}/3 para cena ${numeroCena}`);
    try {
      const imagem = await gerarImagemComFallbackMelhorado(prompt, payload, numeroCena, index + 1);
      
      // Adicionar imagem ao array de arquivos temporários se fornecido
      if (arquivosTemporarios && imagem) {
        arquivosTemporarios.push(imagem);
        log(`📝 Imagem ${index + 1} adicionada à lista de limpeza: ${imagem}`);
      }
      
      return imagem;
    } catch (error) {
      log(`❌ Erro ao gerar imagem ${index + 1}: ${error}`);
      // Retornar placeholder em caso de erro
      const placeholderPath = `output/generated_images/placeholder_error_${numeroCena}_${index + 1}.png`;
      criarPlaceholderValido(placeholderPath);
      if (arquivosTemporarios) arquivosTemporarios.push(placeholderPath);
      return placeholderPath;
    }
  });
  
  // Executar todas as promises em paralelo
  const imagens = await Promise.all(promises);
  
  log(`✅ Todas as 3 imagens da cena ${numeroCena} foram processadas em paralelo!`);
  return imagens;
}