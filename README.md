# 🎬 Video Baby AI - Gerador Automático de Vídeos para Maternidade

Sistema completo de geração automática de vídeos focado no nicho de maternidade, com backend em Node.js/TypeScript, frontend responsivo e integrações com múltiplas APIs de IA.

## 🚀 Funcionalidades

### ✨ Geração de Conteúdo
- **Roteiros automáticos** com IA (Gemini, Groq, OpenAI)
- **Imagens personalizadas** via Stable Diffusion e Freepik
- **Narração TTS** com ElevenLabs e Google TTS
- **Música de fundo** automática
- **Legendas sincronizadas** com análise de áudio

### 🎯 Tipos de Vídeo
- **Reels/Stories** (15-60 segundos)
- **Anúncios publicitários**
- **Dicas rápidas**
- **Conteúdo educativo**
- **Tutoriais**
- **Conteúdo inspiracional**

### 🔧 Tecnologias
- **Backend**: Node.js + TypeScript + Express
- **Frontend**: HTML5 + CSS3 + JavaScript
- **Banco**: PostgreSQL + Prisma ORM
- **IA**: Google Gemini, Groq, OpenAI
- **TTS**: ElevenLabs, Google TTS
- **Imagens**: Stable Diffusion, Freepik
- **Vídeo**: FFmpeg
- **Cloud**: Cloudinary

## 📦 Instalação

### Pré-requisitos
- Node.js 18+
- PostgreSQL
- FFmpeg
- Contas nas APIs (opcional)

### Setup Rápido
```bash
# 1. Clone o repositório
git clone https://github.com/maxwellbatis/videioaibabydiary.git
cd videioaibabydiary

# 2. Instale as dependências
npm install

# 3. Configure o banco de dados
npm run db:setup

# 4. Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas configurações

# 5. Inicie o servidor
npm start
```

## ⚙️ Configuração

### APIs Necessárias (Opcionais)
- **Google Gemini**: Para geração de roteiros
- **Groq**: Fallback para geração de conteúdo
- **OpenAI**: Fallback adicional
- **ElevenLabs**: Narração de alta qualidade
- **Freepik**: Imagens profissionais
- **Cloudinary**: Armazenamento de mídia

### Variáveis de Ambiente
```env
# Banco de Dados
DATABASE_URL="postgresql://user:password@localhost:5432/babydiary"

# APIs
GEMINI_KEY="sua_chave_gemini"
GROQ_API_KEY="sua_chave_groq"
OPENAI_API_KEY="sua_chave_openai"
ELEVENLABS_API_KEY="sua_chave_elevenlabs"
FREEPIK_API_KEY="sua_chave_freepik"

# Cloudinary
CLOUDINARY_CLOUD_NAME="seu_cloud_name"
CLOUDINARY_API_KEY="sua_api_key"
CLOUDINARY_API_SECRET="seu_api_secret"
```

## 🎮 Como Usar

### 1. Acesse o Frontend
Abra `http://localhost:3000` no navegador

### 2. Configure as APIs
- Vá para a seção "Configurações"
- Adicione suas chaves de API
- Verifique o status das APIs

### 3. Gere um Vídeo
- Escolha o tipo de vídeo (reels, anúncio, etc.)
- Defina o tema e público-alvo
- Selecione a música de fundo
- Clique em "Gerar Vídeo"

### 4. Baixe o Resultado
- Aguarde a geração (2-5 minutos)
- Visualize o vídeo no modal
- Baixe o arquivo MP4

## 🏗️ Estrutura do Projeto

```
videioaibabydiary/
├── src/
│   ├── image/          # Geração de imagens
│   ├── orchestrators/  # Orquestradores de vídeo
│   ├── subtitles/      # Sistema de legendas
│   ├── text/          # Geração de texto com IA
│   ├── tts/           # Text-to-Speech
│   ├── utils/         # Utilitários
│   └── video/         # Processamento de vídeo
├── frontend/          # Interface web
├── assets/music/      # Músicas de fundo
├── prisma/           # Schema do banco
└── output/           # Vídeos gerados
```

## 🔄 Sistema de Fallback

O sistema possui múltiplas camadas de fallback:

1. **Gemini** → **Groq** → **OpenAI** → **Templates Locais**
2. **ElevenLabs** → **Google TTS**
3. **Stable Diffusion** → **Freepik** → **Imagens Padrão**

## 📊 Monitoramento

- **Status das APIs** em tempo real
- **Uso de tokens/credits**
- **Logs detalhados** de geração
- **Métricas de performance**

## 🛠️ Desenvolvimento

### Scripts Disponíveis
```bash
npm start          # Inicia o servidor
npm run dev        # Modo desenvolvimento
npm run build      # Compila TypeScript
npm run db:setup   # Configura banco
npm run db:migrate # Executa migrações
```

### Adicionando Novos Tipos de Vídeo
1. Edite `src/text/gemini-groq.ts`
2. Adicione template no objeto `templatesPorTipo`
3. Configure público-alvo específico

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 🆘 Suporte

- **Issues**: [GitHub Issues](https://github.com/maxwellbatis/videioaibabydiary/issues)
- **Documentação**: [Wiki do Projeto](https://github.com/maxwellbatis/videioaibabydiary/wiki)

## 🎉 Agradecimentos

- Google Gemini pela IA de geração de conteúdo
- ElevenLabs pela qualidade do TTS
- FFmpeg pela processamento de vídeo
- Comunidade open source

---

**Desenvolvido com ❤️ para mães e empreendedores digitais** 