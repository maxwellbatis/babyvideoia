import React, { useState, useEffect } from 'react';
import { Upload, Image, Trash2, Eye } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { uploadAppImage, getAppImages, deleteAppImage, AppImage } from '../services/api';
import { useToast } from './Toast';

interface UploadAppImageProps {
  onImageSelect: (image: AppImage) => void;
  selectedImageIds?: string[];
}

export const UploadAppImage: React.FC<UploadAppImageProps> = ({ onImageSelect, selectedImageIds = [] }) => {
  const [images, setImages] = useState<AppImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const data = await getAppImages();
      setImages(data);
    } catch (error) {
      showToast('Erro ao carregar imagens', 'error');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        showToast('Por favor, selecione apenas arquivos de imagem', 'error');
        continue;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        showToast(`Arquivo ${file.name} muito grande. Limite de 5MB`, 'error');
        continue;
      }

      setLoading(true);
      try {
        const uploadedImage = await uploadAppImage(file);
        setImages(prev => [...prev, uploadedImage]);
        showToast(`Imagem ${file.name} enviada com sucesso!`, 'success');
        await loadImages();
        if (onImageSelect) onImageSelect(uploadedImage); // Chame o callback para atualizar seleção no VideoForm
      } catch (error) {
        showToast(`Erro ao enviar ${file.name}`, 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta imagem?')) return;

    try {
      await deleteAppImage(id);
      setImages(prev => prev.filter(img => img.id !== id));
      showToast('Imagem excluída com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao excluir imagem', 'error');
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Image className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Imagens do App
          </h3>
        </div>
        
        <label className="relative">
          <input
            type="file"
            accept="image/*"
            multiple
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
            Adicionar Imagens
          </Button>
        </label>
      </div>

      {images.length === 0 ? (
        <div className="text-center py-8">
          <Image className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">
            Nenhuma imagem enviada ainda
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
            Adicione imagens para usar nos seus vídeos
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((image) => (
            <div
              key={image.id}
              className={`relative group rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                selectedImageIds.includes(image.id)
                  ? 'border-indigo-500 ring-2 ring-indigo-200'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
              }`}
            >
              <img
                src={image.url}
                alt={image.name}
                className="w-full h-32 object-cover"
              />
              
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex space-x-2">
                  <button
                    onClick={() => setPreviewImage(image.url)}
                    className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                  >
                    <Eye className="w-4 h-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(image.id)}
                    className="p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
              
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <p className="text-white text-xs truncate">{image.name}</p>
                <p className="text-white/80 text-xs">{formatFileSize(image.size)}</p>
              </div>
              
              <button
                onClick={() => onImageSelect(image)}
                className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium transition-all duration-200 ${
                  selectedImageIds.includes(image.id)
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {selectedImageIds.includes(image.id) ? 'Selecionada' : 'Selecionar'}
              </button>
            </div>
          ))}
        </div>
      )}

      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="max-w-4xl max-h-4xl p-4">
            <img
              src={previewImage}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
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