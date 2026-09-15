import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNELS } from '@shared/constants/ipc';
import { WindowManager } from '@main/infrastructure/windows/WindowManager';
import { BackupService } from '@main/infrastructure/backup/BackupService';

const { mockHandle, mockRemoveHandler } = vi.hoisted(() => ({
  mockHandle: vi.fn(),
  mockRemoveHandler: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: mockHandle,
    removeHandler: mockRemoveHandler,
  },
}));

import {
  registerBackupHandlers,
  type BackupHandlerDependencies,
} from '@main/ipc/handlers/backupHandlers';

describe('backupHandlers (Unit - [P7-T1], Architecture §5.2, §14)', () => {
  const handlersMap = new Map<
    string,
    (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<unknown>
  >();

  const validEvent = {
    sender: { id: 101 },
  } as unknown as IpcMainInvokeEvent;

  beforeEach(() => {
    vi.restoreAllMocks();
    handlersMap.clear();

    vi.spyOn(WindowManager, 'isValidWebContents').mockReturnValue(true);

    mockRemoveHandler.mockImplementation(() => {});
    mockHandle.mockImplementation(
      (
        channel: string,
        handler: (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<unknown>,
      ) => {
        handlersMap.set(channel, handler);
      },
    );
  });

  it('registers BACKUP_TRIGGER handler removing previous handler first', () => {
    registerBackupHandlers();

    expect(mockRemoveHandler).toHaveBeenCalledWith(IPC_CHANNELS.BACKUP_TRIGGER);
    expect(mockHandle).toHaveBeenCalledWith(IPC_CHANNELS.BACKUP_TRIGGER, expect.any(Function));
  });

  it('executes createSnapshot and returns success Result<string>', async () => {
    const mockCreateSnapshot = vi.fn().mockResolvedValue('/path/to/backup.db');
    const deps: BackupHandlerDependencies = {
      createSnapshot: mockCreateSnapshot,
    };

    registerBackupHandlers(deps);

    const handler = handlersMap.get(IPC_CHANNELS.BACKUP_TRIGGER);
    expect(handler).toBeDefined();

    const result = await handler!(validEvent);
    expect(mockCreateSnapshot).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      success: true,
      data: '/path/to/backup.db',
    });
  });

  it('delegates to BackupService.createRollingSnapshot by default when dependencies omitted', async () => {
    const backupSpy = vi
      .spyOn(BackupService, 'createRollingSnapshot')
      .mockResolvedValue('/default/path/notes.backup-1.db');

    registerBackupHandlers();

    const handler = handlersMap.get(IPC_CHANNELS.BACKUP_TRIGGER);
    const result = await handler!(validEvent);

    expect(backupSpy).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      success: true,
      data: '/default/path/notes.backup-1.db',
    });
  });
});
