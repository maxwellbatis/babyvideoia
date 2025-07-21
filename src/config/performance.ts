// Configurações de performance centralizadas
export const PERFORMANCE_CONFIG = {
  // Paralelização
  maxConcurrentImages: 3, // Máximo de imagens geradas simultaneamente
  maxConcurrentScenes: 2, // Máximo de cenas processadas simultaneamente
  
  // Timeouts
  imageGenerationTimeout: 120000, // 2 minutos
  apiTimeout: 30000, // 30 segundos
  videoProcessingTimeout: 300000, // 5 minutos
  
  // Cache
  enableImageCache: true,
  cacheMaxAge: 24 * 60 * 60 * 1000, // 24 horas
  cacheMaxSize: 500 * 1024 * 1024, // 500MB
  
  // Logs
  logLevel: process.env.LOG_LEVEL || 'info',
  enablePerformanceLogs: true,
  enableApiLogs: true,
  
  // Processamento
  enableParallelProcessing: true,
  enableBatchProcessing: true,
  batchSize: 3,
  
  // Fallbacks
  enableFastFallbacks: true,
  maxRetries: 2,
  retryDelay: 1000, // 1 segundo
  
  // Limpeza
  autoCleanup: true,
  cleanupInterval: 60 * 60 * 1000, // 1 hora
  maxTempFiles: 100,
  
  // APIs
  apiConfig: {
    gemini: {
      timeout: 30000,
      maxRetries: 2,
      batchSize: 1
    },
    groq: {
      timeout: 30000,
      maxRetries: 2,
      batchSize: 1
    },
    elevenlabs: {
      timeout: 60000,
      maxRetries: 1,
      batchSize: 1
    },
    freepik: {
      timeout: 15000,
      maxRetries: 1,
      batchSize: 1
    },
    stableDiffusion: {
      timeout: 120000,
      maxRetries: 1,
      batchSize: 1
    }
  }
};

// Configurações específicas por ambiente
export const ENV_CONFIG = {
  development: {
    ...PERFORMANCE_CONFIG,
    logLevel: 'debug',
    enablePerformanceLogs: true,
    maxConcurrentImages: 2,
    maxConcurrentScenes: 1
  },
  production: {
    ...PERFORMANCE_CONFIG,
    logLevel: 'info',
    enablePerformanceLogs: false,
    maxConcurrentImages: 5,
    maxConcurrentScenes: 3,
    enableFastFallbacks: true
  },
  test: {
    ...PERFORMANCE_CONFIG,
    logLevel: 'error',
    enablePerformanceLogs: false,
    maxConcurrentImages: 1,
    maxConcurrentScenes: 1,
    enableImageCache: false
  }
};

// Função para obter configuração baseada no ambiente
export function getConfig() {
  const env = process.env.NODE_ENV || 'development';
  return ENV_CONFIG[env as keyof typeof ENV_CONFIG] || ENV_CONFIG.development;
}

// Função para verificar se uma otimização está habilitada
export function isOptimizationEnabled(feature: keyof typeof PERFORMANCE_CONFIG): boolean {
  const config = getConfig();
  return config[feature] === true;
}

// Função para obter timeout de uma API
export function getApiTimeout(api: keyof typeof PERFORMANCE_CONFIG.apiConfig): number {
  const config = getConfig();
  return config.apiConfig[api].timeout;
}

// Função para obter configuração de retry
export function getRetryConfig(api: keyof typeof PERFORMANCE_CONFIG.apiConfig) {
  const config = getConfig();
  return {
    maxRetries: config.apiConfig[api].maxRetries,
    timeout: config.apiConfig[api].timeout,
    batchSize: config.apiConfig[api].batchSize
  };
} 