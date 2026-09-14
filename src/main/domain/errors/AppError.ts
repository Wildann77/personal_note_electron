import type { ErrorCode, AppErrorPayload } from '@shared/types/result';

/**
 * Base domain error class carrying structured error codes and optional details.
 * Captured by IPC handlers and transformed into standard Result<T, AppErrorPayload>.
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Serializes the error to the standard IPC error payload contract.
   */
  public toPayload(): AppErrorPayload {
    return {
      code: this.code,
      message: this.message,
      ...(this.details !== undefined ? { details: this.details } : {}),
    };
  }

  public static validation(message: string, details?: unknown): ValidationError {
    return new ValidationError(message, details);
  }

  public static notFound(message: string, details?: unknown): NotFoundError {
    return new NotFoundError(message, details);
  }

  public static concurrency(message: string, details?: unknown): ConcurrencyError {
    return new ConcurrencyError(message, details);
  }

  public static database(message: string, details?: unknown): DatabaseError {
    return new DatabaseError(message, details);
  }

  public static ipcSecurity(message: string, details?: unknown): IpcSecurityError {
    return new IpcSecurityError(message, details);
  }

  public static backup(message: string, details?: unknown): BackupError {
    return new BackupError(message, details);
  }

  public static internal(message: string, details?: unknown): InternalError {
    return new InternalError(message, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, details?: unknown) {
    super('NOT_FOUND', message, details);
    this.name = 'NotFoundError';
  }
}

export class ConcurrencyError extends AppError {
  constructor(message: string, details?: unknown) {
    super('CONCURRENCY_ERROR', message, details);
    this.name = 'ConcurrencyError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: unknown) {
    super('DATABASE_ERROR', message, details);
    this.name = 'DatabaseError';
  }
}

export class IpcSecurityError extends AppError {
  constructor(message: string, details?: unknown) {
    super('IPC_SECURITY_ERROR', message, details);
    this.name = 'IpcSecurityError';
  }
}

export class BackupError extends AppError {
  constructor(message: string, details?: unknown) {
    super('BACKUP_ERROR', message, details);
    this.name = 'BackupError';
  }
}

export class InternalError extends AppError {
  constructor(message: string, details?: unknown) {
    super('INTERNAL_ERROR', message, details);
    this.name = 'InternalError';
  }
}
