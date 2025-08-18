import axios from '../axios';

enum LogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

interface LogContext {
  [key: string]: any;
}

const log = (message: string, level: LogLevel = LogLevel.INFO, context: LogContext = {}): void => {
  try {
    // Using navigator.sendBeacon if available for reliability, otherwise fallback to axios
    // However, sendBeacon sends POST and doesn't support JSON, so we stick to axios
    // for simplicity and consistency with the backend.
    axios.post('/api/log', {
      message,
      level,
      context,
    }).catch(error => {
      // Silently fail, but log to console for developer awareness during development
      console.error('Failed to send log to server:', error);
    });
  } catch (error) {
    console.error('Error in logger utility:', error);
  }
};

export { log, LogLevel };
