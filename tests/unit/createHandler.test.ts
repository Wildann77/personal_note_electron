import { describe, it, expect, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import type { IpcMainInvokeEvent } from 'electron';
import { createProtectedHandler } from '@main/ipc/utils/createHandler';
import { WindowManager } from '@main/infrastructure/windows/WindowManager';
import { AppError } from '@main/domain/errors/AppError';
import { logger } from '@main/infrastructure/logger/logger';

describe('createProtectedHandler (Unit - Architecture §5.2)', () => {
  const validEvent = {
    sender: { id: 100 },
  } as unknown as IpcMainInvokeEvent;

  const testSchema = z.object({
    title: z.string().min(1, 'Judul tidak boleh kosong'),
    count: z.number().int().positive(),
  });

  let loggerInfoSpy: ReturnType<typeof vi.spyOn>;
  let loggerWarnSpy: ReturnType<typeof vi.spyOn>;
  let loggerErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(WindowManager, 'isValidWebContents').mockReturnValue(true);
    loggerInfoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {});
    loggerWarnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
  });

  it('successfully executes handler when sender and schema are valid', async () => {
    const mockHandler = vi.fn().mockResolvedValue({ id: 1, title: 'Halo' });
    const protectedHandler = createProtectedHandler(testSchema, mockHandler, 'test:channel');

    const result = await protectedHandler(validEvent, { title: 'Catatan 1', count: 5 });

    expect(result).toEqual({
      success: true,
      data: { id: 1, title: 'Halo' },
    });
    expect(mockHandler).toHaveBeenCalledWith({ title: 'Catatan 1', count: 5 }, validEvent);
    expect(loggerInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining('[IPC:test:channel] Request received'),
      expect.any(Object),
    );
    expect(loggerInfoSpy).toHaveBeenCalledWith(
      expect.stringContaining('[IPC:test:channel] Succeeded in'),
      expect.objectContaining({
        result: { id: 1, title: 'Halo' },
      }),
    );
  });

  it('rejects unregistered sender and does not execute handler (IPC_SECURITY_ERROR)', async () => {
    vi.spyOn(WindowManager, 'isValidWebContents').mockReturnValue(false);

    const mockHandler = vi.fn();
    const protectedHandler = createProtectedHandler(testSchema, mockHandler);

    const result = await protectedHandler(validEvent, { title: 'Catatan', count: 1 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('IPC_SECURITY_ERROR');
      expect(result.error.message).toContain('SECURITY_VIOLATION');
    }
    expect(mockHandler).not.toHaveBeenCalled();
  });

  it('rejects invalid payload without executing handler (VALIDATION_ERROR)', async () => {
    const mockHandler = vi.fn();
    const protectedHandler = createProtectedHandler(testSchema, mockHandler);

    const result = await protectedHandler(validEvent, { title: '', count: -1 });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('VALIDATION_ERROR');
      expect(result.error.message).toBe('Parameter request tidak valid');
      expect(result.error.details).toBeDefined();
    }
    expect(mockHandler).not.toHaveBeenCalled();
    expect(loggerWarnSpy).toHaveBeenCalled();
  });

  it('maps domain AppError subclasses to their specific error codes and details', async () => {
    const notFoundHandler = vi
      .fn()
      .mockRejectedValue(AppError.notFound('Catatan ID 42 tidak ditemukan', { id: 42 }));
    const protectedNotFound = createProtectedHandler(testSchema, notFoundHandler);

    const notFoundResult = await protectedNotFound(validEvent, { title: 'Test', count: 1 });

    expect(notFoundResult).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Catatan ID 42 tidak ditemukan',
        details: { id: 42 },
      },
    });
    expect(loggerWarnSpy).toHaveBeenCalled();

    const concurrencyHandler = vi
      .fn()
      .mockRejectedValue(
        AppError.concurrency('Konflik revisi', { currentRevision: 3, expectedRevision: 2 }),
      );
    const protectedConcurrency = createProtectedHandler(testSchema, concurrencyHandler);

    const concurrencyResult = await protectedConcurrency(validEvent, { title: 'Test', count: 1 });

    expect(concurrencyResult).toEqual({
      success: false,
      error: {
        code: 'CONCURRENCY_ERROR',
        message: 'Konflik revisi',
        details: { currentRevision: 3, expectedRevision: 2 },
      },
    });
  });

  it('maps SECURITY_VIOLATION raw error to IPC_SECURITY_ERROR', async () => {
    const secViolationHandler = vi
      .fn()
      .mockRejectedValue(new Error('SECURITY_VIOLATION: Origin invalid'));
    const protectedSec = createProtectedHandler(testSchema, secViolationHandler);

    const result = await protectedSec(validEvent, { title: 'Test', count: 1 });

    expect(result).toEqual({
      success: false,
      error: {
        code: 'IPC_SECURITY_ERROR',
        message: 'SECURITY_VIOLATION: Origin invalid',
      },
    });
    expect(loggerWarnSpy).toHaveBeenCalled();
  });

  it('logs unhandled error and returns generic INTERNAL_ERROR without leaking stack trace', async () => {
    const crashHandler = vi.fn().mockRejectedValue(new TypeError('Unexpected null reference'));
    const protectedCrash = createProtectedHandler(testSchema, crashHandler);

    const result = await protectedCrash(validEvent, { title: 'Test', count: 1 });

    expect(loggerErrorSpy).toHaveBeenCalledWith('[Unhandled IPC Error]:', expect.any(TypeError));
    expect(result).toEqual({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Terjadi kesalahan sistem internal',
      },
    });
    // Ensure no stack trace or raw TypeError leaked in error object
    if (!result.success) {
      expect(result.error.details).toBeUndefined();
      expect(result.error.message).not.toContain('Unexpected null reference');
    }
  });

  it('logs unhandled error with channel name prefix when channelName is provided', async () => {
    const crashHandler = vi.fn().mockRejectedValue(new TypeError('Crash in channel'));
    const protectedCrash = createProtectedHandler(testSchema, crashHandler, 'notes:test');

    const result = await protectedCrash(validEvent, { title: 'Test', count: 1 });

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      '[Unhandled IPC Error - notes:test]:',
      expect.any(TypeError),
    );
    expect(result.success).toBe(false);
  });
});
