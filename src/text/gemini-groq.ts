import { GoogleGenerativeAI } from '@google/generative-ai';

// Importar getCredential
import { getCredential } from '../utils/credentials';

// Função principal com fallback Gemini → Groq → OpenAI → Local
async function generateWithFallback(prompt: string, systemPrompt?: string, getCred?: (name: string) => Promise<string | undefined>): Promise<string> {
  let geminiKey = process.env.GEMINI_KEY;
  let groqKey = process.env.GROQ_API_KEY;
  let openaiKey = process.env.OPENAI_API_KEY;
  
  if (getCred) {
    geminiKey = geminiKey || await getCred('GEMINI_KEY');
    groqKey = groqKey || await getCred('GROQ_API_KEY');
    openaiKey = openaiKey || await getCred('OPENAI_API_KEY');
  } else {
    geminiKey = geminiKey || await getCredential('GEMINI_KEY');
    groqKey = groqKey || await getCredential('GROQ_API_KEY');
    openaiKey = openaiKey || await getCredential('OPENAI_API_KEY');
  }

  if (!geminiKey && !groqKey && !openaiKey) {
    throw new Error('Nenhuma API key configurada. Configure GEMINI_KEY, GROQ_API_KEY ou OPENAI_API_KEY no banco ou .env');
  }

  // Tentar Groq primeiro
  if (groqKey) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + groqKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            { role: 'system', content: systemPrompt || 'Você é um assistente útil.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error('Groq API error: ' + response.status + ' - ' + response.statusText);
      }

      const data = await response.json();
      console.log('✅ Groq usado com sucesso');
      return data.choices[0].message.content;
    } catch (error: any) {
      console.log('❌ Groq falhou:', error.message || error);
      // Se for erro de quota, aguardar um pouco antes de tentar próxima API
      if (error.message && error.message.includes('429')) {
        console.log('⏳ Aguardando 3 segundos devido a quota excedida...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  }

  // Fallback para Gemini
  if (geminiKey) {
    try {
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

      const fullPrompt = systemPrompt ? systemPrompt + '\n\n' + prompt : prompt;
      
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();
      
      console.log('✅ Gemini usado com sucesso (fallback)');
      return text;
    } catch (error: any) {
      console.log('❌ Gemini falhou:', error.message || error);
      // Se for erro de quota, aguardar um pouco antes de tentar próxima API
      if (error.status === 429) {
        console.log('⏳ Aguardando 5 segundos devido a quota excedida...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }

  // Fallback para OpenAI
  if (openaiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + openaiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt || 'Você é um assistente útil.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error('OpenAI API error: ' + response.status + ' - ' + response.statusText);
      }

      const data = await response.json();
      console.log('✅ OpenAI usado com sucesso (fallback)');
      return data.choices[0].message.content;
    } catch (error: any) {
      console.log('❌ OpenAI também falhou:', error.message || error);
    }
  }

  // Fallback final: gerar conteúdo básico localmente
  console.log('⚠️ Usando fallback local devido a falhas nas APIs');
  return generateLocalFallback(prompt, systemPrompt);
}

// Função de fallback local para quando todas as APIs falharem
function generateLocalFallback(prompt: string, systemPrompt?: string): string {
  const templates = {
    script: {
      anuncio: [
        "Você já se sentiu perdida na rotina do bebê?",
        "Muitas mães passam por isso todos os dias...",
        "Mas existe uma forma mais leve de organizar tudo.",
        "O Baby Diary transforma o caos em harmonia.",
        "Baixe agora e descubra a diferença!"
      ],
      dica: [
        "Uma dica que mudou minha vida como mãe:",
        "Antes de dormir, anote 3 momentos especiais do dia.",
        "Isso ajuda a focar no positivo e reduz o estresse.",
        "Funciona mesmo nos dias mais difíceis.",
        "Experimente e me conte como foi!"
      ],
      educativo: [
        "Você sabia que o sono do bebê tem fases?",
        "Cada fase é importante para o desenvolvimento.",
        "Entender isso pode mudar sua rotina.",
        "Vamos descobrir juntas como funciona.",
        "Quer saber mais? Veja o próximo vídeo!"
      ]
    },
    title: [
      "Transforme sua rotina com o Baby Diary",
      "Descubra o segredo das mães organizadas",
      "Baby Diary: seu companheiro perfeito",
      "Organize sua maternidade de forma simples",
      "Baby Diary: mais tempo para o que importa"
    ],
    hashtags: [
      "#Maternidade #BabyDiary #DesenvolvimentoInfantil #MãeDePrimeiraViagem",
      "#AmorDeMãe #DicasParaMães #Família #Crescimento #SaúdeInfantil",
      "#CuidadosComBebê #MaternidadeReal #VidaDeMãe #Bebê #Família"
    ]
  };

  // Detectar tipo de conteúdo baseado no prompt
  if (prompt.toLowerCase().includes('título') || prompt.toLowerCase().includes('title')) {
    return templates.title[Math.floor(Math.random() * templates.title.length)];
  }
  
  if (prompt.toLowerCase().includes('hashtag') || prompt.toLowerCase().includes('hashtags')) {
    return templates.hashtags[Math.floor(Math.random() * templates.hashtags.length)];
  }
  
  if (prompt.toLowerCase().includes('anúncio') || prompt.toLowerCase().includes('venda')) {
    return templates.script.anuncio.join('\n');
  }
  
  if (prompt.toLowerCase().includes('dica') || prompt.toLowerCase().includes('dica')) {
    return templates.script.dica.join('\n');
  }
  
  // Padrão: retornar script educativo
  return templates.script.educativo.join('\n');
}

// Função para gerar roteiros de vídeo com templates específicos por tipo
export async function generateScript(
  tema: string, 
  apiKey?: string, 
  tipo: string = 'anuncio',
  duracaoTotal: number = 30,
  publico: string = 'maes',
  cenas: number = 5,
  duracaoCena: number = 6
): Promise<string> {
  const palavrasPorCena = Math.floor(duracaoCena * 2.5);

  // Templates específicos por tipo de vídeo para evitar conteúdo robótico
  const templatesPorTipo = {
    anuncio: {
      nome: "VSL/Anúncio Publicitário",
      estrutura: "Hook → Problema → Solução → Benefícios → CTA",
      objetivo: "Vender o app Baby Diary de forma persuasiva",
      tom: "Persuasivo, emocional, com urgência",
      exemplos: {
        maes: [
          "Você já se sentiu perdida na rotina do bebê?",
          "Muitas mães passam por isso todos os dias...",
          "Mas existe uma forma mais leve de organizar tudo.",
          "O Baby Diary transforma o caos em harmonia.",
          "Baixe agora e descubra a diferença!"
        ],
        influenciadoras: [
          "Quer criar conteúdo que realmente conecta com suas seguidoras?",
          "Muitas influenciadoras perdem engajamento por não terem uma estratégia clara...",
          "Mas existe uma ferramenta que vai revolucionar seu conteúdo.",
          "O Baby Diary White Label é a solução completa para seu negócio.",
          "Transforme sua audiência em clientes fiéis hoje mesmo!"
        ],
        afiliados: [
          "Quer ganhar comissões recorrentes sem complicação?",
          "Muitos afiliados perdem dinheiro por não terem o produto certo...",
          "Mas existe uma oportunidade única no mercado.",
          "O Baby Diary White Label oferece margens incríveis e retenção alta.",
          "Junte-se aos afiliados que já estão lucrando milhares!"
        ],
        infoprodutores: [
          "Quer escalar seu negócio sem aumentar custos?",
          "Muitos infoprodutores ficam limitados pela falta de ferramentas...",
          "Mas existe uma solução que vai multiplicar seus resultados.",
          "O Baby Diary White Label é a ferramenta que faltava no seu arsenal.",
          "Transforme seu conhecimento em um negócio escalável agora!"
        ],
        empreendedores: [
          "Quer entrar no mercado de apps sem investir milhões?",
          "Muitos empreendedores perdem oportunidades por não terem a solução certa...",
          "Mas existe uma forma de ter seu próprio app de sucesso.",
          "O Baby Diary White Label é a oportunidade que você estava esperando.",
          "Seja o próximo unicórnio do mercado de apps para mães!"
        ]
      }
    },
    dica: {
      nome: "Dica Rápida e Prática",
      estrutura: "Gancho → Dica → Exemplo → Resultado",
      objetivo: "Compartilhar conhecimento útil de forma direta",
      tom: "Amigável, prático, acolhedor",
      exemplos: {
        maes: [
          "Uma dica que mudou minha vida como mãe:",
          "Antes de dormir, anote 3 momentos especiais do dia.",
          "Isso ajuda a focar no positivo e reduz o estresse.",
          "Funciona mesmo nos dias mais difíceis.",
          "Experimente e me conte como foi!"
        ],
        influenciadoras: [
          "Dica de ouro para influenciadoras:",
          "Use o Baby Diary para criar conteúdo autêntico.",
          "Suas seguidoras vão se identificar com sua jornada real.",
          "O engajamento vai aumentar naturalmente.",
          "Teste e veja a diferença nos seus números!"
        ],
        afiliados: [
          "Dica secreta para afiliados:",
          "Promova produtos que você realmente usa.",
          "O Baby Diary White Label tem alta conversão.",
          "Seus leads vão confiar mais em você.",
          "Resultados garantidos em 30 dias!"
        ]
      }
    },
    educativo: {
      nome: "Conteúdo Educativo",
      estrutura: "Introdução → Desenvolvimento → Conclusão",
      objetivo: "Ensinar algo novo sobre maternidade",
      tom: "Informativo, didático, acolhedor",
      exemplos: [
        "Você sabia que o sono do bebê tem fases?",
        "Cada fase é importante para o desenvolvimento.",
        "Entender isso pode mudar sua rotina.",
        "Vamos descobrir juntas como funciona.",
        "Quer saber mais? Veja o próximo vídeo!"
      ]
    },
    story: {
      nome: "Story/Reels para Redes Sociais",
      estrutura: "Situação → Reação → Reflexão",
      objetivo: "Criar identificação e engajamento",
      tom: "Casual, real, divertido",
      exemplos: [
        "Tentando tomar café e o bebê acorda...",
        "Nunca mais tomei um café quente na vida!",
        "Mas tenho amor de sobra para compensar.",
        "Cada momento vale a pena, mesmo sem café.",
        "Quem mais passa por isso? Comenta aí!"
      ]
    },
    tutorial: {
      nome: "Tutorial Passo a Passo",
      estrutura: "Objetivo → Passos → Resultado",
      objetivo: "Ensinar algo prático e específico",
      tom: "Instrutivo, claro, encorajador",
      exemplos: [
        "Vou te mostrar como organizar a rotina do bebê.",
        "Primeiro, anote os horários principais.",
        "Depois, crie uma sequência lógica.",
        "Por fim, seja flexível com as mudanças.",
        "Pronto! Sua rotina ficará muito mais leve."
      ]
    },
    inspiracional: {
      nome: "Conteúdo Inspiracional",
      estrutura: "Frase → História → Reflexão",
      objetivo: "Motivar e emocionar",
      tom: "Emocional, motivacional, acolhedor",
      exemplos: [
        "Ser mãe não é dar conta de tudo.",
        "É amar mesmo quando está cansada.",
        "É persistir mesmo quando parece impossível.",
        "Você está fazendo um trabalho incrível.",
        "Continue assim, você é inspiração!"
      ]
    }
  };

  const template = templatesPorTipo[tipo as keyof typeof templatesPorTipo] || templatesPorTipo.anuncio;
  
  const publicoConfig = {
    // Público principal (mães)
    maes: 'mães de primeira viagem',
    gestantes: 'gestantes',
    maes_experientes: 'mães experientes',
    pais: 'pais em geral',
    familiares: 'familiares',
    
    // Público para vendas SaaS White Label
    influenciadoras: 'influenciadoras digitais e mães',
    afiliados: 'afiliados e parceiros de marketing',
    infoprodutores: 'criadores de infoprodutos e cursos',
    empreendedores: 'empreendedores e empresários',
    agencias: 'agências de marketing digital',
    consultores: 'consultores e coaches',
    revendedores: 'revendedores e distribuidores',
    startups: 'startups e empresas em crescimento',
    profissionais: 'profissionais liberais',
    educadores: 'educadores e professores'
  };
  
  const publicoAlvo = publicoConfig[publico as keyof typeof publicoConfig] || 'mães';

  // Selecionar exemplos baseados no público e tipo
  let exemplosParaUsar: string[] = [];
  if (template.exemplos && typeof template.exemplos === 'object' && !Array.isArray(template.exemplos)) {
    // Se tem exemplos específicos por público
    const exemplosPorPublico = template.exemplos as any;
    exemplosParaUsar = exemplosPorPublico[publico] || exemplosPorPublico.maes || [];
  } else if (Array.isArray(template.exemplos)) {
    // Se tem exemplos genéricos
    exemplosParaUsar = template.exemplos;
  }

  // Prompt simples e direto para evitar conteúdo robótico
  const prompt = `Crie um roteiro natural para um vídeo sobre "${tema}".

PÚBLICO: ${publicoAlvo}
TIPO: ${tipo}
TOM: ${template.tom}

INSTRUÇÕES:
- Fale naturalmente, como em uma conversa
- Adapte a linguagem para ${publicoAlvo}
- Divida em ${cenas} cenas fluidas
- Cada cena deve ter narração e descrição visual
- Use SSML básico: <speak>, <prosody>, <break>, <emphasis>

IMPORTANTE: 
- Retorne APENAS o JSON, sem texto explicativo antes ou depois
- Cada cena DEVE ter EXATAMENTE 3 descrições visuais diferentes
- NÃO retorne apenas 1 descrição por cena

FORMATO DO JSON:
{
  "cenas": [
    {
      "narracao": "<speak>Oi! Vamos falar sobre [tema]...</speak>",
      "visual": [
        "Primeira descrição visual detalhada",
        "Segunda descrição visual diferente", 
        "Terceira descrição visual única"
      ]
    }
  ]
}

EXEMPLO DE DESCRIÇÕES VISUAIS:
- Cena 1: ["Pessoa em ambiente de trabalho", "Close-up do rosto pensativo", "Vista de cima da mesa com documentos"]
- Cena 2: ["Grupo de pessoas em reunião", "Tela de computador com gráficos", "Mãos digitando no teclado"]`;

  const systemPrompt = `Você é um roteirista especializado em ${tipo} para ${publicoAlvo}. 
Crie conteúdo natural, conversacional e envolvente com SSML básico para ElevenLabs.
Retorne apenas JSON válido, sem texto explicativo.
Cada cena deve ter EXATAMENTE 3 descrições visuais diferentes.`;

  // Se apiKey foi fornecida, usar ela diretamente, senão usar fallback do banco
  if (apiKey) {
    return generateWithFallback(prompt, systemPrompt, async (name: string) => {
      if (name === 'GEMINI_KEY') return apiKey;
      return await getCredential(name);
    });
  } else {
    return generateWithFallback(prompt, systemPrompt);
  }
}

// Função para gerar posts do Baby Diary
export async function generateBabyDiaryPost(
  tema: string, 
  tipo: 'dica' | 'desenvolvimento' | 'cuidados' | 'alimentacao' | 'brincadeiras', 
  apiKey?: string
): Promise<string> {
  const prompt = 'Crie um post criativo e informativo para o Baby Diary sobre "' + tema + '" no formato ' + tipo + '.\n\n' +
    'O post deve ser:\n' +
    '- Motivacional e positivo\n' +
    '- Com dicas práticas\n' +
    '- Linguagem acolhedora para mães\n' +
    '- Formato adequado para redes sociais\n' +
    '- Com emojis relevantes\n\n' +
    'Tema: ' + tema + '\n' +
    'Tipo: ' + tipo;
  
  // Se apiKey foi fornecida, usar ela diretamente, senão usar fallback do banco
  if (apiKey) {
    return generateWithFallback(prompt, 'Você é um especialista em conteúdo para mães e bebês. Crie posts criativos e informativos.', async (name: string) => {
      if (name === 'GEMINI_KEY') return apiKey;
      return await getCredential(name);
    });
  } else {
    return generateWithFallback(prompt, 'Você é um especialista em conteúdo para mães e bebês. Crie posts criativos e informativos.');
  }
}

// Função para gerar legendas de redes sociais
export async function generateSocialMediaCaption(
  tema: string, 
  plataforma: 'instagram' | 'facebook' | 'tiktok', 
  apiKey?: string
): Promise<string> {
  const prompt = 'Crie uma legenda envolvente para ' + plataforma + ' sobre "' + tema + '" para mães e bebês.\n\n' +
    'A legenda deve ser:\n' +
    '- Otimizada para ' + plataforma + '\n' +
    '- Com hashtags relevantes\n' +
    '- Chamativa e interativa\n' +
    '- Com call-to-action\n' +
    '- Linguagem jovem e moderna\n\n' +
    'Tema: ' + tema + '\n' +
    'Plataforma: ' + plataforma;
  
  // Se apiKey foi fornecida, usar ela diretamente, senão usar fallback do banco
  if (apiKey) {
    return generateWithFallback(prompt, 'Você é um especialista em marketing digital para mães e bebês. Crie legendas otimizadas para redes sociais.', async (name: string) => {
      if (name === 'GEMINI_KEY') return apiKey;
      return await getCredential(name);
    });
  } else {
    return generateWithFallback(prompt, 'Você é um especialista em marketing digital para mães e bebês. Crie legendas otimizadas para redes sociais.');
  }
}

// Função para gerar conteúdo de marketing
export async function generateBabyDiaryMarketingContent(
  tipo: 'influenciadora' | 'parceiro' | 'mae' | 'vendas',
  plataforma: 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'email',
  apiKey?: string
): Promise<string> {
  const prompt = 'Crie conteúdo de marketing para ' + tipo + ' na plataforma ' + plataforma + ' sobre o Baby Diary.\n\n' +
    'O conteúdo deve ser:\n' +
    '- Focado no público ' + tipo + '\n' +
    '- Otimizado para ' + plataforma + '\n' +
    '- Com argumentos convincentes\n' +
    '- Chamativo e profissional\n' +
    '- Com call-to-action claro\n\n' +
    'Tipo: ' + tipo + '\n' +
    'Plataforma: ' + plataforma;
  
  // Se apiKey foi fornecida, usar ela diretamente, senão usar fallback do banco
  if (apiKey) {
    return generateWithFallback(prompt, 'Você é um especialista em marketing digital. Crie conteúdo persuasivo e profissional.', async (name: string) => {
      if (name === 'GEMINI_KEY') return apiKey;
      return await getCredential(name);
    });
  } else {
    return generateWithFallback(prompt, 'Você é um especialista em marketing digital. Crie conteúdo persuasivo e profissional.');
  }
}

// Função para gerar roteiros de marketing de vídeo
export async function generateVideoMarketingScript(
  publico: 'influenciadoras' | 'parceiros' | 'maes' | 'vendas',
  duracao: 'curto' | 'medio' | 'longo' = 'medio',
  apiKey?: string
): Promise<string> {
  const prompt = 'Crie um roteiro de vídeo de marketing para ' + publico + ' com duração ' + duracao + ' sobre o Baby Diary.\n\n' +
    'O roteiro deve ser:\n' +
    '- Focado no público ' + publico + '\n' +
    '- Duração ' + duracao + ' (curto: 30s, médio: 1min, longo: 2min)\n' +
    '- Com argumentos convincentes\n' +
    '- Estrutura clara: problema, solução, benefícios\n' +
    '- Com call-to-action forte\n\n' +
    'Público: ' + publico + '\n' +
    'Duração: ' + duracao;
  
  // Se apiKey foi fornecida, usar ela diretamente, senão usar fallback do banco
  if (apiKey) {
    return generateWithFallback(prompt, 'Você é um roteirista de vídeos de marketing. Crie roteiros claros, objetivos e persuasivos.', async (name: string) => {
      if (name === 'GEMINI_KEY') return apiKey;
      return await getCredential(name);
    });
  } else {
    return generateWithFallback(prompt, 'Você é um roteirista de vídeos de marketing. Crie roteiros claros, objetivos e persuasivos.');
  }
}

// Função para gerar argumento de venda
export async function generateArgumentoVenda(
  tipo: 'influenciadora' | 'parceiro' | 'mae',
  apiKey?: string
): Promise<string> {
  const prompt = 'Crie um argumento de venda persuasivo para ' + tipo + ' sobre o Baby Diary.\n\n' +
    'O argumento deve:\n' +
    '- Identificar as necessidades do ' + tipo + '\n' +
    '- Apresentar benefícios claros\n' +
    '- Responder objeções comuns\n' +
    '- Ter tom profissional e confiável\n' +
    '- Incluir call-to-action\n\n' +
    'Tipo: ' + tipo;
  
  // Se apiKey foi fornecida, usar ela diretamente, senão usar fallback do banco
  if (apiKey) {
    return generateWithFallback(prompt, 'Você é um especialista em vendas. Crie argumentos de venda convincentes e profissionais.', async (name: string) => {
      if (name === 'GEMINI_KEY') return apiKey;
      return await getCredential(name);
    });
  } else {
    return generateWithFallback(prompt, 'Você é um especialista em vendas. Crie argumentos de venda convincentes e profissionais.');
  }
}

// Função para gerar título automático do vídeo
export async function generateVideoTitle(
  tema: string,
  tipo: string = 'anuncio',
  publico: string = 'maes',
  apiKey?: string
): Promise<string> {
  const prompt = `Crie um título atrativo e SEO-friendly para um vídeo sobre "${tema}".
  
  CONTEXTO:
  - Tipo de vídeo: ${tipo}
  - Público-alvo: ${publico}
  - Nicho: materno-infantil (Baby Diary)
  
  REQUISITOS:
  - Máximo 60 caracteres
  - Atraente e clickbait (mas honesto)
  - Otimizado para redes sociais
  - Incluir emoção ou curiosidade
  - Usar palavras-chave relevantes
  
  EXEMPLOS DE TÍTULOS BONS:
  - "3 Truques que Salvam a Rotina de Qualquer Mãe"
  - "Como Transformar 5 Minutos em Momentos Especiais"
  - "A Verdade Sobre o Sono das Mães (Sobrevivendo sem Dormir)"
  - "Desenvolvimento do Bebê: Do Sorriso ao Primeiro 'Mamãe'"
  - "Por que Todo Empreendedor Deveria Ter um White Label"
  
  Gere apenas o título, sem aspas ou formatação extra.`;
  
  // Se apiKey foi fornecida, usar ela diretamente, senão usar fallback do banco
  if (apiKey) {
    return generateWithFallback(prompt, 'Você é um especialista em marketing digital e SEO. Crie títulos atrativos e otimizados para redes sociais.', async (name: string) => {
      if (name === 'GEMINI_KEY') return apiKey;
      return await getCredential(name);
    });
  } else {
    return generateWithFallback(prompt, 'Você é um especialista em marketing digital e SEO. Crie títulos atrativos e otimizados para redes sociais.');
  }
}

// Função para gerar hashtags automáticas
export async function generateVideoHashtags(
  tema: string,
  tipo: string = 'anuncio',
  publico: string = 'maes',
  apiKey?: string
): Promise<string> {
  const prompt = `Crie hashtags relevantes e estratégicas para um vídeo sobre "${tema}".
  
  CONTEXTO:
  - Tipo de vídeo: ${tipo}
  - Público-alvo: ${publico}
  - Nicho: materno-infantil (Baby Diary)
  
  REQUISITOS:
  - 5-8 hashtags no total
  - Misturar hashtags populares e específicas
  - Incluir hashtags do nicho materno
  - Usar hashtags trending quando relevante
  - Evitar hashtags muito genéricas
  
  CATEGORIAS DE HASHTAGS:
  1. Nicho materno: #Maternidade, #BabyDiary, #DesenvolvimentoInfantil
  2. Trending: #MãeDePrimeiraViagem, #RotinaDoBebê, #Amamentação
  3. Emocional: #AmorDeMãe, #Crescimento, #Família
  4. Educativo: #DicasParaMães, #CuidadosComBebê, #SaúdeInfantil
  5. Para SaaS: #Empreendedorismo, #WhiteLabel, #SaaS, #MarketingDigital
  
  EXEMPLO DE RESPOSTA:
  #Maternidade #BabyDiary #DesenvolvimentoInfantil #MãeDePrimeiraViagem #AmorDeMãe #DicasParaMães #Família #Crescimento
  
  Retorne apenas as hashtags separadas por espaço, sem texto adicional.`;
  
  // Se apiKey foi fornecida, usar ela diretamente, senão usar fallback do banco
  if (apiKey) {
    return generateWithFallback(prompt, 'Você é um especialista em marketing digital e redes sociais. Crie hashtags estratégicas e relevantes para o nicho materno-infantil.', async (name: string) => {
      if (name === 'GEMINI_KEY') return apiKey;
      return await getCredential(name);
    });
  } else {
    return generateWithFallback(prompt, 'Você é um especialista em marketing digital e redes sociais. Crie hashtags estratégicas e relevantes para o nicho materno-infantil.');
  }
}

export { generateWithFallback }; 