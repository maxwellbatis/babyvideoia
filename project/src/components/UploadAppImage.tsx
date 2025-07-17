import React, { useState, useEffect } from 'react';
import { Upload, Trash2, Plus, Image as ImageIcon } from 'lucide-react';
import { Card } from './ui/Card';
import { Select } from './ui/Select';
import { TextArea } from './ui/TextArea';
import { uploadUserImage, getUserImages, deleteUserImage, UserImage } from '../services/api';
import { useToast } from './Toast';
import Modal from './ui/Modal'; // Supondo que exista um componente Modal, se não, crie um simples inline

export interface ImagemComDescricao {
  id: string;
  url: string;
  descricao: string;
  categoria: 'funcionalidade' | 'painel_admin' | 'user_interface' | 'pagamento' | 'loja' | 'atividades' | 'diario' | 'outros';  file?: File;
}

interface UploadAppImageProps {
  imagens: ImagemComDescricao[];
  onImagensChange: (imagens: ImagemComDescricao[]) => void;
}

export const UploadAppImage: React.FC<UploadAppImageProps> = ({ imagens, onImagensChange }) => {
  const [categorias] = useState([
    { value: 'funcionalidade', label: '🔧 Funcionalidade do App' },
    { value: 'painel_admin', label: '⚙️ Painel Administrativo' },
    { value: 'user_interface', label: '📱 Interface do Usuário' },
    { value: 'pagamento', label: '💳 Sistema de Pagamento' },
    { value: 'loja', label: '🛒Loja/Produtos' },
    { value: 'atividades', label: '🎯 Atividades e Marcos' },
    { value: 'diario', label: '📖 Diário e Memórias' },
    { value: 'outros', label: '📋 Outros' }
  ]);

  const [userImages, setUserImages] = useState<UserImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useToast();
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [pendingDescricao, setPendingDescricao] = useState('');
  const [pendingCategoria, setPendingCategoria] = useState('funcionalidade');

  // Carregar imagens do usuário
  useEffect(() => {
    loadUserImages();
  }, []);

  const loadUserImages = async () => {
    try {
      const images = await getUserImages();
      setUserImages(images);
    } catch (error) {
      console.error('Erro ao carregar imagens:', error);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    console.log('📁 Processando arquivos:', files.length);
    
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        showToast('Por favor, selecione apenas arquivos de imagem', 'error');
        continue;
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        showToast('Arquivo muito grande. Limite de 10MB', 'error');
        continue;
      }

      setLoading(true);
      try {
        // Upload para Cloudinary via backend
        const uploadedImage = await uploadUserImage(file, 'Imagem do app', 'funcionalidade');
        
        // Adicionar à lista de imagens do usuário
        setUserImages(prev => [...prev, uploadedImage]);
        
        showToast('Imagem enviada com sucesso!', 'success');
      } catch (error) {
        console.error('Erro no upload:', error);
        showToast('Erro ao enviar imagem', 'error');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        showToast('Por favor, selecione apenas arquivos de imagem', 'error');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        showToast('Arquivo muito grande. Limite de 10MB', 'error');
        return;
      }
      setPendingFile(file);
      setPendingDescricao('');
      setPendingCategoria('funcionalidade');
      const reader = new FileReader();
      reader.onload = (ev) => setPendingPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSavePending = async () => {
    if (!pendingFile) return;
    if (!pendingDescricao.trim()) {
      showToast('Preencha a descrição da imagem', 'warning');
      return;
    }
    setLoading(true);
    try {
      const uploadedImage = await uploadUserImage(pendingFile, pendingDescricao, pendingCategoria);
      setUserImages(prev => [...prev, uploadedImage]);
      showToast('Imagem enviada com sucesso!', 'success');
      setPendingFile(null);
      setPendingPreview(null);
      setPendingDescricao('');
      setPendingCategoria('funcionalidade');
    } catch (error) {
      showToast('Erro ao enviar imagem', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelPending = () => {
    setPendingFile(null);
    setPendingPreview(null);
    setPendingDescricao('');
    setPendingCategoria('funcionalidade');
  };

  const handleDeleteUserImage = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta imagem?')) return;

    try {
      await deleteUserImage(id);
      setUserImages(prev => prev.filter(img => img.id !== id));
      showToast('Imagem excluída com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao excluir imagem', 'error');
    }
  };

  // Função para selecionar imagem da galeria (apenas imagens com url Cloudinary)
  const selectImageFromGallery = (userImage: UserImage) => {
    // Só permite adicionar se o url for Cloudinary (começa com http)
    if (!userImage.url.startsWith('http')) {
      showToast('Aguarde o upload terminar antes de adicionar', 'warning');
      return;
    }
    const novaImagem: ImagemComDescricao = {
      id: userImage.id,
      url: userImage.url, // sempre Cloudinary
      descricao: userImage.descricao,
      categoria: userImage.categoria
    };
    // Verificar se já não está selecionada
    const exists = imagens.find(img => img.id === userImage.id);
    if (!exists) {
      onImagensChange([...imagens, novaImagem]);
      showToast('Imagem adicionada ao vídeo!', 'success');
    } else {
      showToast('Imagem já está selecionada', 'info');
    }
  };

  const updateImagem = (id: string, field: keyof ImagemComDescricao, value: string) => {
    const imagensAtualizadas = imagens.map(img => 
      img.id === id ? { ...img, [field]: value } : img
    );
    onImagensChange(imagensAtualizadas);
  };

  const removeImagem = (id: string) => {
    const imagensAtualizadas = imagens.filter(img => img.id !== id);
    onImagensChange(imagensAtualizadas);
  };

  const getCategoriaEmoji = (categoria: 'funcionalidade' | 'painel_admin' | 'user_interface' | 'pagamento' | 'loja' | 'atividades' | 'diario' | 'outros') => {
    const emojis = {
      funcionalidade: '🔧',
      painel_admin: '⚙️',
      user_interface: '📱',
      pagamento: '💳',
      loja: '🛒',
      atividades: '🎯',
      diario: '📖',
      outros: '📋'
    };
    return emojis[categoria] || '📋';
  };

  const filteredUserImages = userImages.filter(image => {
    const matchesSearch = image.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         image.originalName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || image.categoria === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <Card>
      <div className="space-y-6">
        {/* Área de Upload */}
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-purple-400 dark:hover:border-purple-500 transition-colors">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />     <h3 className="text-lg font-semibold text-gray-90 dark:text-white mb-2">
  📸 Upload de Imagens do App
</h3>
<p className="text-sm text-gray-60 dark:text-gray-400 mb-4">
  Arraste imagens aqui ou clique no botão para selecionar
</p>
          
          <input
            type="file"
            accept="image/*"
            multiple={false}
            onChange={handleFileInput}
            id="file-upload"
            className="hidden"
            disabled={loading || !!pendingFile}
          />
          <label 
            htmlFor="file-upload"
            className={`inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg cursor-pointer transition-colors ${loading || pendingFile ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Plus className="w-4 h-4 mr-2" />          {loading ? 'Enviando...' : 'Selecionar Imagem'}
          </label>
        </div>

        {/* Modal de edição antes do upload */}
        {pendingFile && (
          <Modal isOpen={!!pendingFile} onClose={handleCancelPending}>
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-bold mb-2">Editar Imagem Antes do Upload</h3>
              {pendingPreview && (
                <img src={pendingPreview} alt="Preview" className="w-full h-48 object-contain rounded-lg border mb-2" />
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Descrição *</label>
                <TextArea
                  value={pendingDescricao}
                  onChange={e => setPendingDescricao(e.target.value)}
                  rows={3}
                  className="w-full"
                  placeholder="Descreva o que a imagem mostra para que a IA use no contexto do roteiro"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Categoria</label>
                <Select
                  value={pendingCategoria}
                  onChange={e => setPendingCategoria(e.target.value)}
                  options={categorias}
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={handleCancelPending}
                  className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-gray-800"
                  disabled={loading}
                >Cancelar</button>
                <button
                  onClick={handleSavePending}
                  className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                  disabled={loading || !pendingDescricao.trim()}
                >Salvar</button>
              </div>
            </div>
          </Modal>
        )}

        {/* Galeria de Imagens do Usuário */}
        <div className="space-y-4">     <h4 className="font-semibold text-gray-90 dark:text-white">
           🖼️ Galeria de Imagens ({userImages.length})
          </h4>
          
          {/* Filtros da Galeria */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="🔍 Buscar por descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-70 dark:text-white"
            />
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-70 dark:text-white"
            >
              <option value="all">🎵 Todas as Categorias</option>
              {categorias.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Lista de Imagens da Galeria */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {filteredUserImages.map((image) => {
              const isSelected = imagens.some(img => img.id === image.id);
              
              return (
                <div
                  key={image.id}
                  className={`relative p-3 rounded-lg border-2 transition-all duration-300 cursor-pointer ${
                    isSelected
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:bg-gray-700/50'
                  }`}
                  onClick={() => selectImageFromGallery(image)}
                >
                  {/* Badge de seleção */}
                  <div className="absolute top-2 right-2">
                    {isSelected ? (
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    ) : (
                      <div className="w-5 h-5 bg-gray-300 rounded-full"></div>
                    )}
                  </div>

                  {/* Preview da imagem */}
                  <img
                    src={image.url}
                    alt={image.descricao}
                    className="w-full h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-600 mb-2"
                  />

                  {/* Informações da imagem */}
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1">
                      <span className="text-sm">{getCategoriaEmoji(image.categoria)}</span>
                      <h5 className="font-medium text-gray-90 dark:text-white text-sm truncate">
                        {image.originalName}
                      </h5>
                    </div>
                    
                    <p className="text-xs text-gray-60 dark:text-gray-400">
                      {image.descricao || 'Sem descrição'}
                    </p>
                  </div>

                  {/* Botão de deletar */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteUserImage(image.id);
                    }}
                    className="absolute top-2 left-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          {filteredUserImages.length === 0 && (
            <div className="text-center py-8">
              <ImageIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-50 dark:text-gray-400">
                {searchTerm || selectedCategory !== 'all' 
                  ? 'Nenhuma imagem encontrada com os filtros atuais'
                  : 'Nenhuma imagem na galeria ainda'
                }
              </p>
            </div>
          )}
        </div>

        {/* Dicas de Uso */}
        <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <h5 className="font-medium text-blue-90 dark:text-blue-100 mb-2">💡 Dicas de Uso:</h5>
          <ul className="text-sm text-blue-70 dark:text-blue-300 space-y-1">
            <li>• <strong>Para mães:</strong> Use prints de funcionalidades como "Memórias Especiais", "Marcos do Desenvolvimento, Linha do Tempo"</li>
            <li>• <strong>Para parceiros:</strong> Use prints do Painel Admin, Métricas de Vendas, Gestão de Assinaturas</li>
            <li>• <strong>Para influenciadoras:</strong> Use prints da Interface do App, Funcionalidades Premium, Compartilhamento</li>
            <li>• <strong>Descrição:</strong> Seja específico: Tela de cadastro simples e rápida em vez de apenas "Cadastro"</li>
          </ul>
        </div>

        {/* Lista de Imagens Selecionadas */}
        {imagens.length > 0 && (
          <div className="space-y-4">     <h4 className="font-semibold text-gray-90 dark:text-white">
              📋 Imagens Selecionadas para o Vídeo ({imagens.length})
            </h4>
            
            {imagens.map((imagem, index) => (
              <div key={imagem.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-start space-x-4">
                  {/* Preview da Imagem */}
                  <div className="flex-shrink-0">
                    <img
                      src={imagem.url}
                      alt={`Imagem ${index + 1}`}
                      className="w-24 h-24 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                    />
                  </div>

                  {/* Campos de Edição */}
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-70 dark:text-gray-300 mb-1">
                          Categoria
                        </label>
                        <Select
                          value={imagem.categoria}
                          onChange={(e) => updateImagem(imagem.id, 'categoria', e.target.value)}
                          options={categorias}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-70 dark:text-gray-300 mb-1">
                          {getCategoriaEmoji(imagem.categoria)} {imagem.file?.name || `Imagem ${index + 1}`}
                        </label>
                        <div className="text-xs text-gray-50 dark:text-gray-400">
                          {imagem.file?.size ? `${(imagem.file.size / 1024 /1024).toFixed(2)}MB` : 'Arquivo carregado'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-70 dark:text-gray-300 mb-1">
                        Descrição da Imagem *
                      </label>
                      <TextArea
                        placeholder="Ex: Tela de cadastro simples e rápida do Baby Diary, mostrando o formulário intuitivo para mães..."
                        value={imagem.descricao}
                        onChange={(e) => updateImagem(imagem.id, 'descricao', e.target.value)}
                        rows={3}
                        className="w-full"
                      />
                      <p className="text-xs text-gray-50 dark:text-gray-400 mt-1">
                        Descreva o que a imagem mostra para que a IA use no contexto do roteiro
                      </p>
                    </div>
                  </div>

                  {/* Botão Remover */}
                  <button
                    onClick={() => removeImagem(imagem.id)}
                    className="p-2 text-red-50 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}; 