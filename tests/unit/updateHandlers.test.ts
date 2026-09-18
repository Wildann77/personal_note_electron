import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IpcMainInvokeEvent } from 'electron';
import { IPC_CHANNELS } from '@shared/constants/ipc';
import { WindowManager } from '@main/infrastructure/windows/WindowManager';
import { BackupService } from '@main/infrastructure/backup/BackupService';

const { mockHandle, mockRemoveHandler, mockOpenExternal } = vi.hoisted(() => ({
  mockHandle: vi.fn(),
  mockRemoveHandler: vi.fn(),
  mockOpenExternal: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: mockHandle,
    removeHandler: mockRemoveHandler,
  },
  shell: {
    openExternal: mockOpenExternal,
  },
}));

import {
  registerUpdateHandlers,
  type UpdateHandlerDependencies,
} from '@main/ipc/handlers/updateHandlers';

describe('updateHandlers (Unit - Architecture §15.3, TASK [P23-T3])', () => {
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

  it('registers UPDATE_DOWNLOAD handler removing previous handler first', () => {
    registerUpdateHandlers();

    expect(mockRemoveHandler).toHaveBeenCalledWith(IPC_CHANNELS.UPDATE_DOWNLOAD);
    expect(mockHandle).toHaveBeenCalledWith(IPC_CHANNELS.UPDATE_DOWNLOAD, expect.any(Function));
  });

  it('creates backup snapshot and opens external release URL', async () => {
    const mockCreateSnapshot = vi.fn().mockResolvedValue('/path/to/backup.db');
    const mockOpen = vi.fn().mockResolvedValue(undefined);
    const deps: UpdateHandlerDependencies = {
      createSnapshot: mockCreateSnapshot,
      openExternal: mockOpen,
    };

    registerUpdateHandlers(deps);

    const handler = handlersMap.get(IPC_CHANNELS.UPDATE_DOWNLOAD);
    expect(handler).toBeDefined();

    const result = await handler!(validEvent, {
      releaseUrl: 'https://github.com/Wildann77/personal_note_electron/releases',
    });
    expect(mockCreateSnapshot).toHaveBeenCalledTimes(1);
    expect(mockOpen).toHaveBeenCalledWith(
      'https://github.com/Wildann77/personal_note_electron/releases',
    );
    expect(result).toEqual({
      success: true,
      data: true,
    });
  });

  it('continues opening browser even if backup snapshot throws', async () => {
    const mockCreateSnapshot = vi.fn().mockRejectedValue(new Error('Disk full'));
    const mockOpen = vi.fn().mockResolvedValue(undefined);
    const deps: UpdateHandlerDependencies = {
      createSnapshot: mockCreateSnapshot,
      openExternal: mockOpen,
    };

    registerUpdateHandlers(deps);

    const handler = handlersMap.get(IPC_CHANNELS.UPDATE_DOWNLOAD);
    const result = await handler!(validEvent, {
      releaseUrl: 'https://github.com/Wildann77/personal_note_electron/releases',
    });

    expect(mockCreateSnapshot).toHaveBeenCalledTimes(1);
    expect(mockOpen).toHaveBeenCalledWith(
      'https://github.com/Wildann77/personal_note_electron/releases',
    );
    expect(result).toEqual({
      success: true,
      data: true,
    });
  });

  it('rejects payload with invalid URL', async () => {
    registerUpdateHandlers();

    const handler = handlersMap.get(IPC_CHANNELS.UPDATE_DOWNLOAD);
    const result = (await handler!(validEvent, { releaseUrl: 'not-a-valid-url' })) as {
      success: boolean;
      error?: { code: string };
    };

    expect(result.success).toBe(false);
    expect(result.error?.code).toBe('VALIDATION_ERROR');
  });

  it('delegates to BackupService.createRollingSnapshot by default when dependencies omitted', async () => {
    const backupSpy = vi
      .spyOn(BackupService, 'createRollingSnapshot')
      .mockResolvedValue('/default/path/notes.backup-1.db');
    mockOpenExternal.mockResolvedValue(undefined);

    registerUpdateHandlers();

    const handler = handlersMap.get(IPC_CHANNELS.UPDATE_DOWNLOAD);
    const result = await handler!(validEvent, {
      releaseUrl: 'https://github.com/Wildann77/personal_note_electron/releases',
    });

    expect(backupSpy).toHaveBeenCalledTimes(1);
    expect(mockOpenExternal).toHaveBeenCalledWith(
      'https://github.com/Wildann77/personal_note_electron/releases',
    );
    expect(result).toEqual({
      success: true,
      data: true,
    });
  });
});
