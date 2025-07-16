const fs = require('fs');
const path = require('path');

console.log('🧹 Iniciando limpeza manual de imagens...');

// Função para limpar diretório de imagens
function limparDiretorioImagens() {
  const imagesDir = 'output/generated_images';
  
  if (!fs.existsSync(imagesDir)) {
    console.log('✅ Diretório de imagens não existe, nada para limpar.');
    return;
  }
  
  try {
    const files = fs.readdirSync(imagesDir);
    let arquivosRemovidos = 0;
    
    files.forEach(file => {
      const filePath = path.join(imagesDir, file);
      const stats = fs.statSync(filePath);
      
      // Verificar se é arquivo de imagem
      if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg')) {
        try {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Removido: ${file}`);
          arquivosRemovidos++;
        } catch (e) {
          console.log(`⚠️ Erro ao remover ${file}: ${e.message}`);
        }
      }
    });
    
    console.log(`✅ Limpeza concluída! ${arquivosRemovidos} arquivos removidos.`);
    
    // Verificar se o diretório ficou vazio
    const remainingFiles = fs.readdirSync(imagesDir);
    if (remainingFiles.length === 0) {
      try {
        fs.rmdirSync(imagesDir);
        console.log('🗑️ Diretório vazio removido: output/generated_images');
      } catch (e) {
        console.log(`⚠️ Erro ao remover diretório vazio: ${e.message}`);
      }
    }
    
  } catch (e) {
    console.log(`❌ Erro ao acessar diretório: ${e.message}`);
  }
}

// Função para limpar diretório de vídeos temporários
function limparDiretorioVideos() {
  const videosDir = 'output/final_videos';
  
  if (!fs.existsSync(videosDir)) {
    console.log('✅ Diretório de vídeos não existe, nada para limpar.');
    return;
  }
  
  try {
    const files = fs.readdirSync(videosDir);
    let arquivosRemovidos = 0;
    
    files.forEach(file => {
      const filePath = path.join(videosDir, file);
      
      // Verificar se é arquivo de vídeo ou texto
      if (file.endsWith('.mp4') || file.endsWith('.avi') || file.endsWith('.mov') || 
          file.endsWith('.txt') || file.endsWith('.srt')) {
        try {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Removido: ${file}`);
          arquivosRemovidos++;
        } catch (e) {
          console.log(`⚠️ Erro ao remover ${file}: ${e.message}`);
        }
      }
    });
    
    console.log(`✅ Limpeza de vídeos concluída! ${arquivosRemovidos} arquivos removidos.`);
    
    // Verificar se o diretório ficou vazio
    const remainingFiles = fs.readdirSync(videosDir);
    if (remainingFiles.length === 0) {
      try {
        fs.rmdirSync(videosDir);
        console.log('🗑️ Diretório vazio removido: output/final_videos');
      } catch (e) {
        console.log(`⚠️ Erro ao remover diretório vazio: ${e.message}`);
      }
    }
    
  } catch (e) {
    console.log(`❌ Erro ao acessar diretório de vídeos: ${e.message}`);
  }
}

// Função para limpar arquivos de áudio temporários
function limparArquivosAudio() {
  const outputDir = 'output';
  
  if (!fs.existsSync(outputDir)) {
    console.log('✅ Diretório output não existe, nada para limpar.');
    return;
  }
  
  try {
    const files = fs.readdirSync(outputDir);
    let arquivosRemovidos = 0;
    
    files.forEach(file => {
      const filePath = path.join(outputDir, file);
      const stats = fs.statSync(filePath);
      
      // Verificar se é arquivo de áudio
      if (file.endsWith('.mp3') || file.endsWith('.wav') || file.endsWith('.m4a')) {
        try {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Removido: ${file}`);
          arquivosRemovidos++;
        } catch (e) {
          console.log(`⚠️ Erro ao remover ${file}: ${e.message}`);
        }
      }
    });
    
    console.log(`✅ Limpeza de áudio concluída! ${arquivosRemovidos} arquivos removidos.`);
    
  } catch (e) {
    console.log(`❌ Erro ao acessar diretório output: ${e.message}`);
  }
}

// Executar limpeza
console.log('\n=== LIMPEZA DE IMAGENS ===');
limparDiretorioImagens();

console.log('\n=== LIMPEZA DE VÍDEOS ===');
limparDiretorioVideos();

console.log('\n=== LIMPEZA DE ÁUDIO ===');
limparArquivosAudio();

console.log('\n🎉 Limpeza manual concluída!'); 