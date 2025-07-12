const fs = require('fs');
const path = require('path');

console.log('🚀 Configurando arquivos de metadados para produção...');

// Função para criar diretório se não existir
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Diretório criado: ${dirPath}`);
  } else {
    console.log(`📁 Diretório já existe: ${dirPath}`);
  }
}

// Função para criar app_images.json
function createAppImagesFile() {
  const outputDir = './output';
  const appImagesPath = path.join(outputDir, 'app_images.json');
  
  ensureDirectoryExists(outputDir);
  
  const appImagesData = [
    {
      "id": 1752332869794,
      "filename": "ChatGPT Image 12 de jul. de 2025, 01_30_57.png",
      "cloudinaryUrl": "https://res.cloudinary.com/dvldpdrrk/image/upload/v1752332859/baby-diary-app-images/app_1752332867980.png",
      "cloudinaryPublicId": "baby-diary-app-images/app_1752332867980",
      "tag": "app-mockup",
      "description": "Mãe concentrada na tela do app Baby Diary, com expressão de afeto.",
      "size": 2550783,
      "createdAt": "2025-07-12T15:07:49.794Z"
    },
    {
      "id": 1752332891671,
      "filename": "01 video.png",
      "cloudinaryUrl": "https://res.cloudinary.com/dvldpdrrk/image/upload/v1752332881/baby-diary-app-images/app_1752332889665.png",
      "cloudinaryPublicId": "baby-diary-app-images/app_1752332889665",
      "tag": "app-mockup",
      "description": "Cena íntima de uma mãe usando o Baby Diary para acompanhar o crescimento da filha.",
      "size": 2140592,
      "createdAt": "2025-07-12T15:08:11.671Z"
    },
    {
      "id": 1752332936345,
      "filename": "04 video.png",
      "cloudinaryUrl": "https://res.cloudinary.com/dvldpdrrk/image/upload/v1752332926/baby-diary-app-images/app_1752332934215.png",
      "cloudinaryPublicId": "baby-diary-app-images/app_1752332934215",
      "tag": "app-mockup",
      "description": "Olhar carinhoso de uma mãe navegando pelo perfil da filha no app.",
      "size": 2814025,
      "createdAt": "2025-07-12T15:08:56.345Z"
    },
    {
      "id": 1752332951005,
      "filename": "03 video.png",
      "cloudinaryUrl": "https://res.cloudinary.com/dvldpdrrk/image/upload/v1752332941/baby-diary-app-images/app_1752332949173.png",
      "cloudinaryPublicId": "baby-diary-app-images/app_1752332949173",
      "tag": "app-mockup",
      "description": "Conexão emocional entre mãe e bebê representada pelo uso do Baby Diary.",
      "size": 2341906,
      "createdAt": "2025-07-12T15:09:11.005Z"
    },
    {
      "id": 1752332987483,
      "filename": "02 video.png",
      "cloudinaryUrl": "https://res.cloudinary.com/dvldpdrrk/image/upload/v1752332977/baby-diary-app-images/app_1752332979329.png",
      "cloudinaryPublicId": "baby-diary-app-images/app_1752332979329",
      "tag": "app-mockup",
      "description": "Mãe imersa nas lembranças da filha através do Baby Diary em seu celular.",
      "size": 2400543,
      "createdAt": "2025-07-12T15:09:47.483Z"
    }
  ];
  
  if (fs.existsSync(appImagesPath)) {
    console.log(`📄 app_images.json já existe: ${appImagesPath}`);
  } else {
    fs.writeFileSync(appImagesPath, JSON.stringify(appImagesData, null, 2));
    console.log(`✅ app_images.json criado: ${appImagesPath}`);
  }
}

// Função para criar video_metadata.json
function createVideoMetadataFile() {
  const outputDir = './output';
  const videoMetadataPath = path.join(outputDir, 'video_metadata.json');
  
  ensureDirectoryExists(outputDir);
  
  const videoMetadataData = {
    "videos": [
      {
        "titulo": "Segredo viral: Baby Diary no Insta!\nMães, conteúdo viral AGORA!\nBaby Diary: atraia clientes fácil!\nReceita de sucesso: Insta Mães!\nTransforme seu Insta com Baby Diary\nVídeo: clientes com Baby Diary!\nExploda seu Insta com Baby Diary!\nMais clientes com o Baby Diary? SIM!\nDesvende o sucesso no Insta (Mães)!\nBaby Diary: o segredo das mamães!\n",
        "hashtags": "#Maternidade #BabyDiary #DicasParaMães #MãeDePrimeiraViagem #RotinaDoBebê #MarketingDigital #Empreendedorismo #Crescimento\n",
        "tema": "Receita de sucesso: Como usar o Baby Diary para criar conteúdo viral no Instagram e atrair clientes!",
        "tipo": "anuncio",
        "publico": "maes",
        "formato": "sd",
        "cenas": 3,
        "resolution": "portrait",
        "videoPath": "final_Receita_de_sucesso__Como_usar__20250712_183010.mp4",
        "thumbnailPath": "final_Receita_de_sucesso__Como_usar__20250712_183010_thumb.jpg",
        "tamanho": 3120697,
        "createdAt": "2025-07-12T21:30:22.702Z",
        "id": "md0reuem-1fbhc9",
        "updatedAt": "2025-07-12T21:30:30.295Z",
        "cloudinaryVideoUrl": "https://res.cloudinary.com/dvldpdrrk/video/upload/v1752355817/baby-diary-videos/video_md0reuem-1fbhc9.mp4",
        "cloudinaryThumbnailUrl": "https://res.cloudinary.com/dvldpdrrk/image/upload/v1752355818/baby-diary-thumbnails/thumb_md0reuem-1fbhc9.jpg"
      },
      {
        "titulo": "\"Desbloqueie o Potencial do Seu Bebê: A Importância da Estimulação Cognitiva para o Desenvolvimento\"\n\nEste título é curto (54 caracteres), atraente e clickbait, com palavras-chave relevantes (estimulação cognitiva, desenvolvimento) e inclui emoção (desbloqueie o potencial). Além disso, é fácil de lembrar e fácil de ler em redes sociais.",
        "hashtags": "#Maternidade #BabyDiary #DesenvolvimentoInfantil #MãeDePrimeiraViagem #AmorDeMãe #DicasParaMães #Crescimento #SaúdeInfantil",
        "tema": "A importância da estimulação cognitiva nos bebês",
        "tipo": "anuncio",
        "publico": "maes",
        "formato": "sd",
        "cenas": 5,
        "resolution": "landscape",
        "videoPath": "final_A_import_ncia_da_estimula__o_c_20250712_175910.mp4",
        "thumbnailPath": "final_A_import_ncia_da_estimula__o_c_20250712_175910_thumb.jpg",
        "tamanho": 4432516,
        "createdAt": "2025-07-12T20:59:21.945Z",
        "id": "md0qaymx-s30u8i",
        "updatedAt": "2025-07-12T20:59:33.400Z",
        "cloudinaryVideoUrl": "https://res.cloudinary.com/dvldpdrrk/video/upload/v1752353962/baby-diary-videos/video_md0qaymx-s30u8i.mp4",
        "cloudinaryThumbnailUrl": "https://res.cloudinary.com/dvldpdrrk/image/upload/v1752353963/baby-diary-thumbnails/thumb_md0qaymx-s30u8i.jpg"
      },
      {
        "titulo": "Transforme sua audiência em uma Máquina de Vendas com o Baby Diary - 5 Segredos para Impulsionar seu Negócio!",
        "hashtags": "#Maternidade #BabyDiary #DesenvolvimentoInfantil #MãeDePrimeiraViagem #AmorDeMãe #DicasParaMães #Família #Crescimento #Empreendedorismo #WhiteLabel #SaúdeInfantil",
        "tema": "Transforme sua audiência em uma máquina de vendas com o Baby Diary",
        "tipo": "anuncio",
        "publico": "infoprodutores",
        "formato": "sd",
        "cenas": 5,
        "resolution": "portrait",
        "videoPath": "final_Transforme_sua_audi_ncia_em_um_20250712_171553.mp4",
        "thumbnailPath": "final_Transforme_sua_audi_ncia_em_um_20250712_171553_thumb.jpg",
        "tamanho": 3791140,
        "createdAt": "2025-07-12T20:16:07.809Z",
        "id": "md0orczl-dsdceh",
        "updatedAt": "2025-07-12T20:16:13.429Z",
        "cloudinaryVideoUrl": "https://res.cloudinary.com/dvldpdrrk/video/upload/v1752351362/baby-diary-videos/video_md0orczl-dsdceh.mp4",
        "cloudinaryThumbnailUrl": "https://res.cloudinary.com/dvldpdrrk/image/upload/v1752351363/baby-diary-thumbnails/thumb_md0orczl-dsdceh.jpg"
      }
    ]
  };
  
  if (fs.existsSync(videoMetadataPath)) {
    console.log(`📄 video_metadata.json já existe: ${videoMetadataPath}`);
  } else {
    fs.writeFileSync(videoMetadataPath, JSON.stringify(videoMetadataData, null, 2));
    console.log(`✅ video_metadata.json criado: ${videoMetadataPath}`);
  }
}

// Função para criar diretório de músicas se não existir
function createMusicDirectories() {
  const musicDirs = [
    './assets/music/ambient',
    './assets/music/corporate', 
    './assets/music/emotional',
    './assets/music/energetic'
  ];
  
  musicDirs.forEach(dir => {
    ensureDirectoryExists(dir);
  });
  
  console.log('🎵 Diretórios de música verificados/criados');
}

// Função principal
function main() {
  console.log('🚀 Iniciando configuração para produção...');
  
  try {
    // Criar diretórios necessários
    createMusicDirectories();
    
    // Criar arquivos de metadados
    createAppImagesFile();
    createVideoMetadataFile();
    
    console.log('\n✅ Configuração concluída com sucesso!');
    console.log('📁 Estrutura criada:');
    console.log('   - output/app_images.json');
    console.log('   - output/video_metadata.json');
    console.log('   - assets/music/ (com subdiretórios)');
    
    console.log('\n🎯 Próximos passos:');
    console.log('   1. Execute: npm install');
    console.log('   2. Configure as variáveis de ambiente');
    console.log('   3. Execute: npm start');
    
  } catch (error) {
    console.error('❌ Erro durante a configuração:', error);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  createAppImagesFile,
  createVideoMetadataFile,
  createMusicDirectories,
  main
}; 