# Guia Completo: ElevenLabs & Pipeline VSL – BabyVideoIA

## O que é ElevenLabs?

**ElevenLabs** é uma plataforma de inteligência artificial para geração de voz (TTS – Text-to-Speech) de altíssima qualidade, com suporte a SSML (Speech Synthesis Markup Language), emoção, variação de tom, ritmo e naturalidade. No BabyVideoIA, ela é usada para criar narrações profissionais, naturais e envolventes para vídeos verticais.

---

## Como funciona o pipeline VSL (Vídeo Sales Letter) no BabyVideoIA

1. **Usuário escolhe:**
   - Tema do vídeo
   - Tipo de vídeo (dica, anúncio, educativo, tutorial, story, inspiracional)
   - Público-alvo (mães, gestantes, influenciadoras, etc.)
   - Tom do roteiro (íntimo, educativo, profissional, emocional, etc.)
   - Duração total
2. **Geração do roteiro:**
   - IA (Gemini/Groq) cria um roteiro natural, emocional, com frases conversacionais e tags SSML.
   - O roteiro é dividido em cenas, cada uma com narração e descrição visual.
3. **Preview e edição:**
   - Usuário pode revisar e editar o roteiro, incluindo SSML.
4. **Narração ElevenLabs:**
   - As narrações das cenas são concatenadas em um único `<speak>...</speak>`.
   - O texto é enviado para ElevenLabs, que gera o áudio profissional.
5. **Geração de imagens IA:**
   - Para cada cena, uma imagem é gerada (Colab SD ou Freepik, com fallback).
6. **Sincronização:**
   - O tempo do áudio é dividido proporcionalmente entre as imagens/cenas.
7. **Legendas automáticas:**
   - O áudio é transcrito por Whisper e as legendas são sincronizadas.
8. **Montagem final:**
   - Imagens animadas, áudio, legendas e música de fundo são unidos em um vídeo vertical pronto para redes sociais.

---

## Personalização para cada público

### Tabela de públicos e sugestões de abordagem

| Público                      | Abordagem/Emoção           | Exemplo de Fala Direta           |
|------------------------------|----------------------------|----------------------------------|
| Mães de primeira viagem      | Acolhimento, segurança     | "Oi, mamãe! Você não está sozinha." |
| Gestantes                    | Carinho, expectativa       | "Parabéns por essa nova fase!"   |
| Mães experientes             | Reconhecimento, inspiração | "Sua experiência inspira outras mães." |
| Pais em geral                | Inclusivo, prático         | "Pai, sua presença faz toda diferença." |
| Familiares                   | Apoio, união               | "Família é a base de tudo."     |
| Influenciadoras digitais     | Engajamento, oportunidade  | "Oi, influenciadora! Que tal engajar ainda mais sua audiência?" |
| Afiliados e parceiros        | Negócios, parceria         | "Olá, parceiro! Vamos crescer juntos?" |
| Criadores de infoprodutos    | Autoridade, impacto        | "Transforme conhecimento em impacto com vídeos profissionais." |
| Empreendedores               | Motivação, visão           | "Empreender é criar o futuro. Conte com a gente!" |
| Agências de marketing        | Estratégia, resultado      | "Sua agência pode entregar vídeos incríveis para clientes." |
| Consultores e coaches        | Confiança, orientação      | "Consultor, sua voz pode transformar vidas." |
| Revendedores                 | Oportunidade, lucro        | "Revenda vídeos prontos e aumente sua renda." |
| Startups                     | Inovação, agilidade        | "Startup, destaque-se com vídeos de impacto." |
| Profissionais liberais       | Autoridade, proximidade    | "Profissional, mostre seu valor com vídeos autênticos." |
| Educadores                   | Didática, inspiração       | "Professor, inspire alunos com conteúdo visual e voz humana." |

---

## Exemplos de prompts e narração para cada tipo de vídeo

### 1. **Dica Rápida (15-30s)**
- **Prompt do usuário:** "Como acalmar o bebê na hora do sono"
- **Exemplo de narração SSML:**
  ```ssml
  <speak>
    <prosody rate="slow">Oi, mamãe! <break time="400ms"/> Sabia que uma música suave pode acalmar seu bebê? <emphasis>Experimente hoje!</emphasis>
  </prosody>
  </speak>
  ```

### 2. **Anúncio/Publicidade (30-60s)**
- **Prompt:** "Divulgar o app Baby Diary para mães"
- **Exemplo:**
  ```ssml
  <speak>
    <prosody pitch="+2st">Já imaginou organizar todas as memórias do seu bebê em um só lugar? <break time="300ms"/> Conheça o Baby Diary! <emphasis>Baixe agora e transforme sua rotina.</emphasis>
  </prosody>
  </speak>
  ```

### 3. **Educativo (60-90s)**
- **Prompt:** "Importância do sono para o desenvolvimento do bebê"
- **Exemplo:**
  ```ssml
  <speak>
    <prosody rate="medium">O sono é fundamental para o crescimento saudável. <break time="400ms"/> Crie uma rotina tranquila e veja a diferença no dia a dia.</prosody>
  </speak>
  ```

### 4. **Story/Reels (15-30s)**
- **Prompt:** "Desafio de tomar café com bebê pequeno"
- **Exemplo:**
  ```ssml
  <speak>
    <prosody rate="fast">Tentando tomar café e o bebê acorda... <break time="300ms"/> Quem mais passa por isso? <emphasis>Comenta aí!</emphasis>
  </prosody>
  </speak>
  ```

### 5. **Tutorial (45-90s)**
- **Prompt:** "Como criar uma rotina leve para mães"
- **Exemplo:**
  ```ssml
  <speak>
    <prosody rate="medium">Anote os horários principais do bebê. <break time="300ms"/> Crie uma sequência lógica, mas seja flexível. <emphasis>O importante é o bem-estar de todos.</emphasis>
  </prosody>
  </speak>
  ```

### 6. **Inspiracional (30-60s)**
- **Prompt:** "Mensagem de apoio para mães cansadas"
- **Exemplo:**
  ```ssml
  <speak>
    <prosody rate="slow">Ser mãe é um desafio diário. <break time="400ms"/> Mas cada sorriso do seu bebê vale a pena. <emphasis>Você está fazendo um trabalho incrível!</emphasis>
  </prosody>
  </speak>
  ```

---

## Estrutura de cenas e roteiro

- O roteiro é dividido em cenas (ex: 3 a 6), cada uma com:
  - **Narração** (SSML)
  - **Descrição visual** (para IA gerar imagem)
- O tempo do vídeo é dividido igualmente entre as cenas.
- O usuário pode editar o texto, o SSML e as descrições visuais antes de gerar o vídeo.

---

## Como customizar tudo pelo frontend

- **Escolha o tipo de vídeo, público, tom e duração**.
- **Edite o roteiro**: ajuste frases, emoção, pausas, SSML.
- **Visualize o preview** antes de gerar o vídeo final.
- **Envie para geração**: o pipeline VSL faz todo o resto automaticamente.

---

## Dicas avançadas de SSML e humanização

- Use `<break time="..."/>` para pausas naturais.
- Use `<emphasis>` para dar destaque a palavras importantes.
- Use `<prosody rate="slow" pitch="+2st">` para variar ritmo e tom.
- Fale diretamente com o público: use “você”, “sua empresa”, “mamãe”, etc.
- Misture emoção: “Você não está sozinha”, “Vamos crescer juntos”, “Curta cada momento”.
- Teste diferentes estilos de voz e emoção para cada público.

---

## Observações técnicas e melhores práticas

- Sempre use `<speak>...</speak>` envolvendo todo o texto para ElevenLabs.
- Não exagere nas pausas ou ênfases para não soar artificial.
- Prefira frases curtas, naturais e conversacionais.
- Revise o texto final antes de gerar o vídeo.
- Se a IA não gerar SSML, adicione manualmente no editor do frontend.

---

## Exemplo de fluxo completo (do prompt ao vídeo)

1. Usuário seleciona: “Dica Rápida”, público “Gestantes”, tom “Íntimo”, duração “30s”.
2. Digita o tema: “Como lidar com ansiedade na gravidez”.
3. IA gera roteiro dividido em 3 cenas, cada uma com narração SSML e descrição visual.
4. Usuário revisa e edita o texto, ajusta emoção e pausas.
5. Gera o vídeo: áudio ElevenLabs, imagens IA, legendas automáticas, tudo sincronizado.
6. Baixa ou compartilha o vídeo pronto!

---

Se quiser exemplos prontos para cada público ou tipo de vídeo, ou templates de prompts, é só pedir! 

Plano de Revisão e Migração para Pipeline VSL
1. Revisão do Fluxo Atual
[x] Entender como o frontend envia os dados (tema, tipo, público, cenas, etc).
[x] Verificar como o backend recebe e processa (roteiro, imagens, narração, legendas).
[x] Identificar pontos onde o TTS antigo ainda é chamado.
[x] Garantir que a geração de legendas funciona com áudio único.
2. Checklist de Refatoração
A. Backend
[ ] Remover qualquer função, import ou chamada do TTS antigo (gTTS, gerarNarracaoTTSGratuito, etc).
[ ] Garantir que só existe a função de narração ElevenLabs (gerarNarracaoElevenLabs).
[ ] Ajustar o pipeline para:
Gerar roteiro completo (com SSML).
Gerar áudio único ElevenLabs.
Dividir o tempo do áudio entre as imagens/cenas.
Gerar imagens (Stable Diffusion/Freepik).
Montar vídeo sincronizando imagens e áudio principal.
Gerar legendas a partir do áudio principal (Whisper ou fallback manual).
[ ] Remover qualquer lógica que espera múltiplos áudios curtos.
[ ] Garantir fallback robusto para imagens e legendas.
B. Frontend
[ ] Garantir que sempre envia o parâmetro correto para ativar o pipeline VSL.
[ ] Remover qualquer opção de TTS antigo ou pipeline antigo.
[ ] Permitir apenas a geração de vídeos no modo VSL.
C. Integração
[ ] Testar geração de vídeo para todos os tipos e públicos.
[ ] Verificar logs para garantir que não há chamadas ao TTS antigo.
[ ] Validar sincronização de imagens, áudio e legendas.
[ ] Validar uploads e metadados (Cloudinary, banco, etc).
3. Passos Detalhados
Passo 1: Limpeza do Backend
Revisar todos os arquivos em src/tts/, src/orchestrators/, src/utils/, src/subtitles/.
Remover funções antigas de TTS.
Garantir que só existe a função ElevenLabs.
Ajustar o orquestrador para pipeline VSL puro.
Passo 2: Ajuste do Frontend
Revisar os formulários e scripts JS.
Remover opções antigas.
Garantir envio do parâmetro correto (modo: "vsl" ou equivalente).
Passo 3: Testes e Logs
Gerar vídeos de todos os tipos/públicos.
Conferir logs para garantir que só o ElevenLabs é chamado.
Validar legendas, imagens, sincronização.
Passo 4: Robustez e Fallbacks
Testar falha de geração de imagem (deve cair no Freepik).
Testar falha de legenda (deve cair no fallback manual).
Testar falha de áudio (mensagem de erro clara).
4. O que revisar em cada arquivo-chave
src/tts/elevenlabs.ts
→ Só deve ter funções do ElevenLabs (sem TTS antigo).
src/orchestrators/orchestrator-animated-sd.ts
→ Só pipeline VSL, sem lógica de narração por cena.
src/utils/audioUtils.ts
→ Funções de utilidade para áudio, sem dependência do TTS antigo.
src/subtitles/aligner.ts
→ Geração de legendas a partir do áudio principal.
src/image/stabledefusion.ts e src/image/freepik.ts
→ Geração de imagens, com fallback robusto.
Frontend (HTML/JS)
→ Só modo VSL, sem opções antigas.
5. Próximos Passos
Você quer que eu comece revisando o backend (orquestrador, TTS, utilitários) ou o frontend?
Prefere que eu faça um checklist de cada arquivo, ou já vá limpando e ajustando direto?
Quer logs mais detalhados para cada etapa do pipeline?