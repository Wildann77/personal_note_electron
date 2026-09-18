import type { IpcMainInvokeEvent } from 'electron';
import { ZodType, ZodError } from 'zod';
import type { Result } from '@shared/types/result';
import { validateIpcSender } from '@main/ipc/security/validateSender';
import { AppError } from '@main/domain/errors/AppError';
import { logger } from '@main/infrastructure/logger/logger';

/**
 * Standardized protected IPC handler wrapper (Architecture §5.2).
 * Sequence:
 * 1. Logs request entry (channel, sender webContents id)
 * 2. Validates sender origin (webContents) via validateIpcSender
 * 3. Parses and validates input payload runtime via Zod schema
 * 4. Executes the application use case handler
 * 5. Logs request duration & sanitized result metadata
 * 6. Transforms any error into structured Result<TOutput> without leaking internal stack traces.
 *
 * @param schema Zod validation schema for the input payload
 * @param handler Asynchronous use case execution function
 * @param channelName Optional IPC channel identifier for structured logging
 * @returns Standard Electron ipcMain.handle callback returning Result<TOutput>
 */
export function createProtectedHandler<TInput, TOutput>(
  schema: ZodType<TInput>,
  handler: (input: TInput, event: IpcMainInvokeEvent) => Promise<TOutput>,
  channelName?: string,
) {
  return async (event: IpcMainInvokeEvent, rawInput: unknown): Promise<Result<TOutput>> => {
    const channelTag = channelName ? `[IPC:${channelName}]` : '[IPC]';
    const startTime = performance.now();
    logger.info(`${channelTag} Request received`, { senderId: event?.sender?.id });

    try {
      // 1. Validasi Keamanan Pengirim
      validateIpcSender(event);

      // 2. Validasi Runtime Skema Payload via Zod 4.x
      const parsedInput = schema.parse(rawInput);

      // 3. Eksekusi Use Case
      const data = await handler(parsedInput, event);
      const durationMs = Math.round((performance.now() - startTime) * 100) / 100;
      logger.info(`${channelTag} Succeeded in ${durationMs}ms`, {
        durationMs,
        result: data,
      });
      return { success: true, data };
    } catch (err: unknown) {
      const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

      if (err instanceof ZodError) {
        logger.warn(`${channelTag} Validation failed in ${durationMs}ms`, {
          durationMs,
          error: err.flatten(),
        });
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
        logger.warn(`${channelTag} AppError [${err.code}] in ${durationMs}ms: ${err.message}`, {
          durationMs,
          code: err.code,
          details: err.details,
        });
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
        logger.warn(`${channelTag} Security violation in ${durationMs}ms: ${err.message}`, {
          durationMs,
          error: err.message,
        });
        return {
          success: false,
          error: {
            code: 'IPC_SECURITY_ERROR',
            message: err.message,
          },
        };
      }

      logger.error(
        channelName ? `[Unhandled IPC Error - ${channelName}]:` : '[Unhandled IPC Error]:',
        err,
      );
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
