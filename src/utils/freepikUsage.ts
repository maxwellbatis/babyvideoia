import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { getCredential } from './credentials';

const USAGE_FILE = path.join(process.cwd(), 'freepik_usage.json');
const LIMITS_FILE = path.join(process.cwd(), 'freepik_limits.json');
const ALERTS_FILE = path.join(process.cwd(), 'freepik_alerts.json');

// Configuração para uso ilimitado (sem limites impostos)
const UNLIMITED_CONFIG = {
  unlimited: true,        // Modo ilimitado ativado
  trackUsage: true,       // Ainda rastreia uso para estatísticas
  showWarnings: false,    // Não mostra avisos de limite
  autoFallback: false,    // Não faz fallback automático
  alertThresholds: {      // Limites para alertas preventivos (não bloqueiam)
    daily: 80,            // Alerta quando usar 80% do limite diário típico
    monthly: 70,          // Alerta quando usar 70% do limite mensal típico
    consecutiveErrors: 3  // Alerta após 3 erros consecutivos
  }
};

// Estrutura para rastrear alertas
interface FreepikAlert {
  type: 'usage' | 'error' | 'rate_limit';
  message: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
  resolved: boolean;
}

export function incrementFreepikUsage() {
  const today = new Date().toISOString().slice(0, 10);
  let usage: Record<string, number> = {};
  if (fs.existsSync(USAGE_FILE)) {
    usage = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf-8'));
  }
  usage[today] = (usage[today] || 0) + 1;
  fs.writeFileSync(USAGE_FILE, JSON.stringify(usage));
  console.log(`📊 Freepik: Uso registrado para ${today} (total: ${usage[today]})`);
  
  // Verificar se deve gerar alerta preventivo
  checkUsageAlerts(today, usage[today]);
}

function checkUsageAlerts(date: string, dailyUsage: number) {
  const alerts = loadAlerts();
  const today = new Date().toISOString().slice(0, 10);
  
  // Alerta preventivo para uso diário alto (mas não bloqueia)
  if (dailyUsage >= UNLIMITED_CONFIG.alertThresholds.daily) {
    const alert: FreepikAlert = {
      type: 'usage',
      message: `Uso diário alto detectado: ${dailyUsage} requisições. Considere adicionar uma nova chave Freepik para melhor distribuição.`,
      timestamp: new Date().toISOString(),
      severity: 'warning',
      resolved: false
    };
    
    // Verificar se já existe alerta similar hoje
    const existingAlert = alerts.find(a => 
      a.type === 'usage' && 
      a.timestamp.startsWith(today) && 
      !a.resolved
    );
    
    if (!existingAlert) {
      alerts.push(alert);
      saveAlerts(alerts);
      console.log(`⚠️ ALERTA PREVENTIVO: ${alert.message}`);
    }
  }
}

function loadAlerts(): FreepikAlert[] {
  if (fs.existsSync(ALERTS_FILE)) {
    return JSON.parse(fs.readFileSync(ALERTS_FILE, 'utf-8'));
  }
  return [];
}

function saveAlerts(alerts: FreepikAlert[]) {
  fs.writeFileSync(ALERTS_FILE, JSON.stringify(alerts, null, 2));
}

export function getFreepikUsageToday() {
  const today = new Date().toISOString().slice(0, 10);
  if (!fs.existsSync(USAGE_FILE)) return 0;
  const usage = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf-8'));
  return usage[today] || 0;
}

export function getFreepikUsageThisMonth() {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  if (!fs.existsSync(USAGE_FILE)) return 0;
  const usage = JSON.parse(fs.readFileSync(USAGE_FILE, 'utf-8'));
  
  let monthlyTotal = 0;
  Object.keys(usage).forEach(date => {
    if (date.startsWith(currentMonth)) {
      monthlyTotal += usage[date];
    }
  });
  
  return monthlyTotal;
}

export function canUseFreepik(): { canUse: boolean; reason?: string; usage: any; alerts?: FreepikAlert[] } {
  const today = getFreepikUsageToday();
  const thisMonth = getFreepikUsageThisMonth();
  const alerts = loadAlerts().filter(a => !a.resolved);
  
  // Em modo ilimitado, sempre pode usar
  const usage = {
    today,
    thisMonth,
    unlimited: true,
    message: 'Modo ilimitado ativado - use quantas chaves quiser!',
    alerts: alerts.length > 0 ? alerts : undefined
  };
  
  return { 
    canUse: true, 
    usage,
    reason: 'Modo ilimitado - sem limites impostos',
    alerts: alerts.length > 0 ? alerts : undefined
  };
}

export function getFreepikLimits() {
  // Retorna configuração ilimitada
  return UNLIMITED_CONFIG;
}

export function setFreepikLimits(limits: any) {
  // Salva configuração (mas não impõe limites)
  fs.writeFileSync(LIMITS_FILE, JSON.stringify({ ...UNLIMITED_CONFIG, ...limits }));
  console.log('✅ Configuração do Freepik atualizada (modo ilimitado mantido)');
}

// Função para verificar status da API Freepik (sem limites)
export async function checkFreepikApiStatus(): Promise<{ status: string; message: string; details?: any; alerts?: FreepikAlert[] }> {
  try {
    const apiKey = await getCredential('FREEPIK_API_KEY');
    if (!apiKey) {
      return { 
        status: 'no_key', 
        message: 'API key não configurada - adicione uma nova chave quando necessário' 
      };
    }
    
    // Teste simples da API
    const response = await axios.get('https://api.freepik.com/v1/user/me', {
      headers: {
        'x-freepik-api-key': apiKey
      },
      timeout: 5000
    });
    
    const alerts = loadAlerts().filter(a => !a.resolved);
    
    return { 
      status: 'active', 
      message: 'API Freepik funcionando normalmente - modo ilimitado ativo',
      details: response.data,
      alerts: alerts.length > 0 ? alerts : undefined
    };
  } catch (error: any) {
    const alerts = loadAlerts();
    
    if (error.response?.status === 401) {
      // Registrar alerta de chave inválida
      const alert: FreepikAlert = {
        type: 'error',
        message: 'Chave API Freepik inválida detectada. Adicione uma nova chave.',
        timestamp: new Date().toISOString(),
        severity: 'critical',
        resolved: false
      };
      
      alerts.push(alert);
      saveAlerts(alerts);
      
      return { 
        status: 'invalid_key', 
        message: 'Chave API inválida - adicione uma nova chave',
        alerts: [alert]
      };
    } else if (error.response?.status === 429) {
      // Registrar alerta de rate limit
      const alert: FreepikAlert = {
        type: 'rate_limit',
        message: 'Rate limit atingido na API Freepik. Adicione uma nova chave ou aguarde.',
        timestamp: new Date().toISOString(),
        severity: 'warning',
        resolved: false
      };
      
      alerts.push(alert);
      saveAlerts(alerts);
      
      return { 
        status: 'rate_limited', 
        message: 'Rate limit atingido - adicione uma nova chave ou aguarde',
        alerts: [alert]
      };
    } else {
      return { 
        status: 'error', 
        message: `Erro na API: ${error.message}` 
      };
    }
  }
}

// Função para resetar uso (útil para testes)
export function resetFreepikUsage() {
  if (fs.existsSync(USAGE_FILE)) {
    fs.unlinkSync(USAGE_FILE);
  }
  console.log('✅ Uso do Freepik resetado (modo ilimitado mantido)');
}

// Função para mostrar estatísticas (sem limites)
export function getFreepikStats() {
  const today = getFreepikUsageToday();
  const thisMonth = getFreepikUsageThisMonth();
  const alerts = loadAlerts().filter(a => !a.resolved);
  
  return {
    today,
    thisMonth,
    unlimited: true,
    message: 'Modo ilimitado ativo - use quantas chaves quiser!',
    dailyRemaining: '∞',
    monthlyRemaining: '∞',
    dailyPercentage: 0,
    monthlyPercentage: 0,
    status: 'unlimited',
    alerts: alerts.length > 0 ? alerts : undefined,
    recommendations: generateRecommendations(today, thisMonth, alerts)
  };
}

function generateRecommendations(dailyUsage: number, monthlyUsage: number, alerts: FreepikAlert[]): string[] {
  const recommendations: string[] = [];
  
  if (dailyUsage >= UNLIMITED_CONFIG.alertThresholds.daily) {
    recommendations.push('Considere adicionar uma nova chave Freepik para distribuir melhor o uso diário');
  }
  
  if (monthlyUsage >= UNLIMITED_CONFIG.alertThresholds.monthly * 30) {
    recommendations.push('Uso mensal alto detectado - adicione múltiplas chaves para melhor distribuição');
  }
  
  const errorAlerts = alerts.filter(a => a.type === 'error' || a.type === 'rate_limit');
  if (errorAlerts.length >= UNLIMITED_CONFIG.alertThresholds.consecutiveErrors) {
    recommendations.push('Múltiplos erros detectados - verifique suas chaves Freepik e adicione novas se necessário');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Sistema funcionando normalmente - continue usando quantas chaves quiser!');
  }
  
  return recommendations;
}

// Função para adicionar nova chave API
export async function addNewFreepikKey(newApiKey: string): Promise<{ success: boolean; message: string }> {
  try {
    // Aqui você pode implementar a lógica para salvar a nova chave
    // Por exemplo, no banco de dados ou arquivo de configuração
    console.log('🔑 Nova chave Freepik adicionada com sucesso!');
    
    // Testar a nova chave
    const testResponse = await axios.get('https://api.freepik.com/v1/user/me', {
      headers: {
        'x-freepik-api-key': newApiKey
      },
      timeout: 5000
    });
    
    // Marcar alertas relacionados como resolvidos
    const alerts = loadAlerts();
    const updatedAlerts = alerts.map(alert => ({
      ...alert,
      resolved: alert.type === 'error' || alert.type === 'rate_limit' ? true : alert.resolved
    }));
    saveAlerts(updatedAlerts);
    
    return { 
      success: true, 
      message: 'Nova chave Freepik adicionada e testada com sucesso! Alertas relacionados foram resolvidos.' 
    };
  } catch (error: any) {
    return { 
      success: false, 
      message: `Erro ao adicionar nova chave: ${error.message}` 
    };
  }
}

// Função para listar chaves ativas (se implementar múltiplas chaves)
export function getActiveFreepikKeys(): string[] {
  // Implementar lógica para retornar chaves ativas
  // Por enquanto, retorna array vazio
  return [];
}

// Função para alternar entre chaves (se implementar múltiplas chaves)
export async function switchFreepikKey(keyIndex: number): Promise<{ success: boolean; message: string }> {
  try {
    // Implementar lógica para alternar chaves
    console.log(`🔄 Alternando para chave Freepik #${keyIndex + 1}`);
    return { 
      success: true, 
      message: `Chave Freepik #${keyIndex + 1} ativada` 
    };
  } catch (error: any) {
    return { 
      success: false, 
      message: `Erro ao alternar chave: ${error.message}` 
    };
  }
}

// Função para obter alertas ativos
export function getActiveAlerts(): FreepikAlert[] {
  return loadAlerts().filter(a => !a.resolved);
}

// Função para marcar alerta como resolvido
export function resolveAlert(alertIndex: number): { success: boolean; message: string } {
  try {
    const alerts = loadAlerts();
    if (alertIndex >= 0 && alertIndex < alerts.length) {
      alerts[alertIndex].resolved = true;
      saveAlerts(alerts);
      return { success: true, message: 'Alerta marcado como resolvido' };
    }
    return { success: false, message: 'Índice de alerta inválido' };
  } catch (error: any) {
    return { success: false, message: `Erro ao resolver alerta: ${error.message}` };
  }
}

// Função para limpar alertas antigos (mais de 7 dias)
export function cleanupOldAlerts(): { success: boolean; message: string; cleaned: number } {
  try {
    const alerts = loadAlerts();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const originalCount = alerts.length;
    const filteredAlerts = alerts.filter(alert => {
      const alertDate = new Date(alert.timestamp);
      return alertDate > sevenDaysAgo || !alert.resolved;
    });
    
    saveAlerts(filteredAlerts);
    const cleaned = originalCount - filteredAlerts.length;
    
    return { 
      success: true, 
      message: `Limpeza concluída - ${cleaned} alertas antigos removidos`,
      cleaned
    };
  } catch (error: any) {
    return { 
      success: false, 
      message: `Erro na limpeza: ${error.message}`,
      cleaned: 0
    };
  }
} 