import type { IpcMainInvokeEvent } from 'electron';
import { ZodType, ZodError } from 'zod';
import type { Result } from '@shared/types/result';
import { validateIpcSender } from '@main/ipc/security/validateSender';
import { AppError } from '@main/domain/errors/AppError';
import { logger } from '@main/infrastructure/logger/logger';

/**
 * Standardized protected IPC handler wrapper (Architecture §5.2).
 * Sequence:
 * 1. Validates sender origin (webContents) via validateIpcSender
 * 2. Parses and validates input payload runtime via Zod schema
 * 3. Executes the application use case handler
 * 4. Transforms any error into structured Result<TOutput> without leaking internal stack traces.
 *
 * @param schema Zod validation schema for the input payload
 * @param handler Asynchronous use case execution function
 * @returns Standard Electron ipcMain.handle callback returning Result<TOutput>
 */
export function createProtectedHandler<TInput, TOutput>(
  schema: ZodType<TInput>,
  handler: (input: TInput, event: IpcMainInvokeEvent) => Promise<TOutput>,
) {
  return async (event: IpcMainInvokeEvent, rawInput: unknown): Promise<Result<TOutput>> => {
    try {
      // 1. Validasi Keamanan Pengirim
      validateIpcSender(event);

      // 2. Validasi Runtime Skema Payload via Zod 4.x
      const parsedInput = schema.parse(rawInput);

      // 3. Eksekusi Use Case
      const data = await handler(parsedInput, event);
      return { success: true, data };
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Parameter request tidak valid',
            details: err.flatten(),
          },
        };
      }

      if (err instanceof AppError) {
        return {
          success: false,
          error: {
            code: err.code,
            message: err.message,
            ...(err.details !== undefined ? { details: err.details } : {}),
          },
        };
      }

      if (err instanceof Error && err.message.startsWith('SECURITY_VIOLATION')) {
        return {
          success: false,
          error: {
            code: 'IPC_SECURITY_ERROR',
            message: err.message,
          },
        };
      }

      logger.error('[Unhandled IPC Error]:', err);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Terjadi kesalahan sistem internal',
        },
      };
    }
  };
}
