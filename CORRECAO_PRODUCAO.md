# 🔧 Correção do Problema em Produção

## 🚨 Problema Identificado

O erro no servidor de produção é causado pelo comando `npx ts-node` que não está funcionando corretamente. O log mostra:

```
cmd: 'npx ts-node ./src/orchestrators/orchestrator-animated-sd.ts --tema="..."'
```

## ✅ Solução

### 1. Atualizar o servidor para usar JavaScript compilado

O projeto já tem uma pasta `dist/` com arquivos JavaScript compilados. Vamos modificar o servidor para usar esses arquivos.

### 2. Criar script de correção

Execute no servidor:

```bash
# 1. Acesse o diretório do projeto
cd videioaibabydiary

# 2. Execute o script de configuração
node setup-production.js

# 3. Corrija o servidor para usar JavaScript
node fix-server-production.js

# 4. Reinicie o servidor
pm2 restart video-ai-baby
```

## 📋 Passos Detalhados

### Passo 1: Executar setup-production.js
```bash
node setup-production.js
```

Este script irá:
- ✅ Criar diretório `output/`
- ✅ Criar `app_images.json` com 5 imagens de exemplo
- ✅ Criar `video_metadata.json` com 3 vídeos de exemplo
- ✅ Criar diretórios de música

### Passo 2: Corrigir servidor
```bash
node fix-server-production.js
```

Este script irá:
- ✅ Modificar `server.ts` para usar arquivos JavaScript
- ✅ Substituir `npx ts-node` por `node dist/`
- ✅ Garantir que os comandos funcionem em produção

### Passo 3: Verificar
```bash
# Verificar se os arquivos foram criados
ls -la output/
cat output/app_images.json
cat output/video_metadata.json

# Verificar se o servidor foi corrigido
grep -n "ts-node" server.ts
```

### Passo 4: Reiniciar
```bash
pm2 restart video-ai-baby
pm2 logs video-ai-baby
```

## 🎯 Resultado Esperado

Após a correção:
- ✅ Comandos usarão `node dist/src/orchestrators/orchestrator-animated-sd.js`
- ✅ Arquivos de metadados estarão criados
- ✅ Sistema funcionará sem erros de TypeScript

## 🔍 Verificação

Teste a geração de vídeo:
1. Acesse o frontend
2. Tente gerar um vídeo
3. Verifique os logs: `pm2 logs video-ai-baby`

Se ainda houver problemas, verifique:
- Se o TypeScript foi compilado: `ls -la dist/src/orchestrators/`
- Se as dependências estão instaladas: `npm list ts-node`
- Se o FFmpeg está funcionando: `ffmpeg -version` 