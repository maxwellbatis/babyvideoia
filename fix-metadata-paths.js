const fs = require('fs');
const path = require('path');

const metadataPath = path.join(__dirname, 'output', 'video_metadata.json');

if (!fs.existsSync(metadataPath)) {
  console.error('❌ Arquivo de metadados não encontrado:', metadataPath);
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
let alterou = false;

if (Array.isArray(data.videos)) {
  data.videos.forEach(video => {
    if (video.videoPath) {
      const fileName = path.basename(video.videoPath);
      if (video.videoPath !== fileName) {
        video.videoPath = fileName;
        alterou = true;
      }
    }
    if (video.thumbnailPath) {
      const thumbName = path.basename(video.thumbnailPath);
      if (video.thumbnailPath !== thumbName) {
        video.thumbnailPath = thumbName;
        alterou = true;
      }
    }
  });
}

if (alterou) {
  fs.writeFileSync(metadataPath, JSON.stringify(data, null, 2), 'utf8');
  console.log('✅ Metadados corrigidos com sucesso!');
} else {
  console.log('ℹ️ Nenhuma alteração necessária nos metadados.');
} 