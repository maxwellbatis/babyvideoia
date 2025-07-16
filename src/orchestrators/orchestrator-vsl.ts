import { getCredential } from '../utils/credentials';
import { videoMetadataManager } from '../utils/videoMetadata';
import { GeneratedImageManager } from '../utils/generatedImageManager';
import { generateSceneImageSuggestions } from '../utils/sceneImageGenerator';
import { log } from '../utils/logger';
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
  return `Você é um roteirista especialista em vídeos verticais para redes sociais sobre maternidade e bebês.

Gere um roteiro VSL dividido em ${numeroCenas} cenas, cada uma baseada na descrição abaixo.

Para cada cena, gere:
- a narração (SSML)
- a descrição visual resumida
- 3 descrições detalhadas e diferentes para imagens da cena (varie ângulo, foco, emoção, ação, iluminação, etc)

ATENÇÃO: O campo "visual" deve ser um array com exatamente 3 strings, cada uma descrevendo uma imagem diferente da cena. NÃO retorne menos de 3 descrições. Se não conseguir, repita a última até completar 3.

NÃO use blocos markdown (não coloque \`\`\`json ou \`\`\` no início/fim da resposta). Apenas retorne o JSON puro.

Tema: ${tema}
Tipo: ${tipo}
Público: ${publico}
Tom: ${tom}
Duração total: ${duracao} segundos

CENAS:
${cenasText}

Exemplo de resposta:
{
  "cenas": [
    {
      "narracao": "...",
      "visual": [
        "Prompt detalhado para imagem 1",
        "Prompt detalhado para imagem 2",
        "Prompt detalhado para imagem 3"
      ]
    }
  ],
  "caption": "Legenda para Instagram com hashtags e call-to-action"
}`;
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
  } catch (e) {
    // Fallback simples se canvas não estiver disponível
    const fs = require('fs');
    // Criar um arquivo PNG mínimo válido com dimensões corretas
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
      0x49, 0x48, 0x44, 0x52, // IHDR
      (largura >> 24) & 0xFF, (largura >> 16) & 0xFF, (largura >> 8) & 0xFF, largura & 0xFF, // width
      (altura >> 24) & 0xFF, (altura >> 16) & 0xFF, (altura >> 8) & 0xFF, altura & 0xFF, // height
      0x08, 0x02, 0x00, 0x00, 0x00, // bit depth, color type, etc.
      0x00, 0x00, 0x00, 0x00, // CRC placeholder
      0x00, 0x00, 0x00, 0x00, // IEND chunk length
      0x49, 0x45, 0x4E, 0x44, // IEND
      0xAE, 0x42, 0x60, 0x82  // CRC
    ]);
    fs.writeFileSync(outputPath, pngHeader);
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
  
  // 1. PRIMEIRO: Tentar Freepik (rápido)
  try {
    log(`🎨 ETAPA 1: Tentando Freepik para imagem ${numeroImagem} da cena ${numeroCena}...`);
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
    imagens.push(imagem);
    
    // Adicionar imagem ao array de arquivos temporários se fornecido
    if (arquivosTemporarios && imagem) {
      arquivosTemporarios.push(imagem);
      log(`📝 Imagem adicionada à lista de limpeza: ${imagem}`);
    }
    
    if (i < 2) {
      log(`⏳ Aguardando 5 segundos antes da próxima imagem...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
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

// Função principal do pipeline VSL otimizada
export async function generateVideoVSL(payload: GenerateVideoPayload): Promise<VideoResult> {
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

    // Prompt dinâmico para IA - versão VSL contínua e natural
    const promptIA = `Gere um roteiro VSL contínuo, natural e conversacional para um vídeo sobre "${payload.tema}".

REQUISITOS:
- Roteiro fluido e contínuo, como um discurso único e natural
- Texto adequado para ${payload.duracao || 30} segundos de vídeo
- Adapte a linguagem para: ${publico}
- Fale diretamente com o público, de forma humana
- Estrutura: Hook → Problema → Solução → Benefícios → Call-to-action
- Termine com call-to-action forte e claro

DIVISÃO EM CENAS:
- Divida o roteiro em ${typeof payload.cenas === 'number' ? payload.cenas : 5} partes de tamanho proporcional
- A divisão é APENAS para sincronizar imagens, não para separar a narração
- Cada parte deve ter 3 descrições visuais diferentes para ilustrar a cena

FORMATO DO JSON:
{
  "roteiro": "Texto contínuo e fluido do roteiro completo, sem quebras artificiais",
  "cenas": [
    {
      "trecho": "Parte do texto para esta cena (para sincronizar imagens)",
      "visual": [
        "Primeira descrição visual detalhada",
        "Segunda descrição visual diferente", 
        "Terceira descrição visual única"
      ]
    }
  ]
}

EXEMPLO DE ROTEIRO CONTÍNUO:
"Você já pensou em escalar seu negócio sem complicação? O white label é a solução que você estava esperando. Imagine ter seu próprio produto, com sua marca, sem precisar desenvolver do zero. Com o white label, você foca no que realmente importa: vender, crescer e impactar mais pessoas. Deixe a tecnologia e o suporte com a gente. Não perca tempo! Dê o próximo passo e transforme sua jornada empreendedora agora mesmo. Clique no link e comece hoje!"

IMPORTANTE: 
- Retorne APENAS o JSON, sem texto explicativo
- O roteiro deve ser um texto contínuo, não blocos isolados
- Cada cena deve ter EXATAMENTE 3 descrições visuais diferentes`;
    log(`🧠 Prompt dinâmico para IA: ${promptIA}`);

    // Criar diretórios necessários
    const imagesOutputDir = 'output/generated_images';
    const outputDir = 'output/final_videos';
    if (!fs.existsSync(imagesOutputDir)) {
      fs.mkdirSync(imagesOutputDir, { recursive: true });
    }
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 1. Gerar roteiro via IA
    log('🤖 Gerando roteiro completo via IA...');
    const apiKey = await getCredential('GEMINI_KEY');
    
    if (!apiKey) throw new Error('GEMINI_KEY não configurada no banco.');

    const numeroCenas = typeof payload.cenas === 'number' ? payload.cenas : 5;
    let roteiroIAString = await generateScript(promptIA, apiKey);
    
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
      
      let jsonString = roteiroIAString.trim();
      
      // Remover texto explicativo antes do JSON
      const jsonStart = jsonString.search(/\{/);
      if (jsonStart > 0) {
        jsonString = jsonString.substring(jsonStart);
        log(`🔧 Removido texto explicativo antes do JSON`);
      }
      
      // Tentar extrair apenas o array de cenas se o JSON estiver malformado
      const cenasMatch = jsonString.match(/"cenas"\s*:\s*\[([\s\S]*?)\]/);
      if (cenasMatch) {
        try {
          const cenasContent = cenasMatch[1];
          // Limpar o conteúdo das cenas
          let cenasLimpo = cenasContent
            .replace(/,\s*}/g, '}') // Remove vírgula antes de }
            .replace(/,\s*]/g, ']') // Remove vírgula antes de ]
            .replace(/\n/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          // Tentar parsear apenas o array de cenas
          const cenasArray = JSON.parse(`[${cenasLimpo}]`);
          if (Array.isArray(cenasArray) && cenasArray.length > 0) {
            roteiroIA = { cenas: cenasArray };
            log(`✅ JSON corrigido extraindo apenas o array de cenas!`);
          }
        } catch (e2) {
          log(`❌ Falha ao extrair array de cenas: ${e2.message}`);
        }
      }
      
      // Se ainda não conseguiu, tentar correção mais agressiva
      if (!roteiroIA) {
        try {
          // Remover possíveis caracteres extras no final
          jsonString = jsonString.replace(/[\,\s]*$/, '');
          
          // Contar chaves e colchetes
          const openBraces = (jsonString.match(/\{/g) || []).length;
          const closeBraces = (jsonString.match(/\}/g) || []).length;
          const openBrackets = (jsonString.match(/\[/g) || []).length;
          const closeBrackets = (jsonString.match(/\]/g) || []).length;
          
          log(`🔍 Contagem: {${openBraces}/${closeBraces}}, [${openBrackets}/${closeBrackets}]`);
          
          // Fechar colchetes abertos
          for (let i = 0; i < (openBrackets - closeBrackets); i++) {
            jsonString += ']';
          }
          
          // Fechar chaves abertas
          for (let i = 0; i < (openBraces - closeBraces); i++) {
            jsonString += '}';
          }
          
          // Tentar parse novamente
          roteiroIA = JSON.parse(jsonString);
          log(`✅ JSON corrigido com fechamento automático!`);
        } catch (e2) {
          log(`❌ Falha na correção do JSON: ${e2.message}`);
          log(`📋 JSON problemático: ${jsonString.substring(0, 500)}...`);
          
          // Tentar extrair JSON usando regex mais robusto
          const jsonMatch = jsonString.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              roteiroIA = JSON.parse(jsonMatch[0]);
              log(`✅ JSON extraído com regex!`);
            } catch (e3) {
              log(`❌ Regex também falhou: ${e3.message}`);
            }
          }
        }
      }
      
      // Se ainda falhou, tentar extrair cenas individualmente
      if (!roteiroIA) {
        log(`🔄 Tentando extrair cenas individualmente...`);
        const cenasIndividuais = [];
        const cenasRegex = /\{[^}]*"narracao"[^}]*"visual"[^}]*\}/g;
        const matches = jsonString.match(cenasRegex);
        
        if (matches && matches.length > 0) {
          for (const match of matches) {
            try {
              const cena = JSON.parse(match);
              if (cena.narracao && cena.visual) {
                cenasIndividuais.push(cena);
              }
            } catch (e) {
              log(`⚠️ Falha ao parsear cena individual: ${e.message}`);
            }
          }
          
          if (cenasIndividuais.length > 0) {
            roteiroIA = { cenas: cenasIndividuais };
            log(`✅ Extraídas ${cenasIndividuais.length} cenas individualmente!`);
          }
        }
      }
      
      // Se ainda falhou, criar roteiro de fallback baseado na resposta da IA
      if (!roteiroIA) {
        log(`🔄 Criando roteiro de fallback baseado na resposta da IA...`);
        
        // Tentar extrair pelo menos a narração da resposta da IA
        const narracaoMatch = roteiroIAString.match(/"narracao"\s*:\s*"([^"]+)"/g);
        const visualMatch = roteiroIAString.match(/"visual"\s*:\s*\[([^\]]+)\]/g);
        
        if (narracaoMatch && narracaoMatch.length > 0) {
          const cenas = [];
          for (let i = 0; i < Math.min(narracaoMatch.length, 5); i++) {
            const narracao = narracaoMatch[i].match(/"narracao"\s*:\s*"([^"]+)"/)?.[1] || `Cena ${i + 1} sobre ${payload.tema}`;
            const visual = visualMatch && visualMatch[i] ? 
              visualMatch[i].match(/"visual"\s*:\s*\[([^\]]+)\]/)?.[1].split(',').map(v => v.trim().replace(/"/g, '')) || 
              [`Imagem ${i + 1} relacionada ao tema`, `Variação da imagem ${i + 1}`, `Elemento visual ${i + 1}`] :
              [`Imagem ${i + 1} relacionada ao tema`, `Variação da imagem ${i + 1}`, `Elemento visual ${i + 1}`];
            
            cenas.push({ narracao, visual });
          }
          
          roteiroIA = { cenas };
          log(`✅ Roteiro criado com ${cenas.length} cenas extraídas da resposta da IA`);
        } else {
          // Último recurso: roteiro genérico
          roteiroIA = {
            cenas: [
              {
                narracao: "Olá! Vamos falar sobre " + payload.tema + ".",
                visual: ["Imagem relacionada ao tema", "Variação da imagem", "Outra variação"]
              },
              {
                narracao: "Você já passou por situações como essa?",
                visual: ["Pessoa pensativa", "Situação de reflexão", "Momento de decisão"]
              },
              {
                narracao: "A solução está mais próxima do que você imagina.",
                visual: ["Solução visual", "Resultado positivo", "Momento de realização"]
              }
            ]
          };
          log(`🔄 Usando roteiro de fallback genérico com ${roteiroIA.cenas.length} cenas`);
        }
      }
    }
    
    if (!roteiroIA || !Array.isArray(roteiroIA.cenas)) {
      log(`❌ Roteiro inválido após todas as tentativas. RoteiroIA: ${JSON.stringify(roteiroIA)}`);
      throw new Error('Falha ao gerar roteiro: resposta inválida da IA.');
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
        const { generateSocialMediaCaption } = require('../text/gemini-groq');
        legendaRedesSociais = await generateSocialMediaCaption(
          payload.tema, 
          payload.plataformaLegenda || 'instagram', 
          apiKey
        );
        log(`✅ Legenda gerada: "${legendaRedesSociais.substring(0, 100)}..."`);
      } catch (e) {
        log(`⚠️ Erro ao gerar legenda: ${e.message}`);
        legendaRedesSociais = `Confira este vídeo incrível sobre ${payload.tema}! #${payload.tema.replace(/\s+/g, '')} #babyvideoia`;
      }
    }

    // 4. Gerar imagens sequencialmente para todas as cenas
    log('🎨 Iniciando geração sequencial de imagens...');
    const imagensPorCena: string[][] = [];
    
    for (let i = 0; i < roteiroIA.cenas.length; i++) {
      const cena = roteiroIA.cenas[i];
      log(`🎬 Processando cena ${i + 1}/${roteiroIA.cenas.length}...`);
      
      // Converter formato antigo para novo se necessário
      const cenaFormatada = {
        trecho: cena.trecho || cena.narracao || `Cena ${i + 1}`,
        visual: cena.visual
      };
      
      const imagensCena = await processarImagensCenaSequencial(cenaFormatada, payload, i + 1, arquivosTemporarios);
      imagensPorCena.push(imagensCena);
      
      // Delay entre cenas para não sobrecarregar
      if (i < roteiroIA.cenas.length - 1) {
        log(`⏳ Aguardando 3 segundos antes da próxima cena...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    log('✅ Todas as imagens foram geradas com sucesso!');

    // 5. Gerar narração ElevenLabs
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
        const img = sync.imagens[i];
        
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
    await addSubtitlesToVideo(videoFinal, subtitlesPath, videoFinalLegendado);
    arquivosTemporarios.push(videoFinal);

    log(`✅ Vídeo final legendado salvo em: ${videoFinalLegendado}`);

    // 10. Gerar thumbnail
    log('🖼️ Gerando thumbnail...');
    const thumbnailPath = await generateThumbnail(videoFinalLegendado);

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
      caption: legendaRedesSociais || `Vídeo gerado automaticamente sobre ${payload.tema}`
    });

    log(`✅ Vídeo salvo com ID: ${videoId}`);

    // 13. Limpar arquivos temporários
    limparArquivosTemporarios(arquivosTemporarios);

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
        titulo: tituloFinal, // Novo campo
        legendaRedesSociais: legendaRedesSociais, // Novo campo
        plataformaLegenda: payload.plataformaLegenda // Novo campo
      }
    };
    
  } catch (error) {
    log(`❌ Erro no pipeline VSL: ${error}`);
    console.error('[VSL] Erro detalhado:', error);
    
    // Limpar arquivos temporários mesmo em caso de erro
    limparArquivosTemporarios(arquivosTemporarios);
    
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