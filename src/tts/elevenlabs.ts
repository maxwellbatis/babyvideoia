// Integração com ElevenLabs TTS
import 'dotenv/config';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { getCredential } from '../utils/credentials';

export async function gerarNarracaoElevenLabs(
  texto: string,
  nomeArquivo: string,
  voiceId = 'EXAVITQu4vr4xnSDxMaL',
  apiKeyParam?: string
) {
  let apiKey = apiKeyParam || process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    // Forçar busca no banco, ignorando cache
    apiKey = await getCredential('ELEVENLABS_API_KEY', true);
    console.log('🔑 Buscando chave ElevenLabs no banco (forçado)...');
  }
  if (!apiKey) throw new Error('Chave ElevenLabs não configurada');
  
  // Limpar a chave API - remover espaços, quebras de linha e caracteres inválidos
  apiKey = apiKey.trim().replace(/\s+/g, '').replace(/[\r\n]/g, '');
  
  console.log('🔑 Chave ElevenLabs encontrada:', apiKey.substring(0, 10) + '...');
  
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  const pasta = path.dirname(nomeArquivo);
  if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });

  // Melhorar o texto com tags de emoção e pausas naturais
  const textoMelhorado = melhorarTextoParaNarracao(texto);

  console.log('🎙️ Enviando requisição para ElevenLabs...');
  console.log('📝 Texto a ser narrado:', textoMelhorado.substring(0, 100) + '...');

  const response = await axios.post(
    url,
    {
      text: textoMelhorado,
      model_id: "eleven_multilingual_v2",
      voice_settings: { 
        stability: 0.6, 
        similarity_boost: 0.75,
        style: 0.3,
        use_speaker_boost: true
      }
    },
    {
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json"
      },
      responseType: "arraybuffer"
    }
  );
  
  console.log('✅ Resposta recebida do ElevenLabs, salvando arquivo...');
  fs.writeFileSync(nomeArquivo, response.data);
  console.log('💾 Arquivo de narração salvo:', nomeArquivo);
  return nomeArquivo;
}

// Função para melhorar o texto com emoção e pausas naturais
function melhorarTextoParaNarracao(texto: string): string {
  let textoMelhorado = texto;

  // Adicionar pausas naturais baseadas na pontuação
  textoMelhorado = textoMelhorado
    .replace(/\.\.\./g, '... <break time="0.8s"/>') // Pausa longa para reticências
    .replace(/\./g, '. <break time="0.3s"/>') // Pausa média para pontos
    .replace(/,/g, ', <break time="0.2s"/>') // Pausa curta para vírgulas
    .replace(/!/g, '! <break time="0.4s"/>') // Pausa para exclamações
    .replace(/\?/g, '? <break time="0.4s"/>'); // Pausa para perguntas

  // Adicionar tags de emoção baseadas no conteúdo
  if (textoMelhorado.includes('você') || textoMelhorado.includes('mãe')) {
    textoMelhorado = '<speak><prosody rate="medium" pitch="medium">' + textoMelhorado + '</prosody></speak>';
  }

  // Adicionar ênfase em palavras importantes
  const palavrasImportantes = ['importante', 'essencial', 'fundamental', 'incrível', 'especial', 'mágico'];
  palavrasImportantes.forEach(palavra => {
    const regex = new RegExp(`\\b${palavra}\\b`, 'gi');
    textoMelhorado = textoMelhorado.replace(regex, `<emphasis level="moderate">${palavra}</emphasis>`);
  });

  // Adicionar variação de ritmo para perguntas
  if (textoMelhorado.includes('?')) {
    textoMelhorado = textoMelhorado.replace(/\?/g, '? <prosody rate="slow" pitch="high">');
  }

  // Adicionar tom mais suave para frases emocionais
  if (textoMelhorado.includes('amor') || textoMelhorado.includes('especial') || textoMelhorado.includes('mágico')) {
    textoMelhorado = '<speak><prosody rate="slow" pitch="low">' + textoMelhorado + '</prosody></speak>';
  }

  return textoMelhorado;
}

export async function gerarEfeitoSonoroElevenLabs(
  text: string,
  durationSeconds?: number,
  outputFile?: string
): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('Chave ElevenLabs não configurada');
  const url = 'https://api.elevenlabs.io/v1/sound-generation';
  const headers = {
    'xi-api-key': apiKey,
    'Content-Type': 'application/json',
  };
  const data: any = { text };
  if (durationSeconds) data.duration_seconds = durationSeconds;
  const filePath = outputFile || `sound_effect_${Date.now()}.mp3`;
  const pasta = path.dirname(filePath);
  if (!fs.existsSync(pasta)) fs.mkdirSync(pasta, { recursive: true });

  const response = await axios.post(url, data, { headers, responseType: 'arraybuffer' });
  fs.writeFileSync(filePath, response.data);
  return filePath;
}

function splitText(text: string, maxLen: number = 900): string[] {
  const parts: string[] = [];
  let current = '';
  for (const line of text.split('\n')) {
    if ((current + line).length > maxLen) {
      parts.push(current);
      current = '';
    }
    current += (current ? '\n' : '') + line;
  }
  if (current) parts.push(current);
  return parts;
}

export async function gerarNarracaoTTSGratuito(texto: string, nomeArquivo: string) {
  try {
    // Limpa quebras de linha e markdown
    const cleanText = texto.replace(/\n/g, ' ').replace(/[*_`#>\-]/g, '').trim();
    
    if (!cleanText) {
      throw new Error('Texto vazio após limpeza');
    }
    
    const partes = splitText(cleanText, 900).filter(p => p.trim().length > 0);
    
    if (partes.length === 0) {
      throw new Error('Nenhuma parte válida encontrada no texto');
    }
    
    const tempDir = './output/tts_temp';
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const mp3s: string[] = [];
    
    for (let i = 0; i < partes.length; i++) {
      const tempMp3 = path.join(tempDir, `parte${i}.mp3`);
      
      await new Promise<void>((resolve, reject) => {
        // Escapar caracteres especiais no texto
        const escapedText = partes[i].replace(/"/g, '\\"').replace(/'/g, "\\'");
        const comando = `python src/tts_gtts.py "${escapedText}" "${tempMp3}"`;
        
        console.log(`Executando TTS parte ${i + 1}/${partes.length}: ${partes[i].substring(0, 50)}...`);
        
        exec(comando, { timeout: 30000 }, (error, stdout, stderr) => {
          if (error) {
            console.error(`Erro ao executar TTS parte ${i + 1}:`, stderr || error);
            return reject(new Error(`TTS parte ${i + 1} falhou: ${stderr || error}`));
          }
          
          // Verificar se o arquivo foi criado e tem tamanho > 0
          if (!fs.existsSync(tempMp3) || fs.statSync(tempMp3).size === 0) {
            return reject(new Error(`Arquivo de áudio parte ${i + 1} inválido ou vazio`));
          }
          
          console.log(`TTS parte ${i + 1} concluída: ${fs.statSync(tempMp3).size} bytes`);
          mp3s.push(tempMp3);
          resolve();
        });
      });
    }

    // Se só tem uma parte, copiar diretamente
    if (mp3s.length === 1) {
      fs.copyFileSync(mp3s[0], nomeArquivo);
      fs.unlinkSync(mp3s[0]);
      fs.rmdirSync(tempDir);
      return nomeArquivo;
    }

    // Junta todos os mp3s em um só usando ffmpeg
    const listFile = path.join(tempDir, 'list.txt');
    fs.writeFileSync(listFile, mp3s.map(f => `file '${path.resolve(f)}'`).join('\n'));
    
    await new Promise<void>((resolve, reject) => {
      const comando = `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c copy "${nomeArquivo}"`;
      exec(comando, { timeout: 60000 }, (error, stdout, stderr) => {
        if (error) {
          console.error('Erro ao juntar os áudios:', stderr || error);
          return reject(new Error(`Falha ao concatenar áudios: ${stderr || error}`));
        }
        resolve();
      });
    });

    // Verificar se o arquivo final foi criado
    if (!fs.existsSync(nomeArquivo) || fs.statSync(nomeArquivo).size === 0) {
      throw new Error('Arquivo de áudio final inválido ou vazio');
    }

    // Limpa arquivos temporários
    mp3s.forEach(f => {
      if (fs.existsSync(f)) fs.unlinkSync(f);
    });
    if (fs.existsSync(listFile)) fs.unlinkSync(listFile);
    if (fs.existsSync(tempDir)) fs.rmdirSync(tempDir);

    console.log(`TTS concluído com sucesso: ${nomeArquivo} (${fs.statSync(nomeArquivo).size} bytes)`);
    return nomeArquivo;
    
  } catch (error) {
    console.error('Erro no TTS gratuito:', error);
    throw error;
  }
}

export async function gerarNarracaoComFallback(texto: string, nomeArquivo: string, voiceId = 'EXAVITQu4vr4xnSDxMaL', apiKeyParam?: string) {
  try {
    await gerarNarracaoElevenLabs(texto, nomeArquivo, voiceId, apiKeyParam);
    return nomeArquivo;
  } catch (e1) {
    console.warn('❌ ElevenLabs falhou:', e1);
    try {
      await gerarNarracaoTTSGratuito(texto, nomeArquivo);
      return nomeArquivo;
    } catch (e2) {
      console.warn('❌ TTS gratuito também falhou:', e2);
      // Fallback final: áudio silencioso
      const { exec } = require('child_process');
      await new Promise((resolve, reject) => {
        exec(`ffmpeg -y -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=44100 -t 5 "${nomeArquivo}"`, (error: any) => {
          if (error) {
            console.error('❌ Erro ao criar áudio silencioso:', error);
            reject(error);
          } else {
            console.log('✅ Áudio silencioso criado:', nomeArquivo);
            resolve(null);
          }
        });
      });
      return nomeArquivo;
    }
  }
}

// Função para buscar uso real de caracteres na ElevenLabs
export async function getElevenLabsUsage(apiKeyParam?: string): Promise<{ used: number; limit: number; plan: string }> {
  let apiKey = apiKeyParam || process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    // Forçar busca no banco, ignorando cache
    apiKey = await getCredential('ELEVENLABS_API_KEY', true);
  }
  if (!apiKey) throw new Error('Chave ElevenLabs não configurada');
  
  // Limpar a chave API - remover espaços, quebras de linha e caracteres inválidos
  apiKey = apiKey.trim().replace(/\s+/g, '').replace(/[\r\n]/g, '');
  
  const url = 'https://api.elevenlabs.io/v1/user/subscription';
  const response = await axios.get(url, {
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
  });
  const data = response.data;
  return {
    used: data.character_count || 0,
    limit: data.character_limit || 0,
    plan: data.tier || 'desconhecido'
  };
}
