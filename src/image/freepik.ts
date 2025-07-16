import axios from 'axios';
import fs from 'fs';
import { getCredential } from '../utils/credentials';
import { incrementFreepikUsage } from '../utils/freepikUsage';

export async function generateImageFreepik(prompt: string, outputPath: string, options: any = {}) {
  let apiKey = options.apiKey;
  if (!apiKey) {
    apiKey = await getCredential('FREEPIK_API_KEY');
  }
  if (!apiKey) throw new Error('FREEPIK_API_KEY não configurada');

  // Construir prompt realista adaptativo ao contexto
  const basePrompt = prompt.toLowerCase();
  let enhancedPrompt = prompt;
  
  // Adicionar elementos específicos baseados no contexto do prompt
  if (basePrompt.includes('bebê') || basePrompt.includes('baby') || basePrompt.includes('mãe') || basePrompt.includes('mother') || basePrompt.includes('família') || basePrompt.includes('family')) {
    // Para conteúdo materno-infantil
    enhancedPrompt = `${prompt}, fotografia realista, proporções humanas, natural skin, candid moment, motherhood, baby, family, love, care, tenderness, high quality, 4k, ultra realistic`;
  } else if (basePrompt.includes('negócio') || basePrompt.includes('business') || basePrompt.includes('empreendedor') || basePrompt.includes('empresário') || basePrompt.includes('corporativo')) {
    // Para conteúdo de negócios
    enhancedPrompt = `${prompt}, fotografia realista, ambiente corporativo, profissional, moderno, high quality, 4k, ultra realistic`;
  } else if (basePrompt.includes('influenciadora') || basePrompt.includes('social media') || basePrompt.includes('redes sociais')) {
    // Para conteúdo de influenciadoras
    enhancedPrompt = `${prompt}, fotografia realista, redes sociais, tecnologia, moderno, high quality, 4k, ultra realistic`;
  } else {
    // Para outros tipos de conteúdo
    enhancedPrompt = `${prompt}, fotografia realista, proporções humanas, natural skin, high quality, 4k, ultra realistic`;
  }
  
  // Adicionar elementos negativos universais
  enhancedPrompt += `, no doll, no toy, no cartoon, no illustration, no 3d, no cgi, no render, no wax, no mannequin, no extra fingers, no extra limbs, no deformed, no big eyes, no anime, no stylized, no plastic, no fake, no blurry, no lowres, no bad anatomy, no bad hands, no bad face, no mutated, no poorly drawn, no out of frame`;

  // Mapeamento de aspect ratio
  const aspectMap: Record<string, string> = {
    'square': 'square_1_1',
    'portrait': 'social_story_9_16',
    'vertical': 'social_story_9_16',
    'landscape': 'widescreen_16_9',
  };
  let imageSize = options.imageSize || 'square';
  if (options.resolution) {
    if (options.resolution === 'vertical' || options.resolution === 'portrait') {
      imageSize = 'vertical';
    } else if (options.resolution === 'horizontal' || options.resolution === 'landscape') {
      imageSize = 'landscape';
    } else {
      imageSize = 'square';
    }
  }
  const aspect_ratio = aspectMap[imageSize] || 'square_1_1';

  // 1. Criar tarefa
  const body = {
    prompt: enhancedPrompt,
    num_images: 1,
    aspect_ratio,
    filter_nsfw: true,
  };

  let taskId: string | undefined;
  try {
    const res = await axios.post(
      'https://api.freepik.com/v1/ai/text-to-image/flux-dev',
      body,
      { headers: { 'Content-Type': 'application/json', 'x-freepik-api-key': apiKey } }
    );
    taskId = res.data?.data?.task_id;
    if (!taskId) throw new Error('Task ID não retornado pela Freepik!');
  } catch (err: any) {
    throw new Error('Erro ao criar tarefa na Freepik: ' + (err.response?.data?.message || err.message));
  }

  // 2. Polling até a imagem estar pronta
  let imageUrl: string | undefined;
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise(r => setTimeout(r, 3000));
    try {
      const statusRes = await axios.get(
        `https://api.freepik.com/v1/ai/text-to-image/flux-dev/${taskId}`,
        { headers: { 'Content-Type': 'application/json', 'x-freepik-api-key': apiKey } }
      );
      if (statusRes.data?.data?.status === 'COMPLETED' && statusRes.data?.data?.generated?.length > 0) {
        imageUrl = statusRes.data.data.generated[0];
        break;
      }
      if (statusRes.data?.data?.status === 'FAILED') {
        throw new Error('Geração de imagem falhou na Freepik!');
      }
    } catch (err: any) {
      throw new Error('Erro ao consultar status da Freepik: ' + (err.response?.data?.message || err.message));
    }
  }
  if (!imageUrl) throw new Error('Imagem não gerada pela Freepik! (timeout ou erro na API)');

  // 3. Baixar a imagem da URL
  try {
    const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    fs.writeFileSync(outputPath, imgRes.data);
    // Verificar se a imagem foi salva corretamente
    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 1000) {
      throw new Error('Arquivo de imagem baixado da Freepik é inválido ou muito pequeno.');
    }
    incrementFreepikUsage();
    return outputPath;
  } catch (err: any) {
    throw new Error('Erro ao baixar imagem da Freepik: ' + (err.response?.data?.message || err.message));
  }
}

// Teste CLI rápido para debug
if (require.main === module) {
  (async () => {
    const prompt = process.argv[2] || 'mãe com bebê brincando, ambiente alegre';
    const output = process.argv[3] || './output/test_freepik_cli.png';
    try {
      console.log('Testando geração Freepik...');
      const result = await generateImageFreepik(prompt, output, { resolution: 'vertical' });
      console.log('✅ Imagem gerada:', result);
    } catch (err) {
      console.error('❌ Erro ao gerar imagem Freepik:', err);
      process.exit(1);
    }
  })();
} 