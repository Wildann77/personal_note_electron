/**
 * Result type contract for IPC communication and domain use cases.
 * Enforces a strict discriminated union pattern across processes.
 */
export type Result<T, E = AppErrorPayload> =
  { success: true; data: T } | { success: false; error: E };

/**
 * Standard error codes categorized by architectural failure domain.
 */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONCURRENCY_ERROR'
  | 'DATABASE_ERROR'
  | 'IPC_SECURITY_ERROR'
  | 'BACKUP_ERROR'
  | 'INTERNAL_ERROR';

/**
 * Structured error payload returned when an operation fails.
 */
export interface AppErrorPayload {
  code: ErrorCode;
  message: string;
  details?: unknown;
}
