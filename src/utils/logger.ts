// Logger utilitário
export function log(message: string): void {
    const time = new Date().toISOString();
    console.log(`[${time}] ${message}`);
  }
  