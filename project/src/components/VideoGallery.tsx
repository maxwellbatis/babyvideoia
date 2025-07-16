import React, { useState, useEffect } from 'react';
import { Play, Download, Trash2, Eye, Hash, Calendar, Clock, Film } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { getVideos, deleteVideo, Video } from '../services/api';
import { useToast } from './Toast';

export const VideoGallery: React.FC = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      const data = await getVideos();
      setVideos(data);
    } catch (error) {
      showToast('Erro ao carregar vídeos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este vídeo?')) return;

    try {
      await deleteVideo(id);
      setVideos(prev => prev.filter(v => v.id !== id));
      showToast('Vídeo excluído com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao excluir vídeo', 'error');
    }
  };

  const handleDownload = (video: Video) => {
    const link = document.createElement('a');
    link.href = video.url;
    link.download = `${video.titulo}.mp4`;
    link.click();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'processing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluído';
      case 'processing':
        return 'Processando';
      case 'failed':
        return 'Falhou';
      default:
        return 'Desconhecido';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center space-x-2 mb-6">
          <Film className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Galeria de Vídeos
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 dark:bg-gray-700 rounded-lg h-48 mb-4"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center space-x-2 mb-6">
        <Film className="w-6 h-6 text-indigo-600" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Galeria de Vídeos
        </h2>
        <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 px-2 py-1 rounded-full text-sm">
          {videos.length}
        </span>
      </div>

      {videos.length === 0 ? (
        <div className="text-center py-12">
          <Film className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            Nenhum vídeo gerado ainda
          </p>
          <p className="text-gray-400 dark:text-gray-500 mt-2">
            Crie seu primeiro vídeo usando o formulário acima
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {videos.map((video) => (
            <div
              key={video.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow duration-200"
            >
              <div className="relative">
                <img
                  src={video.thumbnail}
                  alt={video.titulo}
                  className="w-full h-48 object-cover"
                />
                
                <div className="absolute top-2 right-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(video.status)}`}>
                    {getStatusText(video.status)}
                  </span>
                </div>
                
                <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-opacity duration-200 flex items-center justify-center">
                  <button
                    onClick={() => setSelectedVideo(video)}
                    className="opacity-0 hover:opacity-100 transition-opacity duration-200 p-3 bg-white rounded-full shadow-lg hover:bg-gray-100"
                  >
                    <Play className="w-6 h-6 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {video.titulo}
                </h3>
                
                {/* Legenda de Redes Sociais */}
                {video.legendaRedesSociais && (
                  <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-200">📱 Legenda para Redes Sociais</span>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 line-clamp-3">
                      {video.legendaRedesSociais}
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(video.legendaRedesSociais || '');
                        showToast('Legenda copiada para a área de transferência!', 'success');
                      }}
                      className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline"
                    >
                      Copiar legenda
                    </button>
                  </div>
                )}
                
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <Calendar className="w-4 h-4 mr-1" />
                  {formatDate(video.created_at)}
                </div>

                {video.hashtags && video.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-4">
                    {video.hashtags.slice(0, 3).map((hashtag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2 py-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 rounded-full text-xs"
                      >
                        <Hash className="w-3 h-3 mr-1" />
                        {hashtag}
                      </span>
                    ))}
                    {video.hashtags.length > 3 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        +{video.hashtags.length - 3} mais
                      </span>
                    )}
                  </div>
                )}

                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Eye}
                    onClick={() => setSelectedVideo(video)}
                    className="flex-1"
                  >
                    Assistir
                  </Button>
                  
                  {video.status === 'completed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      icon={Download}
                      onClick={() => handleDownload(video)}
                    >
                      Baixar
                    </Button>
                  )}
                  
                  <button
                    onClick={() => handleDelete(video.id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="max-w-4xl max-h-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedVideo.titulo}
                </h3>
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-4">
              <video
                src={selectedVideo.url}
                controls
                className="w-full max-h-96 rounded-lg"
                poster={selectedVideo.thumbnail}
              >
                Seu navegador não suporta vídeos HTML5.
              </video>
              
              {/* Título e Legenda no Modal */}
              <div className="mt-4 space-y-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    📝 Título do Vídeo
                  </h4>
                  <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                    {selectedVideo.titulo}
                  </p>
                </div>
                
                {selectedVideo.legendaRedesSociais && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      📱 Legenda para Redes Sociais
                    </h4>
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-700">
                      <p className="text-gray-700 dark:text-gray-300 mb-3">
                        {selectedVideo.legendaRedesSociais}
                      </p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedVideo.legendaRedesSociais || '');
                          showToast('Legenda copiada para a área de transferência!', 'success');
                        }}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline"
                      >
                        📋 Copiar legenda completa
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Criado em: {formatDate(selectedVideo.created_at)}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedVideo.status)}`}>
                    {getStatusText(selectedVideo.status)}
                  </span>
                </div>
                
                {selectedVideo.status === 'completed' && (
                  <Button
                    size="sm"
                    icon={Download}
                    onClick={() => handleDownload(selectedVideo)}
                  >
                    Baixar Vídeo
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};