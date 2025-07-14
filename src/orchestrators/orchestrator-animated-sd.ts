import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { generateScript } from '../text/gemini-groq';
import { gerarImagemColabSD } from '../image/stabledefusion';
import { generateImageFreepik } from '../image/freepik';
import { log } from '../utils/logger';
import { gerarNarracaoTTSGratuito } from '../tts/elevenlabs';
import { generateSubtitles, generateSubtitlesWithAudioAnalysis, useWhisperSrt, convertWhisperToProgressive, generateProgressiveSubtitlesWithAudio } from '../subtitles/aligner';
import { getAudioDuration, normalizeAudio, verificarDuracaoAudio } from '../utils/audioUtils';
import { getVideoStyle, applyVideoStyle } from '../video/styleVideo';
import { gerarPromptImagem } from '../image/imagePrompt';
import { 
  createKenBurnsAnimation, 
  addAudioToVideo, 
  addSubtitlesToVideo, 
  applyVideoStyle as applyFFmpegStyle,
  concatenateVideos,
  getVideoResolution,
  addBackgroundMusic,
  VideoFormat
} from '../video/ffmpeg';
import { getCredential } from '../utils/credentials';
import { transcribeAudio, saveSrtFile, isValidSrt } from '../utils/whisperClient';

// Função para dividir o roteiro em cenas (igual ao animated-images)
function splitScriptIntoScenes(script: string, maxScenes = 5): string[] {
  const narracoes: string[] = [];
  const patterns = [
    /\*\*Narração:\*\*\s*(.+?)(?=\*|$)/g,
    /\*Narração:\s*(.+?)(?=\*|$)/g,
    /Narração:\s*(.+?)(?=\n|$)/g,
    /\*\s*(.+?)(?=\*|$)/g
  ];
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i];
    const matches = script.matchAll(pattern);
    for (const match of matches) {
      const narracao = match[1]?.trim();
      if (narracao && narracao.length > 5 && !narracao.includes('**') && !narracao.includes('Visual:')) {
        narracoes.push(narracao);
      }
    }
  }
  if (narracoes.length === 0) {
    let cleanScript = script.replace(/\*\*/g, '').replace(/Visual:.*?(?=\n|$)/g, '').replace(/Narração:.*?(?=\n|$)/g, '');
    const sentences = cleanScript.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10 && s.length < 200);
    if (sentences.length === 0) {
      return [script];
    }
    const cenas: string[] = [];
    const frasesPorCena = Math.min(2, Math.ceil(sentences.length / maxScenes));
    for (let i = 0; i < maxScenes && i * frasesPorCena < sentences.length; i++) {
      const startIndex = i * frasesPorCena;
      const endIndex = Math.min(startIndex + frasesPorCena, sentences.length);
      const frasesCena = sentences.slice(startIndex, endIndex);
      if (frasesCena.length > 0) {
        const cena = frasesCena.map(f => f.trim()).join('. ') + '.';
        cenas.push(cena);
      }
    }
    return cenas;
  }
  const cenas: string[] = [];
  const narracoesPorCena = Math.ceil(narracoes.length / maxScenes);
  for (let i = 0; i < maxScenes; i++) {
    const startIndex = i * narracoesPorCena;
    const endIndex = Math.min(startIndex + narracoesPorCena, narracoes.length);
    const narracoesCena = narracoes.slice(startIndex, endIndex);
    if (narracoesCena.length > 0) {
      const cena = narracoesCena.join('. ');
      cenas.push(cena);
    }
  }
  return cenas;
}

async function generateVideoWithStableDiffusion(
  tema: string, 
  tipo: string = 'anuncio',
  duracaoTotal: number = 30,
  publico: string = 'maes',
  cenas: number = 5,
  resolution: VideoFormat = 'vertical',
  showCallToAction: boolean = true,
  showWatermark: boolean = true,
  backgroundMusic?: {
    path: string;
    volume?: number;
    loop?: boolean;
    fadeIn?: number;
    fadeOut?: number;
  },
  appImages?: string[], // [NOVO] Array de URLs das imagens do app
  appImagesContext?: string // [NOVO] Contexto das imagens para o roteiro
): Promise<string> {
  const duracaoCena = Math.floor(duracaoTotal / cenas);
  log(`🎬 [SD] Iniciando geração de vídeo com Stable Diffusion`);
  log(`📐 Resolução: ${resolution}`);
  log(`🎯 Tema: ${tema}`);
  log(`🎬 Tipo: ${tipo}`);
  log(`⏱️ Duração total: ${duracaoTotal}s`);
  log(`🎬 Cenas: ${cenas}`);
  log(`⏱️ Duração por cena: ${duracaoCena}s`);
  log(`👥 Público: ${publico}`);
  
  // [NOVO] Log do contexto das imagens do app
  if (appImagesContext) {
    log(`📝 Contexto das imagens do app recebido: ${appImagesContext.substring(0, 200)}...`);
  }
  
  log(`🤖 [SD] CHAMANDO GEMINI/GROQ PARA GERAR ROTEIRO...`);
  
  // [NOVO] Incluir contexto das imagens do app no tema para a IA
  let temaComContexto = tema;
  if (appImagesContext) {
    temaComContexto = `${tema}\n\n${appImagesContext}`;
    log(`📝 Tema com contexto das imagens: ${temaComContexto.substring(0, 300)}...`);
  }
  
  const script = await generateScript(temaComContexto, await getCredential('GEMINI_KEY'), tipo, duracaoTotal, publico, cenas, duracaoCena);
  log(`🤖 [SD] RESPOSTA DO GEMINI/GROQ RECEBIDA:`);
  log('--- INÍCIO DO SCRIPT BRUTO ---');
  log(script);
  log('--- FIM DO SCRIPT BRUTO ---');
  // Extrair cenas do JSON
  let cenasJson: any[] = [];
  try {
    let cleanScript = script;
    if (script.includes('```json')) {
      cleanScript = script.replace(/```json\s*/, '').replace(/\s*```$/, '');
    }
    log('--- SCRIPT APÓS REMOVER MARKDOWN ---');
    log(cleanScript);
    const jsonMatch = cleanScript.match(/\{[\s\S]*"cenas"[\s\S]*\}/);
    if (jsonMatch) {
      cleanScript = jsonMatch[0];
      log('--- JSON EXTRAÍDO DO SCRIPT ---');
      log(cleanScript);
    }
    // Remove vírgulas finais antes de fechar array/objeto
    cleanScript = cleanScript.replace(/,\s*([}\]])/g, '$1');
    const json = JSON.parse(cleanScript);
    if (Array.isArray(json.cenas)) {
      // Filtrar para garantir que cada narração seja só a frase narrada
      cenasJson = json.cenas.map(cena => ({
        narracao: (typeof cena.narracao === 'string')
          ? cena.narracao.replace(/"visual".*/i, '') // remove qualquer trecho "visual": ...
            .replace(/exemplo:.*/i, '') // remove exemplos
            .replace(/\[.*?\]/g, '') // remove colchetes
            .replace(/"/g, '') // remove aspas extras
            .replace(/\s+/g, ' ') // normaliza espaços
            .trim()
          : '',
        visual: Array.isArray(cena.visual) ? cena.visual : [String(cena.visual || '')]
      })).filter(cena => cena.narracao.length > 5);
      log(`--- ARRAY DE CENAS EXTRAÍDO DO JSON (${cenasJson.length}) ---`);
      log(JSON.stringify(cenasJson, null, 2));
    } else {
      throw new Error('Campo "cenas" não é um array');
    }
  } catch (err) {
    log(`❌ Erro ao fazer parse do JSON: ${err}`);
    log(`⚠️ Caindo para fallback por regex de narração e visual.`);
    // Fallback: extrair narração e visual por regex
    const narracaoRegex = /"narracao"\s*:\s*"([^"]+)"/g;
    const visualRegex = /"visual"\s*:\s*\[([^\]]+)\]/g;
    const narracoes: string[] = [];
    const visuais: string[][] = [];
    let match;
    while ((match = narracaoRegex.exec(script)) !== null) {
      narracoes.push(match[1].replace(/exemplo:.*/i, '').replace(/\[.*?\]/g, '').replace(/"/g, '').replace(/\s+/g, ' ').trim());
    }
    while ((match = visualRegex.exec(script)) !== null) {
      // Extrai cada visual como array de strings
      const visualArr = match[1].split(',').map(v => v.replace(/"/g, '').trim()).filter(Boolean);
      visuais.push(visualArr.length ? visualArr : ['mãe e bebê, maternidade, carinho']);
    }
    log('--- ARRAY DE NARRACOES EXTRAÍDO POR REGEX ---');
    log(JSON.stringify(narracoes, null, 2));
    log('--- ARRAY DE VISUAIS EXTRAÍDO POR REGEX ---');
    log(JSON.stringify(visuais, null, 2));
    // Montar cenasJson combinando narração e visual
    cenasJson = narracoes.map((narracao, idx) => ({
      narracao,
      visual: visuais[idx] || ['mãe e bebê, maternidade, carinho']
    })).filter(cena => cena.narracao.length > 5);
    log(`✅ Fallback: ${cenasJson.length} cenas geradas por regex.`);
    log(JSON.stringify(cenasJson, null, 2));
    if (cenasJson.length === 0) {
      // fallback final: dividir por frases
      log('⚠️ Fallback regex falhou, tentando divisão tradicional de frases.');
      const cenasFallback = splitScriptIntoScenes(script, cenas);
      log('--- ARRAY DE CENAS DO FALLBACK ---');
      log(JSON.stringify(cenasFallback, null, 2));
      cenasJson = cenasFallback.map(frase => ({
        narracao: frase.replace(/"visual".*/i, '')
                       .replace(/exemplo:.*/i, '')
                       .replace(/\[.*?\]/g, '')
                       .replace(/"/g, '')
                       .replace(/\s+/g, ' ')
                       .trim(),
        visual: ['mãe e bebê, maternidade, carinho']
      })).filter(cena => cena.narracao.length > 5);
      log(`✅ Fallback tradicional: ${cenasJson.length} cenas geradas.`);
      log(JSON.stringify(cenasJson, null, 2));
    }
  }
  log(`🎬 [SD] Total de cenas extraídas: ${cenasJson.length}`);
  const tmpDir = './output/animatedsd_tmp';
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  const sceneVideos: string[] = [];
  for (let i = 0; i < cenasJson.length; i++) {
    const cenaObj = cenasJson[i];
    const narracao = (typeof cenaObj.narracao === 'string') ? cenaObj.narracao.trim() : '';
    const visuals: string[] = Array.isArray(cenaObj.visual) ? cenaObj.visual : [String(cenaObj.visual || '')];
    const sceneNum = i + 1;
    log(`\n🎬 [SD] PROCESSANDO CENA ${sceneNum}:`);
    log(`📝 TEXTO DA NARRAÇÃO: "${narracao}"`);
    log(`🎨 DESCRIÇÕES VISUAIS: ${JSON.stringify(visuals)}`);
    
    // [NOVO] Verificar se há imagem do app disponível para esta cena
    const appImageUrl = appImages && appImages[i];
    if (appImageUrl) {
      log(`🖼️ [APP] Usando imagem do app para cena ${sceneNum}: ${appImageUrl.substring(0, 100)}...`);
    } else {
      log(`🎨 [IA] Gerando imagem IA para cena ${sceneNum}...`);
    }
    
    // Sempre gerar 3 imagens por cena
    const imagensPorCena = 3;
    log(`🎨 [SD] Gerando ${imagensPorCena} imagens para a cena ${sceneNum}...`);
    const imagePaths: string[] = [];
    
    for (let j = 0; j < imagensPorCena; j++) {
      const imageNum = j + 1;
      const imagePath = path.join(tmpDir, `scene${sceneNum}_img${imageNum}.png`);
      
      // [NOVO] Se há imagem do app para esta cena, usar ela
      if (appImageUrl && j === 0) { // Usar imagem do app apenas na primeira imagem da cena
        try {
          log(`🖼️ [APP] Baixando imagem do app para cena ${sceneNum}...`);
          const response = await fetch(appImageUrl);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          
          const buffer = await response.arrayBuffer();
          fs.writeFileSync(imagePath, Buffer.from(buffer));
          log(`✅ [APP] Imagem do app baixada: ${imagePath}`);
          imagePaths.push(imagePath);
          
          // [NOVO] Gerar narração contextualizada baseada na imagem do app
          if (appImagesContext) {
            try {
              log(`🤖 [IA] Gerando narração contextualizada para imagem do app na cena ${sceneNum}...`);
              
              // Extrair descrição da imagem do contexto
              const contextLines = appImagesContext.split('\n');
              const imageDescription = contextLines.find(line => line.includes(`Cena ${sceneNum}:`));
              
              if (imageDescription) {
                const description = imageDescription.replace(`Cena ${sceneNum}:`, '').replace(/\([^)]+\)/, '').trim();
                log(`📝 Descrição da imagem: ${description}`);
                
                // Gerar narração contextualizada usando a descrição
                const contextualPrompt = `Baseado na imagem do app que mostra: "${description}", crie uma narração curta e contextualizada para esta cena. A narração deve explicar ou comentar sobre o que está sendo mostrado na imagem.`;
                
                const contextualNarration = await generateScript(contextualPrompt, await getCredential('GEMINI_KEY'), 'dica', 10, publico, 1, 10);
                
                // Atualizar a narração da cena com a versão contextualizada
                if (contextualNarration && contextualNarration.length > 10) {
                  cenaObj.narracao = contextualNarration.replace(/```json[\s\S]*?```/g, '').replace(/[{}"]/g, '').trim();
                  log(`✅ [IA] Narração contextualizada gerada: "${cenaObj.narracao}"`);
                }
              }
            } catch (contextError) {
              log(`❌ [IA] Erro ao gerar narração contextualizada: ${contextError}`);
              log(`⚠️ [APP] Usando narração original para a imagem do app`);
            }
          }
          
          // Para as outras imagens da cena, gerar IA baseada na imagem do app
          if (j < imagensPorCena - 1) {
            const iaImagePath = path.join(tmpDir, `scene${sceneNum}_img${imageNum + 1}.png`);
            const imagePrompt = `variation of: ${narracao}, similar style to app screenshot, professional, high quality`;
            
            try {
              await gerarImagemColabSD(imagePrompt, iaImagePath);
              log(`✅ [IA] Imagem IA gerada baseada na imagem do app: ${iaImagePath}`);
              imagePaths.push(iaImagePath);
            } catch (error) {
              log(`❌ [IA] Erro ao gerar imagem IA baseada no app: ${error}`);
              // Fallback: copiar a imagem do app
              fs.copyFileSync(imagePath, iaImagePath);
              imagePaths.push(iaImagePath);
            }
          }
          continue; // Pular para próxima iteração
        } catch (error) {
          log(`❌ [APP] Erro ao baixar imagem do app: ${error}`);
          log(`🔄 [IA] Fallback para geração IA...`);
        }
      }
      
      // Garantir prompts variados mesmo se só houver 1 visual
      let imagePrompt: string;
      if (visuals && visuals.length > 0) {
        if (visuals.length > j) {
          imagePrompt = visuals[j];
        } else {
          if (visuals.length === 1) {
            if (j === 1) {
              imagePrompt = `${visuals[0]}, close-up do rosto da mãe, expressão de cansaço mas amorosa, luz lateral dramática, foco seletivo`;
            } else if (j === 2) {
              imagePrompt = `${visuals[0]}, vista de cima, bebê dormindo no colo, mãos da mãe segurando com carinho, ambiente suave e acolhedor`;
            } else {
              imagePrompt = visuals[0];
            }
          } else {
            imagePrompt = visuals[visuals.length-1];
          }
        }
      } else {
        if (j === 1) {
          imagePrompt = `${narracao}, close-up emocional, expressão de determinação, luz natural suave, foco nos olhos`;
        } else if (j === 2) {
          imagePrompt = `${narracao}, vista lateral, momento íntimo, ambiente aconchegante, tons quentes`;
        } else {
          imagePrompt = narracao;
        }
      }
      // LOG DETALHADO DO PROMPT
      log(`🖼️ [PROMPT] Cena ${sceneNum} - Imagem ${imageNum}: "${imagePrompt}"`);
      // 1. Tentar Stable Diffusion primeiro
      try {
        log(`🎨 [SD] Tentando gerar imagem ${imageNum} com Stable Diffusion...`);
        await gerarImagemColabSD(imagePrompt, imagePath, { 
          resolution: resolution as 'vertical' | 'horizontal' | 'square' 
        });
        log(`✅ [SD] Imagem ${imageNum} gerada com Stable Diffusion: ${imagePath}`);
        log(`🖼️ [RESULTADO] Cena ${sceneNum} - Imagem ${imageNum}: Stable Diffusion - ${imagePath}`);
        imagePaths.push(imagePath);
      } catch (sdError) {
        log(`❌ [SD] Stable Diffusion falhou para imagem ${imageNum}: ${sdError}`);
        log(`🔄 Tentando Freepik como fallback para imagem ${imageNum}...`);
        // 2. Fallback para Freepik
        try {
          log(`🎨 [FREEPIK] Gerando imagem ${imageNum} com Freepik: ${imagePrompt.substring(0, 100)}...`);
          await generateImageFreepik(
            imagePrompt,
            imagePath,
            {
              apiKey: await getCredential('FREEPIK_API_KEY'),
              resolution: resolution // CORRIGIDO: Passar resolution diretamente
            }
          );
          log(`✅ [FREEPIK] Imagem ${imageNum} gerada com sucesso: ${imagePath}`);
          log(`🖼️ [RESULTADO] Cena ${sceneNum} - Imagem ${imageNum}: Freepik - ${imagePath}`);
          imagePaths.push(imagePath);
        } catch (freepikError) {
          log(`❌ [FREEPIK] Freepik falhou para imagem ${imageNum}: ${freepikError}`);
          log(`🔄 Tentando gerar prompt melhorado...`);
          // 3. Fallback final: prompt melhorado
          try {
            const improvedPrompt = gerarPromptImagem(narracao, {
              style: 'realistic',
              mood: 'warm',
              focus: 'mother'
            });
            log(`🎨 [PROMPT MELHORADO] Gerando imagem ${imageNum} com prompt melhorado: ${improvedPrompt.substring(0, 100)}...`);
            await gerarImagemColabSD(improvedPrompt, imagePath, { 
              resolution: resolution as 'vertical' | 'horizontal' | 'square' 
            });
            log(`✅ [PROMPT MELHORADO] Imagem ${imageNum} gerada com sucesso: ${imagePath}`);
            log(`🖼️ [RESULTADO] Cena ${sceneNum} - Imagem ${imageNum}: Prompt Melhorado - ${imagePath}`);
            imagePaths.push(imagePath);
          } catch (finalError) {
            log(`❌ [FINAL] Todos os métodos falharam para imagem ${imageNum}: ${finalError}`);
            // Criar imagem placeholder
            const placeholderPath = path.join(tmpDir, `placeholder_scene${sceneNum}_img${imageNum}.png`);
            fs.writeFileSync(placeholderPath, '');
            log(`⚠️ [PLACEHOLDER] Criado placeholder para imagem ${imageNum}: ${placeholderPath}`);
            imagePaths.push(placeholderPath);
          }
        }
      }
      // Pequena pausa entre gerações para evitar sobrecarga
      if (j < imagensPorCena - 1) {
        log(`⏳ Aguardando 2 segundos antes da próxima imagem...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    if (imagePaths.length === 0) {
      log(`❌ [SD] Nenhuma imagem gerada para a cena ${sceneNum}, pulando cena.`);
      continue;
    }
    // Gerar narração da cena
    const audioPath = path.join(tmpDir, `narracao_scene${sceneNum}.mp3`);
    try {
      await gerarNarracaoTTSGratuito(narracao, audioPath);
      if (!fs.existsSync(audioPath) || fs.statSync(audioPath).size === 0) throw new Error('Arquivo de áudio inválido ou vazio');
      log(`✅ [SD] Narração gerada: ${audioPath}`);
    } catch (error) {
      log(`❌ [SD] Erro ao gerar narração: ${error}`);
      continue;
    }
    // Normalizar áudio
    const normalizedAudioPath = path.join(tmpDir, `narracao_normalizada_scene${sceneNum}.mp3`);
    try {
      await normalizeAudio(audioPath, normalizedAudioPath);
      log(`✅ [SD] Áudio normalizado: ${normalizedAudioPath}`);
    } catch (error) {
      log(`❌ [SD] Erro ao normalizar áudio: ${error}`);
      fs.copyFileSync(audioPath, normalizedAudioPath);
    }
    // Duração da cena = duração do áudio da narração
    let audioDuration: number = 0;
    try {
      audioDuration = await verificarDuracaoAudio(normalizedAudioPath);
      if (!audioDuration || audioDuration < 1) throw new Error('Áudio inválido ou muito curto');
    } catch (error) {
      log(`❌ [SD] Erro ao verificar duração do áudio: ${error}`);
      continue;
    }
    // Duração de cada imagem
    const duracaoPorImagemBase = audioDuration / imagensPorCena;
    // Adicionar padding na última imagem para garantir que não corte o áudio
    const paddingUltimaImagem = 0.3; // segundos
    // Criar animação para cada imagem
    const animatedPaths: string[] = [];
    for (let j = 0; j < imagePaths.length; j++) {
      const isLast = (j === imagePaths.length - 1);
      const duracao = isLast ? (duracaoPorImagemBase + paddingUltimaImagem) : duracaoPorImagemBase;
      const animatedPath = path.join(tmpDir, `animado_scene${sceneNum}_img${j + 1}.mp4`);
      createKenBurnsAnimation(imagePaths[j], animatedPath, duracao, resolution);
      animatedPaths.push(animatedPath);
    }
    // Concatenar animações das imagens da cena
    const concatListPath = path.join(tmpDir, `concat_scene${sceneNum}.txt`);
    let concatContent = animatedPaths.map(p => `file '${path.resolve(p)}'`).join('\n');
    fs.writeFileSync(concatListPath, concatContent);
    let sceneConcatPath = path.join(tmpDir, `scene${sceneNum}_concat.mp4`);
    concatenateVideos(concatListPath, sceneConcatPath, resolution);
    // Verificar duração do vídeo concatenado
    let videoConcatDuration = 0;
    try {
      videoConcatDuration = await verificarDuracaoAudio(sceneConcatPath);
    } catch (e) {
      videoConcatDuration = 0;
    }
    // Se o vídeo for menor que o áudio, adicionar frames extras da última imagem
    if (videoConcatDuration < audioDuration) {
      const diff = audioDuration - videoConcatDuration + 0.1; // pequeno extra
      const extraPath = path.join(tmpDir, `extra_scene${sceneNum}.mp4`);
      createKenBurnsAnimation(imagePaths[imagePaths.length-1], extraPath, diff, resolution);
      // Atualizar lista de concatenação
      concatContent += `\nfile '${path.resolve(extraPath)}'`;
      fs.writeFileSync(concatListPath, concatContent);
      sceneConcatPath = path.join(tmpDir, `scene${sceneNum}_concat_final.mp4`);
      concatenateVideos(concatListPath, sceneConcatPath, resolution);
    }
    // Adicionar áudio da narração à cena (NÃO usar -shortest)
    const videoWithAudioPath = path.join(tmpDir, `videoaudio_scene${sceneNum}.mp4`);
    addAudioToVideo(sceneConcatPath, normalizedAudioPath, videoWithAudioPath, false); // false = não usar -shortest
    // Gerar legendas com transcrição automática Whisper
    let subtitles: string[];
    let subtitlesPath: string;
    
    try {
      log(`🎙️ [WHISPER] Tentando transcrição automática para legendas profissionais...`);
      
      // Usar Whisper para transcrição automática
      const whisperResult = await transcribeAudio(normalizedAudioPath);
      
      if (isValidSrt(whisperResult.srt)) {
        // Salvar legenda SRT do Whisper
        subtitlesPath = path.join(tmpDir, `legenda_whisper_scene${sceneNum}.srt`);
        saveSrtFile(whisperResult.srt, subtitlesPath);
        
        // [NOVO] Usar SRT do Whisper convertido para legendas progressivas
        subtitles = convertWhisperToProgressive(whisperResult.srt, 'word'); // 'word' = palavra por palavra, 'phrase' = frase por frase
        
        log(`✅ [WHISPER] Legendas progressivas geradas: ${subtitles.length} blocos`);
        log(`📝 [WHISPER] Texto transcrito: "${whisperResult.text.substring(0, 100)}..."`);
        log(`⏱️ [WHISPER] Usando legendas progressivas (palavra por palavra)`);
      } else {
        throw new Error('SRT inválido retornado pelo Whisper');
      }
      
    } catch (whisperError) {
      log(`❌ [WHISPER] Falha na transcrição automática: ${whisperError}`);
      log(`🔄 [FALLBACK] Usando geração manual de legendas...`);
      
      // Fallback: usar método anterior de geração de legendas progressivas
      subtitles = await generateProgressiveSubtitlesWithAudio(narracao, normalizedAudioPath, 'word');
      subtitlesPath = path.join(tmpDir, `legenda_manual_scene${sceneNum}.srt`);
      fs.writeFileSync(subtitlesPath, subtitles.join('\n'));
      
      log(`✅ [FALLBACK] Legendas progressivas manuais geradas: ${subtitles.length} blocos`);
    }

    // Aplicar legendas ao vídeo
    let videoWithSubtitlesPath: string;
    if (!fs.existsSync(subtitlesPath)) {
      videoWithSubtitlesPath = path.join(tmpDir, `legendado_scene${sceneNum}.mp4`);
      fs.copyFileSync(videoWithAudioPath, videoWithSubtitlesPath);
    } else {
      videoWithSubtitlesPath = path.join(tmpDir, `legendado_scene${sceneNum}.mp4`);
      addSubtitlesToVideo(videoWithAudioPath, subtitlesPath, videoWithSubtitlesPath);
    }
    // Aplicar estilo final
    const finalScenePath = path.join(tmpDir, `estilizado_scene${sceneNum}.mp4`);
    applyFFmpegStyle(videoWithSubtitlesPath, finalScenePath, {
      showCallToAction,
      showWatermark,
      resolution
    });
    sceneVideos.push(finalScenePath);
    log(`[🎬 SD OK] Cena ${sceneNum} processada`);
  }
  // 5. Concatenar vídeos
  if (sceneVideos.length === 0) {
    log(`❌ Nenhuma cena válida foi processada. Verifique se há áudio válido.`);
    throw new Error('Nenhuma cena válida foi processada');
  }

  log(`🎬 Concatenando ${sceneVideos.length} vídeos das cenas...`);
  const concatListPath = path.join(tmpDir, 'concat_list.txt');
  const concatContent = sceneVideos.map(video => `file '${path.resolve(video)}'`).join('\n');
  fs.writeFileSync(concatListPath, concatContent);

  // Gerar nome único para o vídeo final
  const safeTema = tema.replace(/[^a-zA-Z0-9_\-]/g, '_').substring(0, 30);
  const now = new Date();
  const timestamp = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours().toString().padStart(2,'0')}${now.getMinutes().toString().padStart(2,'0')}${now.getSeconds().toString().padStart(2,'0')}`;
  const outputFile = `final_${safeTema}_${timestamp}.mp4`;
  const outputPath = path.join('./output', outputFile);
  concatenateVideos(concatListPath, outputPath, resolution);

  log(`✅ [SD] Vídeo final legendado, narrado e animado salvo em: ${outputPath}`);

  // ADICIONAR MÚSICA DE FUNDO SE ESPECIFICADA
  if (backgroundMusic && backgroundMusic.path) {
    try {
      // Tentar diferentes caminhos para encontrar a música
      let musicFilePath = backgroundMusic.path;
      
      // Se o caminho não existir, tentar variações
      if (!fs.existsSync(musicFilePath)) {
        const possiblePaths = [
          backgroundMusic.path,
          path.join('./assets/music', path.basename(backgroundMusic.path)),
          path.join('./assets/music/ambient', path.basename(backgroundMusic.path)),
          path.join('./assets/music/energetic', path.basename(backgroundMusic.path)),
          path.join('./assets/music/emotional', path.basename(backgroundMusic.path)),
          path.join('./assets/music/corporate', path.basename(backgroundMusic.path))
        ];
        
        for (const testPath of possiblePaths) {
          if (fs.existsSync(testPath)) {
            musicFilePath = testPath;
            log(`🎵 [SD] Música encontrada em: ${musicFilePath}`);
            break;
          }
        }
      }
      
      if (fs.existsSync(musicFilePath)) {
        log(`🎵 [SD] Adicionando música de fundo: ${musicFilePath}`);
        const videoWithMusicPath = outputPath.replace('.mp4', '_with_music.mp4');
        
        addBackgroundMusic(outputPath, musicFilePath, videoWithMusicPath, {
          volume: backgroundMusic.volume || 0.15, // Volume reduzido
          loop: backgroundMusic.loop !== false,
          fadeIn: backgroundMusic.fadeIn || 2,
          fadeOut: backgroundMusic.fadeOut || 2
        });
        
        // Substituir o arquivo original pelo com música
        fs.unlinkSync(outputPath);
        fs.renameSync(videoWithMusicPath, outputPath);
        log(`✅ [SD] Música de fundo adicionada com sucesso`);
      } else {
        log(`⚠️ [SD] Música não encontrada: ${backgroundMusic.path}`);
        log(`🔍 [SD] Procurando em: assets/music/`);
        
        // Listar músicas disponíveis
        const musicDir = './assets/music';
        if (fs.existsSync(musicDir)) {
          const files = fs.readdirSync(musicDir);
          log(`📁 [SD] Músicas disponíveis: ${files.join(', ')}`);
        }
      }
    } catch (musicError) {
      log(`❌ [SD] Erro ao adicionar música de fundo: ${musicError}`);
      log(`⚠️ [SD] Vídeo será salvo sem música de fundo`);
    }
  }

  // GERAR/COPIAR THUMBNAIL ANTES DA LIMPEZA DOS TEMPORÁRIOS
  try {
    const firstImage = path.join(tmpDir, 'scene1_img1.png');
    const thumbnailPath = outputPath.replace('.mp4', '_thumb.jpg');
    if (fs.existsSync(firstImage)) {
      fs.copyFileSync(firstImage, thumbnailPath);
      log(`✅ Thumbnail gerada a partir da primeira imagem: ${thumbnailPath}`);
    } else {
      log(`⚠️ Primeira imagem não encontrada para thumbnail: ${firstImage}`);
    }
  } catch (err) {
    log(`❌ Erro ao gerar thumbnail a partir da primeira imagem: ${err}`);
  }

  // LIMPEZA AUTOMÁTICA DOS ARQUIVOS TEMPORÁRIOS (NÃO REMOVE O VÍDEO FINAL)
  // cleanupTempFiles(tmpDir, log);

  return outputPath;
}

// Função para limpar arquivos temporários (NÃO remove o vídeo final)
function cleanupTempFiles(tmpDir: string, log: (message: string) => void) {
  try {
    log(`🧹 Limpando arquivos temporários...`);
    const tempExtensions = [
      '.png', '.mp3', '.mp4', '.srt', '.txt'
    ];
    let filesRemoved = 0;
    let totalSizeRemoved = 0;
    if (fs.existsSync(tmpDir)) {
      const files = fs.readdirSync(tmpDir);
      for (const file of files) {
        const filePath = path.join(tmpDir, file);
        if (fs.statSync(filePath).isFile()) {
          const ext = path.extname(file).toLowerCase();
          if (tempExtensions.includes(ext)) {
            const fileSize = fs.statSync(filePath).size;
            fs.unlinkSync(filePath);
            filesRemoved++;
            totalSizeRemoved += fileSize;
            log(`   🗑️ Removido: ${file}`);
          }
        }
      }
      // Tentar remover o diretório temporário se estiver vazio
      try {
        const remainingFiles = fs.readdirSync(tmpDir);
        if (remainingFiles.length === 0) {
          fs.rmdirSync(tmpDir);
          log(`   🗂️ Diretório temporário removido: ${tmpDir}`);
        } else {
          log(`   📁 Diretório mantido (${remainingFiles.length} arquivos restantes): ${tmpDir}`);
        }
      } catch (error) {
        log(`   ⚠️ Não foi possível remover diretório: ${error}`);
      }
    }
    log(`✅ LIMPEZA CONCLUÍDA: ${filesRemoved} arquivos removidos, ${(totalSizeRemoved/1024/1024).toFixed(2)}MB liberados.`);
  } catch (error) {
    log(`❌ ERRO NA LIMPEZA: ${error}`);
    log(`⚠️ Arquivos temporários podem ter permanecido no sistema`);
  }
}

// Função principal para CLI
async function main() {
  const args = process.argv.slice(2);
  const tema = args.find(arg => arg.startsWith('--tema='))?.split('=')[1];
  const tipo = args.find(arg => arg.startsWith('--tipo='))?.split('=')[1] || 'anuncio';
  const duracaoTotal = parseInt(args.find(arg => arg.startsWith('--duracao-total='))?.split('=')[1] || '30');
  const publico = args.find(arg => arg.startsWith('--publico='))?.split('=')[1] || 'maes';
  const cenas = parseInt(args.find(arg => arg.startsWith('--cenas='))?.split('=')[1] || '5');
  const resolution = args.find(arg => arg.startsWith('--resolution='))?.split('=')[1] as VideoFormat || 'vertical';
  const showCTA = !args.includes('--no-cta');
  const showWatermark = !args.includes('--no-watermark');
  
  // Parâmetros de música de fundo
  const musicPath = args.find(arg => arg.startsWith('--music='))?.split('=')[1];
  const musicVolume = parseFloat(args.find(arg => arg.startsWith('--music-volume='))?.split('=')[1] || '0.3');
  const musicLoop = !args.includes('--no-music-loop');
  const musicFadeIn = parseFloat(args.find(arg => arg.startsWith('--music-fade-in='))?.split('=')[1] || '2');
  const musicFadeOut = parseFloat(args.find(arg => arg.startsWith('--music-fade-out='))?.split('=')[1] || '2');
  
  const backgroundMusic = musicPath ? {
    path: musicPath,
    volume: musicVolume,
    loop: musicLoop,
    fadeIn: musicFadeIn,
    fadeOut: musicFadeOut
  } : undefined;
  
  // Parâmetros de imagens do app
  const appImagesArg = args.find(arg => arg.startsWith('--app-images='))?.split('=')[1];
  const appImages = appImagesArg ? appImagesArg.split(',').filter(url => url.trim()) : undefined;
  
  const appImagesContextArg = args.find(arg => arg.startsWith('--app-images-context='))?.split('=')[1];
  const appImagesContext = appImagesContextArg ? decodeURIComponent(appImagesContextArg) : undefined;
  
  if (appImages && appImages.length > 0) {
    console.log(`🖼️ [APP] ${appImages.length} imagens do app recebidas para uso no vídeo`);
  }
  
  if (appImagesContext) {
    console.log(`📝 Contexto das imagens do app recebido para o roteiro: ${appImagesContext.substring(0, 200)}...`);
  }

  if (!tema) {
    console.error('❌ Tema é obrigatório. Use: --tema="Seu tema aqui"');
    process.exit(1);
  }
  try {
    await generateVideoWithStableDiffusion(tema, tipo, duracaoTotal, publico, cenas, resolution, showCTA, showWatermark, backgroundMusic, appImages, appImagesContext);
    console.log('🎉 [SD] Vídeo gerado com sucesso!');
  } catch (error) {
    console.error('❌ [SD] Erro ao gerar vídeo:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { generateVideoWithStableDiffusion }; 