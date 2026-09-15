import type { IpcMainInvokeEvent, IpcMainEvent } from 'electron';
import { WindowManager } from '@main/infrastructure/windows/WindowManager';
import { AppError } from '@main/domain/errors/AppError';

export type IpcSenderEvent = IpcMainInvokeEvent | IpcMainEvent | { sender: { id: number } };

/**
 * Validates whether an incoming IPC event sender corresponds to an officially
 * registered and active BrowserWindow webContents in WindowManager (Architecture §4.3).
 *
 * @param event Electron IPC event containing sender webContents
 * @throws IpcSecurityError if sender is missing or not registered in WindowManager
 */
export function validateIpcSender(event: IpcSenderEvent): void {
  const senderWebContents = event?.sender;
  if (!senderWebContents || typeof senderWebContents.id !== 'number') {
    throw AppError.ipcSecurity('SECURITY_VIOLATION: Unauthorized IPC sender webContents.');
  }

  const isRegistered = WindowManager.isValidWebContents(senderWebContents.id);
  if (!isRegistered) {
    throw AppError.ipcSecurity('SECURITY_VIOLATION: Unauthorized IPC sender webContents.');
  }
}
