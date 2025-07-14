import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import { log } from './logger';

export interface WhisperResult {
  text: string;
  srt: string;
}

/**
 * Transcreve áudio usando API Whisper externa
 * @param filePath Caminho do arquivo de áudio
 * @returns Resultado com texto e legenda SRT
 */
export async function transcribeAudio(filePath: string): Promise<WhisperResult> {
  try {
    log(`🎙️ [WHISPER] Iniciando transcrição do áudio: ${filePath}`);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo de áudio não encontrado: ${filePath}`);
    }

    // Criar FormData
    const form = new FormData();
    form.append('audio', fs.createReadStream(filePath));

    // Fazer requisição para API Whisper
    const response = await axios.post(
      'http://172.233.14.178:3000/transcribe',
      form,
      { 
        headers: form.getHeaders(),
        timeout: 60000 // 60 segundos de timeout
      }
    );

    if (!response.data || !response.data.text) {
      throw new Error('Resposta inválida da API Whisper');
    }

    log(`✅ [WHISPER] Transcrição concluída: ${response.data.text.length} caracteres`);
    
    return {
      text: response.data.text,
      srt: response.data.srt || ''
    };

  } catch (error: any) {
    log(`❌ [WHISPER] Erro na transcrição: ${error.message}`);
    
    // Se a API Whisper falhar, retornar erro para usar fallback
    throw new Error(`Falha na transcrição Whisper: ${error.message}`);
  }
}

/**
 * Salva legenda SRT em arquivo
 * @param srtContent Conteúdo da legenda SRT
 * @param outputPath Caminho para salvar o arquivo .srt
 */
export function saveSrtFile(srtContent: string, outputPath: string): void {
  try {
    fs.writeFileSync(outputPath, srtContent);
    log(`💾 [WHISPER] Legenda salva: ${outputPath}`);
  } catch (error: any) {
    log(`❌ [WHISPER] Erro ao salvar legenda: ${error.message}`);
    throw error;
  }
}

/**
 * Valida se o conteúdo SRT é válido
 * @param srtContent Conteúdo da legenda SRT
 * @returns true se válido, false caso contrário
 */
export function isValidSrt(srtContent: string): boolean {
  if (!srtContent || srtContent.trim().length === 0) {
    return false;
  }

  // Verificar se contém pelo menos um bloco SRT válido
  const srtBlocks = srtContent.trim().split('\n\n');
  if (srtBlocks.length === 0) {
    return false;
  }

  // Verificar se o primeiro bloco tem formato válido
  const firstBlock = srtBlocks[0];
  const lines = firstBlock.split('\n');
  
  // Deve ter pelo menos: número, timestamp, texto
  return lines.length >= 3 && 
         /^\d+$/.test(lines[0].trim()) && 
         /^\d{2}:\d{2}:\d{2},\d{3}\s-->\s\d{2}:\d{2}:\d{2},\d{3}$/.test(lines[1].trim());
} 