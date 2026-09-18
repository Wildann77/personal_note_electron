import { app } from 'electron';
import { WindowManager } from '../infrastructure/windows/WindowManager';
import { DatabaseConnection } from '../infrastructure/database/DatabaseConnection';
import { BackupService } from '../infrastructure/backup/BackupService';
import { UpdateChecker } from '../infrastructure/update/UpdateChecker';
import { logger } from '../infrastructure/logger/logger';

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
    logger.info('[AppLifecycle] Bootstrapping application');
    const gotTheLock = app.requestSingleInstanceLock();
    if (!gotTheLock) {
      logger.warn('[AppLifecycle] Aplikasi instance lain sedang berjalan. Mengakhiri proses ini.');
      app.quit();
      return;
    }

    app.on('second-instance', () => {
      logger.info('[AppLifecycle] Second instance detected, focusing main window');
      const mainWin = WindowManager.getMainWindow();
      if (mainWin) {
        if (mainWin.isMinimized()) {
          mainWin.restore();
        }
        mainWin.focus();
      }
    });

    void app.whenReady().then(async () => {
      logger.info('[AppLifecycle] Electron ready, initializing database & services');
      DatabaseConnection.initialize();
      void BackupService.createRollingSnapshot().catch((err: unknown) => {
        logger.error('[AppLifecycle] Gagal membuat snapshot backup awal:', err);
      });

      if (options?.onReady) {
        await options.onReady();
      }

      logger.info('[AppLifecycle] Creating main window');
      WindowManager.createMainWindow();

      // Mulai service background update check (Architecture §15.3, TASK [P23-T2])
      UpdateChecker.start();

      app.on('activate', () => {
        logger.info('[AppLifecycle] App activated');
        if (WindowManager.getAllWindows().length === 0) {
          WindowManager.createMainWindow();
        }
      });
    });

    app.on('window-all-closed', () => {
      logger.info('[AppLifecycle] All windows closed', { platform: process.platform });
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('before-quit', () => {
      logger.info(
        '[AppLifecycle] Before quit event triggered, closing database and stopping update checker',
      );
      UpdateChecker.stop();
      DatabaseConnection.close();
    });
  }
}
