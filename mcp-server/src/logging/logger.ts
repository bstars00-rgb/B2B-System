import type { LogLevel } from '../config/env.js';

/**
 * 구조화 JSON 로거.
 * - 반드시 stderr 로만 출력한다 (stdout 은 MCP stdio 통신 전용 — 오염 금지).
 * - 토큰/자격증명/개인정보로 의심되는 키는 자동 마스킹한다.
 */
const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const SENSITIVE_KEY_PATTERN =
  /(token|api[-_]?key|authorization|password|secret|credential|cookie|session[-_]?id|email|phone|passport|birth)/i;

const MAX_DEPTH = 6;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return '[TRUNCATED]';
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY_PATTERN.test(k) ? '[REDACTED]' : redact(v, depth + 1);
    }
    return out;
  }
  return value;
}

export class Logger {
  constructor(
    private readonly level: LogLevel,
    private readonly bindings: Record<string, unknown> = {},
  ) {}

  child(bindings: Record<string, unknown>): Logger {
    return new Logger(this.level, { ...this.bindings, ...bindings });
  }

  private write(level: LogLevel, message: string, fields?: Record<string, unknown>): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[this.level]) return;
    const record = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(redact({ ...this.bindings, ...(fields ?? {}) }) as Record<string, unknown>),
    };
    process.stderr.write(`${JSON.stringify(record)}\n`);
  }

  debug(message: string, fields?: Record<string, unknown>): void {
    this.write('debug', message, fields);
  }
  info(message: string, fields?: Record<string, unknown>): void {
    this.write('info', message, fields);
  }
  warn(message: string, fields?: Record<string, unknown>): void {
    this.write('warn', message, fields);
  }
  error(message: string, fields?: Record<string, unknown>): void {
    this.write('error', message, fields);
  }
}

export function createLogger(level: LogLevel, bindings?: Record<string, unknown>): Logger {
  return new Logger(level, bindings ?? {});
}
