import React, { useState, useEffect } from 'react';
import { Play, Pause, Settings, Image, Music, Video, FileText, Upload, Download, Eye, EyeOff, Sparkles, Users, Film, Clock, Palette, Volume2 } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { TextArea } from './ui/TextArea';
import { MusicLibrary } from './MusicLibrary';
import { UploadAppImage, ImagemComDescricao } from './UploadAppImage';
import { generateVideo, GenerateVideoRequest, generateScript } from '../services/api';
import { useToast } from './Toast';
import { ChatIA } from './ChatIA';

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

// Novo componente para revisão/edição do roteiro principal
function VideoScriptReview({ roteiro, onEdit, onApprove, onRefazer, loading, cenas }: {
  roteiro: string;
  onEdit: (novo: string) => void;
  onApprove: () => void;
  onRefazer: () => void;
  loading: boolean;
  cenas?: Array<{ narracao: string; visual: string[] }>;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(roteiro);
  const [showCenas, setShowCenas] = useState(false);

  useEffect(() => { setTexto(roteiro); }, [roteiro]);

  return (
    <div className="my-6 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800 shadow-md">
      <h3 className="font-bold text-lg mb-2 text-gray-800 dark:text-gray-100 flex items-center gap-2">
        <FileText className="w-5 h-5 text-blue-500" /> Roteiro principal para narração
      </h3>
      <p className="text-gray-600 dark:text-gray-300 mb-2 text-sm">
        Este é o texto que será gravado como áudio principal do vídeo. Revise, edite se quiser e só depois aprove para gerar o vídeo.
      </p>
      {editando ? (
        <TextArea
          value={texto}
          onChange={e => setTexto(e.target.value)}
          rows={8}
          className="w-full mb-2 text-base"
        />
      ) : (
        <div className="whitespace-pre-line bg-white dark:bg-gray-900 p-3 rounded border text-base mb-2 min-h-[120px]">
          {texto}
        </div>
      )}
      <div className="flex gap-2 mb-2">
        {editando ? (
          <Button onClick={() => { onEdit(texto); setEditando(false); }} size="sm" variant="primary">Salvar edição</Button>
        ) : (
          <Button onClick={() => setEditando(true)} size="sm" variant="outline">Editar roteiro</Button>
        )}
        <Button onClick={onRefazer} size="sm" variant="danger" disabled={loading}>Refazer roteiro</Button>
        <Button onClick={onApprove} size="sm" variant="primary" disabled={loading}>Aprovar roteiro</Button>
      </div>
      {cenas && cenas.length > 0 && (
        <div className="mt-4">
          <button
            className="text-blue-600 dark:text-blue-400 underline text-sm mb-2"
            onClick={() => setShowCenas(v => !v)}
          >
            {showCenas ? 'Ocultar cenas detalhadas' : 'Ver cenas detalhadas (narração e visuais)'}
          </button>
          {showCenas && (
            <div className="bg-gray-100 dark:bg-gray-900 border rounded p-3 mt-2 max-h-72 overflow-y-auto">
              {cenas.map((cena, idx) => (
                <div key={idx} className="mb-3">
                  <div className="font-semibold text-gray-700 dark:text-gray-200">Cena {idx + 1}</div>
                  <div className="text-blue-700 dark:text-blue-300 mb-1">Narração: <span className="font-normal">{cena.narracao}</span></div>
                  <ul className="list-disc ml-6 text-gray-600 dark:text-gray-300 text-sm">
                    {cena.visual && cena.visual.map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export const VideoForm: React.FC<VideoFormProps> = ({ onVideoGenerated }) => {
  const [formData, setFormData] = useState<GenerateVideoRequest>({
    tema: '',
    tipo: 'anuncio',
    publico: 'maes_primeira_viagem',
    cenas: 5,
    formato: 'portrait',
    voz_elevenlabs: 'alloy',
    duracao: 60, // Adicionado campo duracao na raiz
    configuracoes: {
      duracao: 60,
      qualidade: 'high',
      estilo: 'modern',
      volumeMusica: 0.3,
      fadeInMusica: 2,
      fadeOutMusica: 2,
      loopMusica: true
    },
    tom: 'intimo',
    titulo: '', // Novo campo para título
    gerarLegenda: false, // Novo campo para gerar legenda
    plataformaLegenda: 'instagram', // Novo campo para escolher plataforma
    imagensComDescricao: []
  });

  const [selectedMusic, setSelectedMusic] = useState<MusicTrack | null>(null);
  const [selectedImages, setSelectedImages] = useState<AppImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<'form' | 'music' | 'images'>('form');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [useStableDiffusion, setUseStableDiffusion] = useState(false);
  const [musicVolume, setMusicVolume] = useState(0.2); // Valor padrão 20%
  const [musicFadeIn, setMusicFadeIn] = useState(2);
  const [musicFadeOut, setMusicFadeOut] = useState(2);
  const [musicLoop, setMusicLoop] = useState(true);
  const [imagensComDescricao, setImagensComDescricao] = useState<Array<{
    url: string;
    descricao: string;
    categoria: 'funcionalidade' | 'painel_admin' | 'user_interface' | 'pagamento' | 'loja' | 'atividades' | 'diario' | 'outros';
  }>>([]);
  const [cta, setCta] = useState('');
  const { showToast } = useToast();

  // Adicione o estado para controlar o preview
  const audioPreviewRef = React.useRef<HTMLAudioElement>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);

  // Função para tocar/parar preview
  const handlePlayPreview = () => {
    if (!selectedMusic) return;
    if (!audioPreviewRef.current) return;
    if (isPlayingPreview) {
      audioPreviewRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      audioPreviewRef.current.currentTime = 0;
      audioPreviewRef.current.volume = musicVolume;
      audioPreviewRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  // Atualizar volume do preview ao mudar o slider
  useEffect(() => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.volume = musicVolume;
    }
  }, [musicVolume]);

  // Parar preview ao trocar de música
  useEffect(() => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current.currentTime = 0;
      setIsPlayingPreview(false);
    }
  }, [selectedMusic]);

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

  // Dentro do VideoForm, adicionar estados para roteiro e controle de revisão
  const [roteiro, setRoteiro] = useState('');
  const [roteiroAprovado, setRoteiroAprovado] = useState(false);
  const [gerandoRoteiro, setGerandoRoteiro] = useState(false);
  const [roteiroCenas, setRoteiroCenas] = useState<Array<{ narracao: string; visual: string[] }>>([]);

  // Função para gerar roteiro (chama backend ou IA)
  const handleGerarRoteiro = async () => {
    setGerandoRoteiro(true);
    try {
      const payload = { ...formData, imagensComDescricao };
      const resposta = await generateScript(payload);
      // Se resposta for objeto com roteiro e cenas
      if (resposta && typeof resposta === 'object' && 'roteiro' in resposta) {
        setRoteiro(String(resposta.roteiro));
        setRoteiroCenas((resposta && typeof resposta === 'object' && 'cenas' in resposta && Array.isArray((resposta as any).cenas)) ? (resposta as any).cenas : []);
      } else if (typeof resposta === 'string') {
        setRoteiro(resposta);
        setRoteiroCenas([]);
      } else {
        setRoteiro('');
        setRoteiroCenas([]);
      }
      setRoteiroAprovado(false);
    } catch (err) {
      showToast('Erro ao gerar roteiro', 'error');
    } finally {
      setGerandoRoteiro(false);
    }
  };

  // Função para aprovar roteiro
  const handleAprovarRoteiro = () => {
    setRoteiroAprovado(true);
  };
  // Função para editar roteiro
  const handleEditarRoteiro = (novo: string) => {
    setRoteiro(novo);
  };
  // Função para refazer roteiro
  const handleRefazerRoteiro = () => {
    handleGerarRoteiro();
  };

  // Adicione estados para controlar o modo de revisão
  const [modoRevisao, setModoRevisao] = useState(false);

  // Função para gerar roteiro para revisão
  const handleGerarRoteiroApenas = async () => {
    setLoading(true);
    try {
      const publicoMapeado = publicoMap[formData.publico as keyof typeof publicoMap] || formData.publico;
      const payload = {
        tema: formData.tema,
        tipo: tipoMap[formData.tipo as keyof typeof tipoMap] || formData.tipo,
        publico: publicoMapeado,
        tom: formData.tom,
        formato: formData.formato,
        cenas: numCenas,
        voz_elevenlabs: getDefaultVoice(formData.tipo),
        musica: selectedMusic?.url,
        duracao: formData.configuracoes?.duracao || formData.duracao || 60,
        configuracoes: {
          ...formData.configuracoes,
          volumeMusica: musicVolume,
          fadeInMusica: musicFadeIn,
          fadeOutMusica: musicFadeOut,
          loopMusica: musicLoop
        },
        imagensApp: selectedImages.map(img => img.url),
        imagensComDescricao: imagensComDescricao.map(img => ({
          url: img.url,
          descricao: img.descricao,
          categoria: img.categoria
        })),
        useStableDiffusion,
        titulo: formData.titulo,
        gerarLegenda: formData.gerarLegenda,
        plataformaLegenda: formData.plataformaLegenda,
        cta,
        soGerarRoteiro: true
      };
      const resposta = await generateVideo(payload); // Chama /generate-video com flag
      // Se resposta for objeto com roteiro e cenas
      if (resposta && typeof resposta === 'object' && 'roteiro' in resposta) {
        setRoteiro(String(resposta.roteiro));
        setRoteiroCenas((resposta && typeof resposta === 'object' && 'cenas' in resposta && Array.isArray((resposta as any).cenas)) ? (resposta as any).cenas : []);
      } else if (typeof resposta === 'string') {
        setRoteiro(resposta);
        setRoteiroCenas([]);
      } else {
        setRoteiro('');
        setRoteiroCenas([]);
      }
      setRoteiroAprovado(false);
      setModoRevisao(true);
      showToast('Roteiro gerado! Revise, edite e aprove antes de gerar o vídeo.', 'info');
    } catch (err) {
      showToast('Erro ao gerar roteiro', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Função para gerar vídeo completo direto
  const handleGerarVideoCompleto = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.tema.trim()) {
      showToast('Por favor, insira um tema para o vídeo', 'warning');
      return;
    }
    if (numCenas < 1 || numCenas > 10) {
      showToast('Número de cenas deve estar entre 1 e 10', 'warning');
      return;
    }
    setLoading(true);
    try {
      const publicoMapeado = publicoMap[formData.publico as keyof typeof publicoMap] || formData.publico;
      
      // Log detalhado da música selecionada
      console.log('🎵 Música selecionada:', selectedMusic);
      console.log('🎵 URL da música:', selectedMusic?.url);
      console.log('🎵 Configurações de música:', {
        volume: musicVolume,
        fadeIn: musicFadeIn,
        fadeOut: musicFadeOut,
        loop: musicLoop
      });
      
      const payload = {
        tema: formData.tema,
        tipo: tipoMap[formData.tipo as keyof typeof tipoMap] || formData.tipo,
        publico: publicoMapeado,
        tom: formData.tom,
        formato: formData.formato,
        cenas: numCenas,
        voz_elevenlabs: getDefaultVoice(formData.tipo),
        musica: selectedMusic?.url,
        duracao: formData.configuracoes?.duracao || formData.duracao || 60,
        configuracoes: {
          ...formData.configuracoes,
          volumeMusica: musicVolume,
          fadeInMusica: musicFadeIn,
          fadeOutMusica: musicFadeOut,
          loopMusica: musicLoop
        },
        imagensApp: selectedImages.map(img => img.url),
        imagensComDescricao: imagensComDescricao.map(img => ({
          url: img.url,
          descricao: img.descricao,
          categoria: img.categoria
        })),
        useStableDiffusion,
        titulo: formData.titulo,
        gerarLegenda: formData.gerarLegenda,
        plataformaLegenda: formData.plataformaLegenda,
        cta
      };
      
      console.log('📦 Payload completo enviado:', payload);
      
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
        voz_elevenlabs: 'alloy',
        duracao: 30,
        configuracoes: {
          duracao: 30,
          qualidade: 'alta',
          estilo: 'moderno'
        },
        tom: 'intimo',
        titulo: '',
        gerarLegenda: false,
        plataformaLegenda: 'instagram'
      });
      setSelectedMusic(null);
      setSelectedImages([]);
      setImagensComDescricao([]);
      setCta('');
      setRoteiro('');
      setRoteiroAprovado(false);
      setGerandoRoteiro(false);
      setRoteiroCenas([]);
      setModoRevisao(false);
    } catch (error) {
      showToast('Erro ao gerar vídeo', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Função para aprovar roteiro e gerar vídeo após revisão
  const handleAprovarEEnviarVideo = async () => {
    setLoading(true);
    try {
      const publicoMapeado = publicoMap[formData.publico as keyof typeof publicoMap] || formData.publico;
      
      // Log detalhado da música selecionada
      console.log('🎵 Música selecionada:', selectedMusic);
      console.log('🎵 URL da música:', selectedMusic?.url);
      console.log('🎵 Configurações de música:', {
        volume: musicVolume,
        fadeIn: musicFadeIn,
        fadeOut: musicFadeOut,
        loop: musicLoop
      });
      
      const payload = {
        tema: formData.tema,
        tipo: tipoMap[formData.tipo as keyof typeof tipoMap] || formData.tipo,
        publico: publicoMapeado,
        tom: formData.tom,
        formato: formData.formato,
        roteiro,
        cenas: roteiroCenas.length > 0 ? roteiroCenas : numCenas,
        voz_elevenlabs: getDefaultVoice(formData.tipo),
        musica: selectedMusic?.url,
        duracao: formData.configuracoes?.duracao || formData.duracao || 60,
        configuracoes: {
          ...formData.configuracoes,
          volumeMusica: musicVolume,
          fadeInMusica: musicFadeIn,
          fadeOutMusica: musicFadeOut,
          loopMusica: musicLoop
        },
        imagensApp: selectedImages.map(img => img.url),
        imagensComDescricao: imagensComDescricao.map(img => ({
          url: img.url,
          descricao: img.descricao,
          categoria: img.categoria
        })),
        useStableDiffusion,
        titulo: formData.titulo,
        gerarLegenda: formData.gerarLegenda,
        plataformaLegenda: formData.plataformaLegenda,
        cta
      };
      
      console.log('📦 Payload completo enviado:', payload);
      
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
        voz_elevenlabs: 'alloy',
        duracao: 30,
        configuracoes: {
          duracao: 30,
          qualidade: 'alta',
          estilo: 'moderno'
        },
        tom: 'intimo',
        titulo: '',
        gerarLegenda: false,
        plataformaLegenda: 'instagram'
      });
      setSelectedMusic(null);
      setSelectedImages([]);
      setImagensComDescricao([]);
      setCta('');
      setRoteiro('');
      setRoteiroAprovado(false);
      setGerandoRoteiro(false);
      setRoteiroCenas([]);
      setModoRevisao(false);
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

  // Função para receber sugestão do chat e preencher o tema
  const handleThemeSuggestionFromChat = (suggestion: string) => {
    setFormData(prev => ({
      ...prev,
      tema: suggestion
    }));
    showToast('Tema aplicado do chat!', 'success');
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
    { id: 'images', label: '🖼️ Imagens', icon: Image }
  ];

  // Função para aplicar tema selecionado (já definida acima)

  // Adicionar opções populares de CTA
  const ctaOptions = [
    'Saiba mais na bio',
    'Arraste para cima',
    'Clique para baixar',
    'Conheça na bio',
    'Solicite uma demonstração',
    'Baixe agora',
    'Acesse o link na descrição',
    'Descubra mais, link na bio!',
    'Transforme seu negócio, saiba mais!',
  ];

  // 1. Definir numCenas para uso em todo o componente
  const numCenas = typeof formData.cenas === 'number' ? formData.cenas : (Array.isArray(formData.cenas) ? formData.cenas.length : 0);

  return (
    <div className="flex flex-col md:flex-row gap-8">
      <div className="flex-1">
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
            <form className="space-y-8" onSubmit={e => e.preventDefault()}>
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
                <div className="flex flex-wrap gap-2 mt-2">
                  {[
                    { label: '📢 Anúncios', key: 'anuncios' },
                    { label: '📚 Educativos', key: 'educativos' },
                    { label: '📱 Posts Instagram', key: 'posts' },
                    { label: '💰 Vendas', key: 'vendas' }
                  ].map((category) => (
                    <button
                      key={category.key}
                      type="button"
                      onClick={() => handleCategoryClick(category.key)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors bg-indigo-100 text-indigo-700 hover:bg-indigo-200 focus:bg-indigo-300 focus:outline-none`}
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
                  <div className="space-y-2 mt-3">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      💡 Sugestões de Temas:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {filteredSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs hover:bg-indigo-200 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {/* Chat IA abaixo das sugestões */}
                <div className="mt-6">
                  <ChatIA onThemeSuggestion={handleThemeSuggestionFromChat} />
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

              {/* Campo de CTA customizável */}
              <div>
                <label className="flex items-center space-x-2 text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  <span className="text-2xl">📢</span>
                  <span>Call-to-Action (CTA) do Vídeo</span>
                </label>
                <select
                  className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 mb-2"
                  value={cta}
                  onChange={e => setCta(e.target.value)}
                >
                  <option value="">Selecione um CTA ou digite abaixo...</option>
                  {ctaOptions.map((option, idx) => (
                    <option key={idx} value={option}>{option}</option>
                  ))}
                </select>
                <input
                  type="text"
                  className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600"
                  placeholder="Ou digite seu próprio CTA..."
                  value={cta}
                  onChange={e => setCta(e.target.value)}
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  O CTA será integrado ao final do roteiro e da narração principal do vídeo. Exemplo: "Saiba mais na bio", "Arraste para cima", "Clique para baixar", etc.
                </p>
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
                    value={numCenas}
                    onChange={(e) => handleInputChange('cenas', parseInt(e.target.value))}
                    className="text-lg text-center"
                  />
                  <p className="text-sm text-gray-500 mt-2 text-center">
                    {numCenas} cena{numCenas > 1 ? 's' : ''} • ~{numCenas > 0 ? Math.round((formData.configuracoes?.duracao || 30) / numCenas) : 0}s por cena
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
                    {formData.configuracoes?.duracao}s • {numCenas} cenas
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {formatoOptions.find(f => f.value === formData.formato)?.label}
                  </p>
                </div>
              </div>

              {/* Generate Button */}
              {roteiro && (
                <VideoScriptReview
                  roteiro={roteiro}
                  onEdit={handleEditarRoteiro}
                  onApprove={handleAprovarRoteiro}
                  onRefazer={handleRefazerRoteiro}
                  loading={gerandoRoteiro}
                  cenas={roteiroCenas}
                />
              )}
              {!modoRevisao && (
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    loading={loading}
                    disabled={loading || !formData.tema.trim()}
                    onClick={handleGerarVideoCompleto}
                    icon={loading ? undefined : Play}
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
                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    loading={loading}
                    disabled={loading || !formData.tema.trim()}
                    onClick={handleGerarRoteiroApenas}
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
                        Gerar Roteiro
                      </span>
                    )}
                  </Button>
                </div>
              )}
              {modoRevisao && (
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  loading={loading}
                  disabled={loading || !formData.tema.trim()}
                  onClick={handleAprovarEEnviarVideo}
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
                      Aprovar e Gerar Vídeo
                    </span>
                  )}
                </Button>
              )}
              {loading && <div className="flex items-center gap-2 mt-4"><span className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></span> Gerando vídeo, aguarde...</div>}
            </form>
          </Card>
        )}

        {activeTab === 'music' && (
          <div className="space-y-6">
            <MusicLibrary 
              onMusicSelect={handleMusicSelect}
              selectedMusicId={selectedMusic?.id}
            />
            
            {selectedMusic && (
              <Card gradient hover>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-blue-600 rounded-xl">
                    <Volume2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      🎛️ Configurações de Música
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Ajuste o volume da trilha sonora
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-gray-500">0%</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={musicVolume}
                    onChange={e => setMusicVolume(Number(e.target.value))}
                    className="w-full accent-purple-500"
                  />
                  <span className="text-xs text-gray-500">100%</span>
                  <span className="ml-2 text-sm font-semibold text-purple-700 dark:text-purple-300">
                    {(musicVolume * 100).toFixed(0)}%
                  </span>
                </div>
                {/* Preview da música selecionada */}
                <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl border border-green-200 dark:border-green-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-green-800 dark:text-green-200">
                        🎵 {selectedMusic.name}
                      </h4>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        {selectedMusic.artist} • {selectedMusic.genre}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        Volume: {Math.round(musicVolume * 100)}% • Fade: {musicFadeIn}s in, {musicFadeOut}s out • Loop: {musicLoop ? 'Sim' : 'Não'}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedMusic(null)}
                      className="px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 rounded-md text-sm hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
                    >
                      Remover
                    </button>
                  </div>
                  {/* Player de preview */}
                  <div className="flex items-center mt-4 space-x-3">
                    <button
                      onClick={handlePlayPreview}
                      className="p-2 rounded-full bg-purple-100 hover:bg-purple-200 dark:bg-purple-800 dark:hover:bg-purple-700 text-purple-700 dark:text-purple-200"
                    >
                      {isPlayingPreview ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>
                    <audio
                      ref={audioPreviewRef}
                      src={selectedMusic.url}
                      onEnded={() => setIsPlayingPreview(false)}
                      style={{ display: 'none' }}
                    />
                    <span className="text-xs text-gray-500">Preview</span>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Aba de Imagens */}
        {activeTab === 'images' && (
          <div className="space-y-6">
            <UploadAppImage 
              imagens={imagensComDescricao.map((img, idx) => ({
                id: (img as any).id || `temp-${idx}`,
                ...img
              }))}
              onImagensChange={setImagensComDescricao}
            />

            {/* Resumo das Imagens Selecionadas */}
            {(imagensComDescricao.length > 0) && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
                  📋 Resumo das Imagens
                </h4>
                <div className="space-y-2">
                  {imagensComDescricao.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Imagens com Descrição: {imagensComDescricao.length}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {imagensComDescricao.map((img, index) => (
                          <div key={index} className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                            <img src={img.url} alt="Sem descrição" className="w-4 h-4 object-cover rounded" />
                            <span>{img.descricao || 'Sem descrição'}</span>
                            <span className="text-gray-500">({img.categoria})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {/* Remover o bloco do ChatIA do final do layout */}
    </div>
  );
};