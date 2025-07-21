import React, { useState } from 'react';
import { Moon, Sun, Video, Sparkles, Settings, Zap, Target, Copy } from 'lucide-react';
import { VideoForm } from './components/VideoForm';
import { VideoGallery } from './components/VideoGallery';
import { ChatIA } from './components/ChatIA';
import { ApiStatus } from './components/ApiStatus';
import { ApiSettings } from './components/ApiSettings';
import { FreepikAlerts } from './components/FreepikAlerts';
import { Toast, useToast } from './components/Toast';
import { getVideos } from './services/api';

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [refreshGallery, setRefreshGallery] = useState(0);
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [ctaStats, setCtaStats] = useState<{
    totalVideos: number;
    videosWithCTA: number;
    topCTAs: Array<{ cta: string; count: number }>;
  }>({ totalVideos: 0, videosWithCTA: 0, topCTAs: [] });
  const { toast, showToast, hideToast } = useToast();

  // Função para carregar estatísticas de CTA
  const loadCTAStats = async () => {
    try {
      const videos = await getVideos();
      const ctaCounts: Record<string, number> = {};
      const videosWithCTA = videos.filter(v => v.cta);
      
      videosWithCTA.forEach(video => {
        const cta = video.cta || '';
        ctaCounts[cta] = (ctaCounts[cta] || 0) + 1;
      });
      
      setCtaStats({
        totalVideos: videos.length,
        videosWithCTA: videosWithCTA.length,
        topCTAs: Object.entries(ctaCounts)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 3)
          .map(([cta, count]) => ({ cta, count }))
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas de CTA:', error);
    }
  };

  // Carregar estatísticas quando a galeria for atualizada
  React.useEffect(() => {
    loadCTAStats();
  }, [refreshGallery]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleVideoGenerated = (video: any) => {
    setRefreshGallery(prev => prev + 1);
    showToast('Vídeo gerado com sucesso!', 'success');
  };

  const handleSuggestionClick = (suggestion: string) => {
    showToast(`Sugestão aplicada: ${suggestion}`, 'info');
  };

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 ${darkMode ? 'dark' : ''}`}>
      {/* Header */}
      <header className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 shadow-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl">
                  <Video className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                    🍼 Baby Diary
                  </h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Seu diário digital para acompanhar o bebê ✨
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-full text-sm font-medium animate-pulse">
                  🚀 Beta
                </span>
                <span className="px-3 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full text-sm font-medium">
                  ⚡ Novo
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-4">
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">2,500+</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Vídeos Criados</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">98%</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Satisfação</p>
                </div>
              </div>
              
              <button
                onClick={() => setShowApiSettings(!showApiSettings)}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 transform hover:scale-105"
              >
                <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 transform hover:scale-105"
              >
                {darkMode ? (
                  <Sun className="w-5 h-5 text-yellow-500" />
                ) : (
                  <Moon className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* API Settings Modal */}
      {showApiSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="relative">
              <ApiSettings />
              <button
                onClick={() => setShowApiSettings(false)}
                className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="flex space-x-2 text-4xl">
              <span className="animate-bounce">👶</span>
              <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>💕</span>
              <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>🎬</span>
            </div>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold mb-4">
            Registre <span className="text-yellow-300">Memórias</span> Preciosas
          </h2>
          <p className="text-xl md:text-2xl text-pink-100 max-w-3xl mx-auto mb-8">
            Crie vídeos emocionantes sobre o desenvolvimento do seu bebê. 
            Nunca perca um momento especial! 👶💖
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-lg">
            <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <Zap className="w-5 h-5 text-yellow-300" />
              <span>IA Personalizada</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <Video className="w-5 h-5 text-blue-300" />
              <span>Vídeos Emocionantes</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <Sparkles className="w-5 h-5 text-pink-300" />
              <span>Memórias Eternas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content Area */}
          <div className="lg:col-span-3 space-y-8">
            {/* Video Form */}
            <VideoForm onVideoGenerated={handleVideoGenerated} />

            {/* Video Gallery */}
            <VideoGallery key={refreshGallery} />
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* API Status */}
            <ApiStatus />

            {/* Alertas Freepik */}
            <FreepikAlerts />

            {/* Resumo de CTAs Populares */}
            {ctaStats.topCTAs.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                      🎯 CTAs Populares
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {ctaStats.videosWithCTA} de {ctaStats.totalVideos} vídeos
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {ctaStats.topCTAs.map((item, index) => (
                    <div
                      key={index}
                      className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'} {item.count}x
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(item.cta);
                            showToast('CTA copiado!', 'success');
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        "{item.cta}"
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat IA */}
            <ChatIA />
          </div>
        </div>
      </main>

      {/* Features Section */}
      <div className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              💖 Funcionalidades que as Mães Amam
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Tudo que você precisa para documentar a jornada do seu bebê
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-6xl mb-4">📸</div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Memórias Eternas</h4>
              <p className="text-gray-600 dark:text-gray-400">Capture cada momento especial - do primeiro sorriso ao primeiro passo</p>
            </div>
            
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-6xl mb-4">🧠</div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">IA Personalizada</h4>
              <p className="text-gray-600 dark:text-gray-400">Receba dicas inteligentes e sugestões baseadas no desenvolvimento do seu bebê</p>
            </div>
            
            <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
              <div className="text-6xl mb-4">👨‍👩‍👧‍👦</div>
              <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Família Conectada</h4>
              <p className="text-gray-600 dark:text-gray-400">Compartilhe momentos especiais com toda a família em tempo real</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gradient-to-r from-pink-500 to-purple-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-white mb-4">
              📊 Impacto Real na Vida das Famílias
            </h3>
            <p className="text-pink-100">
              Veja como estamos ajudando milhares de famílias
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">2,500+</div>
              <div className="text-pink-100">👶 Bebês Registrados</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">98%</div>
              <div className="text-pink-100">💕 Mães Satisfeitas</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">50k+</div>
              <div className="text-pink-100">📸 Memórias Salvas</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-white mb-2">24/7</div>
              <div className="text-pink-100">🤖 IA Disponível</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gradient-to-r from-gray-900 to-black text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-gradient-to-r from-pink-500 to-purple-600 rounded-xl">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold">🍼 Baby Diary</h3>
              </div>
              <p className="text-gray-400 mb-4">
                O app definitivo para mães que querem documentar cada momento especial do desenvolvimento dos seus bebês. 
                Registre atividades, memórias e marcos importantes em um só lugar! 💖
              </p>
              <div className="flex space-x-4">
                <span className="text-2xl">👶</span>
                <span className="text-2xl">💕</span>
                <span className="text-2xl">🎬</span>
                <span className="text-2xl">✨</span>
              </div>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">👶 Para Mães</h4>
              <ul className="space-y-2 text-gray-400">
                <li>📱 Diário Digital</li>
                <li>📸 Álbum de Memórias</li>
                <li>📊 Acompanhamento</li>
                <li>🤖 IA Personalizada</li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-lg font-semibold mb-4">🚀 Tecnologias</h4>
              <ul className="space-y-2 text-gray-400">
                <li>🧠 Gemini AI</li>
                <li>⚡ Groq</li>
                <li>🎙️ ElevenLabs</li>
                <li>☁️ Cloudinary</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400">
              © 2024 Baby Diary. Criado com ❤️ para mães que querem preservar cada momento especial.
            </p>
            <p className="text-gray-500 text-sm mt-2">
              ✨ Powered by AI • 👶 Made for moms • 💖 Built with love
            </p>
          </div>
        </div>
      </footer>

      {/* Toast Notifications */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
}