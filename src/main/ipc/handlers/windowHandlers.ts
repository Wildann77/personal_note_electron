import { ipcMain, BrowserWindow, type IpcMainEvent } from 'electron';
import { IPC_CHANNELS } from '@shared/constants/ipc';
import { validateIpcSender } from '@main/ipc/security/validateSender';
import { WindowControlsUseCase } from '@main/application/windows/WindowControlsUseCase';
import { OpenChildWindowUseCase } from '@main/application/windows/OpenChildWindowUseCase';
import { SQLiteNoteRepository } from '@main/infrastructure/repositories/SQLiteNoteRepository';
import { MenuManager } from '@main/infrastructure/menu/MenuManager';
import { WindowManager } from '@main/infrastructure/windows/WindowManager';
import { logger } from '@main/infrastructure/logger/logger';

export interface WindowHandlerDependencies {
  windowControlsUseCase?: WindowControlsUseCase;
  openChildWindowUseCase?: OpenChildWindowUseCase;
}

/**
 * Creates default instances for window and child window use cases.
 */
export function createDefaultWindowDependencies(): Required<WindowHandlerDependencies> {
  const noteRepository = new SQLiteNoteRepository();
  return {
    windowControlsUseCase: new WindowControlsUseCase(),
    openChildWindowUseCase: new OpenChildWindowUseCase(noteRepository),
  };
}

/**
 * Registers one-way ipcMain listeners for window control commands,
 * child window spawning, and native context menu display (PRD §Antarmuka Kunci, Architecture §17).
 *
 * @param dependencies Optional dependency overrides for testing.
 */
export function registerWindowHandlers(dependencies?: WindowHandlerDependencies): void {
  const windowControls = dependencies?.windowControlsUseCase ?? new WindowControlsUseCase();
  const openChildWindow =
    dependencies?.openChildWindowUseCase ?? new OpenChildWindowUseCase(new SQLiteNoteRepository());

  // 1. window:minimize
  ipcMain.removeAllListeners(IPC_CHANNELS.WINDOW_MINIMIZE);
  ipcMain.on(IPC_CHANNELS.WINDOW_MINIMIZE, (event: IpcMainEvent) => {
    try {
      validateIpcSender(event);
      windowControls.minimize(event.sender.id);
    } catch (err) {
      logger.error('[windowHandlers] Failed to handle window:minimize:', err);
    }
  });

  // 2. window:maximize
  ipcMain.removeAllListeners(IPC_CHANNELS.WINDOW_MAXIMIZE);
  ipcMain.on(IPC_CHANNELS.WINDOW_MAXIMIZE, (event: IpcMainEvent) => {
    try {
      validateIpcSender(event);
      windowControls.maximize(event.sender.id);
    } catch (err) {
      logger.error('[windowHandlers] Failed to handle window:maximize:', err);
    }
  });

  // 3. window:close
  ipcMain.removeAllListeners(IPC_CHANNELS.WINDOW_CLOSE);
  ipcMain.on(IPC_CHANNELS.WINDOW_CLOSE, (event: IpcMainEvent) => {
    try {
      validateIpcSender(event);
      windowControls.close(event.sender.id);
    } catch (err) {
      logger.error('[windowHandlers] Failed to handle window:close:', err);
    }
  });

  // 4. windows:openChild
  ipcMain.removeAllListeners(IPC_CHANNELS.WINDOWS_OPEN_CHILD);
  ipcMain.on(IPC_CHANNELS.WINDOWS_OPEN_CHILD, (event: IpcMainEvent, rawNoteId: unknown) => {
    try {
      validateIpcSender(event);

      const noteId = typeof rawNoteId === 'number' ? rawNoteId : Number(rawNoteId);
      if (!Number.isInteger(noteId) || noteId <= 0) {
        logger.warn('[windowHandlers] Invalid noteId passed to windows:openChild:', rawNoteId);
        return;
      }

      openChildWindow.execute(noteId).catch((err) => {
        logger.error(`[windowHandlers] Failed to open child window for note ${noteId}:`, err);
      });
    } catch (err) {
      logger.error('[windowHandlers] Failed to handle windows:openChild:', err);
    }
  });

  // 5. context-menu:show-note
  ipcMain.removeAllListeners(IPC_CHANNELS.CONTEXT_MENU_SHOW_NOTE);
  ipcMain.on(IPC_CHANNELS.CONTEXT_MENU_SHOW_NOTE, (event: IpcMainEvent, rawNoteId: unknown) => {
    try {
      validateIpcSender(event);

      const noteId = typeof rawNoteId === 'number' ? rawNoteId : Number(rawNoteId);
      if (!Number.isInteger(noteId) || noteId <= 0) {
        logger.warn('[windowHandlers] Invalid noteId passed to context-menu:show-note:', rawNoteId);
        return;
      }

      const targetWindow =
        WindowManager.getWindowByWebContentsId(event.sender.id) ??
        BrowserWindow.fromWebContents(event.sender);

      if (!targetWindow || targetWindow.isDestroyed()) {
        logger.warn(
          '[windowHandlers] Target window not found or destroyed for context-menu:show-note',
        );
        return;
      }

      MenuManager.showNoteContextMenu(targetWindow, noteId);
    } catch (err) {
      logger.error('[windowHandlers] Failed to handle context-menu:show-note:', err);
    }
  });
}
