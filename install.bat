@echo off
echo ========================================
echo   Instalando Unified Video Generator
echo ========================================
echo.

echo 📦 Instalando dependências Node.js...
npm install
if %errorlevel% neq 0 (
    echo ❌ Erro ao instalar dependências Node.js
    pause
    exit /b 1
)

echo.
echo 🐍 Instalando dependências Python...
python setup.py
if %errorlevel% neq 0 (
    echo ⚠️  Erro ao instalar dependências Python - tentando pip manualmente...
    pip install torch torchvision Pillow numpy gtts tqdm einops accelerate
)

echo.
echo ✅ Instalação concluída!
echo.
echo 📋 Próximos passos:
echo 1. Configure suas chaves API no arquivo .env
echo 2. Execute: npm run generate:aiimage -- --tema="Seu tema aqui"
echo.
pause 