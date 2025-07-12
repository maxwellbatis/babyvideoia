# 🚀 Instruções para Configuração em Produção

## 📋 Pré-requisitos

Certifique-se de que o servidor tenha instalado:
- Node.js (versão 16 ou superior)
- npm ou yarn
- FFmpeg
- Python 3.8+ (para algumas dependências)

## 🔧 Passo a Passo

### 1. Acesse o diretório do projeto
```bash
cd videioaibabydiary
```

### 2. Execute o script de configuração
```bash
node setup-production.js
```

Este script irá:
- ✅ Criar o diretório `output/` se não existir
- ✅ Criar `output/app_images.json` com imagens de exemplo
- ✅ Criar `output/video_metadata.json` com metadados de exemplo
- ✅ Criar diretórios de música (`assets/music/ambient`, `corporate`, `emotional`, `energetic`)

### 3. Instalar dependências
```bash
npm install
```

### 4. Configurar variáveis de ambiente
Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Banco de dados PostgreSQL
DATABASE_URL="postgresql://usuario:senha@localhost:5432/babydiary"

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

# Configurações do servidor
PORT=3000
NODE_ENV=production
```

### 5. Configurar banco de dados
```bash
# Executar migrações do Prisma
npx prisma migrate deploy

# Gerar cliente Prisma
npx prisma generate
```

### 6. Iniciar o servidor
```bash
npm start
```

## 📁 Estrutura de Arquivos Criada

Após executar o script, você terá:

```
videioaibabydiary/
├── output/
│   ├── app_images.json          # Imagens do app (mockups)
│   └── video_metadata.json      # Metadados dos vídeos gerados
├── assets/
│   └── music/
│       ├── ambient/             # Músicas ambientais
│       ├── corporate/           # Músicas corporativas
│       ├── emotional/           # Músicas emocionais
│       └── energetic/           # Músicas energéticas
└── ... (outros arquivos do projeto)
```

## 🎯 Funcionalidades Disponíveis

Com os arquivos criados, o sistema terá:

### 📱 Imagens do App
- 5 imagens de mockup do Baby Diary
- URLs do Cloudinary configuradas
- Tags e descrições para categorização

### 🎬 Metadados de Vídeos
- 3 vídeos de exemplo
- Metadados completos (título, hashtags, tema, etc.)
- URLs do Cloudinary para vídeos e thumbnails

### 🎵 Sistema de Música
- Estrutura de diretórios para diferentes categorias
- Suporte a músicas de fundo personalizadas

## 🔍 Verificação

Para verificar se tudo está funcionando:

1. **Verificar arquivos criados:**
```bash
ls -la output/
cat output/app_images.json
cat output/video_metadata.json
```

2. **Verificar diretórios de música:**
```bash
ls -la assets/music/
```

3. **Testar API:**
```bash
curl http://localhost:3000/api/app-images
curl http://localhost:3000/api/videos
```

## 🚨 Troubleshooting

### Problema: Arquivos não foram criados
```bash
# Verificar permissões
ls -la
# Se necessário, dar permissão de escrita
chmod 755 output/
```

### Problema: Erro de dependências
```bash
# Limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Problema: Banco de dados não conecta
```bash
# Verificar se o PostgreSQL está rodando
sudo systemctl status postgresql
# Verificar string de conexão no .env
```

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do servidor
2. Confirme se todas as variáveis de ambiente estão configuradas
3. Verifique se o banco de dados está acessível
4. Confirme se o FFmpeg está instalado e funcionando

---

**✅ Após seguir estes passos, o sistema estará pronto para uso em produção!** 