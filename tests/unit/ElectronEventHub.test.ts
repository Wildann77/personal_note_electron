import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BrowserWindow } from 'electron';
import { ElectronEventHub } from '@main/infrastructure/events/ElectronEventHub';
import { WindowManager } from '@main/infrastructure/windows/WindowManager';
import { IPC_CHANNELS } from '@shared/constants/ipc';
import type { NoteMutationPayload } from '@shared/types/note';
import { logger } from '@main/infrastructure/logger/logger';

describe('ElectronEventHub (Unit)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const createMockWindow = (
    id: number,
    options: { isDestroyed?: boolean; isWebContentsDestroyed?: boolean } = {},
  ) => {
    const sendMock = vi.fn();
    const win = {
      webContents: {
        id,
        isDestroyed: vi.fn().mockReturnValue(options.isWebContentsDestroyed ?? false),
        send: sendMock,
      },
      isDestroyed: vi.fn().mockReturnValue(options.isDestroyed ?? false),
    } as unknown as BrowserWindow;

    return { win, sendMock };
  };

  it('broadcasts note mutation event to all active windows', () => {
    const { win: win1, sendMock: sendMock1 } = createMockWindow(1);
    const { win: win2, sendMock: sendMock2 } = createMockWindow(2);

    const eventHub = new ElectronEventHub(() => [win1, win2]);

    const payload: NoteMutationPayload = {
      type: 'create',
      noteId: 101,
      note: {
        id: 101,
        title: 'Catatan Baru',
        snippet: 'Kutipan catatan...',
        content: { blocks: [] },
        revision: 1,
        createdAt: 1000,
        updatedAt: 1000,
      },
    };

    eventHub.broadcastNoteMutation(payload);

    expect(sendMock1).toHaveBeenCalledTimes(1);
    expect(sendMock1).toHaveBeenCalledWith(IPC_CHANNELS.NOTES_BROADCAST_CHANGED, payload);

    expect(sendMock2).toHaveBeenCalledTimes(1);
    expect(sendMock2).toHaveBeenCalledWith(IPC_CHANNELS.NOTES_BROADCAST_CHANGED, payload);
  });

  it('skips windows that are destroyed', () => {
    const { win: activeWin, sendMock: activeSend } = createMockWindow(1);
    const { win: destroyedWin, sendMock: destroyedSend } = createMockWindow(2, {
      isDestroyed: true,
    });

    const eventHub = new ElectronEventHub(() => [activeWin, destroyedWin]);

    const payload: NoteMutationPayload = {
      type: 'update',
      noteId: 202,
    };

    eventHub.broadcastNoteMutation(payload);

    expect(activeSend).toHaveBeenCalledTimes(1);
    expect(activeSend).toHaveBeenCalledWith(IPC_CHANNELS.NOTES_BROADCAST_CHANGED, payload);
    expect(destroyedSend).not.toHaveBeenCalled();
  });

  it('skips windows whose webContents is destroyed', () => {
    const { win: activeWin, sendMock: activeSend } = createMockWindow(1);
    const { win: deadWebContentsWin, sendMock: deadSend } = createMockWindow(2, {
      isWebContentsDestroyed: true,
    });

    const eventHub = new ElectronEventHub(() => [activeWin, deadWebContentsWin]);

    const payload: NoteMutationPayload = {
      type: 'delete',
      noteId: 303,
    };

    eventHub.broadcastNoteMutation(payload);

    expect(activeSend).toHaveBeenCalledTimes(1);
    expect(activeSend).toHaveBeenCalledWith(IPC_CHANNELS.NOTES_BROADCAST_CHANGED, payload);
    expect(deadSend).not.toHaveBeenCalled();
  });

  it('does nothing gracefully when no windows are open', () => {
    const eventHub = new ElectronEventHub(() => []);

    const payload: NoteMutationPayload = {
      type: 'create',
      noteId: 404,
    };

    expect(() => {
      eventHub.broadcastNoteMutation(payload);
    }).not.toThrow();
  });

  it('continues broadcasting to other windows if one window throws during send', () => {
    const { win: faultyWin, sendMock: faultySend } = createMockWindow(1);
    faultySend.mockImplementation(() => {
      throw new Error('IPC send failed');
    });

    const { win: okWin, sendMock: okSend } = createMockWindow(2);

    const loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

    const eventHub = new ElectronEventHub(() => [faultyWin, okWin]);

    const payload: NoteMutationPayload = {
      type: 'update',
      noteId: 505,
    };

    expect(() => {
      eventHub.broadcastNoteMutation(payload);
    }).not.toThrow();

    expect(faultySend).toHaveBeenCalledTimes(1);
    expect(okSend).toHaveBeenCalledTimes(1);
    expect(okSend).toHaveBeenCalledWith(IPC_CHANNELS.NOTES_BROADCAST_CHANGED, payload);
    expect(loggerErrorSpy).toHaveBeenCalled();
  });

  it('uses WindowManager.getAllWindows by default when window provider is omitted', () => {
    const { win, sendMock } = createMockWindow(1);
    const getAllSpy = vi.spyOn(WindowManager, 'getAllWindows').mockReturnValue([win]);

    const eventHub = new ElectronEventHub();

    const payload: NoteMutationPayload = {
      type: 'delete',
      noteId: 606,
    };

    eventHub.broadcastNoteMutation(payload);

    expect(getAllSpy).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock).toHaveBeenCalledWith(IPC_CHANNELS.NOTES_BROADCAST_CHANGED, payload);
  });
});
