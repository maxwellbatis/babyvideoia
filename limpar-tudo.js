const fs = require('fs');
const path = require('path');

console.log('🧹 Iniciando limpeza completa de arquivos temporários...');

// Função para limpar recursivamente um diretório
function limparDiretorioRecursivo(dirPath, preservarArquivos = []) {
  if (!fs.existsSync(dirPath)) {
    console.log(`✅ Diretório não existe: ${dirPath}`);
    return 0;
  }
  
  let arquivosRemovidos = 0;
  
  try {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stats = fs.statSync(itemPath);
      
      // Verificar se deve preservar o arquivo
      const devePreservar = preservarArquivos.some(preservar => 
        item.includes(preservar) || itemPath.includes(preservar)
      );
      
      if (devePreservar) {
        console.log(`💾 Preservando: ${item}`);
        continue;
      }
      
      if (stats.isDirectory()) {
        // Limpar subdiretório recursivamente
        const subRemovidos = limparDiretorioRecursivo(itemPath, preservarArquivos);
        arquivosRemovidos += subRemovidos;
        
        // Tentar remover diretório se estiver vazio
        try {
          const remainingItems = fs.readdirSync(itemPath);
          if (remainingItems.length === 0) {
            fs.rmdirSync(itemPath);
            console.log(`🗑️ Diretório vazio removido: ${itemPath}`);
          }
        } catch (e) {
          // Ignorar erros ao remover diretório
        }
      } else {
        // Verificar extensões de arquivos temporários
        const extensoesTemp = [
          '.png', '.jpg', '.jpeg', '.mp4', '.avi', '.mov', '.mp3', '.wav', '.m4a',
          '.txt', '.srt', '.temp', '.tmp'
        ];
        
        const extensao = path.extname(item).toLowerCase();
        const isTempFile = extensoesTemp.includes(extensao) || 
                          item.includes('temp') || 
                          item.includes('tmp') ||
                          item.includes('part_') ||
                          item.includes('scene') ||
                          item.includes('placeholder') ||
                          item.includes('narracao_') ||
                          item.includes('video_sem_audio') ||
                          item.includes('video_final_') ||
                          item.includes('concat_list');
        
        if (isTempFile) {
          try {
            fs.unlinkSync(itemPath);
            console.log(`🗑️ Removido: ${item}`);
            arquivosRemovidos++;
          } catch (e) {
            console.log(`⚠️ Erro ao remover ${item}: ${e.message}`);
          }
        } else {
          console.log(`💾 Preservando (não é temporário): ${item}`);
        }
      }
    }
  } catch (e) {
    console.log(`❌ Erro ao acessar diretório ${dirPath}: ${e.message}`);
  }
  
  return arquivosRemovidos;
}

// Função para mostrar estatísticas de espaço
function mostrarEstatisticas() {
  const outputDir = 'output';
  if (!fs.existsSync(outputDir)) {
    console.log('📊 Diretório output não existe.');
    return;
  }
  
  try {
    let totalSize = 0;
    let totalFiles = 0;
    
    function calcularTamanhoRecursivo(dirPath) {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);
        
        if (stats.isDirectory()) {
          calcularTamanhoRecursivo(itemPath);
        } else {
          totalSize += stats.size;
          totalFiles++;
        }
      }
    }
    
    calcularTamanhoRecursivo(outputDir);
    
    const tamanhoMB = (totalSize / (1024 * 1024)).toFixed(2);
    console.log(`📊 Estatísticas do diretório output:`);
    console.log(`   - Total de arquivos: ${totalFiles}`);
    console.log(`   - Tamanho total: ${tamanhoMB} MB`);
    
  } catch (e) {
    console.log(`❌ Erro ao calcular estatísticas: ${e.message}`);
  }
}

// Executar limpeza
console.log('\n📊 Estatísticas antes da limpeza:');
mostrarEstatisticas();

console.log('\n🧹 Iniciando limpeza...');

// Arquivos importantes para preservar
const arquivosParaPreservar = [
  'video_metadata.json', // Metadados dos vídeos
  'config', // Arquivos de configuração
  'settings', // Configurações
  'credentials' // Credenciais
];

const totalRemovidos = limparDiretorioRecursivo('output', arquivosParaPreservar);

console.log(`\n✅ Limpeza concluída! ${totalRemovidos} arquivos removidos.`);

console.log('\n📊 Estatísticas após a limpeza:');
mostrarEstatisticas();

console.log('\n🎉 Limpeza completa finalizada!'); 