import { log } from '../utils/logger';

export interface VideoStyle {
  aspectRatio: string;
  resolution: string;
  fontFamily: string;
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  animationType: 'ken-burns' | 'fade' | 'slide' | 'zoom';
  transitionDuration: number;
  musicVolume: number;
  showCallToAction: boolean;
  callToActionText: string;
  watermark: boolean;
}

export const VIDEO_STYLES = {
  moderno: {
    aspectRatio: '16:9',
    resolution: '1280x720',
    fontFamily: 'Arial, sans-serif',
    fontSize: 48,
    fontColor: '#ffffff',
    backgroundColor: '#000000',
    animationType: 'ken-burns' as const,
    transitionDuration: 0.5,
    musicVolume: 0.3,
    showCallToAction: true,
    callToActionText: '📱 Baixe o Baby Diary App',
    watermark: true
  },
  classico: {
    aspectRatio: '16:9',
    resolution: '1280x720',
    fontFamily: 'Times New Roman, serif',
    fontSize: 42,
    fontColor: '#2c3e50',
    backgroundColor: '#ecf0f1',
    animationType: 'fade' as const,
    transitionDuration: 0.8,
    musicVolume: 0.2,
    showCallToAction: true,
    callToActionText: '📚 Conheça o Baby Diary',
    watermark: true
  },
  colorido: {
    aspectRatio: '16:9',
    resolution: '1280x720',
    fontFamily: 'Comic Sans MS, cursive',
    fontSize: 52,
    fontColor: '#ffffff',
    backgroundColor: '#e74c3c',
    animationType: 'slide' as const,
    transitionDuration: 0.6,
    musicVolume: 0.4,
    showCallToAction: true,
    callToActionText: '🎨 Baby Diary Colorido',
    watermark: false
  },
  minimalista: {
    aspectRatio: '16:9',
    resolution: '1280x720',
    fontFamily: 'Helvetica, Arial, sans-serif',
    fontSize: 36,
    fontColor: '#333333',
    backgroundColor: '#ffffff',
    animationType: 'fade' as const,
    transitionDuration: 1.0,
    musicVolume: 0.1,
    showCallToAction: false,
    callToActionText: '',
    watermark: false
  }
};

export function getVideoStyle(styleName: string): VideoStyle {
  return VIDEO_STYLES[styleName as keyof typeof VIDEO_STYLES] || VIDEO_STYLES.moderno;
}

export function applyVideoStyle(inputPath: string, outputPath: string, style: VideoStyle, text: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const filters = [];
    
    // Filtro de texto com estilo
    const textFilter = `drawtext=text='${text}':fontfile=/Windows/Fonts/arial.ttf:fontsize=${style.fontSize}:fontcolor=${style.fontColor}:x=(w-text_w)/2:y=h-th-50:box=1:boxcolor=${style.backgroundColor}@0.7:boxborderw=5`;
    filters.push(textFilter);
    
    // Animação baseada no tipo
    switch (style.animationType) {
      case 'ken-burns':
        filters.push('zoompan=z=\'min(zoom+0.0005,1.1)\':x=\'iw/2-(iw/zoom/2)\':y=\'ih/2-(ih/zoom/2)\':d=1');
        break;
      case 'fade':
        filters.push('fade=t=in:st=0:d=1,fade=t=out:st=4:d=1');
        break;
      case 'slide':
        filters.push('slide=slide=left:duration=0.5');
        break;
      case 'zoom':
        filters.push('scale=1.1:1.1,scale=1:1');
        break;
    }
    
    // Call-to-action se habilitado
    if (style.showCallToAction) {
      const ctaFilter = `drawtext=text='${style.callToActionText}':fontfile=/Windows/Fonts/arial.ttf:fontsize=24:fontcolor=#ffffff:x=(w-text_w)/2:y=50:box=1:boxcolor=#000000@0.8:boxborderw=3`;
      filters.push(ctaFilter);
    }
    
    // Watermark se habilitado
    if (style.watermark) {
      const watermarkFilter = `drawtext=text='Baby Diary':fontfile=/Windows/Fonts/arial.ttf:fontsize=16:fontcolor=#ffffff@0.5:x=w-tw-10:y=h-th-10`;
      filters.push(watermarkFilter);
    }
    
    const filterString = filters.join(',');
    const command = `ffmpeg -y -i "${inputPath}" -vf "${filterString}" -c:v libx264 -c:a aac -pix_fmt yuv420p "${outputPath}"`;
    
    log(`🎨 Aplicando estilo ${style.animationType}: ${command}`);
    
    require('child_process').exec(command, (error: any, stdout: any, stderr: any) => {
      if (error) {
        log(`❌ Erro ao aplicar estilo: ${stderr || error}`);
        reject(error);
      } else {
        log(`✅ Estilo aplicado: ${outputPath}`);
        resolve(outputPath);
      }
    });
  });
}

export function addBackgroundMusic(videoPath: string, musicPath: string, outputPath: string, volume: number = 0.3): Promise<string> {
  return new Promise((resolve, reject) => {
    const command = `ffmpeg -y -i "${videoPath}" -i "${musicPath}" -filter_complex "[1:a]volume=${volume}[music];[0:a][music]amix=inputs=2:duration=shortest" -c:v copy "${outputPath}"`;
    
    log(`🎵 Adicionando música de fundo: ${command}`);
    
    require('child_process').exec(command, (error: any, stdout: any, stderr: any) => {
      if (error) {
        log(`❌ Erro ao adicionar música: ${stderr || error}`);
        reject(error);
      } else {
        log(`✅ Música adicionada: ${outputPath}`);
        resolve(outputPath);
      }
    });
  });
}

export function createThumbnail(videoPath: string, outputPath: string, time: string = '00:00:02'): Promise<string> {
  return new Promise((resolve, reject) => {
    const command = `ffmpeg -y -i "${videoPath}" -ss ${time} -vframes 1 -q:v 2 "${outputPath}"`;
    
    log(`🖼️ Criando thumbnail: ${command}`);
    
    require('child_process').exec(command, (error: any, stdout: any, stderr: any) => {
      if (error) {
        log(`❌ Erro ao criar thumbnail: ${stderr || error}`);
        reject(error);
      } else {
        log(`✅ Thumbnail criado: ${outputPath}`);
        resolve(outputPath);
      }
    });
  });
}

export function addCallToAction(videoPath: string, outputPath: string, text: string, duration: number = 3): Promise<string> {
  return new Promise((resolve, reject) => {
    const command = `ffmpeg -y -i "${videoPath}" -vf "drawtext=text='${text}':fontfile=/Windows/Fonts/arial.ttf:fontsize=36:fontcolor=#ffffff:x=(w-text_w)/2:y=(h-text_h)/2:box=1:boxcolor=#000000@0.8:boxborderw=5:enable='between(t,${duration-1},${duration})'" -c:v libx264 -c:a copy "${outputPath}"`;
    
    log(`📢 Adicionando call-to-action: ${command}`);
    
    require('child_process').exec(command, (error: any, stdout: any, stderr: any) => {
      if (error) {
        log(`❌ Erro ao adicionar CTA: ${stderr || error}`);
        reject(error);
      } else {
        log(`✅ Call-to-action adicionado: ${outputPath}`);
        resolve(outputPath);
      }
    });
  });
} 