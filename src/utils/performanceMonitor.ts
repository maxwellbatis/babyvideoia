import { log, logPerf } from './logger';

interface PerformanceMetric {
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  success: boolean;
  error?: string;
  metadata?: any;
}

interface ApiMetric {
  service: string;
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private apiMetrics: ApiMetric[] = [];
  private maxMetrics = 1000; // Manter apenas as últimas 1000 métricas
  
  // Iniciar medição
  start(operation: string, metadata?: any): string {
    const id = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const metric: PerformanceMetric = {
      operation,
      startTime: Date.now(),
      success: false,
      metadata
    };
    
    this.metrics.push(metric);
    this.cleanupOldMetrics();
    
    return id;
  }
  
  // Finalizar medição
  end(id: string, success: boolean = true, error?: string): void {
    const metric = this.metrics.find(m => 
      m.operation === id.split('_')[0] && 
      m.startTime === parseInt(id.split('_')[1])
    );
    
    if (metric) {
      metric.endTime = Date.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.success = success;
      metric.error = error;
      
      logPerf(metric.operation, metric.startTime);
      
      if (!success && error) {
        log(`❌ Performance: ${metric.operation} falhou em ${metric.duration}ms - ${error}`);
      }
    }
  }
  
  // Registrar métrica de API
  recordApi(service: string, operation: string, duration: number, success: boolean, error?: string): void {
    const apiMetric: ApiMetric = {
      service,
      operation,
      duration,
      success,
      error,
      timestamp: Date.now()
    };
    
    this.apiMetrics.push(apiMetric);
    this.cleanupOldApiMetrics();
    
    const status = success ? '✅' : '❌';
    log(`🌐 API ${status} ${service}:${operation} - ${duration}ms${error ? ` - ${error}` : ''}`);
  }
  
  // Obter estatísticas de performance
  getStats(): {
    totalOperations: number;
    averageDuration: number;
    successRate: number;
    slowestOperations: Array<{ operation: string; duration: number }>;
    apiStats: Record<string, { calls: number; avgDuration: number; successRate: number }>;
  } {
    const completedMetrics = this.metrics.filter(m => m.duration !== undefined);
    
    if (completedMetrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        successRate: 0,
        slowestOperations: [],
        apiStats: {}
      };
    }
    
    const totalDuration = completedMetrics.reduce((sum, m) => sum + (m.duration || 0), 0);
    const averageDuration = totalDuration / completedMetrics.length;
    const successCount = completedMetrics.filter(m => m.success).length;
    const successRate = (successCount / completedMetrics.length) * 100;
    
    // Operações mais lentas
    const slowestOperations = completedMetrics
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 5)
      .map(m => ({ operation: m.operation, duration: m.duration || 0 }));
    
    // Estatísticas de APIs
    const apiStats: Record<string, { calls: number; avgDuration: number; successRate: number }> = {};
    const apiGroups = this.apiMetrics.reduce((groups, metric) => {
      const key = metric.service;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(metric);
      return groups;
    }, {} as Record<string, ApiMetric[]>);
    
    Object.entries(apiGroups).forEach(([service, metrics]) => {
      const totalDuration = metrics.reduce((sum, m) => sum + m.duration, 0);
      const successCount = metrics.filter(m => m.success).length;
      
      apiStats[service] = {
        calls: metrics.length,
        avgDuration: totalDuration / metrics.length,
        successRate: (successCount / metrics.length) * 100
      };
    });
    
    return {
      totalOperations: completedMetrics.length,
      averageDuration: Math.round(averageDuration),
      successRate: Math.round(successRate * 100) / 100,
      slowestOperations,
      apiStats
    };
  }
  
  // Gerar relatório de performance
  generateReport(): string {
    const stats = this.getStats();
    const report = [
      '📊 RELATÓRIO DE PERFORMANCE',
      '='.repeat(50),
      `Total de operações: ${stats.totalOperations}`,
      `Duração média: ${stats.averageDuration}ms`,
      `Taxa de sucesso: ${stats.successRate}%`,
      '',
      '🐌 Operações mais lentas:',
      ...stats.slowestOperations.map(op => 
        `  • ${op.operation}: ${op.duration}ms`
      ),
      '',
      '🌐 Estatísticas de APIs:',
      ...Object.entries(stats.apiStats).map(([service, apiStats]) => 
        `  • ${service}: ${apiStats.calls} chamadas, ${Math.round(apiStats.avgDuration)}ms média, ${Math.round(apiStats.successRate)}% sucesso`
      )
    ].join('\n');
    
    return report;
  }
  
  // Limpar métricas antigas
  private cleanupOldMetrics(): void {
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }
  
  private cleanupOldApiMetrics(): void {
    if (this.apiMetrics.length > this.maxMetrics) {
      this.apiMetrics = this.apiMetrics.slice(-this.maxMetrics);
    }
  }
  
  // Resetar monitoramento
  reset(): void {
    this.metrics = [];
    this.apiMetrics = [];
    log('🔄 Monitoramento de performance resetado');
  }
}

// Instância global
export const performanceMonitor = new PerformanceMonitor();

// Decorator para medir performance automaticamente
export function measurePerformance(operation: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const id = performanceMonitor.start(operation);
      try {
        const result = await method.apply(this, args);
        performanceMonitor.end(id, true);
        return result;
      } catch (error) {
        performanceMonitor.end(id, false, error.message);
        throw error;
      }
    };
  };
}

// Função utilitária para medir performance de APIs
export function measureApiPerformance(service: string, operation: string) {
  return async function <T>(apiCall: () => Promise<T>): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await apiCall();
      const duration = Date.now() - startTime;
      performanceMonitor.recordApi(service, operation, duration, true);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      performanceMonitor.recordApi(service, operation, duration, false, error.message);
      throw error;
    }
  };
} 