# src/tts_gtts.py
import sys
from gtts import gTTS

if len(sys.argv) < 3:
    print("Uso: python tts_gtts.py 'texto' 'arquivo_saida.mp3'")
    sys.exit(1)

texto = sys.argv[1]
arquivo_saida = sys.argv[2]

tts = gTTS(text=texto, lang='pt', slow=False)
tts.save(arquivo_saida)
print(f"Áudio salvo em {arquivo_saida}")