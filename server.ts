import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import axios from 'axios';
import { getCredential, clearCredentialCache } from './src/utils/credentials';
import { clearColabCache } from './src/image/stabledefusion';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

// Remover função duplicada getCredential e credCache local

// Inicializar Cloudinary com credenciais do banco
async function initCloudinaryFromDb() {
  const cloud_name = await getCredential('CLOUDINARY_CLOUD_NAME');
  const api_key = await getCredential('CLOUDINARY_API_KEY');
  const api_secret = await getCredential('CLOUDINARY_API_SECRET');
  if (cloud_name && api_key && api_secret) {
    cloudinary.config({ cloud_name, api_key, api_secret });
    console.log('✅ Cloudinary configurado dinamicamente do banco');
  } else {
    console.warn('⚠️ Credenciais do Cloudinary não encontradas no banco. Uploads podem falhar.');
  }
}

// Função para mostrar status de todas as credenciais
async function showCredentialsStatus() {
  console.log('\n🔑 Status das Credenciais:');
  const credentials = [
    { name: 'CLOUDINARY_CLOUD_NAME', display: 'Cloudinary Cloud Name' },
    { name: 'CLOUDINARY_API_KEY', display: 'Cloudinary API Key' },
    { name: 'CLOUDINARY_API_SECRET', display: 'Cloudinary API Secret' },
    { name: 'GEMINI_KEY', display: 'Gemini API Key' },
    { name: 'GROQ_API_KEY', display: 'Groq API Key' },
    { name: 'FREEPIK_API_KEY', display: 'Freepik API Key' },
    { name: 'ELEVENLABS_API_KEY', display: 'ElevenLabs API Key' },
    { name: 'COLAB_SD_URL', display: 'Colab SD URL' }
  ];

  for (const cred of credentials) {
    const value = await getCredential(cred.name);
    const status = value ? '✅ Configurada' : '❌ Não configurada';
    console.log(`   ${cred.display}: ${status}`);
  }
  console.log('');
}

// Função auxiliar para extrair caminho do vídeo do output
function extractVideoPath(stdout) {
  // Tentar regex primeiro
  const videoMatch = stdout.match(/Vídeo final legendado, narrado e animado salvo em: (.+\.mp4)/);
  if (videoMatch) {
    return videoMatch[1];
  }
  
  // Fallback: procurar por arquivos .mp4 na pasta output
  const outputDir = './output';
  if (fs.existsSync(outputDir)) {
    const files = fs.readdirSync(outputDir);
    const mp4Files = files.filter(file => file.endsWith('.mp4') && file.startsWith('final_'));
    
    if (mp4Files.length > 0) {
      const latestVideo = mp4Files.sort().reverse()[0]; // Pega o mais recente
      return path.join(outputDir, latestVideo);
    }
  }
  
  return null;
}

// Chamar ao iniciar
initCloudinaryFromDb();
showCredentialsStatus();

const app = express();
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient();

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = './assets/music';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Manter nome original do arquivo
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Aceitar apenas arquivos de áudio
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de áudio são permitidos'));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB máximo
  }
});

// Middleware específico para upload de imagens
const uploadImage = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    console.log(`🔍 Verificando arquivo: ${file.originalname}, tipo: ${file.mimetype}`);
    // Aceitar apenas arquivos de imagem
    if (file.mimetype.startsWith('image/')) {
      console.log(`✅ Arquivo de imagem aceito: ${file.originalname}`);
      cb(null, true);
    } else {
      console.log(`❌ Arquivo rejeitado (não é imagem): ${file.originalname}, tipo: ${file.mimetype}`);
      cb(new Error('Apenas arquivos de imagem são permitidos'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo para imagens
  }
});

app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));
app.use('/assets', express.static('assets')); // Servir arquivos estáticos da pasta assets

// Rota principal - serve o frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/index.html'));
});

// API para upload de música de fundo
app.post('/api/upload-music', upload.single('music'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    const musicPath = path.join('assets/music', req.file.filename);
    console.log(`✅ Música enviada: ${musicPath}`);
    
    res.json({ 
      success: true, 
      message: 'Música enviada com sucesso',
      path: musicPath,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Erro no upload de música:', error);
    res.status(500).json({ error: 'Erro ao enviar música' });
  }
});

// API para listar músicas disponíveis
app.get('/api/music-list', (req, res) => {
  try {
    const musicDir = './assets/music';
    if (!fs.existsSync(musicDir)) {
      return res.json({ success: true, music: [] });
    }

    // Função recursiva para buscar arquivos de música em todas as subpastas
    function listMusicFilesRecursively(dir, baseDir = 'assets/music') {
      let results = [];
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
          results = results.concat(listMusicFilesRecursively(fullPath, baseDir));
        } else if (/\.(mp3|wav|ogg|m4a)$/i.test(item)) {
          results.push({
            name: item,
            path: path.join(baseDir, path.relative(musicDir, fullPath)).replace(/\\/g, '/'),
            size: stat.size
          });
        }
      }
      return results;
    }

    const files = listMusicFilesRecursively(musicDir);
    res.json({ success: true, music: files });
  } catch (error) {
    console.error('Erro ao listar músicas:', error);
    res.status(500).json({ error: 'Erro ao listar músicas' });
  }
});

// API para gerar posts criativos
app.post('/api/generate-post', async (req, res) => {
  try {
    const { tema, tipo } = req.body;
    const apiKey = await getCredential('GEMINI_KEY');
    
    if (!apiKey) {
      return res.status(500).json({ error: 'Chave Gemini não configurada no banco' });
    }

    const { generateBabyDiaryPost } = await import('./src/text/gemini-groq');
    const post = await generateBabyDiaryPost(tema, tipo, apiKey);
    
    res.json({ success: true, content: post });
  } catch (error) {
    console.error('Erro ao gerar post:', error);
    res.status(500).json({ error: 'Erro ao gerar post' });
  }
});

// API para gerar legendas sociais
app.post('/api/generate-caption', async (req, res) => {
  try {
    const { tema, plataforma } = req.body;
    const apiKey = await getCredential('GEMINI_KEY');
    
    if (!apiKey) {
      return res.status(500).json({ error: 'Chave Gemini não configurada no banco' });
    }

    const { generateSocialMediaCaption } = await import('./src/text/gemini-groq');
    const caption = await generateSocialMediaCaption(tema, plataforma, apiKey);
    
    res.json({ success: true, content: caption });
  } catch (error) {
    console.error('Erro ao gerar legenda:', error);
    res.status(500).json({ error: 'Erro ao gerar legenda' });
  }
});

// API para gerar conteúdo de marketing
app.post('/api/generate-marketing', async (req, res) => {
  try {
    const { tipo, plataforma } = req.body;
    const apiKey = await getCredential('GEMINI_KEY');
    
    if (!apiKey) {
      return res.status(500).json({ error: 'Chave Gemini não configurada no banco' });
    }

    const { generateBabyDiaryMarketingContent } = await import('./src/text/gemini-groq');
    const content = await generateBabyDiaryMarketingContent(tipo, plataforma, apiKey);
    
    res.json({ success: true, content });
  } catch (error) {
    console.error('Erro ao gerar conteúdo de marketing:', error);
    res.status(500).json({ error: 'Erro ao gerar conteúdo de marketing' });
  }
});

// API para gerar roteiros de vídeo marketing
app.post('/api/generate-video-script', async (req, res) => {
  try {
    const { publico, duracao } = req.body;
    const apiKey = await getCredential('GEMINI_KEY');
    
    if (!apiKey) {
      return res.status(500).json({ error: 'Chave Gemini não configurada no banco' });
    }

    const { generateVideoMarketingScript } = await import('./src/text/gemini-groq');
    const script = await generateVideoMarketingScript(publico, duracao, apiKey);
    
    res.json({ success: true, content: script });
  } catch (error) {
    console.error('Erro ao gerar roteiro:', error);
    res.status(500).json({ error: 'Erro ao gerar roteiro' });
  }
});

// API para gerar argumentos de venda
app.post('/api/generate-sales-argument', async (req, res) => {
  try {
    const { tipo } = req.body;
    const apiKey = await getCredential('GEMINI_KEY');
    
    if (!apiKey) {
      return res.status(500).json({ error: 'Chave Gemini não configurada no banco' });
    }

    const { generateArgumentoVenda } = await import('./src/text/gemini-groq');
    const argument = await generateArgumentoVenda(tipo, apiKey);
    
    res.json({ success: true, content: argument });
  } catch (error) {
    console.error('Erro ao gerar argumento:', error);
    res.status(500).json({ error: 'Erro ao gerar argumento' });
  }
});

// Importar gerenciador de metadados
import { videoMetadataManager, createVideoMetadata } from './src/utils/videoMetadata';
import { generateThumbnail } from './src/video/ffmpeg';
import { generateVideoTitle, generateVideoHashtags } from './src/text/gemini-groq';

// API para gerar vídeos completos
app.post('/api/generate-video', async (req, res) => {
  try {
    const { tema, tipo, publico, formato, cenas, resolution, showCallToAction, showWatermark, appImageIds, backgroundMusic } = req.body;
    
    if (!tema) {
      return res.status(400).json({ error: 'Tema é obrigatório' });
    }

    console.log(`🎬 Gerando vídeo: ${tema} (${tipo}, ${publico}, ${formato}, ${cenas} cenas)`);

    // [NOVO] Buscar imagens do app selecionadas
    let appImages = [];
    if (Array.isArray(appImageIds) && appImageIds.length > 0) {
      // Ler do arquivo JSON
      const appImagesFile = path.join(__dirname, 'output', 'app_images.json');
      let allImages = [];
      if (fs.existsSync(appImagesFile)) {
        allImages = JSON.parse(fs.readFileSync(appImagesFile, 'utf8'));
      }
      // Garantir que IDs são do mesmo tipo
      appImages = appImageIds.map(id => allImages.find(img => img.id == id)).filter(Boolean);
      console.log('🖼️ Imagens do app selecionadas:', appImages.map(img => ({ id: img.id, tag: img.tag, description: img.description })));
    }

    // [NOVO] Montar array ordenado de imagens para as cenas
    let imagesForScenes = [];
    for (let i = 0; i < parseInt(cenas); i++) {
      if (appImages[i]) {
        imagesForScenes.push(appImages[i]);
      } else {
        imagesForScenes.push(null); // Fallback para IA
      }
    }
    console.log('🔗 Array de imagens para as cenas:', imagesForScenes.map(img => img ? img.id : 'IA'));

    // [NOVO] Preparar descrições/categorias para passar ao prompt da IA e ao orquestrador
    const appImagesContext = imagesForScenes.map((img, idx) => {
      if (img) {
        return `Cena ${idx+1}: "${img.description || img.filename}" (Categoria: ${img.tag})`;
      } else {
        return `Cena ${idx+1}: [IA]`;
      }
    });
    console.log('📝 Contexto das imagens para IA:', appImagesContext);

    // [NOVO] Criar contexto das imagens do app para o roteiro
    let appImagesForScript = '';
    if (appImages.length > 0) {
      appImagesForScript = `\n\nIMAGENS DO APP SELECIONADAS:\n${appImages.map((img, idx) => 
        `Cena ${idx+1}: ${img.description || img.filename} (${img.tag})`
      ).join('\n')}\n\nINSTRUÇÕES: Use essas imagens do app nas cenas correspondentes. A narração deve ser contextualizada com base na descrição de cada imagem. Se faltar imagem para alguma cena, gere descrição visual para IA.`;
    }
    console.log('📝 Contexto das imagens para roteiro:', appImagesForScript);

    // Gerar título e hashtags com IA
    const apiKey = await getCredential('GEMINI_KEY');
    if (!apiKey) {
      return res.status(500).json({ error: 'Chave Gemini não configurada no banco' });
    }

    const { generateVideoTitle, generateVideoHashtags } = await import('./src/text/gemini-groq');
    
    const titulo = await generateVideoTitle(tema, tipo, publico, apiKey);
    const hashtags = await generateVideoHashtags(tema, tipo, publico, apiKey);
    
    console.log(`📝 Título gerado: ${titulo}`);
    console.log(`🏷️ Hashtags geradas: ${hashtags}`);

    // Construir comando do orchestrator
    let orchestratorPath = './src/orchestrators/orchestrator-animated-images.ts';
    
    // [NOVO] Escolher orquestrador baseado no formato
    if (formato === 'sd') {
      orchestratorPath = './src/orchestrators/orchestrator-animated-sd.ts';
      console.log(`🎬 Usando orquestrador Stable Diffusion SD`);
    } else if (formato === 'aiimage') {
      orchestratorPath = './src/orchestrators/orchestrator-animated-images.ts';
      console.log(`🎬 Usando orquestrador AI Image`);
    } else {
      console.log(`🎬 Usando orquestrador padrão: ${formato}`);
    }
    
    let command = `npx ts-node ${orchestratorPath} --tema="${tema}" --tipo="${tipo}" --publico="${publico}" --formato="${formato}" --cenas="${cenas}" --resolution="${resolution || 'horizontal'}" --showCallToAction="${showCallToAction !== false}" --showWatermark="${showWatermark !== false}"`;
    
    // [NOVO] Adicionar música de fundo se especificada
    if (backgroundMusic && backgroundMusic.path) {
      console.log(`🎵 Música de fundo recebida:`, backgroundMusic);
      command += ` --music="${backgroundMusic.path}"`;
      if (backgroundMusic.volume !== undefined) {
        command += ` --music-volume="${backgroundMusic.volume}"`;
      }
      if (backgroundMusic.loop !== undefined) {
        command += ` --${backgroundMusic.loop ? '' : 'no-'}music-loop`;
      }
      if (backgroundMusic.fadeIn !== undefined) {
        command += ` --music-fade-in="${backgroundMusic.fadeIn}"`;
      }
      if (backgroundMusic.fadeOut !== undefined) {
        command += ` --music-fade-out="${backgroundMusic.fadeOut}"`;
      }
      console.log(`🎵 Parâmetros de música adicionados ao comando`);
    }
    
    // [NOVO] Adicionar URLs das imagens do app se disponíveis
    if (appImages.length > 0) {
      const imageUrls = appImages.map(img => img.cloudinaryUrl).join(',');
      command += ` --app-images="${imageUrls}"`;
      console.log(`🖼️ Passando ${appImages.length} imagens do app para o orquestrador: ${imageUrls.substring(0, 100)}...`);
    }

    // [NOVO] Adicionar contexto das imagens para o roteiro
    if (appImagesForScript) {
      const encodedContext = encodeURIComponent(appImagesForScript);
      command += ` --app-images-context="${encodedContext}"`;
      console.log(`📝 Passando contexto das imagens para o roteiro: ${appImagesForScript.substring(0, 100)}...`);
    }

    console.log(`🚀 Executando: ${command}`);

    exec(command, async (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Erro ao gerar vídeo:', error);
        return res.status(500).json({ error: 'Erro ao gerar vídeo', details: error.message });
      }

      if (stderr) {
        console.log('⚠️ Stderr:', stderr);
      }

      console.log('✅ Vídeo gerado com sucesso!');
      console.log('📊 Output:', stdout);

      // Extrair caminho do vídeo do output
      const videoPath = extractVideoPath(stdout);
      if (!videoPath) {
        console.error('❌ Não foi possível encontrar o caminho do vídeo no output');
        console.log('📊 Output completo:', stdout);
        return res.status(500).json({ error: 'Não foi possível localizar o vídeo gerado' });
      }

      console.log(`🎬 Vídeo encontrado: ${videoPath}`);

      // Verificar se o arquivo existe
      if (!fs.existsSync(videoPath)) {
        console.error('❌ Arquivo de vídeo não encontrado:', videoPath);
        return res.status(500).json({ error: 'Arquivo de vídeo não encontrado' });
      }

      // Gerar thumbnail
      const thumbnailPath = videoPath.replace('.mp4', '_thumb.jpg');
      const thumbnailFileName = path.basename(thumbnailPath); // Apenas o nome do arquivo

      try {
        console.log('🖼️ Gerando thumbnail...');
        await generateThumbnail(videoPath, thumbnailPath);
        console.log(`✅ Thumbnail gerado: ${thumbnailPath}`);
      } catch (thumbErr) {
        console.error('❌ Erro ao gerar thumbnail do vídeo:', thumbErr);
        
        // Fallback: usar primeira imagem como thumbnail
        try {
          const firstImage = videoPath.replace('.mp4', '_scene1.jpg');
          if (fs.existsSync(firstImage)) {
            fs.copyFileSync(firstImage, thumbnailPath);
            console.log(`✅ Thumbnail gerada a partir da primeira imagem: ${thumbnailPath}`);
          } else {
            console.error('❌ Não foi possível encontrar a primeira imagem para gerar o thumbnail.');
          }
        } catch (imgErr) {
          console.error('❌ Fallback de thumbnail com imagem também falhou:', imgErr);
        }
      }

      // Salvar metadados
      const videoMetadataManager = await import('./src/utils/videoMetadata');
      const metadata = {
        titulo,
        hashtags,
        tema,
        tipo,
        publico,
        formato,
        cenas: parseInt(cenas),
        resolution: resolution || 'horizontal',
        videoPath: path.basename(videoPath), // Usar apenas o nome do arquivo
        thumbnailPath: thumbnailFileName, // Usar apenas o nome do arquivo
        tamanho: fs.statSync(videoPath).size,
        createdAt: new Date().toISOString()
      };

      const videoId = videoMetadataManager.videoMetadataManager.addVideo(metadata);
      console.log(`✅ Metadados salvos com ID: ${videoId}`);
      
      // Upload para Cloudinary
      try {
        console.log('☁️ Iniciando upload para Cloudinary...');
        
        // Upload do vídeo
        const videoUploadResult = await cloudinary.uploader.upload(videoPath, {
          resource_type: 'video',
          folder: 'baby-diary-videos',
          public_id: `video_${videoId}`,
        });
        console.log('✅ Upload do vídeo para Cloudinary concluído:', videoUploadResult.secure_url);
        
        // Upload do thumbnail
        let thumbnailCloudinaryUrl = null;
        if (fs.existsSync(thumbnailPath)) {
          const thumbnailUploadResult = await cloudinary.uploader.upload(thumbnailPath, {
            resource_type: 'image',
            folder: 'baby-diary-thumbnails',
            public_id: `thumb_${videoId}`,
          });
          thumbnailCloudinaryUrl = thumbnailUploadResult.secure_url;
          console.log('✅ Upload do thumbnail para Cloudinary concluído:', thumbnailCloudinaryUrl);
        }
        
        // Atualizar metadados com URLs do Cloudinary
        videoMetadataManager.videoMetadataManager.updateVideo(videoId, {
          cloudinaryVideoUrl: videoUploadResult.secure_url,
          cloudinaryThumbnailUrl: thumbnailCloudinaryUrl
        });
        
        return res.json({ 
          success: true, 
          message: 'Vídeo gerado com sucesso!',
          videoId: videoId,
          videoPath: path.basename(videoPath),
          thumbnailPath: thumbnailFileName,
          titulo: titulo,
          hashtags: hashtags,
          downloadUrl: videoUploadResult.secure_url,
          cloudinaryUrl: videoUploadResult.secure_url,
          cloudinaryThumbnailUrl: thumbnailCloudinaryUrl,
          stdout: stdout
        });
      } catch (cloudErr) {
        console.error('❌ Erro ao enviar para Cloudinary:', cloudErr);
        return res.status(500).json({ 
          error: 'Erro ao enviar vídeo para Cloudinary', 
          details: cloudErr.message,
          videoId: videoId,
          videoPath: path.basename(videoPath),
          thumbnailPath: thumbnailFileName,
          titulo: titulo,
          hashtags: hashtags,
          stdout: stdout
        });
      }
    });
  } catch (error) {
    console.error('Erro ao gerar vídeo:', error);
    res.status(500).json({ error: 'Erro ao gerar vídeo' });
  }
});

// API para chat IA - Sugestões de vídeos
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    const apiKey = await getCredential('GEMINI_KEY');
    
    if (!apiKey) {
      return res.status(500).json({ error: 'Chave Gemini não configurada no banco' });
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Mensagem é obrigatória' });
    }

    console.log(`🤖 Chat IA - Mensagem recebida: "${message}"`);

    // Gerar resposta usando Gemini/Groq
    const { generateWithFallback } = await import('./src/text/gemini-groq');
    
    const systemPrompt = `Você é um assistente especializado em sugerir temas criativos para vídeos do nicho materno-infantil, especificamente para o app Baby Diary. 

SUA FUNÇÃO PRINCIPAL:
Sugerir temas específicos, criativos e variados para vídeos sobre maternidade, bebês e família E para vendas do SaaS white label.

DETECÇÃO DE CONTEXTO:
- Se o usuário mencionar "vendas", "negócio", "empreendedor", "afiliado", "influenciadora", "white label", "SaaS", "monetizar", "lucro", "negócio" → Sugira temas para SaaS white label
- Se o usuário mencionar "mães", "bebês", "família", "maternidade", "rotina", "dicas" → Sugira temas para mães
- Se não especificar → Varie entre os dois tipos

QUANDO O USUÁRIO PEDIR SUGESTÕES:
1. Responda de forma amigável, motivacional e pessoal
2. Sugira 3-5 temas específicos e criativos
3. Sempre retorne os temas em formato JSON simples
4. Varie os tipos de conteúdo (dicas, educativos, inspiracionais, etc.)
5. Use linguagem natural e conversacional
6. DETECTE O CONTEXTO e sugira temas apropriados

CATEGORIAS DE TEMAS PARA VARIAR:

👩‍👧‍👦 PARA MÃES:
🎬 ANÚNCIOS/VSL: "Transforme o caos em harmonia com o Baby Diary", "Descubra como organizar a rotina do bebê em 5 minutos"
💡 DICAS RÁPIDAS: "3 respirações que acalmam o bebê", "Como fazer o bebê dormir em 2 minutos"
📚 EDUCACIONAIS: "As fases do sono do bebê explicadas", "Desenvolvimento motor: do queixo ao primeiro passo"
📱 STORIES/REELS: "Tentando tomar café e o bebê acorda...", "Nunca mais dormi 8 horas seguidas"
🎯 TUTORIAIS: "Como criar o primeiro diário do bebê", "Organize a rotina em 3 passos simples"
✨ INSPIRACIONAIS: "Ser mãe não é dar conta de tudo", "Cada momento vale a pena, mesmo sem café"

💼 PARA SAAS WHITE LABEL:
📱 INFLUENCIADORAS: "Como monetizar sua audiência de mães", "Transforme suas seguidoras em clientes fiéis"
🤝 AFILIADOS: "Ganhe comissões recorrentes com Baby Diary", "O produto que todo afiliado deveria promover"
📚 INFOPRODUTORES: "Escale seu negócio com white label", "Transforme seu conhecimento em app próprio"
🚀 EMPREENDEDORES: "Entre no mercado de apps sem investir milhões", "Seja o próximo unicórnio do nicho materno"
🏢 AGÊNCIAS: "Ofereça apps white label para seus clientes", "Diferencial que vai destacar sua agência"
💼 CONSULTORES: "Monetize seu conhecimento com tecnologia", "Ferramenta que seus clientes vão amar"

EXEMPLOS DE TEMAS CRIATIVOS E VARIADOS:

👩‍👧‍👦 PARA MÃES:
- "Como transformar 5 minutos em momentos especiais com o bebê"
- "A verdade sobre o sono das mães: sobrevivendo sem dormir"
- "3 truques que salvam a rotina de qualquer mãe"
- "Desenvolvimento do bebê: do sorriso ao primeiro 'mamãe'"
- "Como organizar a casa com um bebê em 10 minutos"
- "A jornada da amamentação: do desafio à superação"
- "Momentos que fazem tudo valer a pena"
- "Como criar memórias especiais em meio ao caos"
- "A arte de ser mãe: imperfeita e incrível"
- "Transformando a rotina em momentos mágicos"

💼 PARA SAAS WHITE LABEL:
- "Como monetizar sua audiência de mães sem perder autenticidade"
- "O segredo dos afiliados que ganham 6 dígitos por mês"
- "Transforme seu conhecimento em um app próprio em 24h"
- "Por que todo empreendedor deveria ter um white label"
- "Como agências estão lucrando 10x mais com apps próprios"
- "O diferencial que vai destacar sua marca no mercado"
- "Monetize sua expertise sem precisar de programadores"
- "Como consultores estão escalando seus negócios com tecnologia"
- "A oportunidade que você não pode deixar passar"
- "Transforme sua audiência em uma máquina de vendas"

REGRAS PARA EVITAR CONTEÚDO ROBÓTICO:
1. NÃO use frases genéricas como "Dicas para..." ou "Como..."
2. NÃO repita a mesma estrutura de outros temas
3. Use linguagem emocional e pessoal
4. Inclua elementos de storytelling
5. Varie entre diferentes tipos de conteúdo
6. Seja específico e criativo
7. Use perguntas, metáforas e exemplos reais

SEJA CRIATIVO, ESPECÍFICO, EMOCIONAL E FOQUE NO NICHO MATERNO-INFANTIL.`;

    const userPrompt = `Usuário: ${message}

ANÁLISE DO CONTEXTO:
- Palavras-chave detectadas: ${message.toLowerCase().includes('vendas') || message.toLowerCase().includes('negócio') || message.toLowerCase().includes('empreendedor') || message.toLowerCase().includes('afiliado') || message.toLowerCase().includes('influenciadora') || message.toLowerCase().includes('white label') || message.toLowerCase().includes('saas') || message.toLowerCase().includes('monetizar') || message.toLowerCase().includes('lucro') ? 'SAAS' : message.toLowerCase().includes('mães') || message.toLowerCase().includes('bebês') || message.toLowerCase().includes('família') || message.toLowerCase().includes('maternidade') || message.toLowerCase().includes('rotina') || message.toLowerCase().includes('dicas') ? 'MAES' : 'MISTO'}

Responda de forma amigável, pessoal e motivacional. Sugira temas criativos e variados.

IMPORTANTE: 
- Se detectar contexto SAAS → Sugira temas para vendas do white label
- Se detectar contexto MAES → Sugira temas para mães
- Se detectar contexto MISTO → Varie entre os dois tipos

SEMPRE retorne:
1. Uma resposta motivacional, pessoal e útil (máximo 2 frases)
2. Lista de 3-5 temas em formato JSON

Exemplo para SAAS:
{
  "response": "Que alegria ajudar você a criar conteúdo para vendas! Aqui estão alguns temas que vão gerar resultados incríveis...",
  "themes": [
    "Como monetizar sua audiência de mães sem perder autenticidade",
    "O segredo dos afiliados que ganham 6 dígitos por mês",
    "Transforme seu conhecimento em um app próprio em 24h",
    "Por que todo empreendedor deveria ter um white label",
    "Como agências estão lucrando 10x mais com apps próprios"
  ]
}

Exemplo para MAES:
{
  "response": "Que alegria ajudar você a criar conteúdo incrível! Aqui estão alguns temas que vão conectar com o coração das mães...",
  "themes": [
    "Transformando 5 minutos em momentos especiais com o bebê",
    "A verdade sobre o sono das mães: sobrevivendo sem dormir",
    "3 truques que salvam a rotina de qualquer mãe",
    "Desenvolvimento do bebê: do sorriso ao primeiro 'mamãe'",
    "Como organizar a casa com um bebê em 10 minutos"
  ]
}

SEJA CRIATIVO, EMOCIONAL E DETECTE O CONTEXTO CORRETAMENTE!`;

    const response = await generateWithFallback(userPrompt, systemPrompt);
    
    console.log(`🤖 Chat IA - Resposta gerada: ${response.substring(0, 100)}...`);

    // Tentar extrair temas JSON da resposta
    let themes = [];
    try {
      const jsonMatch = response.match(/\{[\s\S]*"themes"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.themes && Array.isArray(parsed.themes)) {
          themes = parsed.themes;
          // Remover o JSON da resposta para mostrar apenas o texto
          const cleanResponse = response.replace(/\{[\s\S]*"themes"[\s\S]*\}/, '').trim();
          return res.json({ 
            success: true, 
            response: cleanResponse || response,
            themes: themes
          });
        }
      }
    } catch (jsonError) {
      console.log('⚠️ Não foi possível extrair temas JSON da resposta');
    }

    // Se não encontrou temas, retornar apenas a resposta
    res.json({ 
      success: true, 
      response: response,
      themes: []
    });

  } catch (error) {
    console.error('Erro no chat IA:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao processar mensagem do chat',
      details: error.message 
    });
  }
});

// Rota para servir thumbnails
app.get('/api/thumbnails/:filename', (req, res) => {
  const filename = req.params.filename;
  const outputDir = path.join(__dirname, 'output');
  const filePath = path.join(outputDir, filename);
  
  // Validar nome do arquivo para segurança
  if (!filename.endsWith('.jpg') || filename.includes('..') || filename.includes('/')) {
    return res.status(400).send('Nome de arquivo inválido');
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Thumbnail não encontrado');
  }

  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache por 1 hora
  fs.createReadStream(filePath).pipe(res);
});

// Endpoint robusto para download/streaming de vídeo
app.get('/api/download/:file', (req, res) => {
  const file = req.params.file;
  const outputDir = path.join(__dirname, 'output');
  const filePath = path.join(outputDir, file);

  // Segurança: só permite .mp4 e sem path traversal
  if (!file.endsWith('.mp4') || file.includes('..') || file.includes('/')) {
    return res.status(400).send('Nome de arquivo inválido');
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('Arquivo não encontrado');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    // Streaming parcial (seek)
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = (end - start) + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
    });
    fileStream.pipe(res);
  } else {
    // Download/streaming completo
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

// Rota para listar vídeos com metadados
app.get('/api/videos', (req, res) => {
  try {
    const videos = videoMetadataManager.getAllVideos();
    
    res.json({ 
      success: true,
      videos: videos,
      total: videos.length
    });
  } catch (error) {
    console.error('Erro ao listar vídeos:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao listar vídeos',
      details: error.message 
    });
  }
});

// Rota para buscar vídeo específico
app.get('/api/videos/:id', (req, res) => {
  try {
    const { id } = req.params;
    const video = videoMetadataManager.getVideo(id);
    
    if (!video) {
      return res.status(404).json({ 
        success: false,
        error: 'Vídeo não encontrado' 
      });
    }
    
    res.json({ 
      success: true,
      video: video
    });
  } catch (error) {
    console.error('Erro ao buscar vídeo:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao buscar vídeo',
      details: error.message 
    });
  }
});

// Rota para atualizar metadados do vídeo
app.put('/api/videos/:id', (req, res) => {
  const { id } = req.params;
  const { titulo, hashtags, caption } = req.body;

  const success = videoMetadataManager.updateVideo(id, { titulo, hashtags, caption });
  if (!success) {
    return res.status(404).json({ success: false, error: 'Vídeo não encontrado' });
  }
  res.json({ success: true, message: 'Vídeo atualizado com sucesso' });
});

// Rota para deletar vídeo
app.delete('/api/videos/:id', (req, res) => {
  try {
    const { id } = req.params;
    const success = videoMetadataManager.removeVideo(id);
    
    if (!success) {
      return res.status(404).json({ 
        success: false,
        error: 'Vídeo não encontrado' 
      });
    }
    
    res.json({ 
      success: true,
      message: 'Vídeo deletado com sucesso' 
    });
  } catch (error) {
    console.error('Erro ao deletar vídeo:', error);
    res.status(500).json({ 
      success: false,
      error: 'Erro ao deletar vídeo',
      details: error.message 
    });
  }
});

// Rotas de gerenciamento de credenciais
app.get('/api/config', async (req, res) => {
  try {
    const creds = await prisma.credential.findMany();
    res.json({ success: true, credentials: creds });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar credenciais', details: err.message });
  }
});

app.post('/api/config', async (req, res) => {
  try {
    const { name, value } = req.body;
    if (!name || !value) return res.status(400).json({ error: 'Nome e valor são obrigatórios' });
    const cred = await prisma.credential.upsert({
      where: { name },
      update: { value },
      create: { name, value }
    });
    clearCredentialCache(name);
    if (name === 'COLAB_SD_URL') clearColabCache();
    res.json({ success: true, credential: cred });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar credencial', details: err.message });
  }
});

// Endpoint para verificar créditos do ElevenLabs
app.get('/api/elevenlabs-credits', async (req, res) => {
  try {
    const apiKey = await getCredential('ELEVENLABS_API_KEY');
    if (!apiKey) {
      return res.json({ 
        success: false, 
        error: 'API key não configurada',
        hasApiKey: false 
      });
    }

    // Verificar informações da conta
    const accountResponse = await axios.get('https://api.elevenlabs.io/v1/user', {
      headers: { 'xi-api-key': apiKey }
    });

    // Verificar uso de caracteres
    const usageResponse = await axios.get('https://api.elevenlabs.io/v1/user/subscription', {
      headers: { 'xi-api-key': apiKey }
    });

    const accountInfo = accountResponse.data;
    const usageInfo = usageResponse.data;

    const creditsInfo = {
      hasApiKey: true,
      email: accountInfo.email || 'N/A',
      firstName: accountInfo.first_name || 'N/A',
      subscription: accountInfo.subscription?.tier || 'N/A',
      characterCount: usageInfo.character_count || 0,
      characterLimit: usageInfo.character_limit || 0,
      charactersRemaining: (usageInfo.character_limit || 0) - (usageInfo.character_count || 0),
      percentageUsed: usageInfo.character_limit ? 
        ((usageInfo.character_count / usageInfo.character_limit) * 100).toFixed(1) : '0'
    };

    res.json({ success: true, credits: creditsInfo });
  } catch (error) {
    console.error('Erro ao verificar créditos ElevenLabs:', error);
    
    if (error.response?.status === 401) {
      res.json({ 
        success: false, 
        error: 'API key inválida ou expirada',
        hasApiKey: true 
      });
    } else if (error.response?.status === 429) {
      res.json({ 
        success: false, 
        error: 'Rate limit atingido. Tente novamente em alguns minutos.',
        hasApiKey: true 
      });
    } else {
      res.json({ 
        success: false, 
        error: 'Erro ao verificar créditos: ' + error.message,
        hasApiKey: true 
      });
    }
  }
});

// Exemplo de uso dinâmico para outras integrações:
app.post('/api/generate-groq', async (req, res) => {
  try {
    const { prompt } = req.body;
    const groqKey = await getCredential('GROQ_API_KEY');
    if (!groqKey) return res.status(500).json({ error: 'GROQ_API_KEY não configurada no banco' });
    // ... chamada à API Groq usando groqKey ...
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao gerar com Groq' });
  }
});
app.post('/api/generate-image', async (req, res) => {
  try {
    const { prompt } = req.body;
    const freepikKey = await getCredential('FREEPIK_API_KEY');
    if (!freepikKey) return res.status(500).json({ error: 'FREEPIK_API_KEY não configurada no banco' });
    // ... chamada à API Freepik usando freepikKey ...
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao gerar imagem' });
  }
});
app.post('/api/generate-tts', async (req, res) => {
  try {
    const { texto } = req.body;
    const elevenKey = await getCredential('ELEVENLABS_API_KEY');
    if (!elevenKey) return res.status(500).json({ error: 'ELEVENLABS_API_KEY não configurada no banco' });
    // ... chamada à API ElevenLabs usando elevenKey ...
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao gerar TTS' });
  }
});

// API para buscar imagens geradas
app.get('/api/generated-images', async (req, res) => {
  try {
    const { tema, tipo, publico, resolution, limit = 20 } = req.query;
    
    const where: any = { isReusable: true };
    
    if (tema) where.tema = tema as string;
    if (tipo) where.tipo = tipo as string;
    if (publico) where.publico = publico as string;
    if (resolution) where.resolution = resolution as string;
    
    const images = await prisma.generatedImage.findMany({
      where,
      orderBy: [
        { usageCount: 'desc' },
        { performance: 'desc' },
        { createdAt: 'desc' }
      ],
      take: parseInt(limit as string)
    });
    
    res.json({
      success: true,
      images: images,
      total: images.length
    });
  } catch (error) {
    console.error('Erro ao buscar imagens geradas:', error);
    res.status(500).json({ error: 'Erro ao buscar imagens geradas' });
  }
});

// API para deletar imagem gerada
app.delete('/api/generated-images/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const image = await prisma.generatedImage.findUnique({
      where: { id: parseInt(id) }
    });
    
    if (!image) {
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }
    
    // Deletar do Cloudinary se existir
    if (image.cloudinaryPublicId) {
      try {
        await cloudinary.uploader.destroy(image.cloudinaryPublicId);
      } catch (cloudinaryError) {
        console.warn('Erro ao deletar do Cloudinary:', cloudinaryError);
      }
    }
    
    // Deletar arquivo local se existir
    if (image.localPath && fs.existsSync(image.localPath)) {
      try {
        fs.unlinkSync(image.localPath);
      } catch (fileError) {
        console.warn('Erro ao deletar arquivo local:', fileError);
      }
    }
    
    // Deletar do banco
    await prisma.generatedImage.delete({
      where: { id: parseInt(id) }
    });
    
    res.json({
      success: true,
      message: 'Imagem deletada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar imagem:', error);
    res.status(500).json({ error: 'Erro ao deletar imagem' });
  }
});

// API para upload de imagens/mockups do app
app.post('/api/upload-app-image', uploadImage.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }

    // Recebe campos extras do frontend (incluindo cena)
    const { tag, description, sceneId, sceneDescription } = req.body;

    console.log(`📱 Upload de imagem do app: ${req.file.filename}`);
    console.log(`📝 Tag: ${tag}, Descrição: ${description}, Cena: ${sceneId}, CenaDesc: ${sceneDescription}`);

    // Upload para Cloudinary
    const uploadResult = await cloudinary.uploader.upload(req.file.path, {
      resource_type: 'image',
      folder: 'baby-diary-app-images',
      public_id: `app_${Date.now()}`,
      tags: tag ? [tag] : ['app-mockup']
    });

    // Salvar no banco de dados via Prisma
    const imageData = await prisma.appImage.create({
      data: {
        filename: req.file.filename,
        cloudinaryUrl: uploadResult.secure_url,
        cloudinaryPublicId: uploadResult.public_id,
        tag: tag || 'app-mockup',
        description: description || '',
        sceneId: sceneId || null,
        sceneDescription: sceneDescription || null,
        size: req.file.size
      }
    });

    // Apagar o arquivo local após o vídeo final ser gerado
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'Imagem enviada e salva no banco com sucesso',
      image: imageData
    });
  } catch (error) {
    console.error('Erro no upload de imagem do app:', error);
    res.status(500).json({ error: 'Erro ao enviar imagem: ' + error.message });
  }
});

// API para listar imagens do app
app.get('/api/app-images', async (req, res) => {
  try {
    const { tag } = req.query;
    
    // Ler do arquivo JSON
    const appImagesFile = path.join(__dirname, 'output', 'app_images.json');
    let images = [];
    
    if (fs.existsSync(appImagesFile)) {
      images = JSON.parse(fs.readFileSync(appImagesFile, 'utf8'));
    }
    
    // Filtrar por tag se especificado
    if (tag) {
      images = images.filter(img => img.tag === tag);
    }
    
    // Ordenar por data de criação (mais recente primeiro)
    images.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    res.json({ success: true, images });
  } catch (error) {
    console.error('Erro ao listar imagens do app:', error);
    res.status(500).json({ error: 'Erro ao listar imagens' });
  }
});

// API para deletar imagem do app
app.delete('/api/app-images/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Ler do arquivo JSON
    const appImagesFile = path.join(__dirname, 'output', 'app_images.json');
    let images = [];
    
    if (fs.existsSync(appImagesFile)) {
      images = JSON.parse(fs.readFileSync(appImagesFile, 'utf8'));
    }
    
    const image = images.find(img => img.id === parseInt(id));
    
    if (!image) {
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }
    
    // Deletar do Cloudinary
    if (image.cloudinaryPublicId) {
      await cloudinary.uploader.destroy(image.cloudinaryPublicId);
    }
    
    // Remover do array e salvar
    images = images.filter(img => img.id !== parseInt(id));
    fs.writeFileSync(appImagesFile, JSON.stringify(images, null, 2));
    
    res.json({ success: true, message: 'Imagem deletada com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar imagem do app:', error);
    res.status(500).json({ error: 'Erro ao deletar imagem' });
  }
});

// API para gerar sugestões de imagens por cena
app.post('/api/generate-scene-image-suggestions', async (req, res) => {
  try {
    const { tema, tipo, publico, formato, cenas, resolution } = req.body;
    
    if (!tema || !cenas || !Array.isArray(cenas)) {
      return res.status(400).json({ error: 'Tema e cenas são obrigatórios' });
    }

    console.log(`🎨 Gerando sugestões de imagens para ${cenas.length} cenas`);

    const apiKey = await getCredential('GEMINI_KEY');
    if (!apiKey) {
      return res.status(500).json({ error: 'Chave Gemini não configurada no banco' });
    }

    const { generateSceneImageSuggestions } = await import('./src/utils/sceneImageGenerator');
    
    const context = {
      tema,
      tipo: tipo || 'anuncio',
      publico: publico || 'maes',
      formato: formato || 'aiimage',
      cenas,
      resolution: resolution || 'horizontal'
    };

    const suggestions = await generateSceneImageSuggestions(context, apiKey);
    
    console.log(`✅ ${suggestions.length} sugestões de imagens geradas`);

    res.json({ 
      success: true, 
      suggestions,
      context
    });
  } catch (error) {
    console.error('Erro ao gerar sugestões de imagens:', error);
    res.status(500).json({ error: 'Erro ao gerar sugestões de imagens: ' + error.message });
  }
});

// API para gerar temas de imagens
app.post('/api/generate-image-themes', async (req, res) => {
  try {
    const { tema, tipo, publico } = req.body;
    
    if (!tema) {
      return res.status(400).json({ error: 'Tema é obrigatório' });
    }

    console.log(`🎨 Gerando temas de imagens para: ${tema}`);

    const apiKey = await getCredential('GEMINI_KEY');
    if (!apiKey) {
      return res.status(500).json({ error: 'Chave Gemini não configurada no banco' });
    }

    const { generateImageThemes } = await import('./src/utils/sceneImageGenerator');
    
    const context = {
      tema,
      tipo: tipo || 'anuncio',
      publico: publico || 'maes',
      formato: 'aiimage',
      cenas: [],
      resolution: 'horizontal'
    };

    const themes = await generateImageThemes(context, apiKey);
    
    console.log(`✅ ${themes.length} temas de imagens gerados`);

    res.json({ 
      success: true, 
      themes,
      context
    });
  } catch (error) {
    console.error('Erro ao gerar temas de imagens:', error);
    res.status(500).json({ error: 'Erro ao gerar temas de imagens: ' + error.message });
  }
});

// API para analisar e melhorar imagem
app.post('/api/analyze-image', async (req, res) => {
  try {
    const { imageUrl, context } = req.body;
    
    if (!imageUrl || !context) {
      return res.status(400).json({ error: 'URL da imagem e contexto são obrigatórios' });
    }

    console.log(`🔍 Analisando imagem: ${imageUrl}`);

    const apiKey = await getCredential('GEMINI_KEY');
    if (!apiKey) {
      return res.status(500).json({ error: 'Chave Gemini não configurada no banco' });
    }

    const { analyzeAndImproveImage } = await import('./src/utils/sceneImageGenerator');
    
    const analysis = await analyzeAndImproveImage(imageUrl, context, apiKey);
    
    console.log(`✅ Análise de imagem concluída`);

    res.json({ 
      success: true, 
      analysis
    });
  } catch (error) {
    console.error('Erro ao analisar imagem:', error);
    res.status(500).json({ error: 'Erro ao analisar imagem: ' + error.message });
  }
});

// API para gerar vídeo com imagens do app
app.post('/api/generate-video-with-app-images', async (req, res) => {
  try {
    const { tema, tipo, publico, formato, cenas, resolution, showCallToAction, showWatermark, appImageIds } = req.body;
    
    if (!tema) {
      return res.status(400).json({ error: 'Tema é obrigatório' });
    }

    console.log(`🎬 Gerando vídeo com imagens do app: ${tema} (${appImageIds?.length || 0} imagens)`);

    // Buscar imagens do app selecionadas
    let appImages = [];
    if (appImageIds && appImageIds.length > 0) {
      // Ler do arquivo JSON
      const appImagesFile = path.join(__dirname, 'output', 'app_images.json');
      let allImages = [];
      
      if (fs.existsSync(appImagesFile)) {
        allImages = JSON.parse(fs.readFileSync(appImagesFile, 'utf8'));
      }
      
      appImages = allImages.filter(img => appImageIds.includes(img.id.toString()));
    }
    
    console.log(`📱 Imagens do app encontradas: ${appImages.length}`);

    // Gerar título e hashtags com IA
    const apiKey = await getCredential('GEMINI_KEY');
    if (!apiKey) {
      return res.status(500).json({ error: 'Chave Gemini não configurada no banco' });
    }

    const { generateVideoTitle, generateVideoHashtags } = await import('./src/text/gemini-groq');
    
    const titulo = await generateVideoTitle(tema, tipo, publico, apiKey);
    const hashtags = await generateVideoHashtags(tema, tipo, publico, apiKey);
    
    console.log(`📝 Título gerado: ${titulo}`);
    console.log(`🏷️ Hashtags geradas: ${hashtags}`);

    // Construir comando do orchestrator com imagens do app
    const orchestratorPath = './src/orchestrators/orchestrator-animated-images.ts';
    let command = `npx ts-node ${orchestratorPath} --tema="${tema}" --tipo="${tipo}" --publico="${publico}" --formato="${formato}" --cenas="${cenas}" --resolution="${resolution || 'horizontal'}" --showCallToAction="${showCallToAction !== false}" --showWatermark="${showWatermark !== false}"`;
    
    // Adicionar URLs das imagens do app se disponíveis
    if (appImages.length > 0) {
      const imageUrls = appImages.map(img => img.cloudinaryUrl).join(',');
      command += ` --app-images="${imageUrls}"`;
    }

    console.log(`🚀 Executando: ${command}`);

    exec(command, async (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Erro ao gerar vídeo:', error);
        return res.status(500).json({ error: 'Erro ao gerar vídeo', details: error.message });
      }

      if (stderr) {
        console.log('⚠️ Stderr:', stderr);
      }

      console.log('✅ Vídeo gerado com sucesso!');
      console.log('📊 Output:', stdout);

      // Extrair caminho do vídeo do output
      const videoPath = extractVideoPath(stdout);
      if (!videoPath) {
        console.error('❌ Não foi possível encontrar o caminho do vídeo no output');
        console.log('📊 Output completo:', stdout);
        return res.status(500).json({ error: 'Não foi possível localizar o vídeo gerado' });
      }

      console.log(`🎬 Vídeo encontrado: ${videoPath}`);

      // Verificar se o arquivo existe
      if (!fs.existsSync(videoPath)) {
        console.error('❌ Arquivo de vídeo não encontrado:', videoPath);
        return res.status(500).json({ error: 'Arquivo de vídeo não encontrado' });
      }

      // Gerar thumbnail
      const thumbnailPath = videoPath.replace('.mp4', '_thumb.jpg');
      const thumbnailFileName = path.basename(thumbnailPath);

      try {
        console.log('🖼️ Gerando thumbnail...');
        await generateThumbnail(videoPath, thumbnailPath);
        console.log(`✅ Thumbnail gerado: ${thumbnailPath}`);
      } catch (thumbErr) {
        console.error('❌ Erro ao gerar thumbnail do vídeo:', thumbErr);
        
        // Fallback: usar primeira imagem como thumbnail
        try {
          const firstImage = videoPath.replace('.mp4', '_scene1.jpg');
          if (fs.existsSync(firstImage)) {
            fs.copyFileSync(firstImage, thumbnailPath);
            console.log(`✅ Thumbnail gerada a partir da primeira imagem: ${thumbnailPath}`);
          } else {
            console.error('❌ Não foi possível encontrar a primeira imagem para gerar o thumbnail.');
          }
        } catch (imgErr) {
          console.error('❌ Fallback de thumbnail com imagem também falhou:', imgErr);
        }
      }

      // Salvar metadados
      const videoMetadataManager = await import('./src/utils/videoMetadata');
      const metadata = {
        titulo,
        hashtags,
        tema,
        tipo,
        publico,
        formato,
        cenas: parseInt(cenas),
        resolution: resolution || 'horizontal',
        videoPath: path.basename(videoPath),
        thumbnailPath: thumbnailFileName,
        tamanho: fs.statSync(videoPath).size,
        createdAt: new Date().toISOString()
      };

      const videoId = videoMetadataManager.videoMetadataManager.addVideo(metadata);
      console.log(`✅ Metadados salvos com ID: ${videoId}`);
      
      // Upload para Cloudinary
      try {
        console.log('☁️ Iniciando upload para Cloudinary...');
        
        // Upload do vídeo
        const videoUploadResult = await cloudinary.uploader.upload(videoPath, {
          resource_type: 'video',
          folder: 'baby-diary-videos',
          public_id: `video_${videoId}`,
        });
        console.log('✅ Upload do vídeo para Cloudinary concluído:', videoUploadResult.secure_url);
        
        // Upload do thumbnail
        let thumbnailCloudinaryUrl = null;
        if (fs.existsSync(thumbnailPath)) {
          const thumbnailUploadResult = await cloudinary.uploader.upload(thumbnailPath, {
            resource_type: 'image',
            folder: 'baby-diary-thumbnails',
            public_id: `thumb_${videoId}`,
          });
          thumbnailCloudinaryUrl = thumbnailUploadResult.secure_url;
          console.log('✅ Upload do thumbnail para Cloudinary concluído:', thumbnailCloudinaryUrl);
        }
        
        // Atualizar metadados com URLs do Cloudinary
        videoMetadataManager.videoMetadataManager.updateVideo(videoId, {
          cloudinaryVideoUrl: videoUploadResult.secure_url,
          cloudinaryThumbnailUrl: thumbnailCloudinaryUrl
        });
        
        return res.json({ 
          success: true, 
          message: 'Vídeo gerado com sucesso!',
          videoId: videoId,
          videoPath: path.basename(videoPath),
          thumbnailPath: thumbnailFileName,
          titulo: titulo,
          hashtags: hashtags,
          downloadUrl: videoUploadResult.secure_url,
          cloudinaryUrl: videoUploadResult.secure_url,
          cloudinaryThumbnailUrl: thumbnailCloudinaryUrl,
          appImagesUsed: appImages.length,
          stdout: stdout
        });
      } catch (cloudErr) {
        console.error('❌ Erro ao enviar para Cloudinary:', cloudErr);
        return res.status(500).json({ 
          error: 'Erro ao enviar vídeo para Cloudinary', 
          details: cloudErr.message,
          videoId: videoId,
          videoPath: path.basename(videoPath),
          thumbnailPath: thumbnailFileName,
          titulo: titulo,
          hashtags: hashtags,
          stdout: stdout
        });
      }
    });
  } catch (error) {
    console.error('Erro ao gerar vídeo com imagens do app:', error);
    res.status(500).json({ error: 'Erro ao gerar vídeo' });
  }
});

// Endpoint para verificar uso de tokens das APIs
app.get('/api/usage/tokens', async (req, res) => {
  try {
    const usage = {
      gemini: { available: false, usage: null, error: null },
      groq: { available: false, usage: null, error: null },
      openai: { available: false, usage: null, error: null }
    };

    // Verificar uso do Gemini
    try {
      const geminiKey = await getCredential('GEMINI_KEY');
      if (geminiKey) {
        // Gemini não tem endpoint público para verificar quota, mas podemos testar conectividade
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        // Fazer uma requisição pequena para testar
        const result = await model.generateContent('Teste de conectividade');
        await result.response;
        
        usage.gemini.available = true;
        usage.gemini.usage = {
          status: 'Ativo',
          note: 'Gemini não fornece API pública para verificar quota. Verifique no Google AI Studio.',
          model: 'gemini-1.5-flash'
        };
      }
    } catch (error: any) {
      usage.gemini.error = error.message || 'Erro desconhecido';
      if (error.status === 429) {
        usage.gemini.usage = {
          status: 'Quota Excedida',
          note: 'Limite diário atingido. Reseta às 00:00 UTC.',
          model: 'gemini-1.5-flash'
        };
      }
    }

    // Verificar uso do Groq
    try {
      const groqKey = await getCredential('GROQ_API_KEY');
      if (groqKey) {
        // Groq não tem endpoint público para verificar quota, mas podemos testar conectividade
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + groqKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama3-8b-8192',
            messages: [{ role: 'user', content: 'Teste de conectividade' }],
            max_tokens: 10
          })
        });
        
        if (response.ok) {
          usage.groq.available = true;
          usage.groq.usage = {
            status: 'Ativo',
            note: 'Groq não fornece API pública para verificar quota. Verifique no dashboard Groq.',
            model: 'llama3-8b-8192'
          };
        } else if (response.status === 429) {
          usage.groq.usage = {
            status: 'Rate Limit',
            note: 'Limite de requisições atingido. Tente novamente em alguns segundos.',
            model: 'llama3-8b-8192'
          };
        } else {
          usage.groq.error = `HTTP ${response.status}: ${response.statusText}`;
        }
      }
    } catch (error: any) {
      usage.groq.error = error.message || 'Erro desconhecido';
    }

    // Verificar uso do OpenAI
    try {
      const openaiKey = await getCredential('OPENAI_API_KEY');
      if (openaiKey) {
        // OpenAI tem endpoint para verificar uso
        const response = await fetch('https://api.openai.com/v1/usage', {
          headers: {
            'Authorization': 'Bearer ' + openaiKey
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          usage.openai.available = true;
          usage.openai.usage = {
            status: 'Ativo',
            total_usage: data.total_usage,
            daily_costs: data.daily_costs,
            object: data.object
          };
        } else if (response.status === 429) {
          usage.openai.usage = {
            status: 'Rate Limit',
            note: 'Limite de requisições atingido.'
          };
        } else {
          usage.openai.error = `HTTP ${response.status}: ${response.statusText}`;
        }
      }
    } catch (error: any) {
      usage.openai.error = error.message || 'Erro desconhecido';
    }

    res.json({
      success: true,
      usage,
      summary: {
        total_apis: 3,
        available_apis: Object.values(usage).filter(api => api.available).length,
        apis_with_quota_info: Object.values(usage).filter(api => api.usage && api.usage.status !== 'Ativo').length
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao verificar uso de tokens'
    });
  }
});

// Endpoint para verificar status das APIs
app.get('/api/status/apis', async (req, res) => {
  try {
    const status = {
      gemini: { available: false, error: null },
      groq: { available: false, error: null },
      openai: { available: false, error: null },
      elevenlabs: { available: false, error: null, credits: null }
    };

    // Testar Gemini
    try {
      const geminiKey = await getCredential('GEMINI_KEY');
      if (geminiKey) {
        const genAI = new GoogleGenerativeAI(geminiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        await model.generateContent('Teste de conectividade');
        status.gemini.available = true;
      }
    } catch (error: any) {
      status.gemini.error = error.message || 'Erro desconhecido';
    }

    // Testar Groq
    try {
      const groqKey = await getCredential('GROQ_API_KEY');
      if (groqKey) {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + groqKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama3-8b-8192',
            messages: [{ role: 'user', content: 'Teste de conectividade' }],
            max_tokens: 10
          })
        });
        
        if (response.ok) {
          status.groq.available = true;
        } else {
          status.groq.error = `HTTP ${response.status}: ${response.statusText}`;
        }
      }
    } catch (error: any) {
      status.groq.error = error.message || 'Erro desconhecido';
    }

    // Testar OpenAI
    try {
      const openaiKey = await getCredential('OPENAI_API_KEY');
      if (openaiKey) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + openaiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Teste de conectividade' }],
            max_tokens: 10
          })
        });
        
        if (response.ok) {
          status.openai.available = true;
        } else {
          status.openai.error = `HTTP ${response.status}: ${response.statusText}`;
        }
      }
    } catch (error: any) {
      status.openai.error = error.message || 'Erro desconhecido';
    }

    // Testar ElevenLabs
    try {
      const elevenlabsKey = await getCredential('ELEVENLABS_API_KEY');
      if (elevenlabsKey) {
        const response = await fetch('https://api.elevenlabs.io/v1/user/subscription', {
          headers: {
            'xi-api-key': elevenlabsKey
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          status.elevenlabs.available = true;
          status.elevenlabs.credits = {
            character_count: data.character_count,
            character_limit: data.character_limit,
            can_extend_character_limit: data.can_extend_character_limit
          };
        } else {
          status.elevenlabs.error = `HTTP ${response.status}: ${response.statusText}`;
        }
      }
    } catch (error: any) {
      status.elevenlabs.error = error.message || 'Erro desconhecido';
    }

    res.json({
      success: true,
      status,
      summary: {
        total_apis: 4,
        available_apis: Object.values(status).filter(api => api.available).length,
        fallback_available: Object.values(status).some(api => api.available)
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || 'Erro ao verificar status das APIs'
    });
  }
});

// Rota de status
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'online',
    timestamp: new Date().toISOString(),
    apis: {
      gemini: !!process.env.GEMINI_KEY,
      pexels: !!process.env.PEXELS_KEY,
      huggingface: !!process.env.HUGGINGFACE_API_KEY
    }
  });
});

// ===== INTEGRAÇÃO COM TIKTOK =====

// Função para baixar vídeo do Cloudinary para buffer
async function downloadVideoToBuffer(cloudinaryUrl: string): Promise<Buffer> {
  try {
    console.log(`📥 Baixando vídeo do Cloudinary: ${cloudinaryUrl}`);
    const response = await axios.get(cloudinaryUrl, { 
      responseType: 'arraybuffer',
      timeout: 30000 // 30 segundos timeout
    });
    
    const buffer = Buffer.from(response.data);
    console.log(`✅ Vídeo baixado: ${(buffer.length / 1024 / 1024).toFixed(2)}MB`);
    return buffer;
  } catch (error) {
    console.error(`❌ Erro ao baixar vídeo do Cloudinary:`, error);
    throw new Error(`Falha ao baixar vídeo: ${error.message}`);
  }
}

// Função para fazer upload para TikTok
async function uploadToTikTok(videoBuffer: Buffer, caption: string, accessToken: string) {
  try {
    console.log(`📤 Iniciando upload para TikTok...`);
    
    // Criar FormData com o vídeo
    const FormData = require('form-data');
    const form = new FormData();
    
    // Adicionar o vídeo como buffer
    form.append('video', videoBuffer, { 
      filename: 'video.mp4', 
      contentType: 'video/mp4' 
    });
    
    // Adicionar a legenda
    if (caption) {
      form.append('text', caption);
    }
    
    // Fazer a requisição para a API do TikTok
    const response = await axios.post(
      'https://open.tiktokapis.com/v2/post/publish/video/upload/',
      form,
      {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 segundos timeout
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );
    
    console.log(`✅ Upload para TikTok concluído:`, response.data);
    return response.data;
  } catch (error) {
    console.error(`❌ Erro no upload para TikTok:`, error);
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    }
    
    throw new Error(`Falha no upload para TikTok: ${error.message}`);
  }
}

// Endpoint para postar vídeo no TikTok
app.post('/api/tiktok/upload/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const { accessToken, customCaption } = req.body;
    
    console.log(`🎬 Iniciando upload para TikTok - Video ID: ${videoId}`);
    
    // Validar parâmetros
    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Access token do TikTok é obrigatório'
      });
    }
    
    // Buscar vídeo no metadata
    const videoMetadataPath = './output/video_metadata.json';
    if (!fs.existsSync(videoMetadataPath)) {
      return res.status(404).json({
        success: false,
        error: 'Arquivo de metadados não encontrado'
      });
    }
    
    const metadataContent = fs.readFileSync(videoMetadataPath, 'utf8');
    const metadata = JSON.parse(metadataContent);
    const video = metadata.videos.find((v: any) => v.id === videoId);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Vídeo não encontrado'
      });
    }
    
    // Verificar se já foi postado no TikTok
    if (video.tiktokUrl) {
      return res.status(400).json({
        success: false,
        error: 'Vídeo já foi postado no TikTok',
        tiktokUrl: video.tiktokUrl
      });
    }
    
    // Verificar se tem URL do Cloudinary
    if (!video.cloudinaryVideoUrl) {
      return res.status(400).json({
        success: false,
        error: 'Vídeo não possui URL do Cloudinary'
      });
    }
    
    // Baixar vídeo do Cloudinary
    const videoBuffer = await downloadVideoToBuffer(video.cloudinaryVideoUrl);
    
    // Preparar legenda
    let caption = customCaption || video.caption || video.titulo || 'Vídeo gerado pelo Baby Diary AI';
    
    // Adicionar hashtags se disponível
    if (video.hashtags) {
      caption += `\n\n${video.hashtags}`;
    }
    
    // Fazer upload para TikTok
    const tiktokResponse = await uploadToTikTok(videoBuffer, caption, accessToken);
    
    // Salvar URL do TikTok no metadata
    if (tiktokResponse.data && tiktokResponse.data.post_id) {
      const tiktokUrl = `https://www.tiktok.com/@user/video/${tiktokResponse.data.post_id}`;
      
      // Atualizar metadata
      video.tiktokUrl = tiktokUrl;
      video.tiktokPosted = true;
      video.tiktokPostedAt = new Date().toISOString();
      
      // Salvar metadata atualizado
      fs.writeFileSync(videoMetadataPath, JSON.stringify(metadata, null, 2));
      
      console.log(`✅ URL do TikTok salva: ${tiktokUrl}`);
      
      res.json({
        success: true,
        message: 'Vídeo postado no TikTok com sucesso!',
        tiktokUrl: tiktokUrl,
        postId: tiktokResponse.data.post_id,
        caption: caption
      });
    } else {
      throw new Error('Resposta do TikTok não contém post_id');
    }
    
  } catch (error: any) {
    console.error(`❌ Erro no endpoint TikTok:`, error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Endpoint para verificar status do TikTok
app.get('/api/tiktok/status/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    
    const videoMetadataPath = './output/video_metadata.json';
    if (!fs.existsSync(videoMetadataPath)) {
      return res.status(404).json({
        success: false,
        error: 'Arquivo de metadados não encontrado'
      });
    }
    
    const metadataContent = fs.readFileSync(videoMetadataPath, 'utf8');
    const metadata = JSON.parse(metadataContent);
    const video = metadata.videos.find((v: any) => v.id === videoId);
    
    if (!video) {
      return res.status(404).json({
        success: false,
        error: 'Vídeo não encontrado'
      });
    }
    
    res.json({
      success: true,
      videoId: videoId,
      tiktokPosted: video.tiktokPosted || false,
      tiktokUrl: video.tiktokUrl || null,
      tiktokPostedAt: video.tiktokPostedAt || null,
      hasCloudinaryUrl: !!video.cloudinaryVideoUrl,
      caption: video.caption || null
    });
    
  } catch (error: any) {
    console.error(`❌ Erro ao verificar status do TikTok:`, error);
    
    res.status(500).json({
      success: false,
      error: error.message || 'Erro interno do servidor'
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📱 Frontend disponível em http://localhost:${PORT}`);
  console.log(`🔧 APIs disponíveis:`);
  console.log(`   POST /api/generate-post`);
  console.log(`   POST /api/generate-caption`);
  console.log(`   POST /api/generate-marketing`);
  console.log(`   POST /api/generate-video-script`);
  console.log(`   POST /api/generate-sales-argument`);
  console.log(`   POST /api/generate-video`);
  console.log(`   GET  /api/videos`);
  console.log(`   GET  /api/videos/:id`);
  console.log(`   PUT  /api/videos/:id`);
  console.log(`   DELETE /api/videos/:id`);
  console.log(`   GET  /api/thumbnails/:filename`);
  console.log(`   GET  /api/download/:file`);
  console.log(`   POST /api/tiktok/upload/:videoId`);
  console.log(`   GET  /api/tiktok/status/:videoId`);
  console.log(`   GET  /api/status`);
}); 