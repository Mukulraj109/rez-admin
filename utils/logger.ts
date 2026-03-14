const REDACTION_PATTERNS: RegExp[] = [
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g,
  /(token|secret|password)["']?\s*[:=]\s*["'][^"']+["']/gi,
];

function redact(input: unknown): string {
  const raw = typeof input === 'string' ? input : JSON.stringify(input);
  return REDACTION_PATTERNS.reduce((acc, pattern) => acc.replace(pattern, '[REDACTED]'), raw);
}

export const logger = {
  info(message: string, meta?: unknown) {
    if (__DEV__) {
      console.info(message, meta ?? '');
    }
  },
  warn(message: string, meta?: unknown) {
    if (__DEV__) {
      console.warn(message, meta ?? '');
    }
  },
  error(message: string, error?: unknown) {
    const safeMessage = redact(message);
    const safeError = error ? redact(error) : '';
    console.error(safeMessage, safeError);
  },
};

export function installProductionConsoleGuard(): void {
  if (__DEV__) return;

  const originalError = console.error.bind(console);
  console.log = () => {};
  console.info = () => {};
  console.debug = () => {};
  console.warn = () => {};
  console.error = (...args: unknown[]) => {
    const redactedArgs = args.map((arg) => redact(arg));
    originalError(...redactedArgs);
  };
}

