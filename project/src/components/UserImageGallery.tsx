import React, { useState, useEffect } fromreact;import { Image, Trash2eck, X, Eye } from 'lucide-react;
import[object Object] Card } from './ui/Card';
import { getUserImages, deleteUserImage, UserImage } from '../services/api';
import { useToast } from './Toast;

interface UserImageGalleryProps [object Object]  onImageSelect: (images: UserImage[]) => void;
  selectedImages: UserImage[];
}

export const UserImageGallery: React.FC<UserImageGalleryProps> = ([object Object] 
  onImageSelect, 
  selectedImages 
}) => [object Object]const images, setImages] = useState<UserImage;
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('); const { showToast } = useToast();

  useEffect(() => {
    loadImages();
  },   const loadImages = async () =>[object Object]   try [object Object]   setLoading(true);
      const data = await getUserImages();
      setImages(data);
    } catch (error)[object Object]
      showToast('Erro ao carregar imagens, r');
    } finally [object Object]  setLoading(false);
    }
  };

  const handleDelete = async (id: string) => [object Object]    if (!confirm('Tem certeza que deseja excluir esta imagem?')) return;

    try {
      await deleteUserImage(id);
      setImages(prev => prev.filter(img => img.id !== id));
      onImageSelect(selectedImages.filter(img => img.id !== id));
      showToast('Imagem excluída com sucesso!,success');
    } catch (error)[object Object]
      showToast('Erro ao excluir imagem',error');
    }
  };

  const toggleImageSelection = (image: UserImage) => {
    const isSelected = selectedImages.some(img => img.id === image.id);
    
    if (isSelected) {
      onImageSelect(selectedImages.filter(img => img.id !== image.id));
    } else {
      onImageSelect(...selectedImages, image]);
    }
  };

  const getCategoriaEmoji = (categoria: string) => [object Object]    const emojis =[object Object]    funcionalidade: 🔧      painel_admin:⚙️    user_interface: '📱,
      pagamento:💳,      loja: '🛒',
      atividades: 🎯,
      diario: 📖,
      outros: '📋'
    };
    return emojis[categoria as keyof typeof emojis] || '📋';
  };

  const formatFileSize = (bytes: number) =>[object Object]
    const sizes =Bytes, KB', 'MB, B'];
    if (bytes === 0return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024);
    return Math.round(bytes / Math.pow(1024 i) * 10010+ + sizes[i];
  };

  const categories = [
    { value:all', label: '🎵 Todas as Categorias' },
[object Object] value:funcionalidade, label: 🔧 Funcionalidade' },
    { value: 'painel_admin, label:⚙️ Painel Admin' },
    { value:user_interface', label: 📱 Interface' },[object Object] value: pagamento', label: 💳 Pagamento' },
    { value: loja, label: 🛒 Loja' },
  [object Object]value: 'atividades', label: '🎯 Atividades' },
    { value: diario', label: 📖 Diário' },
    { value: outros', label: '📋 Outros' }
  ];

  const filteredImages = images.filter(image => {
    const matchesSearch = image.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         image.originalName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || image.categoria === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <Card gradient hover>
      <div className=flex items-center justify-between mb-6">
        <div className=flexitems-center space-x-3    <div className="p-2gradient-to-r from-blue-500purple-600d-xl">
            <Image className="w-6-6hite" />
          </div>
          <div>
            <h3 className=text-xl font-bold text-gray-90dark:text-white">
              🖼️ Galeria de Imagens
            </h3>
            <p className=text-sm text-gray-60dark:text-gray-40>
              Selecione as imagens para usar no vídeo
            </p>
          </div>
        </div>
        
        <div className=text-sm text-gray-500         {selectedImages.length} selecionada{selectedImages.length !== 1 ?s :}      </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4b-6">
        <div className="relative">
          <input
            type=text       placeholder="🔍 Buscar por descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2ocus:ring-blue-500 focus:border-transparent dark:bg-gray-70 dark:text-white"
          />
        </div>
        
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2ocus:ring-blue-500 focus:border-transparent dark:bg-gray-70 dark:text-white"
        >
         [object Object]categories.map(cat => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </div>

      {/* Lista de Imagens */}
      <div className="space-y-4 max-h-96overflow-y-auto">
        {loading ? (
          <div className="text-center py-8>
            <div className="animate-spin rounded-full h-12 border-b-2border-blue-600x-auto mb-4"></div>
            <p className="text-gray-50dark:text-gray-40
              Carregando galeria...
            </p>
          </div>
        ) : filteredImages.length >0? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4        [object Object]filteredImages.map((image) => {
              const isSelected = selectedImages.some(img => img.id === image.id);
              
              return (
                <div
                  key={image.id}
                  className={`relative p-4 rounded-xl border-2 transition-all duration-300cursor-pointer ${
                    isSelected
                      ? 'border-blue-500bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300er:bg-gray-50 dark:hover:bg-gray-700/50'
                  }`}
                  onClick={() => toggleImageSelection(image)}
                >
                  {/* Badge de seleção */}
                  <div className="absolute top-2 right-2">
                    {isSelected ? (
                      <div className="w-6g-blue-500 rounded-full flex items-center justify-center">
                        <Check className="w-4-4                   </div>
                    ) : (
                      <div className="w-66 bg-gray-300g-gray-600ounded-full"></div>
                    )}
                  </div>

                  {/* Preview da imagem */}
                  <div className="relative mb-3">
                    <img
                      src={image.url}
                      alt={image.descricao}
                      className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-20ition-all duration-20nded-lg flex items-center justify-center">
                      <Eye className="w-8 h-8 text-white opacity-0 hover:opacity-100transition-opacity" />
                    </div>
                  </div>

                  {/* Informações da imagem */}
                  <div className="space-y-2">
                    <div className=flexitems-center space-x-2">
                      <span className="text-lg">{getCategoriaEmoji(image.categoria)}</span>
                      <h4 className="font-semibold text-gray-90rk:text-white text-sm truncate">
                     [object Object]image.originalName}
                      </h4>
                    </div>
                    
                    <p className=text-sm text-gray-60dark:text-gray-400">
                      {image.descricao}
                    </p>
                    
                    <div className=flex items-center justify-between text-xs text-gray-500">
                      <span>{formatFileSize(image.size)}</span>
                      <span>{new Date(image.uploaded_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Botão de deletar */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(image.id);
                    }}
                    className="absolute top-2 left-2 p-1 bg-red-500er:bg-red-600 text-white rounded-full transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8            <Image className="w-16h-16t-gray-300 mx-auto mb-4 />
            <p className="text-gray-50dark:text-gray-40>              Nenhuma imagem encontrada
            </p>
            <p className=text-sm text-gray-40dark:text-gray-500 mt-2>           {searchTerm || selectedCategory !== 'all'
                ?Tente ajustar os filtros'
                : 'Faça upload de imagens para começar}
            </p>
          </div>
        )}
      </div>

      {/* Resumo da seleção */}
      {selectedImages.length > 0 && (
        <div className=mt-6 p-4bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-70     <h4 className="font-semibold text-blue-90dark:text-blue-100 mb-2
            📋 Imagens Selecionadas ({selectedImages.length})
          </h4>
          <div className="flex flex-wrap gap-2      [object Object]selectedImages.map((image) => (
              <div key={image.id} className=flexitems-center space-x-2white dark:bg-gray-700 px-2 py-1rounded text-xs>
                <img src={image.url} alt=" className="w-4ject-cover rounded" />
                <span className=truncate max-w-20>{image.descricao}</span>
                <button
                  onClick={() => toggleImageSelection(image)}
                  className="text-red-50hover:text-red-700                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}; 