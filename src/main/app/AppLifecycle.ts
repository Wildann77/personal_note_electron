import { app } from 'electron';
import { WindowManager } from '../infrastructure/windows/WindowManager';
import { DatabaseConnection } from '../infrastructure/database/DatabaseConnection';
import { BackupService } from '../infrastructure/backup/BackupService';

/**
 * Bootstrap options allowing higher-level orchestration (e.g., IPC registry wiring)
 * without coupling AppLifecycle directly to presentation layer components.
 */
export interface AppBootstrapOptions {
  onReady?: () => void | Promise<void>;
}

/**
 * Manages application-level lifecycle and ensures single-instance execution
 * (PRD US#50-51, Architecture §9, §14).
 */
export class AppLifecycle {
  /**
   * Initializes single-instance lock and attaches core Electron lifecycle event listeners.
   */
  static bootstrap(options?: AppBootstrapOptions): void {
    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
      console.warn('Aplikasi instance lain sedang berjalan. Mengakhiri proses ini.');
      app.quit();
      return;
    }

    app.on('second-instance', () => {
      const mainWin = WindowManager.getMainWindow();
      if (mainWin) {
        if (mainWin.isMinimized()) {
          mainWin.restore();
        }
        mainWin.focus();
      }
    });

    void app.whenReady().then(async () => {
      DatabaseConnection.initialize();
      void BackupService.createRollingSnapshot().catch((err: unknown) => {
        console.error('[AppLifecycle] Gagal membuat snapshot backup awal:', err);
      });

      if (options?.onReady) {
        await options.onReady();
      }

      WindowManager.createMainWindow();

      app.on('activate', () => {
        if (WindowManager.getAllWindows().length === 0) {
          WindowManager.createMainWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('before-quit', () => {
      DatabaseConnection.close();
    });
  }
}
