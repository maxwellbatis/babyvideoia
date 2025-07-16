# 🔐 Configuração de APIs - BabyVideoIA

## ✅ Problema Resolvido!

O problema das APIs "Desconectado" foi corrigido. Agora o sistema:

1. ✅ Carrega credenciais do banco de dados
2. ✅ Mapeia corretamente os nomes das APIs
3. ✅ Mostra status real das conexões
4. ✅ Permite edição e salvamento das credenciais
5. ✅ Testa conexões em tempo real

---

## 🚀 Como Usar

### 1. Iniciar os Servidores

```bash
# Terminal 1 - Backend
npm run dev

# Terminal 2 - Frontend
cd project
npm run dev
```

### 2. Acessar o Frontend

Abra: http://localhost:5173

### 3. Configurar APIs

1. Vá para "Configurações de API"
2. Clique em "🔄 Carregar do Banco"
3. As credenciais aparecerão (inicialmente como "Desconectado")
4. Edite as chaves com seus valores reais
5. Clique em "💾 Salvar Todas"
6. Teste as conexões clicando em "Testar"

---

## 🛠️ Gerenciador de Credenciais

Use o script interativo para gerenciar credenciais:

```bash
node manage-credentials.js
```

**Opções disponíveis:**
- Ver credenciais atuais
- Atualizar credencial específica
- Inserir credenciais reais
- Testar conexões

---

## 📋 APIs Necessárias

### 1. **Gemini AI** (IA para roteiros)
- Obter em: https://makersuite.google.com/app/apikey
- Usado para: Geração de roteiros, prompts de imagem

### 2. **Groq** (IA alternativa)
- Obter em: https://console.groq.com/
- Usado para: Geração de roteiros (fallback do Gemini)

### 3. **ElevenLabs** (Narração)
- Obter em: https://elevenlabs.io/
- Usado para: Geração de áudio profissional

### 4. **Cloudinary** (Upload de vídeos)
- Obter em: https://cloudinary.com/
- Usado para: Upload e hospedagem de vídeos gerados

### 5. **Freepik** (Imagens)
- Obter em: https://www.freepik.com/
- Usado para: Busca de imagens profissionais

### 6. **Stable Diffusion** (Geração de imagens)
- Configurar Colab: https://colab.research.google.com/
- Usado para: Geração de imagens com IA

---

## 🔧 Scripts Úteis

### Testar Frontend
```bash
node test-frontend-apis.js
```

### Inserir Credenciais de Teste
```bash
node insert-test-credentials.js
```

### Gerenciar Credenciais
```bash
node manage-credentials.js
```

---

## 🎯 Status das APIs

### ✅ Conectado
- Credencial válida inserida
- API responde corretamente
- Funcionalidade disponível

### ❌ Desconectado
- Credencial não configurada
- Credencial inválida
- API não responde

### ⚠️ Testando
- Teste de conexão em andamento
- Aguarde resultado

---

## 🐛 Troubleshooting

### APIs continuam "Desconectado"
1. Verifique se o servidor está rodando: `npm run dev`
2. Recarregue a página do frontend
3. Clique em "🔄 Carregar do Banco"
4. Verifique se as credenciais estão no banco

### Erro ao salvar credenciais
1. Verifique se o banco está conectado
2. Execute: `npx prisma studio` para verificar
3. Teste a conexão: `node test-frontend-apis.js`

### Frontend não carrega
1. Verifique se está na pasta correta: `cd project`
2. Execute: `npm run dev`
3. Acesse: http://localhost:5173

---

## 📊 Logs e Debug

### Backend Logs
```bash
npm run dev
# Observe os logs no terminal
```

### Frontend Logs
1. Abra DevTools (F12)
2. Vá para Console
3. Observe mensagens de erro

### Teste Completo
```bash
node test-frontend-apis.js
# Testa todos os endpoints
```

---

## 🎉 Próximos Passos

1. ✅ Configure suas credenciais reais
2. ✅ Teste todas as APIs
3. ✅ Gere um vídeo de teste
4. ✅ Verifique upload no Cloudinary
5. ✅ Confirme legendas automáticas

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do servidor
2. Execute os scripts de teste
3. Confirme se o banco está conectado
4. Verifique se as credenciais são válidas

O sistema agora está completamente funcional! 🚀 