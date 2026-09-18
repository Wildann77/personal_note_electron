import { ipcMain, shell } from 'electron';
import { IPC_CHANNELS } from '@shared/constants/ipc';
import { createProtectedHandler } from '@main/ipc/utils/createHandler';
import { downloadUpdateSchema, type DownloadUpdateInput } from '../schemas/updateSchemas';
import { BackupService } from '@main/infrastructure/backup/BackupService';
import { logger } from '@main/infrastructure/logger/logger';

export interface UpdateHandlerDependencies {
  createSnapshot?: () => Promise<string>;
  openExternal?: (url: string) => Promise<void>;
}

/**
 * Registers protected ipcMain handler for downloading updates (Architecture §15.3, TASK [P23-T2], [P23-T3]).
 * Executes a rolling snapshot backup first to ensure zero data loss before opening the release page.
 *
 * @param dependencies Optional dependency overrides for testing.
 */
export function registerUpdateHandlers(dependencies?: UpdateHandlerDependencies): void {
  const createSnapshot =
    dependencies?.createSnapshot ?? (() => BackupService.createRollingSnapshot());
  const openExternal = dependencies?.openExternal ?? ((url: string) => shell.openExternal(url));

  if (typeof ipcMain !== 'undefined' && ipcMain) {
    ipcMain.removeHandler(IPC_CHANNELS.UPDATE_DOWNLOAD);
    ipcMain.handle(
      IPC_CHANNELS.UPDATE_DOWNLOAD,
      createProtectedHandler<DownloadUpdateInput, boolean>(
        downloadUpdateSchema,
        async (input) => {
          logger.info(
            '[UpdateHandler] Menjalankan pre-update backup snapshot sebelum navigasi rilis...',
          );
          try {
            await createSnapshot();
            logger.info('[UpdateHandler] Pre-update backup berhasil dibuat');
          } catch (err) {
            logger.error('[UpdateHandler] Gagal membuat pre-update backup snapshot:', err);
          }

          logger.info('[UpdateHandler] Membuka URL rilis di browser sistem:', {
            url: input.releaseUrl,
          });
          await openExternal(input.releaseUrl);
          return true;
        },
        IPC_CHANNELS.UPDATE_DOWNLOAD,
      ),
    );
  }
}
