import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserWindow, type IpcMainEvent } from 'electron';
import Database from 'better-sqlite3';
import { IPC_CHANNELS } from '@shared/constants/ipc';
import { WindowManager } from '@main/infrastructure/windows/WindowManager';
import { MenuManager } from '@main/infrastructure/menu/MenuManager';
import { logger } from '@main/infrastructure/logger/logger';
import { DatabaseConnection } from '@main/infrastructure/database/DatabaseConnection';

const { mockOn, mockRemoveAllListeners, mockFromWebContents } = vi.hoisted(() => ({
  mockOn: vi.fn(),
  mockRemoveAllListeners: vi.fn(),
  mockFromWebContents: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    on: mockOn,
    removeAllListeners: mockRemoveAllListeners,
  },
  BrowserWindow: {
    fromWebContents: mockFromWebContents,
  },
}));

import {
  registerWindowHandlers,
  createDefaultWindowDependencies,
  type WindowHandlerDependencies,
} from '@main/ipc/handlers/windowHandlers';

describe('windowHandlers (Unit - [P6-T5], PRD §Antarmuka Kunci, Architecture §17)', () => {
  const listenersMap = new Map<string, (event: IpcMainEvent, ...args: unknown[]) => void>();

  const validEvent = {
    sender: { id: 102 },
  } as unknown as IpcMainEvent;

  let minimizeSpy: ReturnType<typeof vi.fn>;
  let maximizeSpy: ReturnType<typeof vi.fn>;
  let closeSpy: ReturnType<typeof vi.fn>;
  let executeOpenChildSpy: ReturnType<typeof vi.fn>;
  let loggerErrorSpy: ReturnType<typeof vi.spyOn>;
  let loggerWarnSpy: ReturnType<typeof vi.spyOn>;
  let mockDeps: WindowHandlerDependencies;

  beforeEach(() => {
    vi.restoreAllMocks();
    listenersMap.clear();

    vi.spyOn(WindowManager, 'isValidWebContents').mockReturnValue(true);
    loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});
    loggerWarnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});

    mockRemoveAllListeners.mockImplementation(() => {});
    mockOn.mockImplementation(
      (channel: string, listener: (event: IpcMainEvent, ...args: unknown[]) => void) => {
        listenersMap.set(channel, listener);
      },
    );

    minimizeSpy = vi.fn();
    maximizeSpy = vi.fn();
    closeSpy = vi.fn();
    executeOpenChildSpy = vi.fn().mockResolvedValue({});

    mockDeps = {
      windowControlsUseCase: {
        minimize: minimizeSpy,
        maximize: maximizeSpy,
        close: closeSpy,
      } as unknown as WindowHandlerDependencies['windowControlsUseCase'],
      openChildWindowUseCase: {
        execute: executeOpenChildSpy,
      } as unknown as WindowHandlerDependencies['openChildWindowUseCase'],
    };
  });

  it('registers all 5 window-related channels via ipcMain.on', () => {
    registerWindowHandlers(mockDeps);

    expect(listenersMap.has(IPC_CHANNELS.WINDOW_MINIMIZE)).toBe(true);
    expect(listenersMap.has(IPC_CHANNELS.WINDOW_MAXIMIZE)).toBe(true);
    expect(listenersMap.has(IPC_CHANNELS.WINDOW_CLOSE)).toBe(true);
    expect(listenersMap.has(IPC_CHANNELS.WINDOWS_OPEN_CHILD)).toBe(true);
    expect(listenersMap.has(IPC_CHANNELS.CONTEXT_MENU_SHOW_NOTE)).toBe(true);
  });

  describe('window control channels', () => {
    it('delegates window:minimize to windowControlsUseCase with sender ID', () => {
      registerWindowHandlers(mockDeps);
      const listener = listenersMap.get(IPC_CHANNELS.WINDOW_MINIMIZE)!;

      listener(validEvent);

      expect(minimizeSpy).toHaveBeenCalledWith(102);
    });

    it('delegates window:maximize to windowControlsUseCase with sender ID', () => {
      registerWindowHandlers(mockDeps);
      const listener = listenersMap.get(IPC_CHANNELS.WINDOW_MAXIMIZE)!;

      listener(validEvent);

      expect(maximizeSpy).toHaveBeenCalledWith(102);
    });

    it('delegates window:close to windowControlsUseCase with sender ID', () => {
      registerWindowHandlers(mockDeps);
      const listener = listenersMap.get(IPC_CHANNELS.WINDOW_CLOSE)!;

      listener(validEvent);

      expect(closeSpy).toHaveBeenCalledWith(102);
    });

    it('blocks unauthorized sender and does not execute windowControls', () => {
      vi.spyOn(WindowManager, 'isValidWebContents').mockReturnValue(false);

      registerWindowHandlers(mockDeps);
      const listener = listenersMap.get(IPC_CHANNELS.WINDOW_MINIMIZE)!;

      listener(validEvent);

      expect(minimizeSpy).not.toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalled();
    });
  });

  describe('windows:openChild channel', () => {
    it('delegates to openChildWindowUseCase when noteId is valid', () => {
      registerWindowHandlers(mockDeps);
      const listener = listenersMap.get(IPC_CHANNELS.WINDOWS_OPEN_CHILD)!;

      listener(validEvent, 42);

      expect(executeOpenChildSpy).toHaveBeenCalledWith(42);
    });

    it('rejects invalid or non-positive noteId and does not execute use case', () => {
      registerWindowHandlers(mockDeps);
      const listener = listenersMap.get(IPC_CHANNELS.WINDOWS_OPEN_CHILD)!;

      listener(validEvent, -5);
      listener(validEvent, 'invalid');

      expect(executeOpenChildSpy).not.toHaveBeenCalled();
      expect(loggerWarnSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('context-menu:show-note channel', () => {
    it('locates target BrowserWindow and shows native context menu with noteId and openChildWindow action', () => {
      const mockWin = { isDestroyed: () => false } as unknown as BrowserWindow;
      vi.spyOn(WindowManager, 'getWindowByWebContentsId').mockReturnValue(mockWin);
      const showMenuSpy = vi.spyOn(MenuManager, 'showNoteContextMenu').mockImplementation(() => {});

      registerWindowHandlers(mockDeps);
      const listener = listenersMap.get(IPC_CHANNELS.CONTEXT_MENU_SHOW_NOTE)!;

      listener(validEvent, 7);

      expect(showMenuSpy).toHaveBeenCalledWith(mockWin, 7, expect.anything());

      // Verifikasi saat onOpenInNewWindow dipanggil, ia mengeksekusi openChildWindowUseCase
      const lastCall = showMenuSpy.mock.lastCall;
      expect(typeof lastCall?.[2]?.onOpenInNewWindow).toBe('function');
      lastCall?.[2]?.onOpenInNewWindow?.(7);
      expect(executeOpenChildSpy).toHaveBeenCalledWith(7);
    });

    it('rejects invalid noteId for context menu', () => {
      const showMenuSpy = vi.spyOn(MenuManager, 'showNoteContextMenu').mockImplementation(() => {});

      registerWindowHandlers(mockDeps);
      const listener = listenersMap.get(IPC_CHANNELS.CONTEXT_MENU_SHOW_NOTE)!;

      listener(validEvent, 0);

      expect(showMenuSpy).not.toHaveBeenCalled();
      expect(loggerWarnSpy).toHaveBeenCalled();
    });

    it('does not invoke MenuManager if target window is destroyed or not found', () => {
      vi.spyOn(WindowManager, 'getWindowByWebContentsId').mockReturnValue(undefined);
      mockFromWebContents.mockReturnValue(null);
      const showMenuSpy = vi.spyOn(MenuManager, 'showNoteContextMenu').mockImplementation(() => {});

      registerWindowHandlers(mockDeps);
      const listener = listenersMap.get(IPC_CHANNELS.CONTEXT_MENU_SHOW_NOTE)!;

      listener(validEvent, 8);

      expect(showMenuSpy).not.toHaveBeenCalled();
      expect(loggerWarnSpy).toHaveBeenCalled();
    });
  });

  describe('createDefaultWindowDependencies', () => {
    it('instantiates default window dependencies', () => {
      vi.spyOn(DatabaseConnection, 'getInstance').mockReturnValue(
        {} as unknown as Database.Database,
      );
      const defaults = createDefaultWindowDependencies();
      expect(defaults.windowControlsUseCase).toBeDefined();
      expect(defaults.openChildWindowUseCase).toBeDefined();
    });
  });
});
