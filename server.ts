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

app.use(cors({
  origin: 'http://localhost:5173', // ou '*' para liberar geral (não recomendado em produção)
  credentials: true
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