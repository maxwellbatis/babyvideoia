# 🎵 Músicas de Fundo

Este diretório contém músicas de fundo para os vídeos gerados.

## 📁 Estrutura Recomendada

```
assets/music/
├── ambient/          # Músicas ambientais suaves
├── energetic/        # Músicas energéticas e motivacionais
├── emotional/        # Músicas emocionais e tocantes
├── corporate/        # Músicas corporativas e profissionais
└── README.md         # Este arquivo
```

## 🎯 Tipos de Música por Público

### Para Mães (Maternidade)
- **Ambiental**: Músicas suaves, acolhedoras
- **Emocional**: Músicas que transmitem amor e carinho
- **Formatos**: MP3, WAV (recomendado: 128kbps ou superior)

### Para Empreendedores/Afiliados
- **Energética**: Músicas motivacionais e dinâmicas
- **Corporativa**: Músicas profissionais e confiáveis
- **Formatos**: MP3, WAV (recomendado: 192kbps ou superior)

## ⚙️ Configurações Recomendadas

### Volume
- **Narração principal**: 100%
- **Música de fundo**: 20-40% (0.2-0.4)

### Fade
- **Fade In**: 2-3 segundos
- **Fade Out**: 2-3 segundos

### Loop
- **Habilitado**: Para vídeos longos
- **Desabilitado**: Para vídeos curtos com música específica

## 📝 Como Usar

### Via API
```json
{
  "tema": "Seu tema aqui",
  "formato": "sd",
  "backgroundMusic": {
    "path": "assets/music/ambient/soft_background.mp3",
    "volume": 0.3,
    "loop": true,
    "fadeIn": 2,
    "fadeOut": 2
  }
}
```

### Via Linha de Comando
```bash
npx ts-node src/orchestrators/orchestrator-animated-sd.ts \
  --tema="Seu tema" \
  --music="assets/music/ambient/soft_background.mp3" \
  --music-volume=0.3 \
  --music-fade-in=2 \
  --music-fade-out=2
```

## 🔗 Fontes de Música Livre de Direitos

- **YouTube Audio Library**: https://www.youtube.com/audiolibrary
- **Free Music Archive**: https://freemusicarchive.org/
- **Incompetech**: https://incompetech.com/
- **Bensound**: https://www.bensound.com/
- **Pixabay Music**: https://pixabay.com/music/

## ⚠️ Importante

- Use apenas músicas **livres de direitos autorais**
- Verifique as licenças antes de usar
- Mantenha os arquivos organizados por categoria
- Use formatos de qualidade adequada (MP3 128kbps+ ou WAV) 