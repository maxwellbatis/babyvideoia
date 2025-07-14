// Montagem de vídeo com FFmpeg
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { log } from '../utils/logger';
const imageSize = require('image-size');

export interface VideoResolution {
  width: number;
  height: number;
  scale: string;
  aspectRatio: string;
}

export const VIDEO_RESOLUTIONS = {
  square: {
    width: 720,
    height: 720,
    scale: '720:720',
    aspectRatio: '1:1'
  },
  vertical: {
    width: 720,
    height: 1280,
    scale: '720:1280',
    aspectRatio: '9:16'
  },
  horizontal: {
    width: 1280,
    height: 720,
    scale: '1280:720',
    aspectRatio: '16:9'
  },
  hd: {
    width: 1920,
    height: 1080,
    scale: '1920:1080',
    aspectRatio: '16:9'
  }
} as const;

export type VideoFormat = keyof typeof VIDEO_RESOLUTIONS;

export function getVideoResolution(format: VideoFormat = 'horizontal'): VideoResolution {
  // Aliases para compatibilidade
  const formatMap: Record<string, VideoFormat> = {
    'landscape': 'horizontal',
    'portrait': 'vertical',
    'square': 'square',
    'hd': 'hd',
    'horizontal': 'horizontal',
    'vertical': 'vertical'
  };
  
  const normalizedFormat = formatMap[format] || 'horizontal';
  return VIDEO_RESOLUTIONS[normalizedFormat];
}

export function createKenBurnsAnimation(
  inputImage: string,
  outputVideo: string,
  duration: number,
  resolution: VideoFormat = 'horizontal'
): void {
  const res = getVideoResolution(resolution);

  // Detectar proporção da imagem
  let width = 0;
  let height = 0;
  try {
    const dimensions = imageSize(inputImage);
    width = dimensions.width || 0;
    height = dimensions.height || 0;
  } catch (e) {
    log(`⚠️ Não foi possível detectar dimensões da imagem, aplicando filtro padrão vertical.`);
    width = 0;
    height = 1;
  }

  // Remover qualquer animação: apenas scale+pad
  const filterChain = `scale=${res.scale}:force_original_aspect_ratio=decrease,pad=${res.width}:${res.height}:(ow-iw)/2:(oh-ih)/2:color=black`;

  const command = `ffmpeg -y -loop 1 -i "${inputImage}" -vf "${filterChain}" -c:v libx264 -t ${duration} -pix_fmt yuv420p -an "${outputVideo}"`;

  log(`FFMPEG: ${command}`);
  execSync(command);
}

export function addAudioToVideo(
  inputVideo: string,
  inputAudio: string,
  outputVideo: string,
  useShortest: boolean = true
): void {
  try {
    // Verificar se os arquivos de entrada existem
    if (!fs.existsSync(inputVideo)) {
      throw new Error(`Vídeo não encontrado: ${inputVideo}`);
    }
    
    if (!fs.existsSync(inputAudio)) {
      throw new Error(`Áudio não encontrado: ${inputAudio}`);
    }

    // Verificar se o arquivo de áudio tem tamanho > 0
    const audioStats = fs.statSync(inputAudio);
    if (audioStats.size === 0) {
      throw new Error(`Arquivo de áudio vazio: ${inputAudio}`);
    }

    // Comando para adicionar áudio
    let command = `ffmpeg -y -i "${inputVideo}" -i "${inputAudio}" -c:v copy -c:a aac -b:a 128k`;
    if (useShortest) {
      command += ' -shortest';
    }
    command += ` "${outputVideo}"`;
    
    log(`FFMPEG: ${command}`);
    execSync(command);

    // Verificar se o arquivo de saída foi criado
    if (!fs.existsSync(outputVideo) || fs.statSync(outputVideo).size === 0) {
      throw new Error(`Falha ao adicionar áudio: arquivo de saída inválido`);
    }

    log(`✅ Áudio adicionado ao vídeo com sucesso: ${outputVideo}`);
  } catch (error) {
    log(`❌ Erro ao adicionar áudio ao vídeo: ${error}`);
    
    // Fallback: copiar apenas o vídeo sem áudio
    try {
      log(`🔄 Tentando fallback: copiando vídeo sem áudio...`);
      fs.copyFileSync(inputVideo, outputVideo);
      log(`✅ Fallback executado: vídeo copiado sem áudio`);
    } catch (fallbackError) {
      log(`❌ Fallback também falhou: ${fallbackError}`);
      throw error;
    }
  }
}

export function addSubtitlesToVideo(
  inputVideo: string,
  subtitlesFile: string,
  outputVideo: string
): void {
  // Converter path para formato compatível com FFmpeg no Windows
  const normalizedSubtitlesPath = subtitlesFile.replace(/\\/g, '/');
  
  const command = `ffmpeg -y -i "${inputVideo}" -vf "subtitles=${normalizedSubtitlesPath}" -c:v libx264 -c:a aac -shortest "${outputVideo}"`;
  
  log(`FFMPEG: ${command}`);
  execSync(command);
}

export function applyVideoStyle(
  inputVideo: string,
  outputVideo: string,
  style: {
    text?: string;
    showCallToAction?: boolean;
    showWatermark?: boolean;
    resolution?: VideoFormat;
  } = {}
): void {
  const {
    text = '',
    showCallToAction = true,
    showWatermark = true,
    resolution = 'horizontal'
  } = style;

  const res = getVideoResolution(resolution);

  // Construir filtros de vídeo
  const filters = [];

  // Adicionar texto principal se fornecido
  if (text) {
    filters.push(`drawtext=text='${text}':fontfile=/Windows/Fonts/arial.ttf:fontsize=36:fontcolor=#ffffff:x=(w-text_w)/2:y=h-th-80:box=1:boxcolor=#000000@0.6:boxborderw=3`);
  }

  // Adicionar call-to-action
  if (showCallToAction) {
    filters.push(`drawtext=text='📱 Baixe o Baby Diary App':fontfile=/Windows/Fonts/arial.ttf:fontsize=20:fontcolor=#ffffff:x=(w-text_w)/2:y=30:box=1:boxcolor=#000000@0.7:boxborderw=2`);
  }

  // Adicionar watermark
  if (showWatermark) {
    filters.push(`drawtext=text='Baby Diary':fontfile=/Windows/Fonts/arial.ttf:fontsize=14:fontcolor=#ffffff@0.6:x=w-tw-10:y=h-th-10`);
  }

  // Remover qualquer animação: apenas scale+pad
  filters.push(`scale=${res.scale}:force_original_aspect_ratio=decrease,pad=${res.width}:${res.height}:(ow-iw)/2:(oh-ih)/2:color=black`);

  const filterString = filters.join(',');

  const command = `ffmpeg -y -i "${inputVideo}" -vf "${filterString}" -c:v libx264 -c:a aac -pix_fmt yuv420p "${outputVideo}"`;

  log(`FFMPEG: ${command}`);
  execSync(command);
}

export function concatenateVideos(
  inputList: string,
  outputVideo: string,
  resolution: VideoFormat = 'horizontal'
): void {
  const res = getVideoResolution(resolution);
  
  // CORREÇÃO: Usar force_original_aspect_ratio=decrease e pad para evitar distorção
  const filterChain = `scale=${res.scale}:force_original_aspect_ratio=decrease,pad=${res.width}:${res.height}:(ow-iw)/2:(oh-ih)/2:color=black`;
  
  const command = `ffmpeg -y -f concat -safe 0 -i "${inputList}" -c:v libx264 -c:a aac -pix_fmt yuv420p -vf "${filterChain}" "${outputVideo}"`;
  
  log(`FFMPEG: ${command}`);
  execSync(command);
}

export function normalizeAudio(inputAudio: string, outputAudio: string): void {
  try {
    // Primeiro, verificar se o arquivo de entrada existe e é válido
    if (!fs.existsSync(inputAudio)) {
      throw new Error(`Arquivo de áudio não encontrado: ${inputAudio}`);
    }

    // Comando mais robusto para normalização
    const command = `ffmpeg -y -i "${inputAudio}" -af "loudnorm=I=-16:TP=-1.5:LRA=11" -ar 44100 -ac 2 -c:a mp3 -b:a 128k "${outputAudio}"`;
    
    log(`FFMPEG: ${command}`);
    execSync(command);

    // Verificar se o arquivo de saída foi criado e tem tamanho > 0
    if (!fs.existsSync(outputAudio) || fs.statSync(outputAudio).size === 0) {
      throw new Error(`Falha ao normalizar áudio: arquivo de saída inválido`);
    }

    log(`✅ Áudio normalizado com sucesso: ${outputAudio}`);
  } catch (error) {
    log(`❌ Erro ao normalizar áudio: ${error}`);
    
    // Fallback: copiar o arquivo original sem normalização
    try {
      log(`🔄 Tentando fallback: copiando arquivo original...`);
      fs.copyFileSync(inputAudio, outputAudio);
      log(`✅ Fallback executado: arquivo copiado sem normalização`);
    } catch (fallbackError) {
      log(`❌ Fallback também falhou: ${fallbackError}`);
      throw error;
    }
  }
}

export function getAudioDuration(filepath: string): number {
  try {
    const output = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filepath}"`
    );
    return parseFloat(output.toString().trim());
  } catch (error) {
    log(`❌ Erro ao obter duração do áudio: ${error}`);
    return 5; // Duração padrão de 5 segundos
  }
}

export function combineVideoAudio(
  videoPaths: string[],
  audioPath: string,
  outputPath: string
): void {
  try {
    // Verificar se os arquivos existem
    for (const videoPath of videoPaths) {
      if (!fs.existsSync(videoPath)) {
        throw new Error(`Vídeo não encontrado: ${videoPath}`);
      }
    }
    
    if (!fs.existsSync(audioPath)) {
      throw new Error(`Áudio não encontrado: ${audioPath}`);
    }

    // Criar lista de concatenação
    const concatListPath = path.join(path.dirname(outputPath), 'concat_list.txt');
    const concatContent = videoPaths.map(video => `file '${path.resolve(video)}'`).join('\n');
    fs.writeFileSync(concatListPath, concatContent);

    // Concatenar vídeos primeiro
    const tempVideoPath = path.join(path.dirname(outputPath), 'temp_concat.mp4');
    const concatCommand = `ffmpeg -y -f concat -safe 0 -i "${concatListPath}" -c:v libx264 -pix_fmt yuv420p "${tempVideoPath}"`;
    
    log(`FFMPEG: ${concatCommand}`);
    execSync(concatCommand);

    // Adicionar áudio ao vídeo concatenado
    const audioCommand = `ffmpeg -y -i "${tempVideoPath}" -i "${audioPath}" -c:v copy -c:a aac -b:a 128k -shortest "${outputPath}"`;
    
    log(`FFMPEG: ${audioCommand}`);
    execSync(audioCommand);

    // Limpar arquivos temporários
    try {
      fs.unlinkSync(concatListPath);
      fs.unlinkSync(tempVideoPath);
    } catch (cleanupError) {
      log(`⚠️ Erro ao limpar arquivos temporários: ${cleanupError}`);
    }

    log(`✅ Vídeo combinado com áudio salvo em: ${outputPath}`);
  } catch (error) {
    log(`❌ Erro ao combinar vídeo com áudio: ${error}`);
    throw error;
  }
}

// Função para gerar thumbnail do vídeo
export function generateThumbnail(
  inputVideo: string,
  outputThumbnail: string,
  time: string = '00:00:02'
): void {
  try {
    // Verificar se o vídeo existe
    if (!fs.existsSync(inputVideo)) {
      throw new Error(`Vídeo não encontrado: ${inputVideo}`);
    }

    // Comando para extrair frame do vídeo
    const command = `ffmpeg -y -i "${inputVideo}" -ss ${time} -vframes 1 -q:v 2 "${outputThumbnail}"`;
    
    log(`FFMPEG: ${command}`);
    execSync(command);

    // Verificar se o thumbnail foi criado
    if (!fs.existsSync(outputThumbnail) || fs.statSync(outputThumbnail).size === 0) {
      throw new Error(`Falha ao gerar thumbnail: arquivo de saída inválido`);
    }

    log(`✅ Thumbnail gerado com sucesso: ${outputThumbnail}`);
  } catch (error) {
    log(`❌ Erro ao gerar thumbnail: ${error}`);
    
    // Fallback: tentar com tempo diferente
    try {
      log(`🔄 Tentando fallback: gerando thumbnail no segundo 1...`);
      const fallbackCommand = `ffmpeg -y -i "${inputVideo}" -ss 00:00:01 -vframes 1 -q:v 2 "${outputThumbnail}"`;
      execSync(fallbackCommand);
      log(`✅ Fallback executado: thumbnail gerado no segundo 1`);
    } catch (fallbackError) {
      log(`❌ Fallback também falhou: ${fallbackError}`);
      throw error;
    }
  }
}

// Função para adicionar música de fundo ao vídeo
export function addBackgroundMusic(
  inputVideo: string,
  musicPath: string,
  outputVideo: string,
  options: {
    volume?: number;
    loop?: boolean;
    fadeIn?: number;
    fadeOut?: number;
  } = {}
): void {
  const {
    volume = 0.15, // Volume reduzido para não sobrepor a narração
    loop = true,
    fadeIn = 2,
    fadeOut = 2
  } = options;

  try {
    // Verificar se os arquivos existem
    if (!fs.existsSync(inputVideo)) {
      throw new Error(`Vídeo não encontrado: ${inputVideo}`);
    }
    
    if (!fs.existsSync(musicPath)) {
      throw new Error(`Música não encontrada: ${musicPath}`);
    }

    // Obter duração do vídeo
    const videoDuration = getVideoDuration(inputVideo);
    
    // Construir filtro de áudio mais simples e robusto
    let musicFilter = `volume=${volume}`;
    
    // Adicionar fade in/out se especificado
    if (fadeIn > 0) {
      musicFilter += `,afade=t=in:st=0:d=${fadeIn}`;
    }
    if (fadeOut > 0 && videoDuration > fadeOut) {
      musicFilter += `,afade=t=out:st=${videoDuration - fadeOut}:d=${fadeOut}`;
    }
    
    // Adicionar loop se necessário
    if (loop) {
      musicFilter += `,aloop=loop=-1:size=2e+09`;
    }
    
    // Comando FFmpeg CORRIGIDO: usar duration=shortest para cortar na duração do vídeo
    const command = `ffmpeg -y -i "${inputVideo}" -i "${musicPath}" -filter_complex "[1:a]${musicFilter}[bgmusic];[0:a][bgmusic]amix=inputs=2:duration=shortest:weights=1,0.3" -c:v copy -c:a aac -b:a 192k "${outputVideo}"`;
    
    log(`🎵 Adicionando música de fundo (volume: ${volume}): ${command}`);
    execSync(command);

    // Verificar se o arquivo foi criado
    if (!fs.existsSync(outputVideo) || fs.statSync(outputVideo).size === 0) {
      throw new Error(`Falha ao adicionar música: arquivo de saída inválido`);
    }

    log(`✅ Música de fundo adicionada com sucesso: ${outputVideo}`);
  } catch (error) {
    log(`❌ Erro ao adicionar música de fundo: ${error}`);
    
    // Fallback mais robusto: tentar com comando mais simples
    try {
      log(`🔄 Tentando fallback com comando simples...`);
      const fallbackCommand = `ffmpeg -y -i "${inputVideo}" -i "${musicPath}" -filter_complex "[1:a]volume=${volume}[bgmusic];[0:a][bgmusic]amix=inputs=2:duration=shortest" -c:v copy "${outputVideo}"`;
      execSync(fallbackCommand);
      log(`✅ Fallback executado com sucesso`);
    } catch (fallbackError) {
      log(`❌ Fallback também falhou: ${fallbackError}`);
      
      // Último fallback: copiar vídeo sem música
      try {
        log(`🔄 Último fallback: copiando vídeo sem música...`);
        fs.copyFileSync(inputVideo, outputVideo);
        log(`✅ Vídeo copiado sem música`);
      } catch (finalError) {
        log(`❌ Todos os fallbacks falharam: ${finalError}`);
        throw error;
      }
    }
  }
}

// Função para obter duração do vídeo
export function getVideoDuration(filepath: string): number {
  try {
    const output = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filepath}"`
    );
    return parseFloat(output.toString().trim());
  } catch (error) {
    log(`❌ Erro ao obter duração do vídeo: ${error}`);
    return 30; // Duração padrão de 30 segundos
  }
}
