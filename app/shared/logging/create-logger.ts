type TLogLevel = 'info' | 'warn' | 'error';

interface ILogPayload {
  level: TLogLevel;
  event: string;
  context?: Record<string, unknown>;
}

export default function createLogger() {
  return {
    info(event: string, context?: Record<string, unknown>) {
      writeLog({ level: 'info', event, context });
    },
    warn(event: string, context?: Record<string, unknown>) {
      writeLog({ level: 'warn', event, context });
    },
    error(event: string, context?: Record<string, unknown>) {
      writeLog({ level: 'error', event, context });
    }
  };
}

function writeLog({ level, event, context }: ILogPayload) {
  console[level](
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event,
      context
    })
  );
}
