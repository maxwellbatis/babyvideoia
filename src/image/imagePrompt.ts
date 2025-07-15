export interface ImagePromptConfig {
    style: 'realistic' | 'illustration' | 'photographic';
    mood: 'warm' | 'calm' | 'joyful' | 'tender';
    focus: 'mother' | 'baby' | 'family' | 'care';
  }
  
  export function gerarPromptImagem(narracao: string, config: Partial<ImagePromptConfig> = {}): string {
    const {
      style = 'realistic',
      mood = 'warm',
      focus = 'mother'
    } = config;
  
    // Extrair palavras-chave da narração
    const keywords = extrairKeywords(narracao);
    
    // Mapear estilo visual
    const styleMap = {
      realistic: 'fotografia realista, alta qualidade',
      illustration: 'ilustração digital suave, estilo cartoon delicado',
      photographic: 'fotografia profissional, luz natural'
    };
  
    // Mapear humor/ambiente
    const moodMap = {
      warm: 'ambiente acolhedor, luz quente, tons dourados',
      calm: 'ambiente tranquilo, luz suave, paz',
      joyful: 'ambiente alegre, cores vibrantes, sorrisos',
      tender: 'momento delicado, carinho, intimidade'
    };
  
    // Mapear foco principal
    const focusMap = {
      mother: 'foco na mãe, expressão de amor e cuidado',
      baby: 'foco no bebê, inocência, pureza',
      family: 'foco na família, conexão, união',
      care: 'foco no cuidado, amamentação, carinho'
    };
  
    // Construir prompt base
    let prompt = `${styleMap[style]}, ${moodMap[mood]}, ${focusMap[focus]}`;
    
    // Adicionar contexto específico da narração
    if (keywords.length > 0) {
      prompt += `, ${keywords.join(', ')}`;
    }
  
    // Adicionar contexto de maternidade
    if (focus === 'mother' || focus === 'baby' || focus === 'family') {
      prompt += ', maternidade, bebê, família, amor, cuidado, carinho';
    }
  
    // Adicionar especificações técnicas
    prompt += ', alta resolução, detalhes finos, composição equilibrada';
  
    return prompt;
  }
  
  function extrairKeywords(texto: string): string[] {
    const palavrasChave = [
      // Ações
      'amamentar', 'amamentação', 'dar de mamar', 'mamar',
      'dormir', 'sono', 'descansar', 'repousar',
      'brincar', 'brincadeira', 'diversão',
      'conversar', 'compartilhar', 'ajudar',
      'respirar', 'relaxar', 'meditar',
      
      // Emoções
      'amor', 'carinho', 'cuidado', 'proteção',
      'paz', 'tranquilidade', 'calma', 'serenidade',
      'alegria', 'felicidade', 'sorriso', 'riso',
      'gratidão', 'esperança', 'força', 'coragem',
      
      // Pessoas
      'mãe', 'mamãe', 'bebê', 'filho', 'filha',
      'família', 'familiares', 'amigos', 'pessoas',
      
      // Ambientes
      'casa', 'quarto', 'berço', 'sofá', 'cama',
      'jardim', 'parque', 'natureza', 'luz natural',
      
      // Objetos
      'brinquedo', 'livro', 'música', 'carinho',
      'abraço', 'beijo', 'toque', 'contato'
    ];
  
    const textoLower = texto.toLowerCase();
    const encontradas = palavrasChave.filter(palavra => 
      textoLower.includes(palavra)
    );
  
    // Se não encontrou palavras específicas, usar contexto geral
    if (encontradas.length === 0) {
      return ['maternidade', 'cuidado', 'amor'];
    }
  
    return encontradas.slice(0, 3); // Máximo 3 palavras-chave
  }
  
  // Prompts específicos para diferentes tipos de conteúdo
  export const PROMPTS_ESPECIFICOS = {
    amamentacao: 'mãe amamentando bebê, momento íntimo, carinho, luz suave, ambiente acolhedor',
    sono: 'bebê dormindo, paz, tranquilidade, berço, luz noturna suave',
    brincadeira: 'mãe e bebê brincando, alegria, sorrisos, brinquedos coloridos',
    cuidado: 'mãe cuidando do bebê, carinho, proteção, momento delicado',
    familia: 'família unida, amor, conexão, momentos especiais',
    descanso: 'mãe descansando, tranquilidade, paz, momento de calma'
  };
  
  export function getPromptEspecifico(tipo: keyof typeof PROMPTS_ESPECIFICOS): string {
    return PROMPTS_ESPECIFICOS[tipo] || PROMPTS_ESPECIFICOS.cuidado;
  } 