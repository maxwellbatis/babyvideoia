import React, { useEffect, useState } from 'react';
import { Activity, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { Card } from './ui/Card';
import { getApiStatus, ApiStatus as ApiStatusType } from '../services/api';

export const ApiStatus: React.FC = () => {
  const [status, setStatus] = useState<ApiStatusType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await getApiStatus();
        setStatus(data);
      } catch (error) {
        console.error('Error fetching API status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <div className="flex items-center space-x-2 mb-4">
          <Activity className="w-5 h-5 text-gray-400" />
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="h-3 bg-gray-200 rounded w-16"></div>
              <div className="h-3 bg-gray-200 rounded w-12"></div>
            </div>
          ))}
        </div>
      </Card>
    );
  }

  const getStatusIcon = (isOnline: boolean) => {
    return isOnline ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <AlertCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getStatusColor = (isOnline: boolean) => {
    return isOnline ? 'text-green-600' : 'text-red-600';
  };

  const getOverallStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'text-green-600';
      case 'partial':
        return 'text-yellow-600';
      case 'offline':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  // Função auxiliar para barra de progresso de uso das APIs
  function renderApiProgress(api: string, label: string) {
    // Tipagem explícita para evitar erro TS
    const usageObj = status?.usage as Record<string, string | number | null | undefined> | undefined;
    const limitObj = status?.limits as Record<string, string | number | null | undefined> | undefined;
    const usageRaw = usageObj?.[api];
    const limitRaw = limitObj?.[api];
    if (!usageRaw || !limitRaw) return null;

    // Sempre trabalhar com string para parsing
    const usageStr = String(usageRaw);
    const limitStr = String(limitRaw);

    // Extrai todos os números
    function parseAllNumbers(str: string): number[] {
      if (!str) return [];
      str = str.replace(/[\s\u200B-\u200D\uFEFF]/g, "");
      return (str.match(/([0-9]+(?:[.,][0-9]+)?)/g) || []).map(s => parseFloat(s.replace(",", ".")));
    }
    // Multiplicador só para o limite
    function parseUnitMultiplier(str: string): number {
      const lower = str.toLowerCase();
      if (lower.includes("gb")) return 1e9;
      if (lower.includes("mb")) return 1e6;
      if (lower.includes("k")) return 1e3;
      if (lower.includes("m")) return 1e6;
      return 1;
    }
    // Extrair números
    const usageNums = parseAllNumbers(usageStr);
    const limitNums = parseAllNumbers(limitStr);
    // Padrão: uso = primeiro número, limite = segundo número (ou primeiro do limite)
    let used = usageNums[0] || 0;
    let total = 0;
    if (usageStr.includes("/") && usageNums.length >= 2) {
      total = usageNums[1] * parseUnitMultiplier(usageStr);
    } else if (limitNums.length > 0) {
      total = limitNums[0] * parseUnitMultiplier(limitStr);
    }
    // Se o limite for menor que o uso, tentar inverter (caso erro de extração)
    if (total > 0 && used > total) {
      const temp = used;
      used = total;
      total = temp;
    }
    const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
    let barColor = "bg-green-500";
    if (percent >= 90) barColor = "bg-red-500";
    else if (percent >= 70) barColor = "bg-yellow-500";
    return (
      <div className="mt-1 mb-2">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Uso: {usageStr} / {limitStr}</span>
          <span>{percent}%</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className={`h-2 ${barColor} transition-all duration-500`} style={{ width: `${percent}%` }} />
        </div>
      </div>
    );
  }

  return (
    <Card>
      <div className="flex items-center space-x-2 mb-4">
        <Activity className="w-5 h-5 text-indigo-600" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Status das APIs
        </h3>
        <div className={`text-sm font-medium ${getOverallStatusColor(status?.status || 'offline')}`}> 
          {status?.status === 'online' ? 'Todas Online' : 
           status?.status === 'partial' ? 'Parcialmente Online' : 'Offline'}
        </div>
      </div>

      <div className="space-y-3">
        {/* Gemini */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Gemini AI</span>
          <div className="flex items-center space-x-2">
            {getStatusIcon(status?.gemini || false)}
            <span className={`text-sm font-medium ${getStatusColor(status?.gemini || false)}`}>{status?.gemini ? 'Online' : 'Offline'}</span>
          </div>
          <span className="text-xs text-gray-500 ml-2">Limite: {status?.limits?.gemini ?? '-'}</span>
        </div>
        {renderApiProgress('gemini', 'Gemini AI')}

        {/* Groq */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Groq</span>
          <div className="flex items-center space-x-2">
            {getStatusIcon(status?.groq || false)}
            <span className={`text-sm font-medium ${getStatusColor(status?.groq || false)}`}>{status?.groq ? 'Online' : 'Offline'}</span>
          </div>
          <span className="text-xs text-gray-500 ml-2">Limite: {status?.limits?.groq ?? '-'}</span>
        </div>
        {renderApiProgress('groq', 'Groq')}

        {/* ElevenLabs */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">ElevenLabs</span>
          <div className="flex items-center space-x-2">
            {getStatusIcon(status?.elevenlabs || false)}
            <span className={`text-sm font-medium ${getStatusColor(status?.elevenlabs || false)}`}>{status?.elevenlabs ? 'Online' : 'Offline'}</span>
          </div>
          <span className="text-xs text-gray-500 ml-2">Limite: {status?.limits?.elevenlabs ?? '-'}</span>
        </div>
        {renderApiProgress('elevenlabs', 'ElevenLabs')}

        {/* Cloudinary */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Cloudinary</span>
          <div className="flex items-center space-x-2">
            {getStatusIcon(status?.cloudinary || false)}
            <span className={`text-sm font-medium ${getStatusColor(status?.cloudinary || false)}`}>{status?.cloudinary ? 'Online' : 'Offline'}</span>
          </div>
          <span className="text-xs text-gray-500 ml-2">Limite: {status?.limits?.cloudinary ?? '-'}</span>
        </div>
        {renderApiProgress('cloudinary', 'Cloudinary')}

        {/* Freepik */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Freepik</span>
          <div className="flex items-center space-x-2">
            {getStatusIcon(status?.freepik || false)}
            <span className={`text-sm font-medium ${getStatusColor(status?.freepik || false)}`}>{status?.freepik ? 'Online' : 'Offline'}</span>
          </div>
          <span className="text-xs text-gray-500 ml-2">Limite: {status?.limits?.freepik ?? '-'}</span>
        </div>
        {renderApiProgress('freepik', 'Freepik')}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
          <Clock className="w-3 h-3 mr-1" />
          Última atualização: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </Card>
  );
};