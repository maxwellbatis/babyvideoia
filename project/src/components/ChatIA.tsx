import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Lightbulb } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { sendChatMessage, ChatMessage } from '../services/api';
import { useToast } from './Toast';

interface ChatIAProps {
  onSuggestionClick: (suggestion: string) => void;
}

export const ChatIA: React.FC<ChatIAProps> = ({ onSuggestionClick }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationContext, setConversationContext] = useState<{
    tema?: string;
    publico?: string;
    tipo?: string;
    interesses?: string[];
  }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { showToast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Mensagem de boas-vindas inteligente
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        message: `Olá! 👋 Sou seu assistente de criação de vídeos. 

Posso te ajudar a:
• 🎯 Escolher o público-alvo ideal
• 💡 Encontrar temas que convertem
• 📱 Criar conteúdo para redes sociais
• 🎬 Desenvolver estratégias de marketing

Me conte: qual tipo de vídeo você quer criar hoje?`,
        type: 'assistant',
        timestamp: new Date().toISOString(),
        suggestions: [
          'Quero criar vídeos para mães',
          'Preciso de ideias para vendas',
          'Como escolher o público-alvo?',
          'Quero conteúdo educativo'
        ]
      };
      setMessages([welcomeMessage]);
    }
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      message: input,
      type: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Análise inteligente da mensagem do usuário
      const analysis = analyzeUserMessage(input);
      updateConversationContext(analysis);
      
      // Gerar resposta contextualizada
      const contextualResponse = generateContextualResponse(input, analysis, conversationContext);
      
      const response: ChatMessage = {
        id: (Date.now() + 1).toString(),
        message: contextualResponse.message,
        type: 'assistant',
        timestamp: new Date().toISOString(),
        suggestions: contextualResponse.suggestions
      };
      
      setMessages(prev => [...prev, response]);
    } catch (error) {
      showToast('Erro ao processar mensagem', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Análise inteligente da mensagem do usuário
  const analyzeUserMessage = (message: string) => {
    const lowerMessage = message.toLowerCase();
    const analysis = {
      tema: '',
      publico: '',
      tipo: '',
      interesses: [] as string[]
    };

    // Detectar público-alvo
    if (lowerMessage.includes('mãe') || lowerMessage.includes('mae') || lowerMessage.includes('gestante')) {
      analysis.publico = 'Mães de primeira viagem';
    } else if (lowerMessage.includes('influenciador') || lowerMessage.includes('afiliado')) {
      analysis.publico = 'Influenciadoras digitais';
    } else if (lowerMessage.includes('empreendedor') || lowerMessage.includes('empresário')) {
      analysis.publico = 'Empreendedores';
    } else if (lowerMessage.includes('educador') || lowerMessage.includes('professor')) {
      analysis.publico = 'Educadores';
    }

    // Detectar tipo de conteúdo
    if (lowerMessage.includes('venda') || lowerMessage.includes('anúncio') || lowerMessage.includes('marketing')) {
      analysis.tipo = 'Anúncio/Publicidade';
    } else if (lowerMessage.includes('educativo') || lowerMessage.includes('ensinar') || lowerMessage.includes('dica')) {
      analysis.tipo = 'Educativo';
    } else if (lowerMessage.includes('instagram') || lowerMessage.includes('post') || lowerMessage.includes('story')) {
      analysis.tipo = 'Story/Reels';
    } else if (lowerMessage.includes('tutorial') || lowerMessage.includes('passo a passo')) {
      analysis.tipo = 'Tutorial';
    }

    // Detectar interesses
    if (lowerMessage.includes('bebê') || lowerMessage.includes('bebe') || lowerMessage.includes('criança')) {
      analysis.interesses.push('desenvolvimento infantil');
    }
    if (lowerMessage.includes('rotina') || lowerMessage.includes('organização')) {
      analysis.interesses.push('organização');
    }
    if (lowerMessage.includes('amamentação') || lowerMessage.includes('alimentação')) {
      analysis.interesses.push('alimentação');
    }
    if (lowerMessage.includes('negócio') || lowerMessage.includes('empreendedorismo')) {
      analysis.interesses.push('empreendedorismo');
    }

    return analysis;
  };

  // Atualizar contexto da conversa
  const updateConversationContext = (analysis: any) => {
    setConversationContext(prev => ({
      ...prev,
      ...analysis
    }));
  };

  // Gerar resposta contextualizada
  const generateContextualResponse = (userMessage: string, analysis: any, context: any) => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Respostas baseadas no contexto
    if (lowerMessage.includes('público') || lowerMessage.includes('publico') || lowerMessage.includes('quem')) {
      return {
        message: `Ótima pergunta! 🎯

Baseado no que você mencionou, aqui estão os públicos mais adequados:

**👶 Mães de primeira viagem**
• Foco: emoção, memórias, praticidade
• Conteúdo: dicas práticas, desenvolvimento infantil
• Tom: acolhedor e empático

**📱 Influenciadoras digitais**
• Foco: negócio, comissão, autoridade
• Conteúdo: oportunidades de parceria, white label
• Tom: profissional e motivacional

**🚀 Empreendedores**
• Foco: escala, lucro, inovação
• Conteúdo: estratégias de negócio, white label
• Tom: direto e orientado a resultados

**👨‍🏫 Educadores**
• Foco: educação, engajamento, inovação
• Conteúdo: metodologias, desenvolvimento infantil
• Tom: didático e inspirador

Qual público mais se identifica com seu objetivo?`,
        suggestions: [
          'Quero focar em mães de primeira viagem',
          'Meu público são influenciadoras',
          'Vou trabalhar com empreendedores',
          'Preciso de conteúdo para educadores'
        ]
      };
    }

    if (lowerMessage.includes('tema') || lowerMessage.includes('ideia') || lowerMessage.includes('conteúdo')) {
      const publico = analysis.publico || context.publico;
      const tipo = analysis.tipo || context.tipo;
      
      let temasSugeridos = [];
      
      if (publico === 'Mães de primeira viagem') {
        temasSugeridos = [
          'Como criar uma rotina de sono saudável para seu bebê',
          'Desenvolvimento infantil: marcos importantes do primeiro ano',
          'Amamentação: guia completo para mães de primeira viagem',
          'Introdução alimentar: transição do leite para sólidos',
          'Estimulação precoce: atividades para desenvolver seu bebê'
        ];
      } else if (publico === 'Influenciadoras digitais') {
        temasSugeridos = [
          'Transforme sua audiência em renda com o Baby Diary White Label',
          'Como criar conteúdo que realmente conecta com suas seguidoras',
          'Oportunidade única: produto que se vende sozinho no nicho materno',
          'White Label: tenha seu próprio app sem desenvolver do zero',
          'Comissões recorrentes: o segredo das influenciadoras de sucesso'
        ];
      } else if (publico === 'Empreendedores') {
        temasSugeridos = [
          'Construa seu império digital materno com o Baby Diary White Label',
          'Mercado de R$ 50 bilhões: oportunidade no nicho materno',
          'SaaS White Label: margem de até 90% e automação total',
          'De zero a herói: jornada de empreendedores no mercado de apps',
          'Escalabilidade infinita: produto pronto para multiplicar seus resultados'
        ];
      } else {
        temasSugeridos = [
          'Transforme sua paixão por bebês em um negócio lucrativo',
          'Como criar conteúdo que realmente conecta com o público',
          'Estratégias de marketing para o nicho materno',
          'Desenvolvimento de produtos digitais para mães',
          'Oportunidades de negócio no mercado infantil'
        ];
      }

      return {
        message: `Perfeito! 💡 Aqui estão temas incríveis para ${publico || 'seu público'}:

${temasSugeridos.map((tema, index) => `${index + 1}. ${tema}`).join('\n')}

**💡 Dica:** Escolha um tema que:
• Resolva um problema real do seu público
• Seja específico e acionável
• Tenha potencial viral
• Se conecte emocionalmente

Qual tema mais te interessa? Posso te ajudar a desenvolver o roteiro completo!`,
        suggestions: temasSugeridos.slice(0, 3)
      };
    }

    if (lowerMessage.includes('ajuda') || lowerMessage.includes('como') || lowerMessage.includes('dica')) {
      return {
        message: `Claro! Estou aqui para te ajudar! 🤝

**🎯 Para escolher o público ideal:**
• Pense em quem mais precisa do seu conteúdo
• Considere o poder aquisitivo do público
• Analise onde eles passam mais tempo online

**💡 Para encontrar temas que convertem:**
• Identifique as principais dores do público
• Use palavras-chave que eles pesquisam
• Foque em soluções práticas e acionáveis

**📱 Para criar conteúdo viral:**
• Comece com um hook forte (primeiros 3 segundos)
• Use storytelling emocional
• Termine com call-to-action claro
• Otimize para cada plataforma

**🎬 Para estruturar o vídeo:**
• Hook → Problema → Solução → Benefícios → CTA
• Mantenha o foco em uma mensagem principal
• Use transições suaves entre cenas

O que você gostaria de saber mais especificamente?`,
        suggestions: [
          'Como escolher o público-alvo?',
          'Quais temas mais convertem?',
          'Como estruturar um vídeo viral?',
          'Dicas para roteiro persuasivo'
        ]
      };
    }

    // Resposta padrão inteligente
    return {
      message: `Interessante! 🤔 

Vejo que você está interessado em ${analysis.tipo || 'criar conteúdo'} para ${analysis.publico || 'seu público'}.

**💭 Algumas perguntas para te ajudar:**

1. **Qual é o objetivo principal do seu vídeo?**
   • Educar e informar?
   • Vender um produto/serviço?
   • Construir autoridade?
   • Engajar nas redes sociais?

2. **Qual é a principal dor do seu público?**
   • Falta de tempo?
   • Dificuldade de organização?
   • Busca por informações confiáveis?
   • Necessidade de soluções práticas?

3. **Qual plataforma será o foco?**
   • Instagram/Reels?
   • YouTube?
   • Facebook?
   • TikTok?

Me conte mais sobre seu objetivo e posso te dar sugestões mais específicas! 🎯`,
      suggestions: [
        'Quero educar e informar',
        'Meu objetivo é vender',
        'Vou focar no Instagram',
        'Preciso de conteúdo para YouTube'
      ]
    };
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const quickSuggestions = [
    'Dê-me ideias para vídeos de marketing',
    'Como criar conteúdo viral?',
    'Sugestões para vídeos educacionais',
    'Ideias para storytelling',
    'Temas para redes sociais'
  ];

  // Sugestões específicas por categoria
  const categorySuggestions = {
    anuncios: [
      "Transforme sua paixão por bebês em um negócio lucrativo com o Baby Diary White Label",
      "Diga adeus ao trabalho árduo e olá à liberdade financeira com nosso SaaS White Label",
      "Construa seu próprio aplicativo de diário infantil em minutos, sem programadores",
      "Aumente sua receita em até 5x com o Baby Diary White Label",
      "De zero a herói: a jornada de empreendedores que alcançaram o sucesso"
    ],
    educativos: [
      "Como criar uma rotina de sono saudável para seu bebê: dicas práticas que funcionam",
      "Desenvolvimento infantil: marcos importantes do primeiro ano de vida",
      "Amamentação: guia completo para mães de primeira viagem",
      "Introdução alimentar: como fazer a transição do leite para sólidos",
      "Estimulação precoce: atividades simples para desenvolver seu bebê"
    ],
    posts: [
      "Momentos especiais: capturando cada sorriso do seu bebê",
      "Rotina da manhã: como organizar o dia com um bebê pequeno",
      "Dicas de organização: transformando o caos em harmonia",
      "Conexão mãe-bebê: fortalecendo o vínculo desde o início",
      "Autocuidado materno: como se cuidar enquanto cuida do bebê"
    ],
    vendas: [
      "Transforme sua paixão por bebês em um negócio lucrativo com o Baby Diary White Label",
      "Diga adeus ao trabalho árduo e olá à liberdade financeira com nosso SaaS White Label",
      "Construa seu próprio aplicativo de diário infantil em minutos, sem programadores",
      "Aumente sua receita em até 5x com o Baby Diary White Label",
      "De zero a herói: a jornada de empreendedores que alcançaram o sucesso"
    ]
  };

  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Sugestões de prompts específicos por categoria
  const promptSuggestions = {
    anuncios: [
      "Crie um anúncio persuasivo para o Baby Diary White Label",
      "Ideias para vídeos de marketing para influenciadoras",
      "Como vender o SaaS White Label para empreendedores",
      "Anúncios que convertem para o nicho materno",
      "Estratégias de vendas para afiliados do Baby Diary"
    ],
    educativos: [
      "Vídeos educativos sobre desenvolvimento infantil",
      "Dicas práticas para mães de primeira viagem",
      "Conteúdo educativo sobre amamentação",
      "Vídeos sobre rotina e organização com bebês",
      "Educação sobre cuidados com recém-nascidos"
    ],
    posts: [
      "Ideias para posts virais no Instagram",
      "Conteúdo para Stories e Reels",
      "Posts que engajam mães no Instagram",
      "Ideias para conteúdo diário no Instagram",
      "Posts que mostram a realidade da maternidade"
    ],
    vendas: [
      "Argumentos de venda para o Baby Diary",
      "Como apresentar o White Label para clientes",
      "Estratégias de vendas para o nicho materno",
      "Vídeos que convertem visitantes em clientes",
      "Técnicas de vendas para infoprodutos"
    ]
  };

  // Função para aplicar sugestão do chat ao formulário
  const handleChatSuggestionClick = (suggestion: string) => {
    onSuggestionClick(suggestion);
    showToast('Sugestão aplicada ao formulário!', 'success');
  };

  // Função para selecionar categoria
  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  // Função para limpar categoria selecionada
  const clearCategory = () => {
    setSelectedCategory('');
  };

  // Função para limpar contexto e reiniciar conversa
  const clearConversation = () => {
    setMessages([]);
    setConversationContext({});
    setSelectedCategory('');
  };

  return (
    <Card className="h-96 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Bot className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Assistente IA Inteligente
          </h3>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Contexto da conversa */}
          {Object.keys(conversationContext).length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">Contexto:</span>
              {conversationContext.publico && (
                <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-xs">
                  {conversationContext.publico}
                </span>
              )}
              {conversationContext.tipo && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-xs">
                  {conversationContext.tipo}
                </span>
              )}
            </div>
          )}
          
          {/* Botão para limpar conversa */}
          {messages.length > 1 && (
            <button
              onClick={clearConversation}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Limpar conversa"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {messages.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
          <Lightbulb className="w-12 h-12 text-indigo-300" />
          <div>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              Precisa de inspiração?
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Escolha uma categoria ou pergunte sobre ideias de vídeos
            </p>
          </div>
          
          {/* Categorias de Vídeo */}
          <div className="w-full space-y-4">
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                { label: '🎬 Anúncios', key: 'anuncios' },
                { label: '📚 Educativos', key: 'educativos' },
                { label: '📱 Posts Instagram', key: 'posts' },
                { label: '💰 Vendas', key: 'vendas' }
              ].map((category) => (
                <button
                  key={category.key}
                  onClick={() => handleCategorySelect(category.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedCategory === category.key
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900 dark:text-indigo-300 dark:hover:bg-indigo-800'
                  }`}
                >
                  {category.label}
                </button>
              ))}
              {selectedCategory && (
                <button
                  onClick={clearCategory}
                  className="px-3 py-2 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  ✕ Limpar
                </button>
              )}
            </div>

            {/* Sugestões da categoria selecionada */}
            {selectedCategory && categorySuggestions[selectedCategory as keyof typeof categorySuggestions] && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  💡 Sugestões de Temas:
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {categorySuggestions[selectedCategory as keyof typeof categorySuggestions].map((suggestion, index) => (
                    <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-800 dark:text-gray-200 mb-2">
                        {suggestion}
                      </p>
                      <button
                        onClick={() => handleChatSuggestionClick(suggestion)}
                        className="px-3 py-1 bg-indigo-600 text-white rounded-md text-xs hover:bg-indigo-700 transition-colors"
                      >
                        Aplicar tema
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sugestões rápidas gerais */}
            {!selectedCategory && (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 dark:text-gray-500">Sugestões rápidas:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {quickSuggestions.slice(0, 3).map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleChatSuggestionClick(suggestion)}
                      className="px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-full hover:bg-indigo-200 transition-colors duration-200 dark:bg-indigo-900 dark:text-indigo-300"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Prompts sugeridos quando categoria está selecionada */}
      {selectedCategory && promptSuggestions[selectedCategory as keyof typeof promptSuggestions] && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            💬 Prompts sugeridos para {selectedCategory === 'anuncios' ? 'Anúncios' : 
              selectedCategory === 'educativos' ? 'Educativos' : 
              selectedCategory === 'posts' ? 'Posts Instagram' : 'Vendas'}:
          </p>
          <div className="space-y-2">
            {promptSuggestions[selectedCategory as keyof typeof promptSuggestions].slice(0, 3).map((prompt, index) => (
              <button
                key={index}
                onClick={() => setInput(prompt)}
                className="block w-full text-left p-2 text-sm text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {messages.length > 0 && (
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100'
                }`}
              >
                <div className="flex items-center space-x-2 mb-1">
                  {message.type === 'user' ? (
                    <User className="w-4 h-4" />
                  ) : (
                    <Bot className="w-4 h-4" />
                  )}
                  <span className="text-xs opacity-75">
                    {message.type === 'user' ? 'Você' : 'IA'}
                  </span>
                </div>
                <p className="text-sm">{message.message}</p>
                
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      💡 Sugestões rápidas:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {message.suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleChatSuggestionClick(suggestion)}
                          className="px-3 py-1 bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 rounded-full text-xs hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors duration-200"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Bot className="w-4 h-4" />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      )}

      <div className="flex space-x-2">
        <Input
          placeholder="Converse comigo sobre seu público, tema ou objetivo do vídeo..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1"
        />
        <Button
          onClick={handleSendMessage}
          disabled={!input.trim() || loading}
          icon={Send}
          size="sm"
        >
          Enviar
        </Button>
      </div>
    </Card>
  );
};