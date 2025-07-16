import React, { useState } from 'react';
import { Video, Play, Settings, Sparkles, Clock, Users, Film, Palette } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { TextArea } from './ui/TextArea';
import { generateVideo, GenerateVideoRequest } from '../services/api';
import { useToast } from './Toast';
import { MusicLibrary } from './MusicLibrary';
import { ImageGalleryWithCategories } from './ImageGalleryWithCategories';

interface VideoFormProps {
  onVideoGenerated: (video: any) => void;
}

interface MusicTrack {
  id: string;
  name: string;
  artist: string;
  duration: number;
  genre: string;
  mood: string;
  url: string;
  waveform: number[];
  liked: boolean;
  category: 'upbeat' | 'calm' | 'dramatic' | 'corporate' | 'cinematic';
}

interface AppImage {
  id: string;
  name: string;
  url: string;
  category: string;
  tags: string[];
  liked: boolean;
  size: string;
}

export const VideoForm: React.FC<VideoFormProps> = ({ onVideoGenerated }) => {
  const [formData, setFormData] = useState<GenerateVideoRequest>({
    tema: '',
    tipo: 'anuncio',
    publico: 'maes_primeira_viagem',
    cenas: 5,
    formato: 'portrait',
    voz_elevenlabs: 'alloy',
    configuracoes: {
      duracao: 30,
      qualidade: 'alta',
      estilo: 'moderno'
    },
    tom: 'intimo',
    titulo: '', // Novo campo para título
    gerarLegenda: false, // Novo campo para gerar legenda
    plataformaLegenda: 'instagram' // Novo campo para escolher plataforma
  });

  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null);
  const [selectedImages, setSelectedImages] = useState<AppImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'music' | 'images'>('form');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [useStableDiffusion, setUseStableDiffusion] = useState(false);
  const { showToast } = useToast();

  const tipoMap: Record<string, string> = {
    anuncio: 'Anúncio/Publicidade',
    dica: 'Dica Rápida',
    educativo: 'Educativo',
    story: 'Story/Reels',
    tutorial: 'Tutorial',
    inspiracional: 'Inspiracional',
  };
  const publicoMap: Record<string, string> = {
    maes_primeira_viagem: 'Mães de primeira viagem',
    gestantes: 'Gestantes',
    maes_experientes: 'Mães experientes',
    pais_geral: 'Pais em geral',
    familiares: 'Familiares',
    influenciadoras_digitais: 'Influenciadoras digitais',
    afiliados_parceiros: 'Afiliados e parceiros',
    criadores_infoprodutos: 'Criadores de infoprodutos',
    empreendedores: 'Empreendedores',
    agencias_marketing: 'Agências de marketing',
    consultores_coaches: 'Consultores e coaches',
    revendedores: 'Revendedores',
    startups: 'Startups',
    profissionais_liberais: 'Profissionais liberais',
    educadores: 'Educadores',
  };
  const tomMap: Record<string, string> = {
    intimo: 'Íntimo',
    educativo: 'Educativo',
    profissional: 'Profissional',
    emocional: 'Emocional',
    alegre: 'Alegre',
    neutro: 'Neutro',
  };

  // Sugestões de temas por categoria
  const themeSuggestions = {
    anuncios: [
      "Transforme sua paixão por bebês em um negócio lucrativo com o Baby Diary White Label: o guia completo para afiliados.",
      "Diga adeus ao trabalho árduo e olá à liberdade financeira: como escalar seu negócio de infoprodutos com nosso SaaS White Label.",
      "Construa seu próprio aplicativo de diário infantil em minutos, sem precisar de programadores: descubra o poder do Baby Diary White Label.",
      "Aumente sua receita em até 5x com o Baby Diary White Label: o segredo para agências de marketing que buscam inovação.",
      "De zero a herói: a jornada de empreendedores que alcançaram o sucesso com o aplicativo Baby Diary White Label."
    ],
    educativos: [
      "Como criar uma rotina de sono saudável para seu bebê: dicas práticas que funcionam.",
      "Desenvolvimento infantil: marcos importantes do primeiro ano de vida.",
      "Amamentação: guia completo para mães de primeira viagem.",
      "Introdução alimentar: como fazer a transição do leite para sólidos.",
      "Estimulação precoce: atividades simples para desenvolver seu bebê."
    ],
    posts: [
      "Momentos especiais: capturando cada sorriso do seu bebê.",
      "Rotina da manhã: como organizar o dia com um bebê pequeno.",
      "Dicas de organização: transformando o caos em harmonia.",
      "Conexão mãe-bebê: fortalecendo o vínculo desde o início.",
      "Autocuidado materno: como se cuidar enquanto cuida do bebê."
    ],
    vendas: [
      "Transforme sua paixão por bebês em um negócio lucrativo com o Baby Diary White Label: o guia completo para afiliados.",
      "Diga adeus ao trabalho árduo e olá à liberdade financeira: como escalar seu negócio de infoprodutos com nosso SaaS White Label.",
      "Construa seu próprio aplicativo de diário infantil em minutos, sem precisar de programadores: descubra o poder do Baby Diary White Label.",
      "Aumente sua receita em até 5x com o Baby Diary White Label: o segredo para agências de marketing que buscam inovação.",
      "De zero a herói: a jornada de empreendedores que alcançaram o sucesso com o aplicativo Baby Diary White Label."
    ]
  };

  // Função para filtrar sugestões por categoria
  const handleCategoryClick = (category: string) => {
    setSelectedCategory(category);
    const categoryKey = category.toLowerCase().replace(/\s+/g, '') as keyof typeof themeSuggestions;
    setFilteredSuggestions(themeSuggestions[categoryKey] || []);
  };

  // Função para aplicar tema selecionado
  const handleSuggestionClick = (suggestion: string) => {
    setFormData(prev => ({
      ...prev,
      tema: suggestion
    }));
    showToast('Tema aplicado com sucesso!', 'success');
  };

  // Função para limpar categoria selecionada
  const clearCategory = () => {
    setSelectedCategory('');
    setFilteredSuggestions([]);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleConfigChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      configuracoes: {
        ...prev.configuracoes,
        [field]: value
      }
    }));
  };

  // 1. Voz feminina padrão para tipos de vídeo anúncio, story, reels, etc.
  const getDefaultVoice = (tipo: string) => {
    if (["anuncio", "publicidade", "story", "reels", "inspiracional"].includes(tipo.toLowerCase())) {
      return "carol"; // ID da voz feminina ElevenLabs
    }
    return "alloy"; // Ou outra voz padrão
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tema.trim()) {
      showToast('Por favor, insira um tema para o vídeo', 'warning');
      return;
    }

    if (formData.cenas < 1 || formData.cenas > 10) {
      showToast('Número de cenas deve estar entre 1 e 10', 'warning');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        tema: formData.tema,
        tipo: tipoMap[formData.tipo as keyof typeof tipoMap] || formData.tipo,
        publico: publicoMap[formData.publico as keyof typeof publicoMap] || formData.publico,
        tom: tomMap[formData.tom as keyof typeof tomMap] || formData.tom,
        formato: formData.formato,
        configuracoes: formData.configuracoes,
        musica: selectedMusic?.id,
        voz_elevenlabs: getDefaultVoice(formData.tipo),
        cenas: formData.cenas,
        imagensApp: selectedImages.map(img => img.id),
        useStableDiffusion: useStableDiffusion,
        titulo: formData.titulo, // Novo campo
        gerarLegenda: formData.gerarLegenda, // Novo campo
        plataformaLegenda: formData.plataformaLegenda // Novo campo
      };

      const video = await generateVideo(payload);
      onVideoGenerated(video);
      showToast('Vídeo gerado com sucesso!', 'success');
      
      // Reset form
      setFormData({
        tema: '',
        tipo: 'anuncio',
        publico: 'maes_primeira_viagem',
        cenas: 5,
        formato: 'portrait',
        configuracoes: {
          duracao: 30,
          qualidade: 'alta',
          estilo: 'moderno'
        },
        tom: 'intimo',
        voz_elevenlabs: 'alloy',
        titulo: '', // Reset do novo campo
        gerarLegenda: false, // Reset do novo campo
        plataformaLegenda: 'instagram' // Reset do novo campo
      });
      setSelectedMusic(null);
      setSelectedImages([]);
      
    } catch (error) {
      showToast('Erro ao gerar vídeo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMusicSelect = (music: MusicTrack) => {
    setSelectedMusic(music);
    showToast(`🎵 Música "${music.name}" selecionada`, 'info');
  };

  const handleImageSelect = (image: AppImage) => {
    setSelectedImages(prev => {
      const exists = prev.find(img => img.id === image.id);
      if (exists) {
        return prev.filter(img => img.id !== image.id);
      } else {
        return [...prev, image];
      }
    });
  };

  // Opções baseadas nas imagens fornecidas
  const publicoOptions = [
    { value: 'maes_primeira_viagem', label: '👶 Mães de primeira viagem' },
    { value: 'gestantes', label: '🤰 Gestantes' },
    { value: 'maes_experientes', label: '👩‍👧‍👦 Mães experientes' },
    { value: 'pais_geral', label: '👨‍👩‍👧‍👦 Pais em geral' },
    { value: 'familiares', label: '👪 Familiares' },
    { value: 'influenciadoras_digitais', label: '📱 Influenciadoras digitais' },
    { value: 'afiliados_parceiros', label: '🤝 Afiliados e parceiros' },
    { value: 'criadores_infoprodutos', label: '📚 Criadores de infoprodutos' },
    { value: 'empreendedores', label: '🚀 Empreendedores' },
    { value: 'agencias_marketing', label: '🏢 Agências de marketing' },
    { value: 'consultores_coaches', label: '💼 Consultores e coaches' },
    { value: 'revendedores', label: '🛍️ Revendedores' },
    { value: 'startups', label: '⚡ Startups' },
    { value: 'profissionais_liberais', label: '⚖️ Profissionais liberais' },
    { value: 'educadores', label: '👨‍🏫 Educadores' }
  ];

  // 2. Tipos de vídeo conforme segunda imagem
  const tipoOptions = [
    { value: 'anuncio', label: '📢 Anúncio/Publicidade (30-60s)' },
    { value: 'dica', label: '💡 Dica Rápida (15-30s)' },
    { value: 'educativo', label: '📚 Educativo (60-90s)' },
    { value: 'story', label: '📱 Story/Reels (15-30s)' },
    { value: 'tutorial', label: '📝 Tutorial (45-90s)' },
    { value: 'inspiracional', label: '✨ Inspiracional (30-60s)' },
  ];

  const duracaoOptions = [
    { value: '15', label: '⚡ 15 segundos (muito rápido)' },
    { value: '30', label: '🎯 30 segundos (anúncio padrão)' },
    { value: '45', label: '📖 45 segundos (médio)' },
    { value: '60', label: '⏱️ 60 segundos (1 minuto)' },
    { value: '90', label: '📚 90 segundos (1.5 minutos)' },
    { value: '120', label: '🎬 120 segundos (2 minutos)' }
  ];

  const formatoOptions = [
    { value: 'landscape', label: '🖥️ Landscape (16:9) - Para TV/Desktop' },
    { value: 'portrait', label: '📱 Portrait (9:16) - Para Stories/Reels' },
    { value: 'square', label: '⬜ Square (1:1) - Para Posts Instagram' }
  ];

  const vozOptions = [
    { value: 'alloy', label: '👩 Alloy - Voz feminina suave' },
    { value: 'echo', label: '👨 Echo - Voz masculina calma' },
    { value: 'fable', label: '👩 Fable - Voz feminina carinhosa' },
    { value: 'onyx', label: '👨 Onyx - Voz masculina profunda' },
    { value: 'nova', label: '👩 Nova - Voz feminina jovem' },
    { value: 'shimmer', label: '👩 Shimmer - Voz feminina doce' }
  ];

  const tomOptions = [
    { value: 'intimo', label: 'Íntimo' },
    { value: 'educativo', label: 'Educativo' },
    { value: 'profissional', label: 'Profissional' },
    { value: 'emocional', label: 'Emocional' },
    { value: 'alegre', label: 'Alegre' },
    { value: 'neutro', label: 'Neutro' }
  ];

  const tabs = [
    { id: 'form', label: '📝 Configuração', icon: Settings },
    { id: 'music', label: '🎵 Música', icon: Play },
    { id: 'images', label: '🖼️ Imagens', icon: Film }
  ];

  // Função para aplicar tema selecionado (já definida acima)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <div className="p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl mr-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            ✨ Criar Vídeo Mágico
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Configure todos os detalhes do seu vídeo perfeito usando nossa IA avançada
        </p>
      </div>

      {/* Tabs */}
      <Card gradient>
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-xl">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Tab Content */}
      {activeTab === 'form' && (
        <Card gradient hover>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Tema */}
            <div>
              <label className="flex items-center space-x-2 text-lg font-semibold text-gray-900 dark:text-white mb-4">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <span>💭 Tema do Vídeo</span>
              </label>
              <TextArea
                placeholder="Peça sugestões de temas para vídeos..."
                value={formData.tema}
                onChange={(e) => handleInputChange('tema', e.target.value)}
                rows={3}
                className="text-lg"
              />
              <div className="space-y-4">
                {/* Botões de categoria */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '📢 Anúncios', key: 'anuncios' },
                    { label: '📚 Educativos', key: 'educativos' },
                    { label: '📱 Posts Instagram', key: 'posts' },
                    { label: '💰 Vendas', key: 'vendas' }
                  ].map((category) => (
                  <button
                      key={category.key}
                    type="button"
                      onClick={() => handleCategoryClick(category.label)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedCategory === category.label
                          ? 'bg-indigo-600 text-white'
                          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800'
                      }`}
                  >
                      {category.label}
                  </button>
                ))}
                  {selectedCategory && (
                    <button
                      type="button"
                      onClick={clearCategory}
                      className="px-3 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-full text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      ✕ Limpar
                    </button>
                  )}
                </div>

                {/* Sugestões filtradas */}
                {filteredSuggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      💡 Sugestões de Temas:
                    </p>
                    <div className="space-y-2">
                      {filteredSuggestions.map((suggestion, index) => (
                        <div key={index} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-800 dark:text-gray-200 mb-2">
                            {suggestion}
                          </p>
                          <button
                            type="button"
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="px-3 py-1 bg-indigo-600 text-white rounded-md text-xs hover:bg-indigo-700 transition-colors"
                          >
                            Aplicar tema
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Título do Vídeo */}
            <div>
              <label className="flex items-center space-x-2 text-lg font-semibold text-gray-900 dark:text-white mb-4">
                <span className="text-2xl">📝</span>
                <span>Título do Vídeo</span>
              </label>
              <Input
                placeholder="Digite um título atrativo para o vídeo ou deixe em branco para gerar automaticamente..."
                value={formData.titulo}
                onChange={(e) => handleInputChange('titulo', e.target.value)}
                className="text-lg"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                O título será usado no vídeo e nas legendas de redes sociais
              </p>
            </div>

            {/* Legendas de Redes Sociais */}
            <div>
              <label className="flex items-center space-x-2 text-lg font-semibold text-gray-900 dark:text-white mb-4">
                <span className="text-2xl">📱</span>
                <span>Legendas para Redes Sociais</span>
              </label>
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="gerarLegenda"
                    checked={formData.gerarLegenda}
                    onChange={(e) => handleInputChange('gerarLegenda', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor="gerarLegenda" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Gerar legenda otimizada para redes sociais
                  </label>
                </div>
                
                {formData.gerarLegenda && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Plataforma principal:
                    </label>
                    <Select
                      value={formData.plataformaLegenda}
                      onChange={(e) => handleInputChange('plataformaLegenda', e.target.value)}
                      options={[
                        { value: 'instagram', label: '📸 Instagram' },
                        { value: 'facebook', label: '📘 Facebook' },
                        { value: 'tiktok', label: '🎵 TikTok' },
                        { value: 'youtube', label: '📺 YouTube' }
                      ]}
                      className="text-base"
                    />
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      A legenda será otimizada para {formData.plataformaLegenda === 'instagram' ? 'Instagram' : 
                        formData.plataformaLegenda === 'facebook' ? 'Facebook' : 
                        formData.plataformaLegenda === 'tiktok' ? 'TikTok' : 'YouTube'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Público-alvo */}
            <div>
              <label className="flex items-center space-x-2 text-lg font-semibold text-gray-900 dark:text-white mb-4">
                <Users className="w-5 h-5 text-purple-600" />
                <span>👥 Público-Alvo</span>
              </label>
              <Select
                value={formData.publico}
                onChange={(e) => handleInputChange('publico', e.target.value)}
                options={publicoOptions}
                className="text-lg"
              />
            </div>

            {/* Tipo de Vídeo */}
            <div>
              <label className="flex items-center space-x-2 text-lg font-semibold text-gray-900 dark:text-white mb-4">
                <Film className="w-5 h-5 text-green-600" />
                <span>🎬 Tipo de Vídeo</span>
              </label>
              <Select
                value={formData.tipo}
                onChange={(e) => handleInputChange('tipo', e.target.value)}
                options={tipoOptions}
                className="text-lg"
              />
            </div>

            {/* Duração */}
            <div>
              <label className="flex items-center space-x-2 text-lg font-semibold text-gray-900 dark:text-white mb-4">
                <Clock className="w-5 h-5 text-blue-600" />
                <span>⏱️ Duração Total do Vídeo</span>
              </label>
              <Select
                value={formData.configuracoes?.duracao}
                onChange={(e) => handleConfigChange('duracao', parseInt(e.target.value))}
                options={duracaoOptions}
                className="text-lg"
              />
            </div>

            {/* Voz ElevenLabs */}
            <div>
              <label className="flex items-center space-x-2 text-lg font-semibold text-gray-900 dark:text-white mb-4">
                <span className="text-2xl">🎙️</span>
                <span>Voz para Narração</span>
              </label>
              <Select
                value={formData.voz_elevenlabs}
                onChange={(e) => handleInputChange('voz_elevenlabs', e.target.value)}
                options={vozOptions}
                className="text-lg"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Escolha a voz que melhor combina com o seu conteúdo
              </p>
            </div>

            {/* Tom da Narração */}
            <div>
              <label className="flex items-center space-x-2 text-lg font-semibold text-gray-900 dark:text-white mb-4">
                <span className="text-2xl">🎙️</span>
                <span>Tom da Narração</span>
              </label>
              <Select
                value={formData.tom}
                onChange={(e) => handleInputChange('tom', e.target.value)}
                options={tomOptions}
                className="text-lg"
              />
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Escolha o tom da narração para ajustar a emoção do vídeo
              </p>
            </div>

            {/* Controle de Geração de Imagens */}
            <div>
              <label className="flex items-center space-x-2 text-lg font-semibold text-gray-900 dark:text-white mb-4">
                <Palette className="w-5 h-5 text-orange-600" />
                <span>🎨 Geração de Imagens</span>
              </label>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="useStableDiffusion"
                    checked={useStableDiffusion}
                    onChange={(e) => setUseStableDiffusion(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 dark:focus:ring-indigo-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label htmlFor="useStableDiffusion" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Usar Stable Diffusion (mais lento, mas melhor qualidade)
                  </label>
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
                  <p>• <strong>Desmarcado:</strong> Freepik → Banco → Placeholder (rápido)</p>
                  <p>• <strong>Marcado:</strong> Freepik → SD → Banco → Placeholder (lento)</p>
                  <p>• <strong>Prioridade:</strong> Freepik sempre primeiro, banco como backup</p>
                </div>
              </div>
            </div>

            {/* Configurações Adicionais */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center space-x-2 text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  <span>🎬 Número de Cenas</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.cenas}
                  onChange={(e) => handleInputChange('cenas', parseInt(e.target.value))}
                  className="text-lg text-center"
                />
                <p className="text-sm text-gray-500 mt-2 text-center">
                  {formData.cenas} cena{formData.cenas > 1 ? 's' : ''} • ~{Math.round((formData.configuracoes?.duracao || 30) / formData.cenas)}s por cena
                </p>
              </div>

              <div>
                <label className="flex items-center space-x-2 text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  <Palette className="w-5 h-5 text-pink-600" />
                  <span>📐 Aspecto do Vídeo</span>
                </label>
                <Select
                  value={formData.formato}
                  onChange={(e) => handleInputChange('formato', e.target.value)}
                  options={formatoOptions}
                  className="text-lg"
                />
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {selectedMusic && (
                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-2xl">🎵</span>
                    <span className="font-semibold text-purple-800 dark:text-purple-200">Música Selecionada</span>
                  </div>
                  <p className="text-sm text-purple-700 dark:text-purple-300">{selectedMusic.name}</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400">{selectedMusic.artist}</p>
                </div>
              )}

              {selectedImages.length > 0 && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-2xl">🖼️</span>
                    <span className="font-semibold text-blue-800 dark:text-blue-200">Imagens Selecionadas</span>
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {selectedImages.length} imagem{selectedImages.length > 1 ? 's' : ''}
                  </p>
                </div>
              )}

              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-700">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl">⚙️</span>
                  <span className="font-semibold text-green-800 dark:text-green-200">Configuração</span>
                </div>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {formData.configuracoes?.duracao}s • {formData.cenas} cenas
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {formatoOptions.find(f => f.value === formData.formato)?.label}
                </p>
              </div>
            </div>

            {/* Generate Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              disabled={loading || !formData.tema.trim()}
              icon={loading ? undefined : Sparkles}
              className="w-full text-xl py-4"
            >
              {loading ? (
                <span className="flex items-center">
                  <span className="animate-spin mr-2">⚡</span>
                  Gerando seu vídeo mágico...
                </span>
              ) : (
                <span className="flex items-center">
                  <span className="mr-2">✨</span>
                  Gerar Vídeo Completo
                </span>
              )}
            </Button>
            {loading && <div className="flex items-center gap-2 mt-4"><span className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></span> Gerando vídeo, aguarde...</div>}
          </form>
        </Card>
      )}

      {activeTab === 'music' && (
        <MusicLibrary 
          onMusicSelect={handleMusicSelect}
          selectedMusicId={selectedMusic?.id}
        />
      )}

      {activeTab === 'images' && (
        <ImageGalleryWithCategories 
          onImageSelect={handleImageSelect}
          selectedImageIds={selectedImages.map(img => img.id)}
        />
      )}
    </div>
  );
};