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
    fetch('/api/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        level,
        context,
      }),
    }).catch(error => {
      // Silently fail, but log to console for developer awareness during development
      console.error('Failed to send log to server:', error);
    });
  } catch (error) {
    console.error('Error in logger utility:', error);
  }
};

export { log, LogLevel };
