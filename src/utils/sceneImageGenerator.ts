import { generateWithFallback } from '../text/gemini-groq';
import { getCredential } from './credentials';

export interface SceneImageSuggestion {
  sceneNumber: number;
  sceneText: string;
  imagePrompt: string;
  suggestedTags: string[];
  description: string;
  mood: string;
  style: string;
}

export interface VideoImageContext {
  tema: string;
  tipo: string;
  publico: string;
  formato: string;
  cenas: string[];
  resolution: string;
}

/**
 * Gera sugestões inteligentes de imagens para cada cena do vídeo
 */
export async function generateSceneImageSuggestions(
  context: VideoImageContext,
  apiKey?: string
): Promise<SceneImageSuggestion[]> {
  
  const systemPrompt = `Você é um especialista em criação de conteúdo visual para vídeos.

CONTEXTO:
- Tema: ${context.tema}
- Tipo: ${context.tipo}
- Público: ${context.publico}
- Formato: ${context.formato}

SUA TAREFA:
Para cada cena, gere:
1. PROMPT DE IMAGEM: Descrição visual clara e detalhada
2. TAGS: Categorias para organizar
3. DESCRIÇÃO: O que a imagem representa
4. MOOD: Tom emocional
5. ESTILO: Estilo visual

REGRAS:
- Cada descrição deve ser única e diferente
- Foque no contexto do tema e público
- Use linguagem visual clara
- Mantenha consistência entre cenas

ADAPTAÇÃO POR PÚBLICO:
- Se público for mães/gestantes: use maternidade, bebê, família, carinho
- Se público for negócios/empreendedores: use escritório, reuniões, gráficos, tecnologia
- Se público for influenciadoras: use redes sociais, celular, stories, engajamento
- Se público for agências: use dashboards, resultados, clientes, estratégia
- Se público for afiliados: use vendas, comissões, produtos, marketing

EXEMPLO PARA NEGÓCIOS:
Prompt: "Empreendedor em reunião de negócios, ambiente corporativo, gráficos de crescimento"
Tags: "negócios, empreendedorismo, crescimento"
Descrição: "Momento de decisão estratégica"
Mood: "profissional, focado"
Estilo: "corporativo, moderno"

EXEMPLO PARA MÃES:
Prompt: "Mãe sorrindo com bebê no colo, ambiente acolhedor, luz suave"
Tags: "maternidade, família, carinho"
Descrição: "Momentos de conexão entre mãe e bebê"
Mood: "alegre, sereno"
Estilo: "realista, natural"`;

  const userPrompt = `Gere sugestões de imagens para estas ${context.cenas.length} cenas:

${context.cenas.map((cena, index) => `CENA ${index + 1}: ${cena}`).join('\n')}

IMPORTANTE:
- Cada cena deve ter 3 descrições visuais ÚNICAS e DIFERENTES
- Foque no contexto: ${context.publico} - ${context.tema}
- Use linguagem visual rica e específica
- Varie ângulos, emoções, ações e cenários
- NÃO repita descrições entre cenas

EXEMPLO DE VARIAÇÃO:
Cena 1: ["Empreendedor em reunião", "Close-up do rosto decidido", "Vista de cima da mesa com documentos"]
Cena 2: ["Dashboard com gráficos", "Pessoa analisando dados", "Tela de computador com resultados"]
Cena 3: ["Handshake de negócio", "Celebração de equipe", "Momento de conquista"]

Retorne apenas o JSON com as sugestões.`;

  try {
    const response = await generateWithFallback(userPrompt, systemPrompt);
    
    // Limpar resposta e extrair JSON
    let responseText = response.trim();
    
    // Remover texto explicativo antes do JSON
    const jsonStart = responseText.search(/\[/);
    if (jsonStart > 0) {
      responseText = responseText.substring(jsonStart);
    }
    
    // Encontrar o final do JSON (último ])
    const jsonEnd = responseText.lastIndexOf(']');
    if (jsonEnd > 0) {
      responseText = responseText.substring(0, jsonEnd + 1);
    }
    
    // Parse do JSON
    const suggestions = JSON.parse(responseText);
    
    if (!Array.isArray(suggestions)) {
      throw new Error('Resposta não é um array válido');
    }
    
    return suggestions.map(suggestion => ({
      sceneNumber: suggestion.sceneNumber || 1,
      sceneText: suggestion.sceneText || '',
      imagePrompt: suggestion.imagePrompt || '',
      suggestedTags: suggestion.suggestedTags || [],
      description: suggestion.description || '',
      mood: suggestion.mood || 'neutro',
      style: suggestion.style || 'realista'
    }));
    
  } catch (error) {
    console.error('Erro ao gerar sugestões de imagens:', error);
    
    // Fallback: gerar sugestões básicas
    return context.cenas.map((cena, index) => {
      const publicoContext = context.publico.toLowerCase();
      let basePrompt = '';
      
      if (publicoContext.includes('empreendedor') || publicoContext.includes('negócio') || publicoContext.includes('infoproduto')) {
        basePrompt = 'empreendedor em ambiente corporativo, gráficos de crescimento, tecnologia';
      } else if (publicoContext.includes('influenciadora')) {
        basePrompt = 'influenciadora usando redes sociais, celular, stories, engajamento';
      } else if (publicoContext.includes('agência')) {
        basePrompt = 'dashboard com resultados, reunião de equipe, estratégia de marketing';
      } else if (publicoContext.includes('afiliado')) {
        basePrompt = 'vendas, comissões, produtos, marketing digital';
      } else {
        basePrompt = 'maternidade, bebê, família, carinho';
      }
      
      return {
        sceneNumber: index + 1,
        sceneText: cena,
        imagePrompt: `${basePrompt}, cena ${index + 1}, alta qualidade`,
        suggestedTags: [context.tipo, context.publico],
        description: `Imagem para cena ${index + 1}`,
        mood: 'profissional',
        style: 'realista'
      };
    });
  }
}

/**
 * Gera temas de imagens baseados no contexto do vídeo
 */
export async function generateImageThemes(
  context: VideoImageContext,
  apiKey: string
): Promise<string[]> {
  
  const systemPrompt = `Você é um especialista em criação de conteúdo visual para vídeos sobre maternidade.

CONTEXTO:
- Tema: ${context.tema}
- Tipo: ${context.tipo}
- Público: ${context.publico}

Gere 5-8 temas de imagens específicos e criativos que seriam perfeitos para este vídeo.

FORMATO: Responda apenas com uma lista simples, um tema por linha.`;

  const userPrompt = `Sugira temas de imagens para um vídeo sobre "${context.tema}" do tipo "${context.tipo}" para "${context.publico}".`;

  try {
    // Se apiKey foi fornecida, usar ela diretamente, senão usar fallback do banco
    let response: string;
    if (apiKey) {
      response = await generateWithFallback(userPrompt, systemPrompt, async (name: string) => {
        if (name === 'GEMINI_KEY') return apiKey;
        return await getCredential(name);
      });
    } else {
      response = await generateWithFallback(userPrompt, systemPrompt);
    }
    
    // Extrair temas da resposta
    const themes = response
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith('-') && !line.startsWith('•'))
      .slice(0, 8);
    
    return themes.length > 0 ? themes : [
      'Mãe e bebê interagindo',
      'Família feliz',
      'Cuidados com o bebê',
      'Desenvolvimento infantil',
      'Amor materno',
      'Crescimento saudável'
    ];
    
  } catch (error) {
    console.error('Erro ao gerar temas de imagens:', error);
    return [
      'Mãe e bebê interagindo',
      'Família feliz',
      'Cuidados com o bebê',
      'Desenvolvimento infantil',
      'Amor materno',
      'Crescimento saudável'
    ];
  }
}

/**
 * Analisa uma imagem existente e sugere melhorias
 */
export async function analyzeAndImproveImage(
  imageUrl: string,
  context: string,
  apiKey: string
): Promise<{
  analysis: string;
  improvements: string[];
  newPrompt: string;
}> {
  
  const systemPrompt = `Você é um especialista em análise de imagens para vídeos sobre maternidade.

Analise a imagem fornecida e sugira melhorias para torná-la mais adequada ao contexto.

CONTEXTO: ${context}

Forneça:
1. ANÁLISE: O que a imagem representa e como se relaciona ao contexto
2. MELHORIAS: Lista de melhorias específicas
3. NOVO_PROMPT: Prompt melhorado para gerar uma versão otimizada

FORMATO: Responda em JSON válido.`;

  const userPrompt = `Analise esta imagem: ${imageUrl}

Contexto: ${context}

Responda em JSON com: analysis, improvements (array), newPrompt`;

  try {
    // Se apiKey foi fornecida, usar ela diretamente, senão usar fallback do banco
    let response: string;
    if (apiKey) {
      response = await generateWithFallback(userPrompt, systemPrompt, async (name: string) => {
        if (name === 'GEMINI_KEY') return apiKey;
        return await getCredential(name);
      });
    } else {
      response = await generateWithFallback(userPrompt, systemPrompt);
    }
    
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return {
      analysis: 'Imagem analisada com sucesso',
      improvements: ['Melhorar contraste', 'Adicionar mais contexto'],
      newPrompt: `versão melhorada de: ${context}`
    };
    
  } catch (error) {
    console.error('Erro ao analisar imagem:', error);
    return {
      analysis: 'Não foi possível analisar a imagem',
      improvements: ['Verificar qualidade', 'Ajustar contexto'],
      newPrompt: `versão melhorada de: ${context}`
    };
  }
} 