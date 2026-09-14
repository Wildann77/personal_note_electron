import path from 'path';
import { app } from 'electron';
import log from 'electron-log';

/**
 * Resolves directory safely across main process runtime and unit test environments.
 */
const getUserDataPath = (): string => {
  try {
    if (app && typeof app.getPath === 'function') {
      return app.getPath('userData');
    }
  } catch {
    // Fallback when app is not ready or within isolated test runners
  }
  return process.cwd();
};

log.transports.file.resolvePathFn = () => path.join(getUserDataPath(), 'logs/personal-note.log');
log.transports.file.maxSize = 5 * 1024 * 1024; // 5 MB rotation limit
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}';

/**
 * Deep/recursive sanitization function that redacts sensitive note content
 * ('content' and 'blocks' fields) from log payloads to guarantee Zero-Leak (Architecture §11).
 *
 * @param data Arbitrary log metadata, object, array, or primitive.
 * @returns Sanitized clone of data with sensitive note content redacted.
 */
export function sanitize<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (data instanceof Date || data instanceof RegExp) {
    return data;
  }

  if (data instanceof Error) {
    return {
      name: data.name,
      message: data.message,
      stack: data.stack,
    } as unknown as T;
  }

  if (Array.isArray(data)) {
    const list: unknown[] = (data as unknown[]).map((item: unknown) => sanitize(item));
    return list as T;
  }

  const record = data as Record<string, unknown>;
  const clean: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (key === 'content') {
      clean[key] = '[REDACTED_CONTENT]';
    } else if (key === 'blocks') {
      clean[key] = '[REDACTED_BLOCKS]';
    } else if (typeof value === 'object' && value !== null) {
      clean[key] = sanitize(value);
    } else {
      clean[key] = value;
    }
  }

  return clean as T;
}

/**
 * Zero-Leak Application Logger.
 * Guarantees that note contents and blocks are never logged in plaintext (PRD §Zero-Leak, Architecture §11).
 */
export const logger = {
  info: (message: string, meta?: unknown): void => {
    log.info(message, meta !== undefined ? sanitize(meta) : '');
  },

  warn: (message: string, meta?: unknown): void => {
    log.warn(message, meta !== undefined ? sanitize(meta) : '');
  },

  error: (message: string, error?: unknown): void => {
    if (error instanceof Error) {
      log.error(message, error.stack || error.message);
    } else if (error !== undefined) {
      log.error(message, sanitize(error));
    } else {
      log.error(message);
    }
  },

  sanitize,
  transports: log.transports,
};
