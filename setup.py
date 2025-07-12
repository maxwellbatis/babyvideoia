#!/usr/bin/env python3
"""
Script de setup para instalar dependências Python
"""

import subprocess
import sys
import os

def install_package(package):
    """Instala um pacote Python"""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        print(f"✅ {package} instalado com sucesso")
        return True
    except subprocess.CalledProcessError:
        print(f"❌ Falha ao instalar {package}")
        return False

def main():
    print("🔧 Configurando dependências Python...")
    
    # Lista de pacotes essenciais
    essential_packages = [
        "torch",
        "torchvision", 
        "Pillow",
        "numpy",
        "gtts",
        "tqdm",
        "einops",
        "accelerate"
    ]
    
    # Lista de pacotes opcionais
    optional_packages = [
        "imagen-pytorch"  # Pode não estar disponível
    ]
    
    print("📦 Instalando pacotes essenciais...")
    for package in essential_packages:
        install_package(package)
    
    print("\n📦 Tentando instalar pacotes opcionais...")
    for package in optional_packages:
        try:
            install_package(package)
        except:
            print(f"⚠️  {package} não disponível - usando fallback")
    
    print("\n✅ Setup concluído!")
    print("💡 Para usar imagen-pytorch, instale manualmente:")
    print("   pip install imagen-pytorch")
    print("   ou clone o repositório: git clone https://github.com/lucidrains/imagen-pytorch.git")

if __name__ == "__main__":
    main() 