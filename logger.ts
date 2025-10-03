// Logger simple para el sistema de webhooks

interface LogLevel {
  INFO: 'info';
  ERROR: 'error';
  WARN: 'warn';
  DEBUG: 'debug';
}

class Logger {
  private logLevel: string = 'info';

  info(message: string, data?: any) {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data || '');
  }

  error(message: string, error?: any) {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error || '');
  }

  warn(message: string, data?: any) {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data || '');
  }

  debug(message: string, data?: any) {
    if (this.logLevel === 'debug') {
      console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, data || '');
    }
  }

  setLevel(level: string) {
    this.logLevel = level;
  }
}

const logger = new Logger();
export default logger;