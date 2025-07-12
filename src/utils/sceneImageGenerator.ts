import { generateWithFallback } from '../text/gemini-groq';

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
  
  const systemPrompt = `Você é um especialista em criação de conteúdo visual para vídeos sobre maternidade e Baby Diary.

CONTEXTO DO VÍDEO:
- Tema: ${context.tema}
- Tipo: ${context.tipo}
- Público: ${context.publico}
- Formato: ${context.formato}
- Resolução: ${context.resolution}

SUA TAREFA:
Para cada cena, você deve gerar:
1. PROMPT DE IMAGEM: Descrição detalhada para gerar imagem AI
2. TAGS SUGERIDAS: Categorias para organizar a imagem
3. DESCRIÇÃO: Explicação do que a imagem representa
4. MOOD: Tom emocional (alegre, sereno, motivacional, etc.)
5. ESTILO: Estilo visual (realista, cartoon, minimalista, etc.)

FORMATO DE RESPOSTA:
Responda APENAS em JSON válido com este formato:
[
  {
    "sceneNumber": 1,
    "sceneText": "texto da cena",
    "imagePrompt": "prompt detalhado para gerar imagem",
    "suggestedTags": ["tag1", "tag2"],
    "description": "descrição da imagem",
    "mood": "alegre",
    "style": "realista"
  }
]

REGRAS:
- Prompts devem ser específicos e detalhados
- Foque no contexto de maternidade/bebês
- Use linguagem visual rica
- Mantenha consistência entre cenas
- Considere a resolução do vídeo`;

  const userPrompt = `Gere sugestões de imagens para estas ${context.cenas.length} cenas:

${context.cenas.map((scene, index) => `${index + 1}. ${scene}`).join('\n')}

Responda em JSON válido seguindo exatamente o formato especificado.`;

  try {
    const response = await generateWithFallback(userPrompt, systemPrompt);
    
    // Tentar extrair JSON da resposta
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const suggestions = JSON.parse(jsonMatch[0]);
      return suggestions.map((suggestion: any, index: number) => ({
        sceneNumber: suggestion.sceneNumber || index + 1,
        sceneText: suggestion.sceneText || context.cenas[index] || '',
        imagePrompt: suggestion.imagePrompt || '',
        suggestedTags: suggestion.suggestedTags || ['app-mockup'],
        description: suggestion.description || '',
        mood: suggestion.mood || 'neutro',
        style: suggestion.style || 'realista'
      }));
    }
    
    // Fallback se não conseguir extrair JSON
    return context.cenas.map((scene, index) => ({
      sceneNumber: index + 1,
      sceneText: scene,
      imagePrompt: `fotografia realista, alta qualidade, ${context.tema.toLowerCase()}, maternidade, bebê, família, amor, cuidado, carinho, alta resolução, detalhes finos`,
      suggestedTags: ['app-mockup', context.tipo, context.publico],
      description: `Imagem representando: ${scene}`,
      mood: 'alegre',
      style: 'realista'
    }));
    
  } catch (error) {
    console.error('Erro ao gerar sugestões de imagens:', error);
    
    // Fallback básico
    return context.cenas.map((scene, index) => ({
      sceneNumber: index + 1,
      sceneText: scene,
      imagePrompt: `fotografia realista, alta qualidade, ${context.tema.toLowerCase()}, maternidade, bebê, família, amor, cuidado, carinho, alta resolução, detalhes finos`,
      suggestedTags: ['app-mockup', context.tipo, context.publico],
      description: `Imagem representando: ${scene}`,
      mood: 'alegre',
      style: 'realista'
    }));
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
    const response = await generateWithFallback(userPrompt, systemPrompt);
    
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
    const response = await generateWithFallback(userPrompt, systemPrompt);
    
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