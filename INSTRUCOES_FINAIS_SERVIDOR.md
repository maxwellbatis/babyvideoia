# 🚀 Instruções Finais para o Servidor

## 📋 O que foi enviado para o Git

✅ **Arquivos novos enviados:**
- `setup-production.js` - Script para criar arquivos de metadados
- `fix-server-production.js` - Script para corrigir o problema do ts-node
- `CORRECAO_PRODUCAO.md` - Guia de correção
- `INSTRUCOES_PRODUCAO.md` - Instruções de configuração

## 🔧 Passos para executar no servidor

### 1. Atualizar o projeto no servidor
```bash
cd videioaibabydiary
git pull origin main
```

### 2. Executar configuração inicial
```bash
node setup-production.js
```

**Este comando irá:**
- ✅ Criar diretório `output/` se não existir
- ✅ Criar `output/app_images.json` com 5 imagens de exemplo
- ✅ Criar `output/video_metadata.json` com 3 vídeos de exemplo
- ✅ Criar diretórios de música (`assets/music/ambient`, `corporate`, `emotional`, `energetic`)

### 3. Corrigir o problema do ts-node
```bash
node fix-server-production.js
```

**Este comando irá:**
- ✅ Criar backup do `server.ts`
- ✅ Verificar se TypeScript está compilado
- ✅ Substituir `npx ts-node` por `node ./dist/src/orchestrators/`
- ✅ Garantir que os comandos funcionem em produção

### 4. Reiniciar o servidor
```bash
pm2 restart video-ai-baby
```

### 5. Verificar se funcionou
```bash
pm2 logs video-ai-baby
```

## 🎯 Resultado esperado

Após executar os comandos:

### ✅ Arquivos criados:
```
videioaibabydiary/
├── output/
│   ├── app_images.json          # 5 imagens de mockup
│   └── video_metadata.json      # 3 vídeos de exemplo
├── assets/music/
│   ├── ambient/                 # 10 músicas ambientais
│   ├── corporate/               # 10 músicas corporativas
│   ├── emotional/               # 10 músicas emocionais
│   └── energetic/               # 10 músicas energéticas
└── server.ts.backup             # Backup do servidor original
```

### ✅ Comandos corrigidos:
- **Antes:** `npx ts-node ./src/orchestrators/orchestrator-animated-sd.ts`
- **Depois:** `node ./dist/src/orchestrators/orchestrator-animated-sd.js`

## 🔍 Verificação

### 1. Verificar arquivos criados:
```bash
ls -la output/
cat output/app_images.json | head -10
cat output/video_metadata.json | head -10
```

### 2. Verificar correção do servidor:
```bash
grep -n "node ./dist/" server.ts
grep -n "ts-node" server.ts
```

### 3. Testar geração de vídeo:
1. Acesse o frontend: `http://seu-servidor:3000`
2. Tente gerar um vídeo
3. Verifique os logs: `pm2 logs video-ai-baby`

## 🚨 Troubleshooting

### Se o setup-production.js falhar:
```bash
# Verificar permissões
ls -la
chmod 755 output/

# Executar novamente
node setup-production.js
```

### Se o fix-server-production.js falhar:
```bash
# Verificar se TypeScript está compilado
ls -la dist/src/orchestrators/

# Se não estiver, compilar manualmente
npx tsc

# Executar novamente
node fix-server-production.js
```

### Se ainda houver erro de ts-node:
```bash
# Restaurar backup
cp server.ts.backup server.ts

# Tentar método alternativo
npm install -g ts-node
node fix-server-production.js
```

### Se o servidor não reiniciar:
```bash
# Verificar status do PM2
pm2 status

# Reiniciar manualmente
pm2 stop video-ai-baby
pm2 start video-ai-baby

# Verificar logs
pm2 logs video-ai-baby
```

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs: `pm2 logs video-ai-baby`
2. Confirme se as variáveis de ambiente estão configuradas
3. Verifique se o banco de dados está acessível
4. Confirme se o FFmpeg está instalado: `ffmpeg -version`

---

**✅ Após seguir estes passos, o sistema estará funcionando corretamente em produção!** 