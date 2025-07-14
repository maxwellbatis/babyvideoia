import axios from 'axios';
import fs from 'fs';
import { getCredential } from '../utils/credentials';

export async function generateImageFreepik(prompt: string, outputPath: string, options: any = {}) {
  let apiKey = options.apiKey || process.env.FREEPIK_API_KEY;
  if (!apiKey) {
    apiKey = await getCredential('FREEPIK_API_KEY');
  }
  if (!apiKey) throw new Error('FREEPIK_API_KEY não configurada');

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
    prompt,
    num_images: 1,
    aspect_ratio,
    filter_nsfw: true,
  };

  const res = await axios.post(
    'https://api.freepik.com/v1/ai/text-to-image/flux-dev',
    body,
    { headers: { 'Content-Type': 'application/json', 'x-freepik-api-key': apiKey } }
  );

  const taskId = res.data?.data?.task_id;
  if (!taskId) throw new Error('Task ID não retornado pela Freepik!');

  // 2. Polling até a imagem estar pronta
  let imageUrl: string | undefined;
  for (let attempt = 0; attempt < 30; attempt++) {
    await new Promise(r => setTimeout(r, 3000));
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
  }
  if (!imageUrl) throw new Error('Imagem não gerada pela Freepik!');

  // 3. Baixar a imagem da URL
  const imgRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
  fs.writeFileSync(outputPath, imgRes.data);
  return outputPath;
} 