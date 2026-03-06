/**
 * Symphony — structured logger.
 *
 * Emits `key=value` pairs to stderr (section 13.1 / 13.2).  Using stderr
 * keeps the structured log stream separate from any stdout output so that
 * operators can always redirect them independently.
 *
 * Format: `[LEVEL] timestamp  msg  key=value key=value …`
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Minimum level at runtime; can be changed via SYMPHONY_LOG_LEVEL env var.
let currentLevel: LogLevel = 'info';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** Override the minimum log level at startup. */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

/** Resolve log level from environment variable. */
export function initLogLevel(): void {
  const env = (process.env['SYMPHONY_LOG_LEVEL'] ?? '').toLowerCase().trim() as LogLevel;
  if (env in LEVELS) {
    currentLevel = env;
  }
}

/**
 * Format a context object as `key=value` pairs.  Values containing spaces
 * are quoted.  Nested objects are JSON-stringified.
 */
function formatContext(ctx: Record<string, unknown>): string {
  return Object.entries(ctx)
    .map(([k, v]) => {
      const str =
        v === null || v === undefined
          ? 'null'
          : typeof v === 'object'
            ? JSON.stringify(v)
            : String(v);
      return str.includes(' ') ? `${k}="${str}"` : `${k}=${str}`;
    })
    .join(' ');
}

function emit(level: LogLevel, msg: string, ctx: Record<string, unknown>): void {
  if (LEVELS[level] < LEVELS[currentLevel]) return;
  const ts = new Date().toISOString();
  const tag = level.toUpperCase().padEnd(5);
  const ctxStr = Object.keys(ctx).length > 0 ? '  ' + formatContext(ctx) : '';
  process.stderr.write(`[${tag}] ${ts}  ${msg}${ctxStr}\n`);
}

export const logger = {
  debug(msg: string, ctx: Record<string, unknown> = {}): void {
    emit('debug', msg, ctx);
  },
  info(msg: string, ctx: Record<string, unknown> = {}): void {
    emit('info', msg, ctx);
  },
  warn(msg: string, ctx: Record<string, unknown> = {}): void {
    emit('warn', msg, ctx);
  },
  error(msg: string, ctx: Record<string, unknown> = {}): void {
    emit('error', msg, ctx);
  },
};
