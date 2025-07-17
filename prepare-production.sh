#!/bin/bash

echo "🚀 Preparando projeto para produção..."

# 1. Limpar arquivos desnecessários
echo "🧹 Limpando arquivos desnecessários..."
rm -f test-music-paths.js
rm -f prepare-production.sh
rm -rf node_modules/.cache
rm -rf .next
rm -rf dist
rm -rf build

# 2. Verificar se as músicas estão no lugar certo
echo "🎵 Verificando biblioteca de músicas..."
if [ -d "assets/music" ]; then
    echo "✅ Biblioteca de músicas encontrada"
    echo "📊 Estatísticas:"
    for category in ambient energetic emotional corporate; do
        if [ -d "assets/music/$category" ]; then
            count=$(ls -1 assets/music/$category/*.mp3 2>/dev/null | wc -l)
            echo "  - $category: $count arquivos"
        else
            echo "  - $category: pasta não encontrada"
        fi
    done
else
    echo "❌ Biblioteca de músicas não encontrada!"
    exit 1
fi

# 3. Verificar dependências
echo "📦 Verificando dependências..."
if [ -f "package.json" ]; then
    echo "✅ package.json encontrado"
else
    echo "❌ package.json não encontrado!"
    exit 1
fi

# 4. Verificar arquivos essenciais
echo "📋 Verificando arquivos essenciais..."
essential_files=("server.ts" "src/orchestrators/orchestrator-vsl.ts" "prisma/schema.prisma")
for file in "${essential_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file não encontrado!"
        exit 1
    fi
done

# 5. Criar arquivo de instruções para produção
echo "📝 Criando instruções para produção..."
cat > PRODUCTION_SETUP.md << 'EOF'
# 🚀 Setup para Produção

## 📋 Pré-requisitos
- Node.js 18+ instalado
- PostgreSQL configurado
- PM2 instalado globalmente: `npm install -g pm2`

## 🔧 Configuração

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar banco de dados
```bash
npx prisma migrate deploy
npx prisma generate
```

### 3. Configurar variáveis de ambiente
Criar arquivo `.env` com as credenciais necessárias:
- GEMINI_KEY
- GROQ_API_KEY
- ELEVENLABS_API_KEY
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET
- FREEPIK_API_KEY
- DATABASE_URL

### 4. Verificar biblioteca de músicas
```bash
node test-music-paths.js
```

### 5. Iniciar com PM2
```bash
pm2 start server.ts --name babyvideoia --interpreter ts-node
pm2 save
pm2 startup
```

## 📁 Estrutura de arquivos esperada
```
babyvideoia/
├── assets/
│   └── music/
│       ├── ambient/
│       ├── energetic/
│       ├── emotional/
│       └── corporate/
├── src/
├── prisma/
├── server.ts
└── package.json
```

## 🔍 Troubleshooting

### Músicas não encontradas
- Verificar se a pasta `assets/music` existe
- Verificar se as categorias estão corretas
- Verificar permissões de acesso

### Erro de banco de dados
- Verificar se o PostgreSQL está rodando
- Verificar se as migrações foram aplicadas
- Verificar se a DATABASE_URL está correta

### Erro de APIs
- Verificar se todas as credenciais estão configuradas
- Verificar se as APIs estão funcionando
EOF

echo "✅ Preparação concluída!"
echo "📝 Instruções salvas em PRODUCTION_SETUP.md"
echo ""
echo "🎯 Próximos passos:"
echo "1. git add ."
echo "2. git commit -m 'Fix: Corrigir localização de músicas para produção'"
echo "3. git push"
echo "4. Na VPS: git pull"
echo "5. Na VPS: npm install"
echo "6. Na VPS: npx prisma migrate deploy"
echo "7. Na VPS: pm2 restart babyvideoia" 