const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function debugImages() {
  console.log('🔍 Debugando problema das imagens...\n');

  try {
    // 1. Verificar se há imagens no banco
    console.log('📊 Verificando imagens no banco de dados...');
    const images = await prisma.generatedImage.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' }
    });

    console.log(`✅ Encontradas ${images.length} imagens no banco`);
    
    if (images.length > 0) {
      console.log('\n📋 Últimas imagens no banco:');
      images.forEach((img, index) => {
        console.log(`${index + 1}. ${img.filename} - ${img.tema} - ${img.tipo} - ${img.publico}`);
        console.log(`   URL: ${img.cloudinaryUrl || 'N/A'}`);
        console.log(`   Tags: ${img.tags.join(', ')}`);
        console.log('');
      });
    } else {
      console.log('❌ Nenhuma imagem encontrada no banco!');
    }

    // 2. Verificar imagens na pasta output
    console.log('📁 Verificando imagens na pasta output...');
    const outputDir = 'output/generated_images';
    if (fs.existsSync(outputDir)) {
      const files = fs.readdirSync(outputDir);
      const pngFiles = files.filter(f => f.endsWith('.png'));
      
      console.log(`✅ Encontrados ${pngFiles.length} arquivos PNG em output/generated_images`);
      
      const realImages = pngFiles.filter(f => !f.includes('placeholder'));
      const placeholders = pngFiles.filter(f => f.includes('placeholder'));
      
      console.log(`   - Imagens reais: ${realImages.length}`);
      console.log(`   - Placeholders: ${placeholders.length}`);
      
      if (realImages.length > 0) {
        console.log('\n📋 Imagens reais encontradas:');
        realImages.slice(0, 5).forEach(img => console.log(`   - ${img}`));
      }
    } else {
      console.log('❌ Pasta output/generated_images não existe!');
    }

    // 3. Testar busca de imagem similar
    console.log('\n🔍 Testando busca de imagem similar...');
    const testCriteria = {
      tema: 'maternidade',
      tipo: 'anuncio',
      publico: 'maes',
      resolution: '576x1024',
      limit: 5
    };

    const similarImages = await prisma.generatedImage.findMany({
      where: {
        tema: testCriteria.tema,
        tipo: testCriteria.tipo,
        publico: testCriteria.publico,
        resolution: testCriteria.resolution
      },
      orderBy: [
        { performance: 'desc' },
        { usageCount: 'desc' },
        { createdAt: 'desc' }
      ],
      take: testCriteria.limit
    });

    console.log(`✅ Busca por "${testCriteria.tema}" encontrou ${similarImages.length} imagens`);

    // 4. Verificar se o problema está na função findBestImageForScene
    console.log('\n🔧 Testando função findBestImageForScene...');
    const { GeneratedImageManager } = require('./src/utils/generatedImageManager');
    
    const bestImage = await GeneratedImageManager.findBestImageForScene(
      'mãe cuidando do bebê',
      'maternidade',
      'anuncio',
      'maes',
      '576x1024',
      1
    );

    if (bestImage) {
      console.log(`✅ Melhor imagem encontrada: ${bestImage.filename}`);
      console.log(`   URL: ${bestImage.cloudinaryUrl || 'N/A'}`);
    } else {
      console.log('❌ Nenhuma imagem encontrada pela função findBestImageForScene');
    }

    // 5. Verificar configuração do Cloudinary
    console.log('\n☁️ Verificando configuração do Cloudinary...');
    const { getCredential } = require('./src/utils/credentials');
    
    const cloudName = await getCredential('CLOUDINARY_CLOUD_NAME');
    const apiKey = await getCredential('CLOUDINARY_API_KEY');
    const apiSecret = await getCredential('CLOUDINARY_API_SECRET');

    console.log(`   Cloud Name: ${cloudName ? '✅ Configurado' : '❌ Não configurado'}`);
    console.log(`   API Key: ${apiKey ? '✅ Configurado' : '❌ Não configurado'}`);
    console.log(`   API Secret: ${apiSecret ? '✅ Configurado' : '❌ Não configurado'}`);

  } catch (error) {
    console.error('❌ Erro durante debug:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  debugImages();
}

module.exports = { debugImages }; 