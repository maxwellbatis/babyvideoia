import sys
import os
from gtts import gTTS

print(f"Script TTS iniciado com {len(sys.argv)} argumentos")
print(f"Argumentos: {sys.argv}")

if len(sys.argv) < 3:
    print("ERRO: Uso: python tts_gtts.py \"texto\" output.mp3")
    sys.exit(1)

texto = sys.argv[1]
saida = sys.argv[2]

print(f"Texto recebido: {texto[:100]}...")
print(f"Arquivo de saída: {saida}")

# Verificar se o diretório existe
diretorio = os.path.dirname(saida)
if diretorio and not os.path.exists(diretorio):
    print(f"Criando diretório: {diretorio}")
    os.makedirs(diretorio, exist_ok=True)

try:
    print("Iniciando geração do áudio...")
    tts = gTTS(text=texto, lang='pt')
    print("Objeto gTTS criado")
    
    tts.save(saida)
    print(f"Áudio salvo em {saida}")
    
    # Verificar se o arquivo foi criado
    if os.path.exists(saida):
        tamanho = os.path.getsize(saida)
        print(f"Arquivo criado com sucesso: {tamanho} bytes")
    else:
        print("ERRO: Arquivo não foi criado!")
        
except Exception as e:
    print(f"ERRO ao gerar áudio: {e}")
    sys.exit(1)