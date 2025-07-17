import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Lightbulb, Music, Image, Sparkles, X } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { sendChatMessage } from '../services/api';

interface Message {
  id: string;
  text: string;
  type: 'user' | 'bot';
  suggestions?: string[];
  category?: string;
}

interface ChatIAProps {
  onMusicSuggestion?: (category: string) => void;
  onImageSuggestion?: (category: string) => void;
  onThemeSuggestion?: (theme: string) => void;
}

const CATEGORIAS = {
  temas: [
    'Sugira um tema para vídeo de maternidade',
    'Quero ideias para vender um produto',
    'Me dê dicas para engajar no Instagram',
    'Como criar um roteiro emocional?',
    'Tema para vídeo educativo sobre bebês',
    'Ideia para anúncio do Baby Diary',
  ],
  musica: [
    'Música energética para vídeo motivacional',
    'Música emocional para conteúdo tocante',
    'Música corporativa para anúncio profissional',
    'Música ambiente para vídeo relaxante',
  ],
  imagens: [
    'Imagens de mães e bebês',
    'Imagens de desenvolvimento infantil',
    'Imagens de produtos para bebês',
    'Imagens de ambiente familiar',
  ],
  roteiros: [
    'Como estruturar um vídeo de 60 segundos',
    'Roteiro para vídeo educativo',
    'Script para anúncio de vendas',
    'Estrutura para vídeo emocional',
  ],
};

const RESPOSTAS_INTELIGENTES = {
  maternidade: [
    '💝 Tema Sugerido: "A Jornada da Amamentação"\n\nRoteiro:\n• Abertura emocional (5s)\n• Desafios reais (15s)\n• Dicas práticas (25s)\n• Momento de superação (10s)\n• Call-to-action (5s)\n\nTom: Acolhedor e empático\nMúsica: Emocional/suave\nPúblico: Mães de primeira viagem',
    '👶 Tema Sugerido: "Desenvolvimento do Bebê - Primeiros Passos"\n\nRoteiro:\n• Introdução do marco (5s)\n• Explicação científica (20s)\n• Dicas de estimulação (20s)\n• Celebração da conquista (10s)\n• Convite para mais conteúdo (5s)\n\nTom: Educativo e inspirador\nMúsica: Energética/motivacional\nPúblico: Mães interessadas em desenvolvimento'
  ],
  vendas: [
    '💰 Tema Sugerido: "Como Organizar a Rotina do Bebê"\n\nRoteiro:\n• Problema comum (10s)\n• Apresentação da solução (15s)\n• Benefícios do produto (20s)\n• Depoimento/testimonial (10s)\n• Oferta especial (5s)\n\nTom: Profissional e confiável\nMúsica: Corporativa/profissional\nPúblico: Mães organizadas',
    '🚀 Tema Sugerido: "Transforme seu Conhecimento em Negócio"\n\nRoteiro:\n• História de sucesso (15s)\n• Processo simplificado (20s)\n• Resultados possíveis (15s)\n• Próximos passos (10s)\n\nTom: Motivacional e direto\nMúsica: Energética/inspiradora\nPúblico: Empreendedoras'
  ],
  engajamento: [
    '📱 Tema Sugerido: "Momentos Reais da Maternidade"\n\nRoteiro:\n• Cena autêntica (10s)\n• Reflexão honesta (15s)\n• Conexão emocional (20s)\n• Pergunta para engajamento (10s)\n• Convite para comentar (5s)\n\nTom: Autêntico e vulnerável\nMúsica: Emocional/intimista\nPúblico: Comunidade de mães',
    '💬 Tema Sugerido: "Pergunta do Dia"\n\nRoteiro:\n• Pergunta provocativa (5s)\n• Contexto pessoal (15s)\n• Reflexão compartilhada (25s)\n• Convite para interação (10s)\n• Agradecimento (5s)\n\nTom: Conversacional e próximo\nMúsica: Ambiente/neutra\nPúblico: Seguidores engajados'
  ]
};

export const ChatIA: React.FC<ChatIAProps> = ({ onThemeSuggestion }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const analisarMensagem = (texto: string) => {
    const lower = texto.toLowerCase();
    if (lower.includes('mãe') || lower.includes('bebê') || lower.includes('maternidade')) {
      return 'maternidade';
    }
    if (lower.includes('vender') || lower.includes('produto') || lower.includes('negócio')) {
      return 'vendas';
    }
    if (lower.includes('engajar') || lower.includes('instagram') || lower.includes('seguidores')) {
      return 'engajamento';
    }
    return 'geral';
  };

  const gerarResposta = (categoria: string) => {
    const respostas = RESPOSTAS_INTELIGENTES[categoria as keyof typeof RESPOSTAS_INTELIGENTES];
    if (respostas) {
      return respostas[Math.floor(Math.random() * respostas.length)];
    }
    return 'Ótima pergunta! Vou te ajudar a criar conteúdo incrível. Que tipo de vídeo você tem em mente?';
  };

  const enviarMensagem = async () => {
    if (!input.trim()) return;
    const userMsg: Message = {
      id: Date.now() + '-user',
      text: input,
      type: 'user',
    };
    setMessages((msgs) => [...msgs, userMsg]);
    setInput('');
    setLoading(true);
    try {
      // Chamada real para a API
      const respostaApi = await sendChatMessage(userMsg.text);
      const botMsg: Message = {
        id: Date.now() + '-bot',
        text: respostaApi.message,
        type: 'bot',
        suggestions: respostaApi.suggestions || ['Quero mais ideias de temas', 'Sugira uma música para este vídeo', 'Que tipo de imagem usar?', 'Como estruturar o roteiro?'],
      };
      setMessages((msgs) => [...msgs, botMsg]);
    } catch (err) {
      setMessages((msgs) => [...msgs, {
        id: Date.now() + '-bot-erro',
        text: '❌ Erro ao conectar com a IA. Tente novamente mais tarde.',
        type: 'bot',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestion = (s: string) => {
    setInput(s);
    // Se a sugestão for de tema, chama o callback
    if (onThemeSuggestion && (s.toLowerCase().includes('tema') || s.toLowerCase().includes('roteiro') || s.toLowerCase().includes('ideia'))) {
      onThemeSuggestion(s);
    }
  };

  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
  };

  const limparConversa = () => {
    setMessages([]);
    setSelectedCategory('');
  };

  return (
    <Card className="h-96 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Bot className="w-6 h-6 text-indigo-600 mr-2" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Assistente IA Criativo</h3>
        </div>
        {messages.length > 0 && (
          <button
            onClick={limparConversa}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Limpar conversa"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Categorias de Sugestões */}
      {messages.length === 0 && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Escolha uma categoria ou digite sua pergunta:</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(CATEGORIAS).map(([key, sugestoes]) => (
              <div key={key} className="space-y-2">
                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                  {key === 'temas' && '🎯 Temas'}
                  {key === 'musica' && '🎵 Música'}
                  {key === 'imagens' && '🖼️ Imagens'}
                  {key === 'roteiros' && '📝 Roteiros'}
                </h4>
                <div className="space-y-1">
                  {sugestoes.slice(0, 2).map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestion(s)}
                      className="w-full text-left px-3 py-1 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Área de Mensagens */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-2">
        {messages.length === 0 && !selectedCategory && (
          <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 dark:text-gray-400">
            <Sparkles className="w-12 h-12 mb-3 text-indigo-400" />
            <p className="text-sm">Peça sugestões de temas, roteiros ou estratégias para seus vídeos!</p>
          </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-sm text-sm whitespace-pre-line ${
                msg.type === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              }`}
            >
              <div className="flex items-center mb-2">
                {msg.type === 'user' ? <User className="w-4 h-4 mr-1" /> : <Bot className="w-4 h-4 mr-1" />}
                <span className="text-xs opacity-70">{msg.type === 'user' ? 'Você' : 'IA'}</span>
                {msg.category && (
                  <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs">
                    {msg.category}
                  </span>
                )}
              </div>
              {msg.text}
              {msg.suggestions && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {msg.suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestion(s)}
                      className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs hover:bg-indigo-200 transition-colors flex items-center"
                    >
                      {s.includes('música') && <Music className="w-3 h-3 mr-1" />}
                      {s.includes('imagem') && <Image className="w-3 h-3 mr-1" />}
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 px-4 py-2 rounded-lg flex items-center">
              <Bot className="w-4 h-4 mr-2" />
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de Mensagem */}
      <form
        className="flex space-x-2 mt-2"
        onSubmit={e => {
          e.preventDefault();
          enviarMensagem();
        }}
      >
        <Input
          placeholder="Digite sua pergunta ou escolha uma sugestão..."
          value={input}
          onChange={e => setInput(e.target.value)}
          className="flex-1"
          disabled={loading}
        />
        <Button
          type="submit"
          icon={Send}
          size="sm"
          disabled={!input.trim() || loading}
        >
          Enviar
        </Button>
      </form>
    </Card>
  );
};
