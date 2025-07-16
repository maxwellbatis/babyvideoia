import axios from "axios";
import fs from "fs";
import path from "path";
import { generateWithFallback } from "../text/gemini-groq"; // Usa fallback Gemini/Groq
import { getCredential } from '../utils/credentials';

// Prompt negativo fixo para realismo e segurança
const NEGATIVE_PROMPT = "doll, toy, cartoon, illustration, 3d, cgi, render, wax, mannequin, extra fingers, extra limbs, deformed, big eyes, anime, stylized, plastic, fake, blurry, lowres, bad anatomy, bad hands, bad face, mutated, poorly drawn, out of frame, unnatural skin, waxy, glossy, extra arms, extra legs, fused fingers, fused limbs, missing fingers, missing limbs, bad proportions, bad eyes, bad mouth, bad teeth, bad nose, bad ears, bad hair, bad lighting, bad composition, bad anatomy, mutated hands, mutated face, mutated body, ugly, creepy, scary, horror, monster, grotesque, distorted, artifact, watermark, signature, text, error, jpeg artifacts, low quality, lowres, worst quality, low detail, low realism, not photorealistic, not realistic, not natural, not candid, not photo, not photography, not portrait, not real";

// Sempre busca do banco, nunca usa cache ou .env
async function getColabUrl(): Promise<string> {
  const dbUrl = await getCredential('COLAB_SD_URL');
  if (!dbUrl || dbUrl.includes('seu_colab_url_aqui') || dbUrl.includes('SEU_COLAB_URL')) {
    throw new Error('URL do Colab SD não configurada corretamente no banco. Configure em Configurações de API.');
  }
  // Garante que termina sem barra
  const cleanUrl = dbUrl.replace(/\/$/, '');
  return cleanUrl + '/sdapi/v1/txt2img';
}

/**
 * Traduz o prompt para inglês usando Gemini, com fallback automático para Groq.
 */
export async function traduzirPromptParaIngles(promptPt: string): Promise<string> {
  const systemPrompt = "Traduza o texto abaixo para inglês, mantendo o máximo de naturalidade e contexto visual para geração de imagem realista. Não explique, apenas traduza.";
  const prompt = `Texto: ${promptPt}`;
  try {
    const traducao = await generateWithFallback(prompt, systemPrompt);
    return traducao.replace(/["']/g, "").trim();
  } catch (err) {
    throw new Error("Falha ao traduzir prompt para inglês: " + (err as Error).message);
  }
}

/**
 * Gera uma imagem realista usando Stable Diffusion no Colab.
 * @param promptPt Prompt em português
 * @param outputPath Caminho para salvar a imagem (ex: './output/imagem1.png')
 * @param options Opções de geração (negativePrompt, resolution, width, height)
 * @returns Caminho da imagem salva
 */
export async function gerarImagemColabSD(
  promptPt: string, 
  outputPath: string, 
  options: {
    negativePrompt?: string;
    resolution?: 'vertical' | 'horizontal' | 'square';
    width?: number;
    height?: number;
    slowMode?: boolean; // Novo parâmetro para modo lento
  } = {}
): Promise<string> {
  // 1. Traduzir prompt para inglês
  console.log(`🔄 Traduzindo prompt para inglês: "${promptPt.substring(0, 50)}..."`);
  const promptEn = await traduzirPromptParaIngles(promptPt);
  console.log(`✅ Tradução concluída: "${promptEn.substring(0, 50)}..."`);
  
  // 2. Determinar dimensões baseado na resolução
  let width = options.width;
  let height = options.height;
  
  if (!width || !height) {
    // Dimensões padrão baseadas na resolução
    if (options.resolution === 'vertical') {
      width = 576;
      height = 1024; // Formato 9:16 para stories
    } else if (options.resolution === 'horizontal') {
      width = 1280;
      height = 720; // Formato 16:9 para vídeos horizontais
    } else {
      width = 1024;
      height = 1024; // Formato quadrado
    }
  }
  
  // 3. Montar payload com configurações mais lentas se solicitado
  const steps = options.slowMode ? 100 : 60; // Mais steps = mais lento mas melhor qualidade
  const cfgScale = options.slowMode ? 8 : 7; // Maior CFG = mais lento mas mais preciso
  
  const data = {
    prompt: promptEn,
    negative_prompt: options.negativePrompt || NEGATIVE_PROMPT,
    steps: steps,
    cfg_scale: cfgScale,
    width: width,
    height: height,
    sampler_name: options.slowMode ? "DPM++ 2M Karras" : "Euler a", // Sampler mais lento
    denoising_strength: options.slowMode ? 0.7 : 0.75 // Menor denoising = mais lento
  };
  
  console.log(`🎨 Configurações SD: ${steps} steps, CFG ${cfgScale}, ${width}x${height}`);
  if (options.slowMode) {
    console.log(`🐌 Modo lento ativado - aguarde mais tempo para melhor qualidade`);
  }
  
  // 4. Delay inicial para estabilizar o Colab
  if (options.slowMode) {
    console.log(`⏳ Aguardando 5 segundos para estabilizar o Colab...`);
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  // 5. Chamar API do Colab
  try {
    const colabUrl = await getColabUrl();
    console.log(`🚀 Enviando requisição para Colab: ${colabUrl}`);
    
    const startTime = Date.now();
    const res = await axios.post(colabUrl, data, { 
      timeout: options.slowMode ? 300000 : 120000 // 5 minutos no modo lento
    });
    const endTime = Date.now();
    
    console.log(`⏱️ Tempo de geração: ${Math.round((endTime - startTime) / 1000)}s`);
    
    const base64Image = res.data.images?.[0];
    if (base64Image) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, Buffer.from(base64Image, "base64"));
      
      // Verificar se a imagem foi salva corretamente
      const stats = fs.statSync(outputPath);
      console.log(`✅ Imagem ${width}x${height} salva em ${outputPath} (${Math.round(stats.size / 1024)}KB)`);
      
      // Delay adicional no modo lento para não sobrecarregar
      if (options.slowMode) {
        console.log(`⏳ Aguardando 8 segundos antes da próxima geração...`);
        await new Promise(resolve => setTimeout(resolve, 8000));
      }
      
      return outputPath;
    } else {
      throw new Error("Nenhuma imagem foi retornada pela API do Colab.");
    }
  } catch (err: any) {
    console.error(`❌ Erro detalhado do Colab:`, err.response?.data || err.message);
    throw new Error("Erro ao gerar imagem no Colab: " + (err.response?.data || err.message));
  }
}

// Função mantida para compatibilidade, mas agora não faz cache
export function clearColabCache() {
  // Não faz mais nada
} 