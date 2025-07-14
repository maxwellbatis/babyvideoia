// Geração e sincronização de legendas melhorada
export function generateSubtitles(text: string, duration: number): string[] {
  // Dividir o texto em frases para melhor sincronização
  const sentences = splitIntoSentences(text);
  const subtitles: string[] = [];
  let currentTime = 0;
  let subtitleIndex = 1;

  for (const sentence of sentences) {
    if (!sentence.trim()) continue;

    // Calcular duração da frase baseada no número de palavras
    const words = sentence.trim().split(' ').filter(word => word.length > 0);
    const sentenceDuration = calculateSentenceDuration(words, duration, sentences.length);
    
    // Dividir frases longas em partes menores
    if (words.length > 8) {
      const parts = splitLongSentence(sentence);
      const partDuration = sentenceDuration / parts.length;
      
      for (const part of parts) {
        if (!part.trim()) continue;
        
        const start = currentTime;
        const end = currentTime + partDuration;
        
        subtitles.push(
          `${subtitleIndex}\n${formatTime(start)} --> ${formatTime(end)}\n${part.trim()}\n`
        );
        
        currentTime = end;
        subtitleIndex++;
      }
    } else {
      // Frase normal
      const start = currentTime;
      const end = currentTime + sentenceDuration;
      
      subtitles.push(
        `${subtitleIndex}\n${formatTime(start)} --> ${formatTime(end)}\n${sentence.trim()}\n`
      );
      
      currentTime = end;
      subtitleIndex++;
    }
  }

  return subtitles;
}

// [NOVO] Função para usar SRT do Whisper diretamente (sem conversão)
export function useWhisperSrt(srtContent: string): string[] {
  if (!srtContent || srtContent.trim().length === 0) {
    throw new Error('Conteúdo SRT vazio');
  }

  // Dividir em blocos SRT
  const blocks = srtContent.trim().split('\n\n');
  const subtitles: string[] = [];

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length >= 3) {
      // Manter o formato SRT original: número, timestamp, texto
      const number = lines[0];
      const timestamp = lines[1];
      const text = lines.slice(2).join(' ');
      
      if (text.trim()) {
        subtitles.push(`${number}\n${timestamp}\n${text}\n`);
      }
    }
  }

  return subtitles;
}

// [NOVO] Função para gerar legendas progressivas (palavra por palavra)
export function generateProgressiveSubtitles(text: string, duration: number, mode: 'word' | 'phrase' = 'word'): string[] {
  const subtitles: string[] = [];
  let currentTime = 0;
  let subtitleIndex = 1;

  if (mode === 'word') {
    // Modo palavra por palavra
    const words = text.split(' ').filter(word => word.trim().length > 0);
    const timePerWord = duration / words.length;
    
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const start = currentTime;
      const end = currentTime + timePerWord;
      
      // Acumular palavras até o momento atual
      const accumulatedText = words.slice(0, i + 1).join(' ');
      
      subtitles.push(
        `${subtitleIndex}\n${formatTime(start)} --> ${formatTime(end)}\n${accumulatedText}\n`
      );
      
      currentTime = end;
      subtitleIndex++;
    }
  } else {
    // Modo frase por frase (progressivo)
    const sentences = splitIntoSentences(text);
    const timePerSentence = duration / sentences.length;
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const start = currentTime;
      const end = currentTime + timePerSentence;
      
      // Acumular frases até o momento atual
      const accumulatedText = sentences.slice(0, i + 1).join(' ');
      
      subtitles.push(
        `${subtitleIndex}\n${formatTime(start)} --> ${formatTime(end)}\n${accumulatedText}\n`
      );
      
      currentTime = end;
      subtitleIndex++;
    }
  }

  return subtitles;
}

// [NOVO] Função para converter SRT do Whisper em legendas progressivas
export function convertWhisperToProgressive(srtContent: string, mode: 'word' | 'phrase' = 'word'): string[] {
  if (!srtContent || srtContent.trim().length === 0) {
    throw new Error('Conteúdo SRT vazio');
  }

  // Extrair todo o texto do SRT
  const blocks = srtContent.trim().split('\n\n');
  const fullText = blocks.map(block => {
    const lines = block.trim().split('\n');
    return lines.slice(2).join(' '); // Pega apenas o texto
  }).join(' ');

  // Calcular duração total baseada no último timestamp
  const lastBlock = blocks[blocks.length - 1];
  const lastTimestamp = lastBlock.split('\n')[1];
  const totalDuration = parseTimestampToSeconds(lastTimestamp.split(' --> ')[1]);

  // Gerar legendas progressivas
  return generateProgressiveSubtitles(fullText, totalDuration, mode);
}

// [NOVO] Função auxiliar para converter timestamp para segundos
function parseTimestampToSeconds(timestamp: string): number {
  const parts = timestamp.split(':');
  const hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);
  const seconds = parseFloat(parts[2].replace(',', '.'));
  
  return hours * 3600 + minutes * 60 + seconds;
}

// Função para sincronização baseada em análise de áudio (mais precisa)
export async function generateSubtitlesWithAudioAnalysis(
  text: string, 
  audioPath: string
): Promise<string[]> {
  try {
    // Dividir texto em frases
    const sentences = splitIntoSentences(text);
    const subtitles: string[] = [];
    
    // Analisar o áudio para detectar pausas e silêncios
    const audioTimings = await analyzeAudioTimings(audioPath, sentences.length);
    
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      if (!sentence.trim()) continue;
      
      const timing = audioTimings[i] || { start: 0, end: 0 };
      
      // Se não temos timing preciso, usar cálculo baseado em palavras
      if (timing.start === 0 && timing.end === 0) {
        const words = sentence.trim().split(' ').filter(word => word.length > 0);
        const sentenceDuration = calculateSentenceDuration(words, 30, sentences.length); // duração estimada
        timing.start = i * sentenceDuration;
        timing.end = timing.start + sentenceDuration;
      }
      
      subtitles.push(
        `${i + 1}\n${formatTime(timing.start)} --> ${formatTime(timing.end)}\n${sentence.trim()}\n`
      );
    }
    
    return subtitles;
  } catch (error) {
    console.error('Erro na análise de áudio, usando método padrão:', error);
    // Fallback para método padrão
    const duration = await getAudioDuration(audioPath);
    return generateSubtitles(text, duration);
  }
}

// [NOVO] Função para sincronização progressiva com análise de áudio
export async function generateProgressiveSubtitlesWithAudio(
  text: string, 
  audioPath: string,
  mode: 'word' | 'phrase' = 'word'
): Promise<string[]> {
  try {
    const duration = await getAudioDuration(audioPath);
    return generateProgressiveSubtitles(text, duration, mode);
  } catch (error) {
    console.error('Erro na análise de áudio progressiva, usando método padrão:', error);
    // Fallback para método padrão
    return generateProgressiveSubtitles(text, 30, mode);
  }
}

// Analisar timings do áudio baseado em pausas e silêncios
async function analyzeAudioTimings(audioPath: string, sentenceCount: number): Promise<Array<{start: number, end: number}>> {
  const timings: Array<{start: number, end: number}> = [];
  
  try {
    // Usar ffmpeg para detectar silêncios no áudio
    const silenceInfo = await detectSilence(audioPath);
    const totalDuration = await getAudioDuration(audioPath);
    
    // Distribuir frases baseado nos silêncios detectados
    let currentTime = 0;
    let silenceIndex = 0;
    
    for (let i = 0; i < sentenceCount; i++) {
      const start = currentTime;
      let end = totalDuration;
      
      // Se há silêncios detectados, usar eles para marcar o fim das frases
      if (silenceInfo[silenceIndex]) {
        end = silenceInfo[silenceIndex].start;
        currentTime = silenceInfo[silenceIndex].end;
        silenceIndex++;
      } else {
        // Distribuir uniformemente o tempo restante
        const remainingTime = totalDuration - currentTime;
        const remainingSentences = sentenceCount - i;
        const timePerSentence = remainingTime / remainingSentences;
        end = currentTime + timePerSentence;
        currentTime = end;
      }
      
      timings.push({ start, end });
    }
    
  } catch (error) {
    console.error('Erro ao analisar áudio:', error);
  }
  
  return timings;
}

// Detectar silêncios no áudio usando ffmpeg (melhorado)
async function detectSilence(audioPath: string): Promise<Array<{start: number, end: number}>> {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    
    // [MELHORADO] Comando para detectar silêncios menos sensível (-25dB por mais de 0.8s)
    // Mais adequado para narrações com pausas naturais
    const command = `ffmpeg -i "${audioPath}" -af silencedetect=noise=-25dB:d=0.8 -f null - 2>&1`;
    
    exec(command, (error: any, stdout: any, stderr: any) => {
      if (error) {
        console.error('Erro ao detectar silêncios:', error);
        return resolve([]);
      }
      
      const output = stderr || stdout;
      const silences: Array<{start: number, end: number}> = [];
      
      // Extrair informações de silêncio do output do ffmpeg
      const silenceMatches = output.match(/silence_start: (\d+\.?\d*)/g);
      const silenceEndMatches = output.match(/silence_end: (\d+\.?\d*)/g);
      
      // Verificar se silenceMatches não é null antes de usar .length
      if (silenceMatches && silenceEndMatches) {
        for (let i = 0; i < silenceMatches.length; i++) {
          const startMatch = silenceMatches[i].match(/silence_start: (\d+\.?\d*)/);
          const endMatch = silenceEndMatches[i]?.match(/silence_end: (\d+\.?\d*)/);
          
          if (startMatch && endMatch) {
            const start = parseFloat(startMatch[1]);
            const end = parseFloat(endMatch[1]);
            
            // [MELHORADO] Filtrar silêncios muito curtos ou muito longos
            const duration = end - start;
            if (duration >= 0.5 && duration <= 3.0) { // Entre 0.5s e 3s
              silences.push({ start, end });
            }
          }
        }
      }
      
      resolve(silences);
    });
  });
}

// Obter duração do áudio
async function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    
    const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`;
    
    exec(command, (error: any, stdout: any, stderr: any) => {
      if (error) {
        console.error('Erro ao obter duração do áudio:', error);
        return resolve(30); // Duração padrão de 30 segundos
      }
      
      const duration = parseFloat(stdout.trim());
      resolve(isNaN(duration) ? 30 : duration);
    });
  });
}

// Dividir texto em frases considerando pontuação
function splitIntoSentences(text: string): string[] {
  // Limpar o texto
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  // Dividir por pontos, exclamações e interrogações
  const sentences = cleanText.split(/(?<=[.!?])\s+/);
  
  // Filtrar frases vazias e muito curtas
  return sentences.filter(sentence => sentence.trim().length > 2);
}

// Calcular duração de uma frase baseada no número de palavras
function calculateSentenceDuration(words: string[], totalDuration: number, totalSentences: number): number {
  // Velocidade média de fala: ~150 palavras por minuto
  const wordsPerMinute = 150;
  const wordsPerSecond = wordsPerMinute / 60;
  
  // Duração baseada na velocidade de fala
  const speechDuration = words.length / wordsPerSecond;
  
  // Adicionar pausas naturais entre frases
  const pauseDuration = 0.3; // 300ms de pausa
  
  // Se a duração calculada for maior que o tempo disponível, ajustar
  const availableTime = totalDuration / totalSentences;
  const adjustedDuration = Math.min(speechDuration + pauseDuration, availableTime);
  
  return Math.max(adjustedDuration, 1.0); // Mínimo 1 segundo
}

// Dividir frases muito longas
function splitLongSentence(sentence: string): string[] {
  const words = sentence.split(' ');
  const maxWordsPerPart = 6;
  const parts: string[] = [];
  
  for (let i = 0; i < words.length; i += maxWordsPerPart) {
    const part = words.slice(i, i + maxWordsPerPart).join(' ');
    if (part.trim()) {
      parts.push(part);
    }
  }
  
  return parts;
}

// Função original mantida para compatibilidade
export function generateSubtitlesSimple(text: string, duration: number): string[] {
  const words = text.split(' ');
  const timePerWord = duration / words.length;
  let currentTime = 0;
  return words.map((word, i) => {
    const start = currentTime;
    let end = currentTime + timePerWord;
    // Garante que end > start (mínimo 1.0s por palavra)
    if (end - start < 1.0) end = start + 1.0;
    currentTime = end;
    return `${i + 1}\n${formatTime(start)} --> ${formatTime(end)}\n${word}\n`;
  });
}

function formatTime(seconds: number): string {
  const date = new Date(0);
  date.setSeconds(Math.floor(seconds));
  const ms = Math.floor((seconds % 1) * 1000).toString().padStart(3, '0');
  return date.toISOString().substr(11, 8) + ',' + ms;
}
  