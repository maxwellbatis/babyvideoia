import axios from 'axios';
import fs from 'fs';
import { getCredential } from '../utils/credentials';

export async function generateImageFreepik(prompt: string, outputPath: string, options: any = {}) {
  let apiKey = options.apiKey || process.env.FREEPIK_API_KEY;
  if (!apiKey) {
    apiKey = await getCredential('FREEPIK_API_KEY');
  }
  if (!apiKey) throw new Error('FREEPIK_API_KEY não configurada');

  const aspectMap: Record<string, string> = {
    'square': 'square_1_1',
    'portrait': 'portrait_2_3',
    'landscape': 'widescreen_16_9',
  };
  const aspect_ratio = aspectMap[options.imageSize || 'square'] || 'square_1_1';

  const body = {
    prompt,
    num_images: 1,
    aspect_ratio,
    filter_nsfw: true,
  };

  const res = await axios.post(
    'https://api.freepik.com/v1/ai/text-to-image',
    body,
    { headers: { 'Content-Type': 'application/json', 'x-freepik-api-key': apiKey } }
  );

  const data = res.data?.data?.[0];
  if (!data?.base64) throw new Error('Imagem não gerada pela Freepik!');

  const buffer = Buffer.from(data.base64, 'base64');
  fs.writeFileSync(outputPath, buffer);
  return outputPath;
} 