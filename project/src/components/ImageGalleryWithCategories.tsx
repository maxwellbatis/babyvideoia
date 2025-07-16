import React, { useState, useRef } from 'react';
import { Image, Search, Grid, List, Heart, Download, Eye, Filter } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface AppImage {
  id: string;
  name: string;
  url: string;
  category: string;
  tags: string[];
  liked: boolean;
  size: string;
}

interface ImageGalleryWithCategoriesProps {
  onImageSelect: (image: AppImage) => void;
  selectedImageIds?: string[];
}

export const ImageGalleryWithCategories: React.FC<ImageGalleryWithCategoriesProps> = ({ 
  onImageSelect, 
  selectedImageIds = [] 
}) => {
  const [images, setImages] = useState<AppImage[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [newCategory, setNewCategory] = useState('ambiental');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { id: 'todas', name: '📱 Todas', emoji: '📱', count: images.length },
    { id: 'mockups', name: '📱 Mockups', emoji: '📱', count: images.filter(img => img.category === 'mockups').length },
    { id: 'screenshots', name: '📸 Screenshots', emoji: '📸', count: images.filter(img => img.category === 'screenshots').length },
    { id: 'interface', name: '🎨 Interface', emoji: '🎨', count: images.filter(img => img.category === 'interface').length },
    { id: 'funcionalidades', name: '⚡ Funcionalidades', emoji: '⚡', count: images.filter(img => img.category === 'funcionalidades').length },
    { id: 'marketing', name: '📈 Marketing', emoji: '📈', count: images.filter(img => img.category === 'marketing').length }
  ];

  const filteredImages = images.filter(image => {
    const matchesCategory = selectedCategory === 'todas' || image.category === selectedCategory;
    const matchesSearch = image.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         image.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const toggleLike = (imageId: string) => {
    // Implementar toggle like
  };

  const loadImages = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/images'); // Replace with your backend endpoint
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data: AppImage[] = await response.json();
      setImages(data);
    } catch (error) {
      console.error('Failed to fetch images:', error);
    }
  };

  const onEdit = async (imageId: string) => {
    const imageToEdit = images.find(img => img.id === imageId);
    if (imageToEdit) {
      const newName = prompt('Nova descrição para a imagem:', imageToEdit.name);
      if (newName) {
        try {
          const response = await fetch(`http://localhost:3000/api/images/${imageId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: newName }),
          });
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const updatedImage = await response.json();
          setImages(images.map(img => img.id === imageId ? updatedImage : img));
          alert('Descrição atualizada com sucesso!');
        } catch (error) {
          console.error('Failed to edit image:', error);
          alert('Falha ao atualizar descrição da imagem.');
        }
      }
    }
  };

  const onDelete = async (imageId: string) => {
    if (confirm('Tem certeza que deseja excluir esta imagem?')) {
      try {
        const response = await fetch(`http://localhost:3000/api/images/${imageId}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        setImages(images.filter(img => img.id !== imageId));
        alert('Imagem excluída com sucesso!');
      } catch (error) {
        console.error('Failed to delete image:', error);
        alert('Falha ao excluir imagem.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('category', newCategory);
    try {
      const response = await fetch('http://localhost:3000/api/images', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) throw new Error('Erro ao enviar imagem');
      setSelectedFile(null);
      await loadImages();
      alert('Imagem enviada com sucesso!');
    } catch (err) {
      alert('Erro ao enviar imagem');
    } finally {
      setUploading(false);
    }
  };

  React.useEffect(() => {
    loadImages();
  }, []);

  return (
    <Card gradient hover>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-xl">
            <Image className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              🖼️ Galeria de Imagens
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Selecione as imagens que deseja usar no vídeo
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'grid' 
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' 
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg transition-colors ${
              viewMode === 'list' 
                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400' 
                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="🔍 Buscar imagens por nome ou tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
              selectedCategory === category.id
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            <span className="mr-2">{category.emoji}</span>
            {category.name}
            <span className="ml-2 px-2 py-0.5 bg-white/20 rounded-full text-xs">
              {category.count}
            </span>
          </button>
        ))}
      </div>

      {/* Upload Section */}
      <div className="flex items-center gap-2 mb-4">
        <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
        <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>Selecionar imagem</Button>
        <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="border rounded px-2 py-1">
          <option value="ambiental">Ambiental</option>
          <option value="emocional">Emocional</option>
          <option value="corporativa">Corporativa</option>
          <option value="energética">Energética</option>
          <option value="outra">Outra</option>
        </select>
        <Button onClick={handleUpload} disabled={!selectedFile || uploading}>{uploading ? 'Enviando...' : 'Enviar'}</Button>
        {selectedFile && <span>{selectedFile.name}</span>}
      </div>

      {/* Images Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredImages.map((image) => (
            <div
              key={image.id}
              className={`relative group rounded-xl overflow-hidden border-2 transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                selectedImageIds.includes(image.id)
                  ? 'border-blue-500 ring-4 ring-blue-200 dark:ring-blue-800 shadow-xl'
                  : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 hover:shadow-lg'
              }`}
              onClick={() => onImageSelect(image)}
            >
              <img
                src={image.url}
                alt={image.name}
                className={`rounded shadow cursor-pointer ${selectedImageIds.includes(image.id) ? 'ring-4 ring-blue-500' : ''}`}
                onClick={() => onImageSelect(image)}
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-opacity duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewImage(image.url);
                    }}
                    className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                  >
                    <Eye className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(image.id);
                    }}
                    className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                  >
                    <Heart className={`w-4 h-4 ${image.liked ? 'text-red-500 fill-current' : 'text-gray-600'}`} />
                  </button>
                </div>
              </div>
              
              {/* Info */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                <p className="text-white text-sm font-medium truncate">{image.name}</p>
                <p className="text-white/80 text-xs">{image.size}</p>
              </div>
              
              {/* Selection Indicator */}
              <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 transition-all duration-200 ${
                selectedImageIds.includes(image.id)
                  ? 'bg-blue-500 border-blue-500'
                  : 'bg-white/20 border-white/50'
              }`}>
                {selectedImageIds.includes(image.id) && (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredImages.map((image) => (
            <div
              key={image.id}
              className={`flex items-center space-x-4 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer ${
                selectedImageIds.includes(image.id)
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
              onClick={() => onImageSelect(image)}
            >
              <img
                src={image.url}
                alt={image.name}
                className="w-16 h-16 object-cover rounded-lg"
              />
              
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-white">{image.name}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{image.size}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {image.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewImage(image.url);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(image.id);
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Heart className={`w-4 h-4 ${image.liked ? 'text-red-500 fill-current' : ''}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredImages.length === 0 && (
        <div className="text-center py-12">
          <Image className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            Nenhuma imagem encontrada
          </p>
          <p className="text-gray-400 dark:text-gray-500 mt-2">
            Tente ajustar os filtros ou fazer upload de novas imagens
          </p>
        </div>
      )}

      {/* Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
          <div className="max-w-4xl max-h-4xl p-4">
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 rounded-full transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};