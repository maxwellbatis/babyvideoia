import fs from 'fs';
import path from 'path';

// Configuração de logs
const LOG_CONFIG = {
  level: process.env.LOG_LEVEL || 'info', // debug, info, warn, error
  enableFileLog: process.env.ENABLE_FILE_LOG === 'true',
  enableConsoleLog: process.env.ENABLE_CONSOLE_LOG !== 'false',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  logDir: 'logs'
};

// Níveis de log
const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

// Cores para console
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class Logger {
  private logFile: string;
  private currentLevel: number;
  
  constructor() {
    this.currentLevel = LOG_LEVELS[LOG_CONFIG.level as keyof typeof LOG_LEVELS] || LOG_LEVELS.info;
    
    if (LOG_CONFIG.enableFileLog) {
      this.ensureLogDir();
      this.logFile = path.join(LOG_CONFIG.logDir, `app_${new Date().toISOString().split('T')[0]}.log`);
    }
  }
  
  private ensureLogDir(): void {
    if (!fs.existsSync(LOG_CONFIG.logDir)) {
      fs.mkdirSync(LOG_CONFIG.logDir, { recursive: true });
    }
  }
  
  private shouldLog(level: number): boolean {
    return level >= this.currentLevel;
  }
  
  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ') : '';
    
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${formattedArgs}`;
  }
  
  private writeToFile(message: string): void {
    if (!LOG_CONFIG.enableFileLog || !this.logFile) return;
    
    try {
      // Verificar tamanho do arquivo
      if (fs.existsSync(this.logFile) && fs.statSync(this.logFile).size > LOG_CONFIG.maxFileSize) {
        // Rotacionar arquivo
        const backupFile = this.logFile.replace('.log', `_${Date.now()}.log`);
        fs.renameSync(this.logFile, backupFile);
      }
      
      fs.appendFileSync(this.logFile, message + '\n');
    } catch (error) {
      console.error('Erro ao escrever no arquivo de log:', error);
    }
  }
  
  private writeToConsole(message: string, level: string): void {
    if (!LOG_CONFIG.enableConsoleLog) return;
    
    let color = COLORS.reset;
    switch (level) {
      case 'error': color = COLORS.red; break;
      case 'warn': color = COLORS.yellow; break;
      case 'info': color = COLORS.green; break;
      case 'debug': color = COLORS.cyan; break;
    }
    
    console.log(`${color}${message}${COLORS.reset}`);
  }
  
  private log(level: string, message: string, ...args: any[]): void {
    const levelNum = LOG_LEVELS[level as keyof typeof LOG_LEVELS];
    if (!this.shouldLog(levelNum)) return;
    
    const formattedMessage = this.formatMessage(level, message, ...args);
    
    this.writeToFile(formattedMessage);
    this.writeToConsole(formattedMessage, level);
  }
  
  debug(message: string, ...args: any[]): void {
    this.log('debug', message, ...args);
  }
  
  info(message: string, ...args: any[]): void {
    this.log('info', message, ...args);
  }
  
  warn(message: string, ...args: any[]): void {
    this.log('warn', message, ...args);
  }
  
  error(message: string, ...args: any[]): void {
    this.log('error', message, ...args);
  }
  
  // Logs específicos para performance
  perf(operation: string, startTime: number): void {
    const duration = Date.now() - startTime;
    this.info(`⏱️ ${operation} concluído em ${duration}ms`);
  }
  
  // Logs específicos para APIs
  api(service: string, operation: string, status: 'success' | 'error', details?: any): void {
    const emoji = status === 'success' ? '✅' : '❌';
    this.info(`${emoji} ${service}: ${operation} - ${status}`, details);
  }
}

// Instância global
export const logger = new Logger();

// Função de compatibilidade
export const log = (message: string, ...args: any[]): void => {
  logger.info(message, ...args);
};

// Funções específicas para diferentes tipos de log
export const logDebug = (message: string, ...args: any[]): void => {
  logger.debug(message, ...args);
};

export const logWarn = (message: string, ...args: any[]): void => {
  logger.warn(message, ...args);
};

export const logError = (message: string, ...args: any[]): void => {
  logger.error(message, ...args);
};

export const logPerf = (operation: string, startTime: number): void => {
  logger.perf(operation, startTime);
};

export const logApi = (service: string, operation: string, status: 'success' | 'error', details?: any): void => {
  logger.api(service, operation, status, details);
};
  