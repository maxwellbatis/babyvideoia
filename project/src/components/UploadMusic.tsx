import React, { useState, useEffect } from 'react';
import { Upload, Music, Trash2, Play, Pause, Volume2 } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { uploadMusic, getMusic, deleteMusic, Music as MusicType } from '../services/api';
import { useToast } from './Toast';

interface UploadMusicProps {
  onMusicSelect: (music: MusicType) => void;
  selectedMusicId?: string;
}

export const UploadMusic: React.FC<UploadMusicProps> = ({ onMusicSelect, selectedMusicId }) => {
  const [music, setMusic] = useState<MusicType[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadMusic();
  }, []);

  const loadMusic = async () => {
    try {
      const data = await getMusic();
      setMusic(data);
    } catch (error) {
      showToast('Erro ao carregar músicas', 'error');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      showToast('Por favor, selecione apenas arquivos de áudio', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      showToast('Arquivo muito grande. Limite de 10MB', 'error');
      return;
    }

    setLoading(true);
    try {
      const uploadedMusic = await uploadMusic(file);
      setMusic(prev => [...prev, uploadedMusic]);
      showToast('Música enviada com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao enviar música', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta música?')) return;

    try {
      await deleteMusic(id);
      setMusic(prev => prev.filter(m => m.id !== id));
      showToast('Música excluída com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao excluir música', 'error');
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const togglePlay = (id: string) => {
    if (playingId === id) {
      setPlayingId(null);
    } else {
      setPlayingId(id);
    }
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Music className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Músicas de Fundo
          </h3>
        </div>
        
        <label className="relative">
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={loading}
          />
          <Button
            icon={Upload}
            size="sm"
            loading={loading}
            disabled={loading}
          >
            Adicionar Música
          </Button>
        </label>
      </div>

      {music.length === 0 ? (
        <div className="text-center py-8">
          <Volume2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            Nenhuma música enviada ainda
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Adicione músicas para usar como fundo nos seus vídeos
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {music.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors duration-200 ${
                selectedMusicId === item.id
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => togglePlay(item.id)}
                  className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 transition-colors"
                >
                  {playingId === item.id ? (
                    <Pause className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <Play className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  )}
                </button>
                
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">
                    {item.name}
                  </h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                    <span>{formatDuration(item.duration)}</span>
                    <span>{formatFileSize(item.size)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  variant={selectedMusicId === item.id ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => onMusicSelect(item)}
                >
                  {selectedMusicId === item.id ? 'Selecionada' : 'Selecionar'}
                </Button>
                
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};