// Usar ts-node para executar TypeScript diretamente
require('ts-node/register');
const { gerarImagemColabSD } = require('./src/image/stabledefusion');
const fs = require('fs');
const path = require('path');

// Configurações de velocidade do SD
const SD_SPEED_CONFIGS = {
  ultra_fast: {
    name: 'Ultra Rápido',
    steps: 20,
    cfg_scale: 6,
    sampler: 'Euler a',
    denoising: 0.8,
    timeout: 60000, // 1 minuto
    delay: 1000 // 1 segundo
  },
  fast: {
    name: 'Rápido',
    steps: 40,
    cfg_scale: 7,
    sampler: 'Euler a',
    denoising: 0.75,
    timeout: 120000, // 2 minutos
    delay: 2000 // 2 segundos
  },
  normal: {
    name: 'Normal',
    steps: 60,
    cfg_scale: 7,
    sampler: 'Euler a',
    denoising: 0.75,
    timeout: 180000, // 3 minutos
    delay: 3000 // 3 segundos
  },
  slow: {
    name: 'Lento',
    steps: 80,
    cfg_scale: 8,
    sampler: 'DPM++ 2M Karras',
    denoising: 0.7,
    timeout: 240000, // 4 minutos
    delay: 5000 // 5 segundos
  },
  ultra_slow: {
    name: 'Ultra Lento',
    steps: 100,
    cfg_scale: 8,
    sampler: 'DPM++ 2M Karras',
    denoising: 0.7,
    timeout: 300000, // 5 minutos
    delay: 8000 // 8 segundos
  }
};

async function testSDSpeedControl() {
  console.log('🎛️ Testando controle de velocidade do Stable Diffusion...\n');

  const testPrompt = 'mãe sorrindo com bebê no colo, ambiente acolhedor, luz suave, alta qualidade';
  const outputDir = 'output/sd_speed_test';
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log(`📝 Prompt de teste: "${testPrompt}"`);
  console.log(`📁 Diretório: ${outputDir}\n`);

  // Testar cada configuração de velocidade
  for (const [speedKey, config] of Object.entries(SD_SPEED_CONFIGS)) {
    console.log(`\n🚀 Testando modo: ${config.name}`);
    console.log(`⚙️ Configuração: ${config.steps} steps, CFG ${config.cfg_scale}, ${config.sampler}`);
    
    const outputPath = path.join(outputDir, `test_${speedKey}.png`);
    const startTime = Date.now();
    
    try {
      // Aguardar delay inicial
      if (config.delay > 0) {
        console.log(`⏳ Aguardando ${config.delay/1000}s antes de iniciar...`);
        await new Promise(resolve => setTimeout(resolve, config.delay));
      }
      
      const result = await gerarImagemColabSD(testPrompt, outputPath, {
        resolution: 'vertical',
        slowMode: speedKey.includes('slow'), // Ativar modo lento para configurações lentas
        negativePrompt: 'blurry, low quality, distorted, ugly, deformed, watermark'
      });
      
      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);
      
      if (fs.existsSync(result)) {
        const stats = fs.statSync(result);
        console.log(`✅ Sucesso! Tempo: ${duration}s, Tamanho: ${Math.round(stats.size / 1024)}KB`);
      } else {
        console.log(`❌ Arquivo não encontrado após geração`);
      }
      
    } catch (error) {
      const endTime = Date.now();
      const duration = Math.round((endTime - startTime) / 1000);
      console.log(`❌ Erro: ${error.message} (Tempo: ${duration}s)`);
    }
    
    // Aguardar entre testes
    if (speedKey !== Object.keys(SD_SPEED_CONFIGS).slice(-1)[0]) {
      console.log(`⏳ Aguardando 3 segundos antes do próximo teste...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log(`\n🎉 Teste de velocidade concluído!`);
  
  // Resumo dos resultados
  console.log(`\n📊 Resumo dos resultados:`);
  const files = fs.readdirSync(outputDir);
  files.forEach(file => {
    const filePath = path.join(outputDir, file);
    const stats = fs.statSync(filePath);
    console.log(`   - ${file}: ${Math.round(stats.size / 1024)}KB`);
  });
}

// Função para gerar uma única imagem com configuração específica
async function generateSingleImage(prompt, speedConfig = 'normal', filename = null) {
  console.log(`🎨 Gerando imagem única com configuração: ${speedConfig}`);
  
  const config = SD_SPEED_CONFIGS[speedConfig];
  if (!config) {
    throw new Error(`Configuração de velocidade '${speedConfig}' não encontrada`);
  }
  
  const outputDir = 'output/single_generation';
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, filename || `single_${speedConfig}_${Date.now()}.png`);
  
  console.log(`📝 Prompt: "${prompt}"`);
  console.log(`⚙️ Configuração: ${config.name} (${config.steps} steps, CFG ${config.cfg_scale})`);
  
  const startTime = Date.now();
  
  try {
    const result = await gerarImagemColabSD(prompt, outputPath, {
      resolution: 'vertical',
      slowMode: speedConfig.includes('slow'),
      negativePrompt: 'blurry, low quality, distorted, ugly, deformed, watermark'
    });
    
    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);
    
    if (fs.existsSync(result)) {
      const stats = fs.statSync(result);
      console.log(`✅ Imagem gerada com sucesso!`);
      console.log(`📁 Arquivo: ${result}`);
      console.log(`📊 Tamanho: ${Math.round(stats.size / 1024)}KB`);
      console.log(`⏱️ Tempo: ${duration}s`);
      return result;
    }
  } catch (error) {
    console.log(`❌ Erro na geração: ${error.message}`);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Teste completo de velocidade
    testSDSpeedControl().catch(console.error);
  } else if (args[0] === 'single') {
    // Geração única
    const prompt = args[1] || 'mãe com bebê, ambiente acolhedor';
    const speed = args[2] || 'normal';
    const filename = args[3] || null;
    
    generateSingleImage(prompt, speed, filename).catch(console.error);
  } else {
    console.log('Uso:');
    console.log('  node sd-speed-control.js                    # Teste completo de velocidade');
    console.log('  node sd-speed-control.js single "prompt"    # Geração única');
    console.log('  node sd-speed-control.js single "prompt" slow "filename.png"  # Com configuração e nome');
  }
}

module.exports = { 
  testSDSpeedControl, 
  generateSingleImage, 
  SD_SPEED_CONFIGS 
}; 