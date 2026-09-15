import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateIpcSender } from '@main/ipc/security/validateSender';
import { WindowManager } from '@main/infrastructure/windows/WindowManager';
import { IpcSecurityError, AppError } from '@main/domain/errors/AppError';
import type { IpcSenderEvent } from '@main/ipc/security/validateSender';

describe('validateIpcSender (Unit - Architecture §4.3)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('allows request when sender webContents ID is registered in WindowManager', () => {
    const isValidSpy = vi.spyOn(WindowManager, 'isValidWebContents').mockReturnValue(true);

    const event = {
      sender: { id: 101 },
    } as unknown as IpcSenderEvent;

    expect(() => validateIpcSender(event)).not.toThrow();
    expect(isValidSpy).toHaveBeenCalledWith(101);
  });

  it('throws IpcSecurityError with SECURITY_VIOLATION when sender is not registered', () => {
    vi.spyOn(WindowManager, 'isValidWebContents').mockReturnValue(false);

    const event = {
      sender: { id: 999 },
    } as unknown as IpcSenderEvent;

    expect(() => validateIpcSender(event)).toThrowError(
      'SECURITY_VIOLATION: Unauthorized IPC sender webContents.',
    );

    try {
      validateIpcSender(event);
    } catch (err) {
      expect(err).toBeInstanceOf(IpcSecurityError);
      expect(err).toBeInstanceOf(AppError);
      expect((err as IpcSecurityError).code).toBe('IPC_SECURITY_ERROR');
    }
  });

  it('throws IpcSecurityError when event.sender is undefined or null', () => {
    const eventWithoutSender = {} as unknown as IpcSenderEvent;
    expect(() => validateIpcSender(eventWithoutSender)).toThrowError(
      'SECURITY_VIOLATION: Unauthorized IPC sender webContents.',
    );

    const eventWithNullSender = { sender: null } as unknown as IpcSenderEvent;
    expect(() => validateIpcSender(eventWithNullSender)).toThrowError(
      'SECURITY_VIOLATION: Unauthorized IPC sender webContents.',
    );
  });

  it('throws IpcSecurityError when event.sender.id is not a valid number', () => {
    const eventWithInvalidId = {
      sender: { id: 'not-a-number' },
    } as unknown as IpcSenderEvent;

    expect(() => validateIpcSender(eventWithInvalidId)).toThrowError(
      'SECURITY_VIOLATION: Unauthorized IPC sender webContents.',
    );
  });
});
