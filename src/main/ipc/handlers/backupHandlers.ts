import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/constants/ipc';
import { createProtectedHandler } from '@main/ipc/utils/createHandler';
import { emptySchema } from '@main/ipc/schemas/noteSchemas';
import { BackupService } from '@main/infrastructure/backup/BackupService';

export interface BackupHandlerDependencies {
  createSnapshot?: () => Promise<string>;
}

/**
 * Registers protected ipcMain handler for database backup triggers.
 * Invokes BackupService.createRollingSnapshot() and returns Result<string>.
 *
 * @param dependencies Optional dependency overrides for testing.
 */
export function registerBackupHandlers(dependencies?: BackupHandlerDependencies): void {
  const createSnapshot =
    dependencies?.createSnapshot ?? (() => BackupService.createRollingSnapshot());

  ipcMain.removeHandler(IPC_CHANNELS.BACKUP_TRIGGER);
  ipcMain.handle(
    IPC_CHANNELS.BACKUP_TRIGGER,
    createProtectedHandler<void, string>(
      emptySchema,
      async () => {
        return createSnapshot();
      },
      IPC_CHANNELS.BACKUP_TRIGGER,
    ),
  );
}
