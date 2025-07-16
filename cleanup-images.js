const fs = require('fs');
const path = require('path');

function cleanupImages() {
  console.log('🧹 Limpando imagens desnecessárias...\n');

  const outputDir = 'output/generated_images';
  
  if (!fs.existsSync(outputDir)) {
    console.log('❌ Pasta output/generated_images não existe!');
    return;
  }

  const files = fs.readdirSync(outputDir);
  const pngFiles = files.filter(f => f.endsWith('.png'));
  
  console.log(`📊 Encontrados ${pngFiles.length} arquivos PNG`);
  
  const realImages = pngFiles.filter(f => !f.includes('placeholder'));
  const placeholders = pngFiles.filter(f => f.includes('placeholder'));
  
  console.log(`   - Imagens reais: ${realImages.length}`);
  console.log(`   - Placeholders: ${placeholders.length}`);
  
  // Verificar quais placeholders podem ser removidos
  const placeholdersToRemove = [];
  
  placeholders.forEach(placeholder => {
    // Extrair informações do nome do placeholder
    const match = placeholder.match(/placeholder_scene(\d+)_img(\d+)\.png/);
    if (match) {
      const sceneNum = match[1];
      const imgNum = match[2];
      const realImageName = `scene${sceneNum}_img${imgNum}.png`;
      
      // Se existe uma imagem real correspondente, marcar placeholder para remoção
      if (realImages.includes(realImageName)) {
        placeholdersToRemove.push(placeholder);
        console.log(`🗑️ Placeholder ${placeholder} será removido (existe ${realImageName})`);
      }
    }
  });
  
  if (placeholdersToRemove.length > 0) {
    console.log(`\n🗑️ Removendo ${placeholdersToRemove.length} placeholders desnecessários...`);
    
    placeholdersToRemove.forEach(placeholder => {
      try {
        fs.unlinkSync(path.join(outputDir, placeholder));
        console.log(`✅ Removido: ${placeholder}`);
      } catch (e) {
        console.log(`❌ Erro ao remover ${placeholder}: ${e.message}`);
      }
    });
  } else {
    console.log('\n✅ Nenhum placeholder desnecessário encontrado');
  }
  
  // Listar imagens reais disponíveis
  console.log('\n📋 Imagens reais disponíveis:');
  realImages.forEach(img => {
    const filePath = path.join(outputDir, img);
    const stats = fs.statSync(filePath);
    const sizeKB = Math.round(stats.size / 1024);
    console.log(`   - ${img} (${sizeKB}KB)`);
  });
  
  console.log('\n✅ Limpeza concluída!');
}

// Executar se chamado diretamente
if (require.main === module) {
  cleanupImages();
}

module.exports = { cleanupImages }; 