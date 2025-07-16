import React, { useState, useRef, useEffect } from 'react';
import { Music, Play, Pause, Volume2, Upload, Search, Filter, Heart, Download } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';

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

interface MusicLibraryProps {
  onMusicSelect: (music: MusicTrack) => void;
  selectedMusicId?: string;
}

export const MusicLibrary: React.FC<MusicLibraryProps> = ({ onMusicSelect, selectedMusicId }) => {
  const [tracks, setTracks] = useState<MusicTrack[]>([
    {
      id: '1',
      name: 'Energetic Startup',
      artist: 'AI Music',
      duration: 120,
      genre: 'Electronic',
      mood: 'Energético',
      url: '#',
      waveform: Array.from({ length: 50 }, () => Math.random() * 100),
      liked: false,
      category: 'upbeat'
    },
    {
      id: '2',
      name: 'Calm Meditation',
      artist: 'Zen Sounds',
      duration: 180,
      genre: 'Ambient',
      mood: 'Relaxante',
      url: '#',
      waveform: Array.from({ length: 50 }, () => Math.random() * 60),
      liked: true,
      category: 'calm'
    },
    {
      id: '3',
      name: 'Corporate Success',
      artist: 'Business Beats',
      duration: 90,
      genre: 'Corporate',
      mood: 'Profissional',
      url: '#',
      waveform: Array.from({ length: 50 }, () => Math.random() * 80),
      liked: false,
      category: 'corporate'
    },
    {
      id: '4',
      name: 'Epic Adventure',
      artist: 'Cinematic Pro',
      duration: 150,
      genre: 'Orchestral',
      mood: 'Épico',
      url: '#',
      waveform: Array.from({ length: 50 }, () => Math.random() * 120),
      liked: true,
      category: 'cinematic'
    }
  ]);

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const audioRef = useRef<HTMLAudioElement>(null);

  const categories = [
    { value: 'all', label: '🎵 Todas as Categorias' },
    { value: 'upbeat', label: '⚡ Energética' },
    { value: 'calm', label: '🧘 Relaxante' },
    { value: 'dramatic', label: '🎭 Dramática' },
    { value: 'corporate', label: '💼 Corporativa' },
    { value: 'cinematic', label: '🎬 Cinematográfica' }
  ];

  const genres = [
    { value: 'all', label: '🎼 Todos os Gêneros' },
    { value: 'Electronic', label: '🎛️ Eletrônica' },
    { value: 'Ambient', label: '🌊 Ambiente' },
    { value: 'Corporate', label: '🏢 Corporativa' },
    { value: 'Orchestral', label: '🎻 Orquestral' }
  ];

  const filteredTracks = tracks.filter(track => {
    const matchesSearch = track.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         track.artist.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || track.category === selectedCategory;
    const matchesGenre = selectedGenre === 'all' || track.genre === selectedGenre;
    
    return matchesSearch && matchesCategory && matchesGenre;
  });

  const togglePlay = (trackId: string) => {
    if (playingId === trackId) {
      setPlayingId(null);
    } else {
      setPlayingId(trackId);
    }
  };

  const toggleLike = (trackId: string) => {
    setTracks(prev => prev.map(track => 
      track.id === trackId ? { ...track, liked: !track.liked } : track
    ));
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getCategoryEmoji = (category: string) => {
    const emojis = {
      upbeat: '⚡',
      calm: '🧘',
      dramatic: '🎭',
      corporate: '💼',
      cinematic: '🎬'
    };
    return emojis[category as keyof typeof emojis] || '🎵';
  };

  return (
    <Card gradient hover>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl">
            <Music className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              🎵 Biblioteca Musical
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Escolha a trilha sonora perfeita para seu vídeo
            </p>
          </div>
        </div>
        
        <Button icon={Upload} variant="outline" size="sm">
          📤 Upload
        </Button>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="🔍 Buscar música..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          options={categories}
        />
        
        <Select
          value={selectedGenre}
          onChange={(e) => setSelectedGenre(e.target.value)}
          options={genres}
        />
      </div>

      {/* Lista de Músicas */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredTracks.map((track) => (
          <div
            key={track.id}
            className={`p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
              selectedMusicId === track.id
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-lg'
                : 'border-gray-200 dark:border-gray-600 hover:border-purple-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
            onClick={() => onMusicSelect(track)}
          >
            <div className="flex items-center space-x-4">
              {/* Play Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay(track.id);
                }}
                className="p-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white hover:from-purple-600 hover:to-pink-600 transition-all duration-200 transform hover:scale-110"
              >
                {playingId === track.id ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
              </button>

              {/* Waveform Visualization */}
              <div className="flex items-end space-x-1 flex-1 h-12">
                {track.waveform.slice(0, 30).map((height, index) => (
                  <div
                    key={index}
                    className={`w-1 bg-gradient-to-t transition-all duration-300 ${
                      playingId === track.id
                        ? 'from-purple-400 to-purple-600 animate-pulse'
                        : 'from-gray-300 to-gray-500 dark:from-gray-600 dark:to-gray-400'
                    }`}
                    style={{ height: `${Math.max(height * 0.4, 8)}px` }}
                  />
                ))}
              </div>

              {/* Track Info */}
              <div className="text-right">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-lg">{getCategoryEmoji(track.category)}</span>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {track.name}
                  </h4>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {track.artist} • {track.genre}
                </p>
                <div className="flex items-center space-x-3 mt-2">
                  <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 px-2 py-1 rounded-full">
                    {track.mood}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDuration(track.duration)}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col space-y-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(track.id);
                  }}
                  className={`p-2 rounded-lg transition-colors ${
                    track.liked
                      ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                      : 'text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${track.liked ? 'fill-current' : ''}`} />
                </button>
                
                <button
                  onClick={(e) => e.stopPropagation()}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTracks.length === 0 && (
        <div className="text-center py-8">
          <Music className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            Nenhuma música encontrada
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Tente ajustar os filtros ou fazer upload de novas músicas
          </p>
        </div>
      )}

      <audio ref={audioRef} />
    </Card>
  );
};