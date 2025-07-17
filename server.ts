import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { generateVideoVSL } from './src/orchestrators/orchestrator-vsl'; // ajuste o caminho se necessário
import cors from 'cors';

const app = express();
const port = process.env.PORT || 3001;

// Configuração para uploads de imagens (se necessário)
const upload = multer({ dest: 'uploads/' });

// Configurar CORS para aceitar requisições do frontend video.babydiary.shop
app.use(cors({
  origin: 'https://video.babydiary.shop',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Tipos principais do payload
interface CenaPayload {
  descricao: string;
  imagens?: string[]; // URLs ou caminhos das imagens enviadas pelo usuário
}

interface GenerateVideoPayload {
  tema: string;
  tipo: string;
  publico: string;
  tom: string;
  duracao: number;
  cenas: CenaPayload[];
  useStableDiffusion?: boolean;
  formato?: string;
  titulo?: string; // Novo campo para título do vídeo
  gerarLegenda?: boolean; // Novo campo para gerar legenda de redes sociais
  plataformaLegenda?: 'instagram' | 'facebook' | 'tiktok' | 'youtube'; // Novo campo para escolher plataforma
}

// Função utilitária para log com timestamp
function logServer(msg: string, ...args: any[]) {
  const now = new Date().toISOString();
  console.log(`[${now}] [SERVER] ${msg}`, ...args);
}

// Exemplo de log robusto nas rotas:

// Upload de imagem
app.post('/api/images', upload.single('file'), async (req, res) => {
  logServer('Recebendo upload de imagem...');
  try {
    const file = req.file;
    const category = req.body.category;
    logServer('Arquivo recebido:', file?.originalname, 'Categoria:', category);
    // ... lógica de salvar imagem ...
    logServer('Upload de imagem concluído:', file?.filename);
    res.status(200).json({ success: true });
  } catch (err) {
    logServer('Erro no upload de imagem:', err);
    res.status(500).json({ error: 'Erro ao fazer upload da imagem' });
  }
});

// Listagem de imagens
app.get('/api/images', async (req, res) => {
  logServer('Listando imagens...');
  try {
    // ... lógica de listar imagens ...
    logServer('Imagens listadas com sucesso');
    res.json([]); // Substitua pelo array real
  } catch (err) {
    logServer('Erro ao listar imagens:', err);
    res.status(500).json({ error: 'Erro ao listar imagens' });
  }
});

// Geração de vídeo
app.post('/api/generate-video', async (req, res) => {
  logServer('Recebendo requisição para gerar vídeo', req.body);
  const start = Date.now();
  try {
    // ... lógica de geração de vídeo ...
    logServer('Pipeline VSL iniciado');
    const payload: GenerateVideoPayload = req.body;
    const resultado = await generateVideoVSL(payload);
    logServer('Pipeline VSL finalizado com sucesso. Tempo:', (Date.now() - start) + 'ms');
    res.status(200).json(resultado);
  } catch (error) {
    logServer('Erro ao gerar vídeo:', error);
    res.status(500).json({ error: 'Erro ao processar pipeline', details: error });
  }
});

// Rota para listar vídeos (mock simples, pode evoluir depois)
app.get('/api/videos', (req, res) => {
  try {
    // Usar o gerenciador de metadados
    const { videoMetadataManager } = require('./src/utils/videoMetadata');
    const videos = videoMetadataManager.getAllVideos();
    
    // Formatar para o frontend
    const formattedVideos = videos.map(video => ({
      id: video.id,
      titulo: video.titulo,
      thumbnail: video.cloudinaryThumbnailUrl || video.thumbnailPath,
      url: video.cloudinaryVideoUrl || video.videoPath,
      hashtags: video.hashtags.split(' '),
      created_at: video.createdAt,
      status: 'completed',
      legendaRedesSociais: video.caption, // Novo campo
      configuracoes: {
        tema: video.tema,
        tipo: video.tipo,
        publico: video.publico,
        formato: video.formato,
        duracao: video.duracao
      }
    }));
    
    res.json(formattedVideos);
  } catch (err) {
    console.error('Erro ao carregar vídeos:', err);
    res.status(500).json({ error: 'Erro ao carregar vídeos' });
  }
});

// Rota para status das APIs (mock simples)
app.get('/api/status/apis', async (req, res) => {
  const { getCredential } = require('./src/utils/credentials');
  const { getFreepikUsageToday } = require('./src/utils/freepikUsage');
  const { getElevenLabsUsage } = require('./src/tts/elevenlabs');
  const status: any = {
    gemini: false,
    groq: false,
    elevenlabs: false,
    freepik: false,
    cloudinary: false,
    status: 'offline',
    limits: {
      gemini: '10.000/mês',
      groq: '5.000/dia',
      elevenlabs: '1M caracteres',
      freepik: '',
      cloudinary: '25GB'
    },
    usage: {
      gemini: null,
      groq: null,
      elevenlabs: null,
      freepik: null,
      cloudinary: null
    },
    errors: {}
  };
  let onlineCount = 0;

  // Gemini
  try {
    const geminiKey = await getCredential('GEMINI_KEY');
    if (geminiKey) {
      status.gemini = true;
      onlineCount++;
      // Não há endpoint público para uso real Gemini, então retorna null e mensagem
      status.usage.gemini = null;
      status.errors.gemini = 'A API Gemini não fornece endpoint público para consulta de uso. Consulte o painel do Google.';
    }
  } catch (e) {
    status.errors.gemini = e.message || e;
    status.usage.gemini = null;
  }

  // Groq
  try {
    const groqKey = await getCredential('GROQ_API_KEY');
    if (groqKey) {
      status.groq = true;
      onlineCount++;
      // Não há endpoint público para uso real Groq, então retorna null e mensagem
      status.usage.groq = null;
      status.errors.groq = 'A API Groq não fornece endpoint público para consulta de uso. Consulte o painel da Groq.';
    }
  } catch (e) {
    status.errors.groq = e.message || e;
    status.usage.groq = null;
  }

  // ElevenLabs
  try {
    const elevenKey = await getCredential('ELEVENLABS_API_KEY');
    if (elevenKey) {
      status.elevenlabs = true;
      onlineCount++;
      try {
        const usage = await getElevenLabsUsage(elevenKey);
        status.limits.elevenlabs = `${usage.limit} caracteres (${usage.plan})`;
        status.usage.elevenlabs = usage.used;
      } catch (e) {
        status.errors.elevenlabs = e.message || e;
        status.usage.elevenlabs = null;
      }
    }
  } catch (e) {
    status.errors.elevenlabs = e.message || e;
    status.usage.elevenlabs = null;
  }

  // Freepik
  try {
    const freepikKey = await getCredential('FREEPIK_API_KEY');
    if (freepikKey) {
      status.freepik = true;
      onlineCount++;
    }
    // Consumo real Freepik
    const freepikUsed = getFreepikUsageToday();
    status.limits.freepik = `100/dia (usado: ${freepikUsed})`;
    status.usage.freepik = freepikUsed;
  } catch (e) {
    status.errors.freepik = e.message || e;
    status.usage.freepik = null;
  }

  // Cloudinary
  try {
    const cloudName = await getCredential('CLOUDINARY_CLOUD_NAME');
    const apiKey = await getCredential('CLOUDINARY_API_KEY');
    const apiSecret = await getCredential('CLOUDINARY_API_SECRET');
    if (cloudName && apiKey && apiSecret) {
      try {
        const cloudinary = require('cloudinary').v2;
        cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
        // Testar conexão (listar recursos)
        await cloudinary.api.resources({ max_results: 1 });
        status.cloudinary = true;
        onlineCount++;
        // Buscar uso real
        try {
          const usage = await cloudinary.api.usage();
          status.limits.cloudinary = `${usage.plan?.storage_limit || '25GB'} (${usage.plan?.name || 'desconhecido'})`;
          status.usage.cloudinary = usage.storage?.usage || usage.storage_usage || null;
        } catch (e) {
          status.errors.cloudinary = e.message || e;
          status.usage.cloudinary = null;
        }
      } catch (e) {
        status.cloudinary = false;
        status.errors.cloudinary = e.message || e;
      }
    }
  } catch (e) {
    status.errors.cloudinary = e.message || e;
    status.usage.cloudinary = null;
  }

  // Status geral
  if (onlineCount === 5) status.status = 'online';
  else if (onlineCount > 0) status.status = 'partial';
  else status.status = 'offline';

  res.json(status);
});

// Rota para gerenciar credenciais
app.get('/api/credentials', async (req, res) => {
  try {
    const { getCredential } = require('./src/utils/credentials');
    
    const credentialNames = [
      'GEMINI_KEY',
      'GROQ_API_KEY', 
      'ELEVENLABS_API_KEY',
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
      'FREEPIK_API_KEY',
      'COLAB_SD_URL'
    ];
    
    const credentials = [];
    for (const name of credentialNames) {
      const value = await getCredential(name);
      if (value) {
        credentials.push({ name, value });
      }
    }
    
    res.json(credentials);
  } catch (error) {
    console.error('Erro ao carregar credenciais:', error);
    res.status(500).json({ error: 'Erro ao carregar credenciais' });
  }
});

app.post('/api/credentials', async (req, res) => {
  try {
    const { credentials } = req.body;
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    for (const cred of credentials) {
      await prisma.credential.upsert({
        where: { name: cred.name },
        update: { value: cred.value },
        create: { name: cred.name, value: cred.value }
      });
    }

    // Limpar cache após salvar
    try {
      const { clearCredentialCache } = require('./src/utils/credentials');
      clearCredentialCache();
    } catch (e) {
      console.warn('Não foi possível limpar o cache das credenciais:', e);
    }

    await prisma.$disconnect();
    res.json({ success: true, message: 'Credenciais salvas com sucesso' });
  } catch (error) {
    console.error('Erro ao salvar credenciais:', error);
    res.status(500).json({ error: 'Erro ao salvar credenciais' });
  }
});

// Rotas para testar conexões das APIs
app.post('/api/test/elevenlabs', async (req, res) => {
  try {
    const { apiKey } = req.body;
    const { gerarNarracaoElevenLabs } = require('./src/tts/elevenlabs');
    
    // Teste simples com texto curto
    const testText = '<speak>Teste de conexão ElevenLabs.</speak>';
    const testFile = `test_elevenlabs_${Date.now()}.mp3`;
    
    await gerarNarracaoElevenLabs(testText, testFile, undefined, apiKey);
    
    // Verificar se o arquivo foi criado
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile); // Limpar arquivo de teste
      res.json({ success: true, message: 'ElevenLabs conectado com sucesso' });
    } else {
      res.status(400).json({ error: 'Falha ao gerar áudio de teste' });
    }
  } catch (error) {
    console.error('Erro ao testar ElevenLabs:', error);
    res.status(500).json({ error: 'Falha ao conectar com ElevenLabs' });
  }
});

app.post('/api/test/gemini', async (req, res) => {
  try {
    const { apiKey } = req.body;
    const { generateWithFallback } = require('./src/text/gemini-groq');
    
    const testPrompt = 'Responda apenas com "OK" se esta conexão estiver funcionando.';
    const response = await generateWithFallback(testPrompt, undefined, () => Promise.resolve(apiKey));
    
    if (response && response.includes('OK')) {
      res.json({ success: true, message: 'Gemini conectado com sucesso' });
    } else {
      res.status(400).json({ error: 'Resposta inesperada do Gemini' });
    }
  } catch (error) {
    console.error('Erro ao testar Gemini:', error);
    res.status(500).json({ error: 'Falha ao conectar com Gemini' });
  }
});

app.post('/api/test/groq', async (req, res) => {
  try {
    const { apiKey } = req.body;
    const { generateWithFallback } = require('./src/text/gemini-groq');
    
    const testPrompt = 'Responda apenas com "OK" se esta conexão estiver funcionando.';
    const response = await generateWithFallback(testPrompt, undefined, () => Promise.resolve(apiKey));
    
    if (response && response.includes('OK')) {
      res.json({ success: true, message: 'Groq conectado com sucesso' });
    } else {
      res.status(400).json({ error: 'Resposta inesperada do Groq' });
    }
  } catch (error) {
    console.error('Erro ao testar Groq:', error);
    res.status(500).json({ error: 'Falha ao conectar com Groq' });
  }
});

app.post('/api/test/cloudinary', async (req, res) => {
  try {
    const { cloudName, apiKey, apiSecret } = req.body;
    
    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(400).json({ error: 'Todos os campos do Cloudinary são obrigatórios' });
    }
    
    // Teste simples de conexão com Cloudinary
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret
    });
    
    // Teste de listagem de recursos
    const result = await cloudinary.api.resources({ max_results: 1 });
    
    res.json({ success: true, message: 'Cloudinary conectado com sucesso' });
  } catch (error) {
    console.error('Erro ao testar Cloudinary:', error);
    res.status(500).json({ error: 'Falha ao conectar com Cloudinary' });
  }
});

app.post('/api/test/freepik', async (req, res) => {
  try {
    const { apiKey } = req.body;
    const { generateImageFreepik } = require('./src/image/freepik');
    
    // Teste simples de busca
    const testPrompt = 'mãe com bebê';
    const testFile = `test_freepik_${Date.now()}.png`;
    
    await generateImageFreepik(testPrompt, testFile, { resolution: 'vertical' });
    
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile); // Limpar arquivo de teste
      res.json({ success: true, message: 'Freepik conectado com sucesso' });
    } else {
      res.status(400).json({ error: 'Falha ao gerar imagem de teste' });
    }
  } catch (error) {
    console.error('Erro ao testar Freepik:', error);
    res.status(500).json({ error: 'Falha ao conectar com Freepik' });
  }
});

app.post('/api/test/colab', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL do Colab é obrigatória' });
    }
    
    // Teste simples de conectividade
    const axios = require('axios');
    const testUrl = url.replace(/\/$/, '') + '/sdapi/v1/txt2img';
    
    const response = await axios.get(testUrl, { timeout: 5000 });
    
    if (response.status === 200) {
      res.json({ success: true, message: 'Colab conectado com sucesso' });
    } else {
      res.status(400).json({ error: 'Colab não está respondendo corretamente' });
    }
  } catch (error) {
    console.error('Erro ao testar Colab:', error);
    res.status(500).json({ error: 'Falha ao conectar com Colab' });
  }
});

// Rotas para gerenciar músicas da biblioteca
app.get('/api/music', async (req, res) => {
  try {
    logServer('Listando músicas da biblioteca...');
    
    const musicDir = path.join(__dirname, 'assets', 'music');
    const categories = ['ambient', 'energetic', 'emotional', 'corporate'];
    const musicLibrary = [];
    
    for (const category of categories) {
      const categoryPath = path.join(musicDir, category);
      
      if (fs.existsSync(categoryPath)) {
        const files = fs.readdirSync(categoryPath).filter(file => 
          file.endsWith('.mp3') || file.endsWith('.wav') || file.endsWith('.m4a')
        );
        
        for (const file of files) {
          const filePath = path.join(categoryPath, file);
          const stats = fs.statSync(filePath);
          
          // Extrair informações do nome do arquivo
          const fileName = path.parse(file).name;
          const name = fileName.replace(/-/g, ' ').replace(/\d+$/, '').trim();
          
          // Mapear categoria para categoria do frontend
          const categoryMap = {
            'ambient': 'calm',
            'energetic': 'upbeat', 
            'emotional': 'dramatic',
            'corporate': 'corporate'
          };
          
          // Mapear categoria para gênero
          const genreMap = {
            'ambient': 'Ambient',
            'energetic': 'Electronic',
            'emotional': 'Orchestral',
            'corporate': 'Corporate'
          };
          
          // Mapear categoria para mood
          const moodMap = {
            'ambient': 'Relaxante',
            'energetic': 'Energético',
            'emotional': 'Emocional',
            'corporate': 'Profissional'
          };
          
          musicLibrary.push({
            id: `${category}_${fileName}`,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            artist: 'Biblioteca Baby Video AI',
            duration: Math.floor(Math.random() * 180) + 60, // Simular duração entre 1-4 min
            genre: genreMap[category],
            mood: moodMap[category],
            url: `/api/music/file/${category}/${encodeURIComponent(file)}`,
            waveform: Array.from({ length: 50 }, () => Math.random() * 100),
            liked: false,
            category: categoryMap[category],
            size: stats.size,
            uploaded_at: stats.mtime.toISOString()
          });
        }
      }
    }
    
    logServer(`✅ ${musicLibrary.length} músicas encontradas na biblioteca`);
    res.json(musicLibrary);
  } catch (error) {
    logServer('❌ Erro ao listar músicas:', error);
    res.status(500).json({ error: 'Erro ao carregar biblioteca de músicas' });
  }
});

// Rota para servir arquivos de música
app.get('/api/music/file/:category/:filename', (req, res) => {
  try {
    const { category, filename } = req.params;
    const musicPath = path.join(__dirname, 'assets', 'music', category, decodeURIComponent(filename));
    
    if (!fs.existsSync(musicPath)) {
      return res.status(404).json({ error: 'Arquivo de música não encontrado' });
    }
    
    // Configurar headers para streaming de áudio
    const stat = fs.statSync(musicPath);
    const fileSize = stat.size;
    const range = req.headers.range;
    
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(musicPath, { start, end });
      
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/mpeg',
      });
      file.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': 'audio/mpeg',
      });
      fs.createReadStream(musicPath).pipe(res);
    }
  } catch (error) {
    logServer('❌ Erro ao servir arquivo de música:', error);
    res.status(500).json({ error: 'Erro ao servir arquivo de música' });
  }
});

// Rota para upload de música (mantém compatibilidade)
app.post('/api/upload-music', upload.single('music'), async (req, res) => {
  try {
    logServer('Recebendo upload de música...');
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    const file = req.file;
    const stats = fs.statSync(file.path);
    
    // Mover arquivo para pasta de músicas (opcional)
    const musicDir = path.join(__dirname, 'assets', 'music', 'custom');
    if (!fs.existsSync(musicDir)) {
      fs.mkdirSync(musicDir, { recursive: true });
    }
    
    const newPath = path.join(musicDir, file.originalname);
    fs.renameSync(file.path, newPath);
    
    const musicData = {
      id: `custom_${Date.now()}`,
      name: path.parse(file.originalname).name,
      url: `/api/music/file/custom/${encodeURIComponent(file.originalname)}`,
      duration: Math.floor(Math.random() * 180) + 60,
      size: stats.size,
      uploaded_at: new Date().toISOString()
    };
    
    logServer('✅ Música enviada com sucesso:', musicData.name);
    res.json(musicData);
  } catch (error) {
    logServer('❌ Erro no upload de música:', error);
    res.status(500).json({ error: 'Erro ao fazer upload da música' });
  }
});

// Rota para deletar música (mantém compatibilidade)
app.delete('/api/music/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logServer(`Deletando música: ${id}`);
    
    // Por enquanto, apenas retorna sucesso (músicas da biblioteca não podem ser deletadas)
    res.json({ success: true, message: 'Música removida com sucesso' });
  } catch (error) {
    logServer('❌ Erro ao deletar música:', error);
    res.status(500).json({ error: 'Erro ao deletar música' });
  }
});

// Rotas para gerenciar imagens do usuário
app.post('/api/upload-image', upload.single('image'), async (req, res) => {
  try {
    logServer('Recebendo upload de imagem...');
    
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado' });
    }
    
    const file = req.file;
    const { descricao, categoria } = req.body;
    
    if (!descricao || !categoria) {
      return res.status(400).json({ error: 'Descrição e categoria são obrigatórias' });
    }
    
    logServer('Arquivo recebido:', file.originalname, 'Descrição:', descricao, 'Categoria:', categoria);
    
    // Upload para Cloudinary
    const cloudinary = require('cloudinary').v2;
    const { getCredential } = require('./src/utils/credentials');
    const cloudName = await getCredential('CLOUDINARY_CLOUD_NAME');
    const apiKey = await getCredential('CLOUDINARY_API_KEY');
    const apiSecret = await getCredential('CLOUDINARY_API_SECRET');
    if (!cloudName || !apiKey || !apiSecret) {
      return res.status(500).json({ error: 'Credenciais do Cloudinary não configuradas' });
    }
    
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret
    });
    
    // Upload da imagem
    const result = await cloudinary.uploader.upload(file.path, {     folder: 'babyvideoia/user-images',
      public_id: `user_image_${Date.now()}`,
      overwrite: true
    });
    
    // Salvar informações da imagem no JSON
    const imageData = {
      id: `img_${Date.now()}`,
      url: result.secure_url,
      descricao: descricao,
      categoria: categoria,
      originalName: file.originalname,
      size: file.size,
      uploaded_at: new Date().toISOString(),
      cloudinary_public_id: result.public_id
    };
    
    // Carregar imagens existentes
    const imagesFile = path.join(__dirname, 'user-images.json');
    let images = [];
    
    if (fs.existsSync(imagesFile)) {
      const fileContent = fs.readFileSync(imagesFile, 'utf8');
      images = JSON.parse(fileContent);
    }
    
    // Adicionar nova imagem
    images.push(imageData);
    
    // Salvar arquivo atualizado
    fs.writeFileSync(imagesFile, JSON.stringify(images, null, 2));
    
    // Limpar arquivo temporário
    fs.unlinkSync(file.path);
    
    logServer('✅ Imagem enviada com sucesso:', imageData.id);
    res.json(imageData);
    
  } catch (error) {
    logServer('❌ Erro no upload de imagem:', error);
    res.status(500).json({ error: 'Erro ao fazer upload da imagem' });
  }
});

// Rota para listar imagens do usuário
app.get('/api/user-images', async (req, res) => {
  try {
    logServer('Listando imagens do usuário...');
    const imagesFile = path.join(__dirname, 'user-images.json');
    let images = [];
    
    if (fs.existsSync(imagesFile)) {
      const fileContent = fs.readFileSync(imagesFile, 'utf8');
      images = JSON.parse(fileContent);
    }
    
    logServer(`✅ ${images.length} imagens encontradas`);
    res.json(images);
    
  } catch (error) {
    logServer('❌ Erro ao listar imagens:', error);
    res.status(500).json({ error: 'Erro ao carregar imagens do usuário' });
  }
});

// Rota para deletar imagem do usuário
app.delete('/api/user-images/:id', async (req, res) => {
  try {
    const { id } = req.params;
    logServer(`Deletando imagem: ${id}`);
    
    const imagesFile = path.join(__dirname, 'user-images.json');
    let images = [];
    
    if (fs.existsSync(imagesFile)) {
      const fileContent = fs.readFileSync(imagesFile, 'utf8');
      images = JSON.parse(fileContent);
    }
    
    // Encontrar imagem para deletar
    const imageIndex = images.findIndex(img => img.id === id);
    if (imageIndex === -1) {
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }
    
    const image = images[imageIndex];
    
    // Deletar do Cloudinary
    try {
      const cloudinary = require('cloudinary').v2;
      const { getCredential } = require('./src/utils/credentials');
      
      const cloudName = await getCredential('CLOUDINARY_CLOUD_NAME');
      const apiKey = await getCredential('CLOUDINARY_API_KEY');
      const apiSecret = await getCredential('CLOUDINARY_API_SECRET');
      
      if (cloudName && apiKey && apiSecret) {
        cloudinary.config({
          cloud_name: cloudName,
          api_key: apiKey,
          api_secret: apiSecret
        });
        
        await cloudinary.uploader.destroy(image.cloudinary_public_id);
        logServer('✅ Imagem deletada do Cloudinary');
      }
    } catch (cloudinaryError) {
      logServer('⚠️ Erro ao deletar do Cloudinary:', cloudinaryError);
    }
    
    // Remover da lista
    images.splice(imageIndex, 1);
    
    // Salvar arquivo atualizado
    fs.writeFileSync(imagesFile, JSON.stringify(images, null, 2));
    
    logServer('✅ Imagem deletada com sucesso');
    res.json({ success: true, message: 'Imagem removida com sucesso' });
    
  } catch (error) {
    logServer('❌ Erro ao deletar imagem:', error);
    res.status(500).json({ error: 'Erro ao deletar imagem' });
  }
});

app.post('/api/chat', async (req, res) => {
  const { message } = req.body;
  // Aqui você pode integrar com IA real, mas para teste:
  res.json({
    id: Date.now().toString(),
    message: `Resposta simulada da IA para: "${message}"`,
    type: 'assistant',
    timestamp: new Date().toISOString(),
    suggestions: [
      'Quero mais ideias de temas',
      'Sugira uma música para este vídeo',
      'Que tipo de imagem usar?',
      'Como estruturar o roteiro?'
    ]
  });
});

app.listen(port, () => {
  console.log(`🚀 Novo backend VSL rodando em http://localhost:${port}`);
});

// Comentários orientando onde implementar cada função do pipeline
// Função: montarPromptIA(payload: GenerateVideoPayload): string
// Função: gerarRoteiroComSSML(prompt: string): Promise<RoteiroGerado>
// Função: gerarImagensPorCena(cena: CenaPayload): Promise<string[]>
// Função: gerarNarracaoElevenLabs(roteiro: RoteiroGerado): Promise<string>
// Função: sincronizarAudioImagens(...)
// Função: montarVideoFinal(...)
// Função: gerarLegendasWhisper(...) 