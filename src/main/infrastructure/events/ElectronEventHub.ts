import type { BrowserWindow } from 'electron';
import type { IEventHub } from '@main/domain/services/IEventHub';
import type { NoteMutationPayload } from '@shared/types/note';
import { IPC_CHANNELS } from '@shared/constants/ipc';
import { WindowManager } from '../windows/WindowManager';

/**
 * Concrete implementation of IEventHub using Electron's webContents.send.
 * Broadcasts note mutation events across all active application windows
 * to guarantee real-time cross-window synchronization (Architecture §17, PRD Further Note #1, PRD US#37).
 */
export class ElectronEventHub implements IEventHub {
  private readonly getWindows: () => BrowserWindow[];

  /**
   * Constructs a new ElectronEventHub.
   * Allows injecting a custom window provider function for testability and decoupling.
   *
   * @param windowProvider Function returning all active BrowserWindow instances.
   */
  constructor(windowProvider: () => BrowserWindow[] = () => WindowManager.getAllWindows()) {
    this.getWindows = windowProvider;
  }

  /**
   * Broadcasts a note mutation event (create, update, delete) to all active windows
   * through their webContents using the IPC_CHANNELS.NOTES_BROADCAST_CHANGED channel.
   *
   * @param payload Note mutation details including type, noteId, and optional updated Note data.
   */
  broadcastNoteMutation(payload: NoteMutationPayload): void {
    const windows = this.getWindows();

    for (const win of windows) {
      try {
        if (!win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
          win.webContents.send(IPC_CHANNELS.NOTES_BROADCAST_CHANGED, payload);
        }
      } catch (err) {
        console.error('[ElectronEventHub] Gagal menyiarkan mutasi ke jendela:', err);
      }
    }
  }
}
