import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppLifecycle } from '@main/app/AppLifecycle';
import { logger } from '@main/infrastructure/logger/logger';

type EventHandler = (...args: unknown[]) => void;

interface MockWindow {
  isMinimized: () => boolean;
  restore: () => void;
  focus: () => void;
}

const {
  mockAppRequestSingleInstanceLock,
  mockAppQuit,
  mockAppOn,
  mockAppWhenReady,
  mockGetMainWindow,
  mockCreateMainWindow,
  mockGetAllWindows,
  mockDbInitialize,
  mockDbClose,
  mockCreateRollingSnapshot,
} = vi.hoisted(() => ({
  mockAppRequestSingleInstanceLock: vi.fn<() => boolean>(),
  mockAppQuit: vi.fn<() => void>(),
  mockAppOn: vi.fn<(event: string, handler: EventHandler) => void>(),
  mockAppWhenReady: vi.fn<() => Promise<void>>(),
  mockGetMainWindow: vi.fn<() => MockWindow | null>(),
  mockCreateMainWindow: vi.fn<() => unknown>(),
  mockGetAllWindows: vi.fn<() => unknown[]>(),
  mockDbInitialize: vi.fn<() => unknown>(),
  mockDbClose: vi.fn<() => void>(),
  mockCreateRollingSnapshot: vi.fn<() => Promise<string>>(),
}));

vi.mock('electron', () => ({
  app: {
    requestSingleInstanceLock: (): boolean => mockAppRequestSingleInstanceLock(),
    quit: (): void => {
      mockAppQuit();
    },
    on: (event: string, handler: EventHandler): void => {
      mockAppOn(event, handler);
    },
    whenReady: (): Promise<void> => mockAppWhenReady(),
  },
}));

vi.mock('@main/infrastructure/windows/WindowManager', () => ({
  WindowManager: {
    getMainWindow: (): MockWindow | null => mockGetMainWindow(),
    createMainWindow: (): unknown => mockCreateMainWindow(),
    getAllWindows: (): unknown[] => mockGetAllWindows(),
  },
}));

vi.mock('@main/infrastructure/database/DatabaseConnection', () => ({
  DatabaseConnection: {
    initialize: (): unknown => mockDbInitialize(),
    close: (): void => {
      mockDbClose();
    },
  },
}));

vi.mock('@main/infrastructure/backup/BackupService', () => ({
  BackupService: {
    createRollingSnapshot: (): Promise<string> => mockCreateRollingSnapshot(),
  },
}));

describe('AppLifecycle (Unit)', () => {
  let eventHandlers: Record<string, EventHandler>;
  let originalPlatform: PropertyDescriptor | undefined;

  const flushAsync = async (): Promise<void> => {
    await new Promise<void>((resolve) => {
      process.nextTick(resolve);
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    eventHandlers = {};

    mockAppOn.mockImplementation((event: string, handler: EventHandler) => {
      eventHandlers[event] = handler;
    });

    mockCreateRollingSnapshot.mockResolvedValue('/mock/backup/path');
    originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
  });

  afterEach(() => {
    if (originalPlatform) {
      Object.defineProperty(process, 'platform', originalPlatform);
    }
  });

  describe('Single-Instance Lock', () => {
    it('quits immediately if single-instance lock is denied', () => {
      mockAppRequestSingleInstanceLock.mockReturnValue(false);
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});

      AppLifecycle.bootstrap();

      expect(mockAppRequestSingleInstanceLock).toHaveBeenCalledTimes(1);
      expect(mockAppQuit).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Aplikasi instance lain sedang berjalan'),
      );
      expect(mockAppOn).not.toHaveBeenCalled();
      expect(mockAppWhenReady).not.toHaveBeenCalled();
    });

    it('attaches lifecycle handlers when single-instance lock is acquired', () => {
      mockAppRequestSingleInstanceLock.mockReturnValue(true);
      mockAppWhenReady.mockReturnValue(new Promise(() => {}));

      AppLifecycle.bootstrap();

      expect(mockAppRequestSingleInstanceLock).toHaveBeenCalledTimes(1);
      expect(mockAppQuit).not.toHaveBeenCalled();
      expect(eventHandlers['second-instance']).toBeDefined();
      expect(eventHandlers['window-all-closed']).toBeDefined();
      expect(eventHandlers['before-quit']).toBeDefined();
      expect(mockAppWhenReady).toHaveBeenCalledTimes(1);
    });

    it('restores and focuses main window on second-instance if minimized', () => {
      mockAppRequestSingleInstanceLock.mockReturnValue(true);
      mockAppWhenReady.mockReturnValue(new Promise(() => {}));

      const mockRestore = vi.fn();
      const mockFocus = vi.fn();
      const mockIsMinimized = vi.fn().mockReturnValue(true);
      const mockWindow: MockWindow = {
        isMinimized: mockIsMinimized,
        restore: mockRestore,
        focus: mockFocus,
      };
      mockGetMainWindow.mockReturnValue(mockWindow);

      AppLifecycle.bootstrap();
      eventHandlers['second-instance']();

      expect(mockGetMainWindow).toHaveBeenCalledTimes(1);
      expect(mockIsMinimized).toHaveBeenCalledTimes(1);
      expect(mockRestore).toHaveBeenCalledTimes(1);
      expect(mockFocus).toHaveBeenCalledTimes(1);
    });

    it('focuses main window on second-instance without restoring if not minimized', () => {
      mockAppRequestSingleInstanceLock.mockReturnValue(true);
      mockAppWhenReady.mockReturnValue(new Promise(() => {}));

      const mockRestore = vi.fn();
      const mockFocus = vi.fn();
      const mockIsMinimized = vi.fn().mockReturnValue(false);
      const mockWindow: MockWindow = {
        isMinimized: mockIsMinimized,
        restore: mockRestore,
        focus: mockFocus,
      };
      mockGetMainWindow.mockReturnValue(mockWindow);

      AppLifecycle.bootstrap();
      eventHandlers['second-instance']();

      expect(mockIsMinimized).toHaveBeenCalledTimes(1);
      expect(mockRestore).not.toHaveBeenCalled();
      expect(mockFocus).toHaveBeenCalledTimes(1);
    });

    it('handles second-instance gracefully if no main window exists', () => {
      mockAppRequestSingleInstanceLock.mockReturnValue(true);
      mockAppWhenReady.mockReturnValue(new Promise(() => {}));
      mockGetMainWindow.mockReturnValue(null);

      AppLifecycle.bootstrap();
      expect(() => eventHandlers['second-instance']()).not.toThrow();
    });
  });

  describe('Ready & Window Creation Lifecycle', () => {
    it('initializes DB, triggers snapshot, calls onReady hook, and creates main window', async () => {
      mockAppRequestSingleInstanceLock.mockReturnValue(true);
      let readyResolve: () => void = () => {};
      mockAppWhenReady.mockReturnValue(
        new Promise<void>((resolve) => {
          readyResolve = resolve;
        }),
      );

      const onReadyHook = vi.fn().mockResolvedValue(undefined);

      AppLifecycle.bootstrap({ onReady: onReadyHook });

      expect(mockDbInitialize).not.toHaveBeenCalled();

      readyResolve();
      await flushAsync();

      expect(mockDbInitialize).toHaveBeenCalledTimes(1);
      expect(mockCreateRollingSnapshot).toHaveBeenCalledTimes(1);
      expect(onReadyHook).toHaveBeenCalledTimes(1);
      expect(mockCreateMainWindow).toHaveBeenCalledTimes(1);
      expect(eventHandlers['activate']).toBeDefined();
    });

    it('recreates main window on activate event when all windows are closed', async () => {
      mockAppRequestSingleInstanceLock.mockReturnValue(true);
      mockAppWhenReady.mockResolvedValue(undefined);

      mockGetAllWindows.mockReturnValue([]);

      AppLifecycle.bootstrap();
      await flushAsync();

      expect(mockCreateMainWindow).toHaveBeenCalledTimes(1);

      eventHandlers['activate']();
      expect(mockCreateMainWindow).toHaveBeenCalledTimes(2);
    });

    it('does not duplicate main window on activate event if windows still exist', async () => {
      mockAppRequestSingleInstanceLock.mockReturnValue(true);
      mockAppWhenReady.mockResolvedValue(undefined);

      mockGetAllWindows.mockReturnValue([{}]);

      AppLifecycle.bootstrap();
      await flushAsync();

      expect(mockCreateMainWindow).toHaveBeenCalledTimes(1);

      eventHandlers['activate']();
      expect(mockCreateMainWindow).toHaveBeenCalledTimes(1);
    });

    it('catches and logs rolling snapshot rejection without crashing startup', async () => {
      mockAppRequestSingleInstanceLock.mockReturnValue(true);
      mockAppWhenReady.mockResolvedValue(undefined);
      mockCreateRollingSnapshot.mockRejectedValue(new Error('Disk full'));
      const errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

      AppLifecycle.bootstrap();
      await flushAsync();
      await flushAsync();

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[AppLifecycle] Gagal membuat snapshot backup awal'),
        expect.any(Error),
      );
      expect(mockCreateMainWindow).toHaveBeenCalledTimes(1);
    });
  });

  describe('Shutdown Lifecycle', () => {
    it('quits app on window-all-closed on Linux/Windows', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      mockAppRequestSingleInstanceLock.mockReturnValue(true);
      mockAppWhenReady.mockReturnValue(new Promise(() => {}));

      AppLifecycle.bootstrap();
      eventHandlers['window-all-closed']();

      expect(mockAppQuit).toHaveBeenCalledTimes(1);
    });

    it('does not quit app on window-all-closed on macOS (darwin)', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      mockAppRequestSingleInstanceLock.mockReturnValue(true);
      mockAppWhenReady.mockReturnValue(new Promise(() => {}));

      AppLifecycle.bootstrap();
      eventHandlers['window-all-closed']();

      expect(mockAppQuit).not.toHaveBeenCalled();
    });

    it('closes database connection cleanly on before-quit', () => {
      mockAppRequestSingleInstanceLock.mockReturnValue(true);
      mockAppWhenReady.mockReturnValue(new Promise(() => {}));

      AppLifecycle.bootstrap();
      eventHandlers['before-quit']();

      expect(mockDbClose).toHaveBeenCalledTimes(1);
    });
  });
});
