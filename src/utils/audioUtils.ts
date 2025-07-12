import { execSync } from "child_process";
import { log } from "./logger";
import ffmpeg from 'fluent-ffmpeg';

export function getAudioDuration(filepath: string): number {
  try {
    const output = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filepath}"`
    );
    const duration = parseFloat(output.toString().trim());
    log(`⏱️ Duração do áudio ${filepath}: ${duration.toFixed(2)}s`);
    return duration;
  } catch (err) {
    log(`❌ Erro ao obter duração do áudio ${filepath}: ${err}`);
    return 0;
  }
}

export function getAudioInfo(filepath: string): { duration: number; bitrate: number; sampleRate: number } {
  try {
    const output = execSync(
      `ffprobe -v error -show_entries format=duration,bit_rate -show_entries stream=sample_rate -of json "${filepath}"`
    );
    const info = JSON.parse(output.toString());
    return {
      duration: parseFloat(info.format.duration) || 0,
      bitrate: parseInt(info.format.bit_rate) || 0,
      sampleRate: parseInt(info.streams?.[0]?.sample_rate) || 44100
    };
  } catch (err) {
    log(`❌ Erro ao obter info do áudio ${filepath}: ${err}`);
    return { duration: 0, bitrate: 0, sampleRate: 44100 };
  }
}

export function verificarDuracaoAudio(path: string): Promise<number> {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(path, (err, metadata) => {
      if (err || !metadata?.format?.duration) {
        return resolve(0);
      }
      resolve(metadata.format.duration);
    });
  });
}

export function normalizeAudio(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Verificar se o arquivo de entrada existe e tem tamanho > 0
    const fs = require('fs');
    if (!fs.existsSync(inputPath)) {
      return reject(new Error(`Arquivo de entrada não encontrado: ${inputPath}`));
    }
    
    const stats = fs.statSync(inputPath);
    if (stats.size === 0) {
      return reject(new Error(`Arquivo de entrada vazio: ${inputPath}`));
    }

    // Comando mais robusto para normalização
    const command = `ffmpeg -y -i "${inputPath}" -af "loudnorm=I=-16:TP=-1.5:LRA=11" -ar 44100 -ac 2 -c:a mp3 -b:a 128k "${outputPath}"`;
    log(`🔊 Normalizando áudio: ${command}`);
    
    require('child_process').exec(command, (error: any, stdout: any, stderr: any) => {
      if (error) {
        log(`❌ Erro na normalização: ${stderr || error}`);
        
        // Tentar com comando mais simples como fallback
        const fallbackCommand = `ffmpeg -y -i "${inputPath}" -ar 44100 -ac 2 -c:a mp3 -b:a 128k "${outputPath}"`;
        log(`🔄 Tentando fallback: ${fallbackCommand}`);
        
        require('child_process').exec(fallbackCommand, (fallbackError: any, fallbackStdout: any, fallbackStderr: any) => {
          if (fallbackError) {
            log(`❌ Fallback também falhou: ${fallbackStderr || fallbackError}`);
            reject(fallbackError);
          } else {
            log(`✅ Áudio processado com fallback: ${outputPath}`);
            resolve();
          }
        });
      } else {
        log(`✅ Áudio normalizado: ${outputPath}`);
        resolve();
      }
    });
  });
}

export function addSilence(audioPath: string, outputPath: string, silenceDuration: number = 0.5): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = `ffmpeg -y -i "${audioPath}" -af "apad=pad_dur=${silenceDuration}" "${outputPath}"`;
    log(`🔇 Adicionando silêncio: ${command}`);
    
    require('child_process').exec(command, (error: any, stdout: any, stderr: any) => {
      if (error) {
        log(`❌ Erro ao adicionar silêncio: ${stderr || error}`);
        reject(error);
      } else {
        log(`✅ Silêncio adicionado: ${outputPath}`);
        resolve();
      }
    });
  });
} 