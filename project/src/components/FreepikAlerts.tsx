import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, Plus, RefreshCw } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import Modal from './ui/Modal';
import { useToast } from './Toast';
import api from '../services/api';

interface FreepikAlert {
  type: 'usage' | 'error' | 'rate_limit';
  message: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
  resolved: boolean;
}

export const FreepikAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<FreepikAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddKeyModal, setShowAddKeyModal] = useState(false);
  const [newApiKey, setNewApiKey] = useState('');
  const [addingKey, setAddingKey] = useState(false);
  const { showToast } = useToast();

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await api.get('/freepik/alerts');
      setAlerts(response.data.alerts || []);
    } catch (error) {
      console.error('Erro ao buscar alertas:', error);
      showToast('Erro ao carregar alertas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const resolveAlert = async (alertIndex: number) => {
    try {
      await api.post('/freepik/alerts/resolve', { alertIndex });
      showToast('Alerta resolvido com sucesso', 'success');
      fetchAlerts();
    } catch (error) {
      console.error('Erro ao resolver alerta:', error);
      showToast('Erro ao resolver alerta', 'error');
    }
  };

  const cleanupAlerts = async () => {
    try {
      const response = await api.post('/freepik/alerts/cleanup');
      showToast(response.data.message, 'success');
      fetchAlerts();
    } catch (error) {
      console.error('Erro ao limpar alertas:', error);
      showToast('Erro ao limpar alertas', 'error');
    }
  };

  const addNewKey = async () => {
    if (!newApiKey.trim()) {
      showToast('Por favor, insira uma chave API válida', 'warning');
      return;
    }

    setAddingKey(true);
    try {
      const response = await api.post('/freepik/add-key', { apiKey: newApiKey });
      showToast(response.data.message, 'success');
      setNewApiKey('');
      setShowAddKeyModal(false);
      fetchAlerts();
    } catch (error) {
      console.error('Erro ao adicionar chave:', error);
      showToast('Erro ao adicionar chave API', 'error');
    } finally {
      setAddingKey(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-700';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-700';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '🔴';
      case 'warning':
        return '🟡';
      default:
        return '🔵';
    }
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Alertas Freepik
            </h3>
          </div>
          <Button
            onClick={fetchAlerts}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">✅</div>
          <p>Nenhum alerta ativo</p>
          <p className="text-sm">O sistema Freepik está funcionando normalmente</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Alertas Freepik ({alerts.length})
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => setShowAddKeyModal(true)}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <Plus className="w-4 h-4 mr-1" />
              Adicionar Chave
            </Button>
            <Button
              onClick={cleanupAlerts}
              variant="outline"
              size="sm"
            >
              Limpar Antigos
            </Button>
            <Button
              onClick={fetchAlerts}
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`p-4 border rounded-lg ${getSeverityColor(alert.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <span className="text-lg">{getSeverityIcon(alert.severity)}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">{alert.message}</p>
                    <p className="text-xs opacity-75">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => resolveAlert(index)}
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">💡</span>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">Dicas para resolver alertas:</p>
              <ul className="text-xs space-y-1">
                <li>• Adicione uma nova chave API do Freepik</li>
                <li>• Distribua o uso entre múltiplas chaves</li>
                <li>• Verifique se as chaves estão ativas</li>
                <li>• Aguarde alguns minutos se houver rate limit</li>
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* Modal para adicionar nova chave */}
      <Modal
        isOpen={showAddKeyModal}
        onClose={() => setShowAddKeyModal(false)}
      >
        <div className="p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Adicionar Nova Chave Freepik
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Chave API do Freepik
            </label>
            <Input
              type="password"
              value={newApiKey}
              onChange={(e) => setNewApiKey(e.target.value)}
              placeholder="Insira sua chave API do Freepik"
              className="w-full"
            />
          </div>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Como obter uma chave Freepik:</strong>
            </p>
            <ol className="text-xs text-yellow-700 dark:text-yellow-300 mt-2 space-y-1">
              <li>1. Acesse <a href="https://www.freepik.com" target="_blank" rel="noopener noreferrer" className="underline">freepik.com</a></li>
              <li>2. Faça login ou crie uma conta</li>
              <li>3. Vá para "API" no menu</li>
              <li>4. Gere uma nova chave API</li>
              <li>5. Cole a chave no campo acima</li>
            </ol>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              onClick={() => setShowAddKeyModal(false)}
              variant="outline"
              disabled={addingKey}
            >
              Cancelar
            </Button>
            <Button
              onClick={addNewKey}
              disabled={addingKey || !newApiKey.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {addingKey ? 'Adicionando...' : 'Adicionar Chave'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}; 