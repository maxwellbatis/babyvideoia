import axios from "axios";
import fs from "fs";
import path from "path";
import { generateWithFallback } from "../text/gemini-groq"; // Usa fallback Gemini/Groq
import { getCredential } from '../utils/credentials';

// Prompt negativo fixo para realismo e segurança
const NEGATIVE_PROMPT = "(nsfw, nude, naked, deformed iris, deformed pupils, semi-realistic, cgi, 3d, render, sketch, cartoon, drawing, anime, mutated hands and fingers:1.4), (deformed, distorted, disfigured:1.3), poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, disconnected limbs, mutation, mutated, ugly, disgusting, amputation";

let cachedColabUrl: string | undefined;
async function getColabUrl(): Promise<string> {
  if (cachedColabUrl) return cachedColabUrl;
  let dbUrl = await getCredential('COLAB_SD_URL');
  dbUrl = dbUrl || process.env.COLAB_SD_URL || "https://SEU_COLAB_URL";
  // Garante que termina sem barra
  dbUrl = dbUrl.replace(/\/$/, '');
  // Garante que termina com o endpoint correto
  cachedColabUrl = dbUrl + '/sdapi/v1/txt2img';
  return cachedColabUrl;
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
 * Gera uma imagem vertical realista usando Stable Diffusion no Colab.
 * @param promptPt Prompt em português
 * @param outputPath Caminho para salvar a imagem (ex: './output/imagem1.png')
 * @returns Caminho da imagem salva
 */
export async function gerarImagemColabSD(promptPt: string, outputPath: string, negativePrompt?: string): Promise<string> {
  // 1. Traduzir prompt para inglês
  const promptEn = await traduzirPromptParaIngles(promptPt);
  // 2. Montar payload
  const data = {
    prompt: promptEn,
    negative_prompt: negativePrompt || NEGATIVE_PROMPT,
    steps: 60,
    width: 512,
    height: 768
  };
  // 3. Chamar API do Colab
  try {
    const colabUrl = await getColabUrl();
    const res = await axios.post(colabUrl, data, { timeout: 120000 });
    const base64Image = res.data.images?.[0];
    if (base64Image) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, Buffer.from(base64Image, "base64"));
      console.log("✅ Imagem salva em", outputPath);
      return outputPath;
    } else {
      throw new Error("Nenhuma imagem foi retornada pela API do Colab.");
    }
  } catch (err: any) {
    throw new Error("Erro ao gerar imagem no Colab: " + (err.response?.data || err.message));
  }
}

export function clearColabCache() {
  cachedColabUrl = undefined;
} 