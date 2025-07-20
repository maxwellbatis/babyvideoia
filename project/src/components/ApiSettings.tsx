import React, { useState, useEffect } from 'react';
import { Settings, Key, CheckCircle, AlertCircle, Save, Eye, EyeOff, CreditCard, Database } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { useToast } from './Toast';
import api from '../services/api';

interface ApiKey {
  name: string;
  key: string;
  status: 'connected' | 'disconnected' | 'testing';
  icon: string;
  description: string;
  hasCredits?: boolean;
  credits?: string;
  configType: 'key' | 'url' | 'multiple';
  fields?: {
    name: string;
    value: string;
    placeholder: string;
    type: 'text' | 'password';
  }[];
}

export const ApiSettings: React.FC = () => {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([
    {
      name: 'Gemini AI',
      key: '',
      status: 'disconnected',
      icon: '🧠',
      description: 'Para geração de roteiros e textos',
      configType: 'key',
      hasCredits: false
    },
    {
      name: 'Groq',
      key: '',
      status: 'disconnected',
      icon: '⚡',
      description: 'Processamento rápido de IA',
      configType: 'key',
      hasCredits: false
    },
    {
      name: 'ElevenLabs',
      key: '',
      status: 'disconnected',
      icon: '🎙️',
      description: 'Vozes realistas para narração',
      configType: 'key',
      hasCredits: true
    },
    {
      name: 'Cloudinary',
      key: '',
      status: 'disconnected',
      icon: '☁️',
      description: 'Armazenamento e processamento de mídia',
      configType: 'multiple',
      hasCredits: false,
      fields: [
        { name: 'cloudName', value: '', placeholder: 'Cloud Name', type: 'text' },
        { name: 'apiKey', value: '', placeholder: 'API Key', type: 'password' },
        { name: 'apiSecret', value: '', placeholder: 'API Secret', type: 'password' }
      ]
    },
    {
      name: 'Freepik',
      key: '',
      status: 'disconnected',
      icon: '🖼️',
      description: 'Banco de imagens e recursos',
      configType: 'key',
      hasCredits: false
    },
    {
      name: 'Stable Diffusion (Colab)',
      key: '',
      status: 'disconnected',
      icon: '🎨',
      description: 'Geração de imagens com IA',
      configType: 'url',
      hasCredits: false
    }
  ]);

  const { showToast } = useToast();

  // Carregar credenciais do banco ao montar o componente
  useEffect(() => {
    loadCredentialsFromDatabase();
  }, []);

  const loadCredentialsFromDatabase = async () => {
    try {
      const response = await api.get('/credentials');
      const credentials = response.data;
      
      console.log('📋 Credenciais carregadas do banco:', credentials);
      
      setApiKeys(prev => prev.map(api => {
        let updatedApi = { ...api };
        
        // Mapear credenciais específicas para cada API
        switch (api.name) {
          case 'Gemini AI':
            const geminiCred = credentials.find((c: any) => c.name === 'GEMINI_KEY');
            if (geminiCred) {
              updatedApi.key = geminiCred.value;
              updatedApi.status = geminiCred.value && geminiCred.value !== 'sua_chave_do_gemini_aqui' ? 'connected' : 'disconnected';
            }
            break;
            
          case 'Groq':
            const groqCred = credentials.find((c: any) => c.name === 'GROQ_API_KEY');
            if (groqCred) {
              updatedApi.key = groqCred.value;
              updatedApi.status = groqCred.value && groqCred.value !== 'sua_chave_do_groq_aqui' ? 'connected' : 'disconnected';
            }
            break;
            
          case 'ElevenLabs':
            const elevenCred = credentials.find((c: any) => c.name === 'ELEVENLABS_API_KEY');
            if (elevenCred) {
              updatedApi.key = elevenCred.value;
              updatedApi.status = elevenCred.value && elevenCred.value !== 'sua_chave_do_elevenlabs_aqui' ? 'connected' : 'disconnected';
            }
            break;
            
          case 'Cloudinary':
            const cloudNameCred = credentials.find((c: any) => c.name === 'CLOUDINARY_CLOUD_NAME');
            const cloudKeyCred = credentials.find((c: any) => c.name === 'CLOUDINARY_API_KEY');
            const cloudSecretCred = credentials.find((c: any) => c.name === 'CLOUDINARY_API_SECRET');
            
            if (updatedApi.fields) {
              updatedApi.fields = updatedApi.fields.map(field => {
                switch (field.name) {
                  case 'cloudName':
                    return { ...field, value: cloudNameCred?.value || '' };
                  case 'apiKey':
                    return { ...field, value: cloudKeyCred?.value || '' };
                  case 'apiSecret':
                    return { ...field, value: cloudSecretCred?.value || '' };
                  default:
                    return field;
                }
              });
              
              const hasValidCreds = cloudNameCred?.value && cloudKeyCred?.value && cloudSecretCred?.value &&
                cloudNameCred.value !== 'seu_cloud_name_aqui' &&
                cloudKeyCred.value !== 'sua_api_key_cloudinary_aqui' &&
                cloudSecretCred.value !== 'seu_api_secret_cloudinary_aqui';
              
              updatedApi.status = hasValidCreds ? 'connected' : 'disconnected';
            }
            break;
            
          case 'Freepik':
            const freepikCred = credentials.find((c: any) => c.name === 'FREEPIK_API_KEY');
            if (freepikCred) {
              updatedApi.key = freepikCred.value;
              updatedApi.status = freepikCred.value && freepikCred.value !== 'sua_chave_do_freepik_aqui' ? 'connected' : 'disconnected';
            }
            break;
            
          case 'Stable Diffusion (Colab)':
            const colabCred = credentials.find((c: any) => c.name === 'COLAB_SD_URL');
            if (colabCred) {
              updatedApi.key = colabCred.value;
              updatedApi.status = colabCred.value && colabCred.value !== 'https://seu_colab_url_aqui' ? 'connected' : 'disconnected';
            }
            break;
        }
        
        return updatedApi;
      }));
      
      console.log('✅ Credenciais mapeadas para interface');
    } catch (error) {
      console.error('❌ Erro ao carregar credenciais:', error);
    }
  };

  const toggleKeyVisibility = (apiName: string) => {
    setShowKeys(prev => ({
      ...prev,
      [apiName]: !prev[apiName]
    }));
  };

  const updateApiKey = (index: number, key: string) => {
    setApiKeys(prev => prev.map((api, i) => 
      i === index ? { ...api, key } : api
    ));
  };

  const testConnection = async (index: number) => {
    const apiKey = apiKeys[index];
    setApiKeys(prev => prev.map((a, i) => 
      i === index ? { ...a, status: 'testing' } : a
    ));

    try {
      // Testar conexão específica baseada no tipo de API
      let testEndpoint = '';
      let testData = {};
      
      switch (apiKey.name) {
        case 'ElevenLabs':
          testEndpoint = '/test/elevenlabs';
          testData = { apiKey: apiKey.key };
          break;
        case 'Gemini AI':
          testEndpoint = '/test/gemini';
          testData = { apiKey: apiKey.key };
          break;
        case 'Groq':
          testEndpoint = '/test/groq';
          testData = { apiKey: apiKey.key };
          break;
        case 'Cloudinary':
          testEndpoint = '/test/cloudinary';
          testData = { 
            cloudName: apiKey.fields?.find((f: any) => f.name === 'cloudName')?.value,
            apiKey: apiKey.fields?.find((f: any) => f.name === 'apiKey')?.value,
            apiSecret: apiKey.fields?.find((f: any) => f.name === 'apiSecret')?.value
          };
          break;
        case 'Freepik':
          testEndpoint = '/test/freepik';
          testData = { apiKey: apiKey.key };
          break;
        case 'Stable Diffusion (Colab)':
          testEndpoint = '/test/colab';
          testData = { url: apiKey.key };
          break;
        default:
          throw new Error('API não suportada para teste');
      }

      const response = await api.post(testEndpoint, testData);
      
      setApiKeys(prev => prev.map((a, i) => 
        i === index ? { 
          ...a, 
          status: 'connected',
          credits: response.data.credits || a.credits
        } : a
      ));
      
      showToast(`${apiKey.name} conectado com sucesso!`, 'success');
    } catch (error: any) {
      setApiKeys(prev => prev.map((a, i) => 
        i === index ? { ...a, status: 'disconnected' } : a
      ));
      
      showToast(
        `Falha ao conectar com ${apiKey.name}: ${error.response?.data?.message || error.message}`, 
        'error'
      );
    }
  };

  const saveAllKeys = async () => {
    try {
      const credentials: Array<{ name: string; value: string }> = [];
      
      apiKeys.forEach(api => {
        switch (api.name) {
          case 'Gemini AI':
            credentials.push({ name: 'GEMINI_KEY', value: api.key });
            break;
          case 'Groq':
            credentials.push({ name: 'GROQ_API_KEY', value: api.key });
            break;
          case 'ElevenLabs':
            credentials.push({ name: 'ELEVENLABS_API_KEY', value: api.key });
            break;
          case 'Cloudinary':
            if (api.fields) {
              api.fields.forEach(field => {
                switch (field.name) {
                  case 'cloudName':
                    credentials.push({ name: 'CLOUDINARY_CLOUD_NAME', value: field.value });
                    break;
                  case 'apiKey':
                    credentials.push({ name: 'CLOUDINARY_API_KEY', value: field.value });
                    break;
                  case 'apiSecret':
                    credentials.push({ name: 'CLOUDINARY_API_SECRET', value: field.value });
                    break;
                }
              });
            }
            break;
          case 'Freepik':
            credentials.push({ name: 'FREEPIK_API_KEY', value: api.key });
            break;
          case 'Stable Diffusion (Colab)':
            credentials.push({ name: 'COLAB_SD_URL', value: api.key });
            break;
        }
      });

      console.log('💾 Salvando credenciais:', credentials);
      await api.post('/credentials', { credentials });
      
      // Limpar cache após salvar
      await clearCredentialsCache();
      
      showToast('Credenciais salvas com sucesso!', 'success');
      
      // Recarregar credenciais do banco
      await loadCredentialsFromDatabase();
    } catch (error) {
      console.error('❌ Erro ao salvar credenciais:', error);
      showToast('Erro ao salvar credenciais', 'error');
    }
  };

  const clearCredentialsCache = async () => {
    try {
      await api.post('/credentials/clear-cache');
      showToast('Cache de credenciais limpo!', 'success');
    } catch (error) {
      console.error('❌ Erro ao limpar cache:', error);
      showToast('Erro ao limpar cache', 'error');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'testing':
        return <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Conectado';
      case 'testing':
        return 'Testando...';
      default:
        return 'Desconectado';
    }
  };

  return (
    <Card gradient hover>
      <div className="flex items-center space-x-3 mb-6">
        <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            ⚙️ Configurações de API
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure suas chaves de API para usar os serviços de IA
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {apiKeys.map((api, index) => (
          <div
            key={api.name}
            className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">{api.icon}</span>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    {api.name}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {api.description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                {getStatusIcon(api.status)}
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  {getStatusText(api.status)}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {/* Campos de configuração */}
              {api.configType === 'multiple' ? (
                // Múltiplos campos (Cloudinary)
                <div className="space-y-2">
                  {api.fields?.map((field, fieldIndex) => (
                    <div key={field.name} className="flex space-x-2">
                      <div className="flex-1 relative">
                        <Input
                          type={showKeys[`${api.name}_${field.name}`] ? 'text' : field.type}
                          placeholder={field.placeholder}
                          value={field.value}
                          onChange={(e) => {
                            setApiKeys(prev => prev.map((a, i) => 
                              i === index ? {
                                ...a,
                                fields: a.fields?.map((f, fi) => 
                                  fi === fieldIndex ? { ...f, value: e.target.value } : f
                                )
                              } : a
                            ));
                          }}
                          className="pr-10"
                        />
                        {field.type === 'password' && (
                          <button
                            type="button"
                            onClick={() => toggleKeyVisibility(`${api.name}_${field.name}`)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {showKeys[`${api.name}_${field.name}`] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                // Campo único
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <Input
                      type={showKeys[api.name] ? 'text' : (api.configType === 'url' ? 'text' : 'password')}
                      placeholder={api.configType === 'url' 
                        ? 'Digite a URL do Colab (ex: https://abc123.ngrok.io)' 
                        : `Digite sua chave da API ${api.name}...`
                      }
                  value={api.key}
                  onChange={(e) => updateApiKey(index, e.target.value)}
                  className="pr-10"
                />
                    {api.configType !== 'url' && (
                <button
                  type="button"
                  onClick={() => toggleKeyVisibility(api.name)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showKeys[api.name] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
                    )}
                  </div>
                </div>
              )}

              {/* Créditos do ElevenLabs */}
              {api.hasCredits && api.credits && (
                <div className="flex items-center space-x-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    Créditos disponíveis: {api.credits}
                  </span>
              </div>
              )}
              
              {/* Botão de teste */}
              <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => testConnection(index)}
                  disabled={api.status === 'testing'}
                loading={api.status === 'testing'}
              >
                Testar
              </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-3">
          <Button
            onClick={loadCredentialsFromDatabase}
            icon={Database}
            variant="outline"
            className="flex-1"
            size="lg"
          >
            🔄 Carregar do Banco
          </Button>
        <Button
          onClick={saveAllKeys}
          icon={Save}
            className="flex-1"
          size="lg"
        >
          💾 Salvar Configurações
        </Button>
        <Button
          onClick={clearCredentialsCache}
          icon={Key}
          variant="outline"
          className="flex-1"
          size="lg"
        >
          🗑️ Limpar Cache
        </Button>
        </div>
      </div>
    </Card>
  );
};