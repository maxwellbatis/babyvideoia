import { generateVideoVSL } from './orchestrator-vsl';
import fs from 'fs';

async function main() {
  const payload = {
    tema: 'Como acalmar o bebê na hora do sono',
    tipo: 'dica',
    publico: 'gestantes',
    tom: 'íntimo',
    duracao: 30,
    cenas: [
      { descricao: 'Mãe embala o bebê no colo em um quarto com luz suave.', imagens: [] },
      { descricao: 'Bebê dormindo tranquilo no berço, música suave ao fundo.', imagens: [] },
      { descricao: 'Mãe sorrindo aliviada, bebê dormindo.', imagens: [] }
    ]
  };

  try {
    console.log('🚦 Iniciando teste do pipeline VSL...');
    const resultado = await generateVideoVSL(payload);
    console.log('✅ Pipeline executado com sucesso!');
    console.log('🎬 Caminho do vídeo:', resultado.videoPath);
    console.log('🖼️ Caminho do thumbnail:', resultado.thumbnailPath);
    console.log('📝 Caminho das legendas:', resultado.legendasPath);
    console.log('📋 Metadados:', resultado.metadados);
    if (resultado.videoPath && fs.existsSync(resultado.videoPath)) {
      console.log('🎉 Vídeo gerado com sucesso!');
    } else {
      console.log('⚠️ Vídeo não encontrado no caminho esperado.');
    }
  } catch (error) {
    console.error('❌ Erro ao rodar pipeline:', error);
  }
}

main(); 