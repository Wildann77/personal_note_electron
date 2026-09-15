import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import type { BrowserWindow } from 'electron';
import {
  WindowControlsUseCase,
  type WindowResolver,
} from '@main/application/windows/WindowControlsUseCase';

describe('WindowControlsUseCase (Unit)', () => {
  let mockWindow: {
    isDestroyed: ReturnType<typeof vi.fn>;
    isMaximized: ReturnType<typeof vi.fn>;
    minimize: ReturnType<typeof vi.fn>;
    maximize: ReturnType<typeof vi.fn>;
    unmaximize: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
  };
  let mockResolver: Mock<WindowResolver>;
  let useCase: WindowControlsUseCase;

  beforeEach(() => {
    vi.clearAllMocks();

    mockWindow = {
      isDestroyed: vi.fn().mockReturnValue(false),
      isMaximized: vi.fn().mockReturnValue(false),
      minimize: vi.fn(),
      maximize: vi.fn(),
      unmaximize: vi.fn(),
      close: vi.fn(),
    };

    mockResolver = vi.fn<WindowResolver>().mockImplementation((target?: BrowserWindow | number) => {
      if (typeof target === 'object' && target !== null) {
        return target;
      }
      return mockWindow as unknown as BrowserWindow;
    });

    useCase = new WindowControlsUseCase(mockResolver);
  });

  describe('minimize (PRD US#43)', () => {
    it('minimizes target window when active', () => {
      useCase.minimize(mockWindow as unknown as BrowserWindow);

      expect(mockWindow.minimize).toHaveBeenCalledTimes(1);
    });

    it('does nothing when window is destroyed', () => {
      mockWindow.isDestroyed.mockReturnValue(true);

      useCase.minimize(mockWindow as unknown as BrowserWindow);

      expect(mockWindow.minimize).not.toHaveBeenCalled();
    });

    it('does nothing when window resolver returns null', () => {
      mockResolver.mockReturnValue(null);

      expect(() => useCase.minimize()).not.toThrow();
    });
  });

  describe('toggleMaximize / maximize (PRD US#44)', () => {
    it('maximizes window when currently not maximized', () => {
      mockWindow.isMaximized.mockReturnValue(false);

      useCase.toggleMaximize(mockWindow as unknown as BrowserWindow);

      expect(mockWindow.maximize).toHaveBeenCalledTimes(1);
      expect(mockWindow.unmaximize).not.toHaveBeenCalled();
    });

    it('unmaximizes (restores) window when currently maximized', () => {
      mockWindow.isMaximized.mockReturnValue(true);

      useCase.toggleMaximize(mockWindow as unknown as BrowserWindow);

      expect(mockWindow.unmaximize).toHaveBeenCalledTimes(1);
      expect(mockWindow.maximize).not.toHaveBeenCalled();
    });

    it('maximize() alias also performs bidirectional toggle', () => {
      mockWindow.isMaximized.mockReturnValue(false);
      useCase.maximize(mockWindow as unknown as BrowserWindow);
      expect(mockWindow.maximize).toHaveBeenCalledTimes(1);

      mockWindow.isMaximized.mockReturnValue(true);
      useCase.maximize(mockWindow as unknown as BrowserWindow);
      expect(mockWindow.unmaximize).toHaveBeenCalledTimes(1);
    });

    it('does nothing when window is destroyed', () => {
      mockWindow.isDestroyed.mockReturnValue(true);

      useCase.toggleMaximize(mockWindow as unknown as BrowserWindow);

      expect(mockWindow.maximize).not.toHaveBeenCalled();
      expect(mockWindow.unmaximize).not.toHaveBeenCalled();
    });
  });

  describe('close (PRD US#45)', () => {
    it('closes target window when active', () => {
      useCase.close(mockWindow as unknown as BrowserWindow);

      expect(mockWindow.close).toHaveBeenCalledTimes(1);
    });

    it('does nothing when window is destroyed', () => {
      mockWindow.isDestroyed.mockReturnValue(true);

      useCase.close(mockWindow as unknown as BrowserWindow);

      expect(mockWindow.close).not.toHaveBeenCalled();
    });
  });

  describe('target resolution', () => {
    it('resolves window via numeric webContentsId passed to resolver', () => {
      useCase.minimize(123);

      expect(mockResolver).toHaveBeenCalledWith(123);
      expect(mockWindow.minimize).toHaveBeenCalledTimes(1);
    });

    it('resolves fallback window when target parameter is omitted', () => {
      useCase.minimize();

      expect(mockResolver).toHaveBeenCalledWith(undefined);
      expect(mockWindow.minimize).toHaveBeenCalledTimes(1);
    });
  });
});
