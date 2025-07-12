// Este arquivo não deve mais ser usado para fallback. Se necessário, importar e exportar apenas generateImageFreepik.
import { spawn } from 'child_process';
import { log } from '../utils/logger';
import fs from 'fs';
import path from 'path';
import { generateImageFreepik } from './freepik';

export interface ImageGenerationOptions {
  size?: number;
  usePlaceholder?: boolean;
  outputDir?: string;
}

export async function generateImageWithImagen(
  prompt: string, 
  outputPath: string, 
  options: ImageGenerationOptions = {}
): Promise<string> {
  const { size = 512, usePlaceholder = false } = options;

  // 1. Tentar Runware API
  try {
    log('🌐 Tentando gerar imagem com Runware API...');
    return await generateImageFreepik(prompt, outputPath, { width: size, height: size });
  } catch (error) {
    log('⚠️  Runware API não disponível ou falhou, tentando carefree-creator...');
  }

  // 2. Tentar carefree-creator
  try {
    // const isCarefreeAvailable = await checkCarefreeServer(); // Removed
    // if (isCarefreeAvailable) { // Removed
      log('🎨 Tentando gerar imagem com carefree-creator...');
      return await generateImageFreepik(prompt, outputPath, { // Changed to generateImageFreepik
        width: size,
        height: size
      });
    // } // Removed
  } catch (error) {
    log('⚠️  Carefree-creator não disponível, tentando Hugging Face...');
  }

  // 3. Tentar Hugging Face
  try {
    // const isHuggingFaceAvailable = await checkHuggingFaceAPI(); // Removed
    // if (isHuggingFaceAvailable) { // Removed
      log('🤗 Tentando gerar imagem com Hugging Face...');
      return await generateImageFreepik(prompt, outputPath, { // Changed to generateImageFreepik
        width: size,
        height: size
      });
    // } // Removed
  } catch (error) {
    log('⚠️  Hugging Face não disponível, tentando imagen-pytorch...');
  }

  // 4. Fallback para imagen-pytorch local
  return new Promise((resolve, reject) => {
    log(`🎨 Gerando imagem local (imagen-pytorch ou placeholder): "${prompt}"`);
    const args = [
      'src/image/imagen.py',
      prompt,
      outputPath,
      '--size', size.toString()
    ];
    if (usePlaceholder) {
      args.push('--placeholder');
    }
    const pythonProcess = spawn('python', args);
    let stdout = '';
    let stderr = '';
    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
      log(`📝 Python: ${data.toString().trim()}`);
    });
    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
      log(`⚠️  Python Error: ${data.toString().trim()}`);
    });
    pythonProcess.on('close', (code) => {
      if (fs.existsSync(outputPath)) {
        log(`✅ Imagem gerada: ${outputPath}`);
        resolve(outputPath);
      } else if (code === 0) {
        reject(new Error('Arquivo de imagem não foi criado'));
      } else {
        if (stderr.includes('UnicodeEncodeError') && fs.existsSync(outputPath)) {
          log(`✅ Imagem gerada (erro de encoding ignorado): ${outputPath}`);
          resolve(outputPath);
        } else {
          reject(new Error(`Processo Python falhou com código ${code}: ${stderr}`));
        }
      }
    });
  });
}

export async function generateMultipleImages(
  prompts: string[], 
  outputDir: string = './output/images',
  options: ImageGenerationOptions = {}
): Promise<string[]> {
  const imagePaths: string[] = [];
  
  // Criar diretório se não existir
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  log(`🎨 Gerando ${prompts.length} imagens...`);
  
  for (let i = 0; i < prompts.length; i++) {
    const prompt = prompts[i];
    const outputPath = path.join(outputDir, `scene-${i + 1}.png`);
    
    try {
      const imagePath = await generateImageWithImagen(prompt, outputPath, options);
      imagePaths.push(imagePath);
      log(`✅ Imagem ${i + 1}/${prompts.length} gerada`);
    } catch (error) {
      log(`❌ Erro ao gerar imagem ${i + 1}: ${error}`);
      // Continuar com as próximas imagens
    }
  }
  
  log(`🎨 Total de imagens geradas: ${imagePaths.length}/${prompts.length}`);
  return imagePaths;
}

export function extractImagePromptsFromScript(script: string, maxImages: number = 5): string[] {
  // Extrair frases do roteiro que podem servir como prompts para imagens
  const sentences = script
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 10 && s.length < 200)
    .slice(0, maxImages);
  
  // Limpar e melhorar os prompts
  return sentences.map(sentence => {
    // Remover markdown e caracteres especiais
    let clean = sentence.replace(/[*_`#>\-]/g, '').replace(/\n/g, ' ');
    
    // Adicionar contexto visual se necessário
    if (!clean.toLowerCase().includes('bebê') && !clean.toLowerCase().includes('mãe')) {
      clean = `Cena de maternidade: ${clean}`;
    }
    
    // Limitar tamanho
    return clean.substring(0, 150);
  });
}

export async function createVideoFromImages(
  imagePaths: string[], 
  audioPath: string, 
  outputPath: string,
  durationPerImage: number = 3
): Promise<string> {
  return new Promise((resolve, reject) => {
    log(`🎬 Criando vídeo com ${imagePaths.length} imagens...`);
    
    // Criar arquivo de lista para FFmpeg com duração específica para cada imagem
    const listFile = './output/image_list.txt';
    let listContent = imagePaths
      .map(imgPath => `file '${path.resolve(imgPath)}'\nduration ${durationPerImage}`)
      .join('\n');
    
    // Adicionar a última imagem novamente para garantir duração correta
    if (imagePaths.length > 0) {
      listContent += `\nfile '${path.resolve(imagePaths[imagePaths.length - 1])}'`;
    }
    
    fs.writeFileSync(listFile, listContent);
    
    // Comando FFmpeg melhorado para criar vídeo com transições suaves
    const ffmpegArgs = [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', listFile,
      '-i', audioPath,
      '-c:v', 'libx264',
      '-c:a', 'aac',
      '-pix_fmt', 'yuv420p',
      '-vf', `fps=30,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=white`,
      '-r', '30',
      '-shortest',
      '-map', '0:v:0',
      '-map', '1:a:0',
      outputPath
    ];
    
    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
    
    ffmpegProcess.stdout.on('data', (data) => {
      log(`📹 FFmpeg: ${data.toString().trim()}`);
    });
    
    ffmpegProcess.stderr.on('data', (data) => {
      log(`📹 FFmpeg: ${data.toString().trim()}`);
    });
    
    ffmpegProcess.on('close', (code) => {
      // Limpar arquivo temporário
      if (fs.existsSync(listFile)) {
        fs.unlinkSync(listFile);
      }
      
      if (code === 0) {
        log(`✅ Vídeo criado: ${outputPath}`);
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg falhou com código ${code}`));
      }
    });
    
    ffmpegProcess.on('error', (error) => {
      reject(new Error(`Erro ao executar FFmpeg: ${error.message}`));
    });
  });
} 