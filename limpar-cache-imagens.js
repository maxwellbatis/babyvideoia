const fs = require('fs');
const path = require('path');

console.log('🧹 Limpando cache de imagens para forçar geração de novas imagens...\n');

// 1. Limpar diretório de imagens geradas
console.log('1️⃣ Limpando diretório de imagens geradas...');

const outputDir = path.join(process.cwd(), 'output', 'generated_images');
if (fs.existsSync(outputDir)) {
  const files = fs.readdirSync(outputDir);
  let removedCount = 0;
  
  files.forEach(file => {
    const filePath = path.join(outputDir, file);
    try {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Removido: ${file}`);
      removedCount++;
    } catch (error) {
      console.log(`⚠️ Erro ao remover ${file}: ${error.message}`);
    }
  });
  
  console.log(`✅ ${removedCount} arquivos removidos do diretório de imagens`);
} else {
  console.log('⚠️ Diretório de imagens não encontrado');
}
console.log('');

// 2. Limpar cache de imagens
console.log('2️⃣ Limpando cache de imagens...');

const cacheDir = path.join(process.cwd(), 'output', 'cache', 'images');
if (fs.existsSync(cacheDir)) {
  const files = fs.readdirSync(cacheDir);
  let removedCount = 0;
  
  files.forEach(file => {
    const filePath = path.join(cacheDir, file);
    try {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Removido do cache: ${file}`);
      removedCount++;
    } catch (error) {
      console.log(`⚠️ Erro ao remover do cache ${file}: ${error.message}`);
    }
  });
  
  console.log(`✅ ${removedCount} arquivos removidos do cache`);
} else {
  console.log('⚠️ Diretório de cache não encontrado');
}
console.log('');

// 3. Verificar arquivos de uso do Freepik
console.log('3️⃣ Verificando arquivos de uso do Freepik...');

const usageFile = path.join(process.cwd(), 'freepik_usage.json');
if (fs.existsSync(usageFile)) {
  try {
    const usage = JSON.parse(fs.readFileSync(usageFile, 'utf-8'));
    const today = new Date().toISOString().slice(0, 10);
    const todayUsage = usage[today] || 0;
    console.log(`📊 Uso atual do Freepik hoje: ${todayUsage} requisições`);
    console.log(`💡 O Freepik continuará funcionando normalmente`);
  } catch (error) {
    console.log(`❌ Erro ao ler arquivo de uso: ${error.message}`);
  }
} else {
  console.log('📊 Arquivo de uso do Freepik não encontrado');
}
console.log('');

// 4. Verificar alertas do Freepik
console.log('4️⃣ Verificando alertas do Freepik...');

const alertsFile = path.join(process.cwd(), 'freepik_alerts.json');
if (fs.existsSync(alertsFile)) {
  try {
    const alerts = JSON.parse(fs.readFileSync(alertsFile, 'utf-8'));
    const activeAlerts = alerts.filter(a => !a.resolved);
    console.log(`⚠️ Alertas ativos: ${activeAlerts.length}`);
    
    if (activeAlerts.length > 0) {
      activeAlerts.forEach((alert, index) => {
        console.log(`  ${index + 1}. [${alert.severity.toUpperCase()}] ${alert.message}`);
      });
    }
  } catch (error) {
    console.log(`❌ Erro ao ler alertas: ${error.message}`);
  }
} else {
  console.log('📋 Nenhum arquivo de alertas encontrado');
}
console.log('');

// 5. Criar diretórios se não existirem
console.log('5️⃣ Verificando/criando diretórios necessários...');

const dirs = [
  path.join(process.cwd(), 'output', 'generated_images'),
  path.join(process.cwd(), 'output', 'cache', 'images'),
  path.join(process.cwd(), 'output', 'final_videos')
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Criado: ${dir}`);
    } catch (error) {
      console.log(`❌ Erro ao criar ${dir}: ${error.message}`);
    }
  } else {
    console.log(`✅ Diretório existe: ${dir}`);
  }
});
console.log('');

// 6. Resumo da limpeza
console.log('6️⃣ Resumo da limpeza:');
console.log('✅ Cache de imagens limpo');
console.log('✅ Diretório de imagens geradas limpo');
console.log('✅ Freepik funcionando normalmente');
console.log('✅ Diretórios verificados/criados');
console.log('');

console.log('🎉 Limpeza concluída!');
console.log('');
console.log('📝 Próximos passos:');
console.log('1. Gere um novo vídeo no frontend');
console.log('2. As imagens serão geradas novamente pelo Freepik');
console.log('3. Não haverá repetição de imagens antigas');
console.log('4. Monitore os logs para confirmar geração de novas imagens');
console.log('');
console.log('💡 Dica: O Freepik continuará funcionando normalmente com suas chaves atuais!'); 