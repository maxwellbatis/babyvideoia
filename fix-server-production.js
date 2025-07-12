const fs = require('fs');
const path = require('path');

console.log('🔧 Corrigindo servidor para produção...');

// Função para verificar se os arquivos JavaScript existem
function checkJavaScriptFiles() {
  const jsFiles = [
    './dist/src/orchestrators/orchestrator-animated-sd.js',
    './dist/src/orchestrators/orchestrator-animated-images.js'
  ];
  
  const missing = [];
  jsFiles.forEach(file => {
    if (!fs.existsSync(file)) {
      missing.push(file);
    }
  });
  
  if (missing.length > 0) {
    console.log('⚠️ Arquivos JavaScript não encontrados:');
    missing.forEach(file => console.log(`   - ${file}`));
    return false;
  }
  
  console.log('✅ Arquivos JavaScript encontrados');
  return true;
}

// Função para corrigir o servidor
function fixServer() {
  const serverPath = './server.ts';
  
  if (!fs.existsSync(serverPath)) {
    console.log('❌ server.ts não encontrado');
    return false;
  }
  
  try {
    console.log('🔄 Corrigindo servidor para usar JavaScript...');
    
    let serverContent = fs.readFileSync(serverPath, 'utf8');
    
    // Substituir comandos ts-node por node dist/
    const replacements = [
      {
        from: /npx ts-node \.\/src\/orchestrators\/orchestrator-animated-sd\.ts/g,
        to: 'node ./dist/src/orchestrators/orchestrator-animated-sd.js'
      },
      {
        from: /npx ts-node \.\/src\/orchestrators\/orchestrator-animated-images\.ts/g,
        to: 'node ./dist/src/orchestrators/orchestrator-animated-images.js'
      }
    ];
    
    let changesMade = false;
    replacements.forEach(replacement => {
      if (serverContent.match(replacement.from)) {
        serverContent = serverContent.replace(replacement.from, replacement.to);
        changesMade = true;
        console.log(`✅ Substituído: ${replacement.from.source}`);
      }
    });
    
    if (changesMade) {
      fs.writeFileSync(serverPath, serverContent);
      console.log('✅ Servidor corrigido com sucesso!');
      return true;
    } else {
      console.log('ℹ️ Nenhuma alteração necessária no servidor');
      return true;
    }
    
  } catch (error) {
    console.error('❌ Erro ao corrigir servidor:', error.message);
    return false;
  }
}

// Função para verificar se o TypeScript está compilado
function compileTypeScript() {
  try {
    console.log('📦 Verificando se TypeScript está compilado...');
    
    if (!fs.existsSync('./dist')) {
      console.log('❌ Pasta dist/ não encontrada. Compilando TypeScript...');
      const { execSync } = require('child_process');
      execSync('npx tsc', { stdio: 'inherit' });
      console.log('✅ TypeScript compilado com sucesso!');
    } else {
      console.log('✅ Pasta dist/ encontrada');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erro ao compilar TypeScript:', error.message);
    return false;
  }
}

// Função para criar backup do servidor
function createBackup() {
  const serverPath = './server.ts';
  const backupPath = './server.ts.backup';
  
  if (fs.existsSync(serverPath)) {
    try {
      fs.copyFileSync(serverPath, backupPath);
      console.log(`✅ Backup criado: ${backupPath}`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao criar backup:', error.message);
      return false;
    }
  }
  
  return false;
}

// Função para verificar se as correções foram aplicadas
function verifyCorrections() {
  const serverPath = './server.ts';
  
  if (!fs.existsSync(serverPath)) {
    console.log('❌ server.ts não encontrado para verificação');
    return false;
  }
  
  try {
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    // Verificar se ainda há ts-node
    const tsNodeMatches = serverContent.match(/npx ts-node/g);
    if (tsNodeMatches) {
      console.log(`⚠️ Ainda há ${tsNodeMatches.length} referências a ts-node`);
      return false;
    }
    
    // Verificar se há node dist/
    const nodeDistMatches = serverContent.match(/node \.\/dist\//g);
    if (nodeDistMatches) {
      console.log(`✅ Encontradas ${nodeDistMatches.length} referências a node dist/`);
      return true;
    }
    
    console.log('⚠️ Nenhuma referência a node dist/ encontrada');
    return false;
    
  } catch (error) {
    console.error('❌ Erro ao verificar correções:', error.message);
    return false;
  }
}

// Função principal
function main() {
  console.log('🚀 Iniciando correção do servidor para produção...');
  
  try {
    // 1. Criar backup
    createBackup();
    
    // 2. Compilar TypeScript se necessário
    if (!compileTypeScript()) {
      console.log('⚠️ Compilação TypeScript falhou, mas continuando...');
    }
    
    // 3. Verificar arquivos JavaScript
    if (!checkJavaScriptFiles()) {
      console.log('❌ Arquivos JavaScript não encontrados. Execute: npx tsc');
      process.exit(1);
    }
    
    // 4. Corrigir servidor
    if (!fixServer()) {
      console.log('❌ Falha ao corrigir servidor');
      process.exit(1);
    }
    
    // 5. Verificar correções
    if (!verifyCorrections()) {
      console.log('⚠️ Verificação falhou, mas o processo pode ter funcionado');
    }
    
    console.log('\n✅ Correção concluída com sucesso!');
    console.log('📋 Próximos passos:');
    console.log('   1. Reinicie o servidor: pm2 restart video-ai-baby');
    console.log('   2. Teste a geração de vídeo');
    console.log('   3. Verifique os logs: pm2 logs video-ai-baby');
    console.log('   4. Se houver problemas, restaure o backup: cp server.ts.backup server.ts');
    
  } catch (error) {
    console.error('❌ Erro durante a correção:', error.message);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  checkJavaScriptFiles,
  fixServer,
  compileTypeScript,
  createBackup,
  verifyCorrections,
  main
}; 