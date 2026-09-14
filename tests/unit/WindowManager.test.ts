import { describe, it, expect, vi, beforeEach } from 'vitest';
import EventEmitter from 'events';

const { MockBrowserWindow, mockShell } = vi.hoisted(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Emitter = require('events') as typeof EventEmitter;

  class MockWebContents extends Emitter {
    id: number;
    openHandler?: (details: { url: string }) => { action: 'deny' | 'allow' };

    constructor(id: number) {
      super();
      this.id = id;
    }

    isDestroyed = vi.fn().mockReturnValue(false);

    setWindowOpenHandler(handler: (details: { url: string }) => { action: 'deny' | 'allow' }) {
      this.openHandler = handler;
    }
  }

  class BrowserWindowMock extends Emitter {
    static instances: BrowserWindowMock[] = [];
    webContents: MockWebContents;
    options: Record<string, unknown>;
    destroyed = false;
    minimized = false;
    focused = false;
    loadedUrl?: string;
    loadedFile?: { path: string; options?: Record<string, unknown> };

    constructor(options: Record<string, unknown>) {
      super();
      this.options = options;
      const id = BrowserWindowMock.instances.length + 1;
      this.webContents = new MockWebContents(id);
      BrowserWindowMock.instances.push(this);
    }

    isDestroyed(): boolean {
      return this.destroyed;
    }

    isMinimized(): boolean {
      return this.minimized;
    }

    restore(): void {
      this.minimized = false;
    }

    focus(): void {
      this.focused = true;
    }

    loadURL(url: string): Promise<void> {
      this.loadedUrl = url;
      return Promise.resolve();
    }

    loadFile(filePath: string, options?: Record<string, unknown>): Promise<void> {
      this.loadedFile = { path: filePath, options };
      return Promise.resolve();
    }

    close(): void {
      this.destroyed = true;
      this.emit('closed');
    }
  }

  const shellMock = {
    openExternal: vi.fn().mockResolvedValue(undefined),
  };

  return {
    MockBrowserWindow: BrowserWindowMock,
    mockShell: shellMock,
  };
});

vi.mock('electron', () => ({
  BrowserWindow: MockBrowserWindow,
  shell: mockShell,
}));

import { WindowManager } from '@main/infrastructure/windows/WindowManager';

describe('WindowManager (Unit)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockBrowserWindow.instances = [];
    WindowManager.resetForTesting();
  });

  it('creates and tracks main window with secure configuration', () => {
    const win = WindowManager.createMainWindow();

    expect(win).toBeDefined();
    expect(WindowManager.getMainWindow()).toBe(win);
    expect(WindowManager.getAllWindows()).toHaveLength(1);
    expect(WindowManager.getAllWindows()[0]).toBe(win);
    expect(WindowManager.isValidWebContents(win.webContents.id)).toBe(true);

    const mockWin = win as unknown as InstanceType<typeof MockBrowserWindow>;
    expect(mockWin.options.frame).toBe(false);
    expect(mockWin.options.width).toBe(1200);
    expect(mockWin.options.height).toBe(800);
    expect(mockWin.options.minWidth).toBe(800);
    expect(mockWin.options.minHeight).toBe(600);

    const webPrefs = mockWin.options.webPreferences as Record<string, unknown>;
    expect(webPrefs.sandbox).toBe(true);
    expect(webPrefs.contextIsolation).toBe(true);
    expect(webPrefs.nodeIntegration).toBe(false);
    expect(webPrefs.webSecurity).toBe(true);
  });

  it('focuses and restores existing main window if called again', () => {
    const firstWin = WindowManager.createMainWindow();
    const mockWin = firstWin as unknown as InstanceType<typeof MockBrowserWindow>;
    mockWin.minimized = true;

    const secondWin = WindowManager.createMainWindow();

    expect(secondWin).toBe(firstWin);
    expect(mockWin.minimized).toBe(false);
    expect(mockWin.focused).toBe(true);
    expect(WindowManager.getAllWindows()).toHaveLength(1);
  });

  it('removes main window from tracking on closed event', () => {
    const win = WindowManager.createMainWindow();
    const webContentsId = win.webContents.id;

    expect(WindowManager.isValidWebContents(webContentsId)).toBe(true);

    (win as unknown as InstanceType<typeof MockBrowserWindow>).close();

    expect(WindowManager.isValidWebContents(webContentsId)).toBe(false);
    expect(WindowManager.getMainWindow()).toBeNull();
    expect(WindowManager.getAllWindows()).toHaveLength(0);
  });

  it('creates and tracks child window with noteId query parameter', () => {
    const childWin = WindowManager.createChildWindow(42);
    const mockChild = childWin as unknown as InstanceType<typeof MockBrowserWindow>;

    expect(childWin).toBeDefined();
    expect(WindowManager.getMainWindow()).toBeNull();
    expect(WindowManager.getAllWindows()).toHaveLength(1);
    expect(WindowManager.isValidWebContents(childWin.webContents.id)).toBe(true);

    expect(mockChild.options.frame).toBe(false);
    expect(mockChild.options.width).toBe(800);
    expect(mockChild.options.height).toBe(600);
    expect(mockChild.options.minWidth).toBe(500);
    expect(mockChild.options.minHeight).toBe(400);

    if (mockChild.loadedUrl) {
      expect(mockChild.loadedUrl).toContain('type=child');
      expect(mockChild.loadedUrl).toContain('noteId=42');
    } else if (mockChild.loadedFile) {
      expect(mockChild.loadedFile.options).toEqual({
        query: {
          type: 'child',
          noteId: '42',
        },
      });
    }
  });

  it('tracks both main window and multiple child windows concurrently', () => {
    const mainWin = WindowManager.createMainWindow();
    const child1 = WindowManager.createChildWindow(10);
    const child2 = WindowManager.createChildWindow(20);

    expect(WindowManager.getAllWindows()).toHaveLength(3);
    expect(WindowManager.getMainWindow()).toBe(mainWin);
    expect(WindowManager.isValidWebContents(mainWin.webContents.id)).toBe(true);
    expect(WindowManager.isValidWebContents(child1.webContents.id)).toBe(true);
    expect(WindowManager.isValidWebContents(child2.webContents.id)).toBe(true);

    // Closing child1 removes only child1
    (child1 as unknown as InstanceType<typeof MockBrowserWindow>).close();

    expect(WindowManager.getAllWindows()).toHaveLength(2);
    expect(WindowManager.isValidWebContents(child1.webContents.id)).toBe(false);
    expect(WindowManager.isValidWebContents(mainWin.webContents.id)).toBe(true);
    expect(WindowManager.isValidWebContents(child2.webContents.id)).toBe(true);
    expect(WindowManager.getMainWindow()).toBe(mainWin);
  });

  it('enforces security policies: intercepts will-navigate and external URLs', () => {
    const win = WindowManager.createMainWindow();
    const mockWin = win as unknown as InstanceType<typeof MockBrowserWindow>;

    // Test will-navigate prevention
    const navEvent = { preventDefault: vi.fn() };
    mockWin.webContents.emit('will-navigate', navEvent, 'https://malicious.com');
    expect(navEvent.preventDefault).toHaveBeenCalled();

    // Test window open handler
    expect(mockWin.webContents.openHandler).toBeDefined();
    const openHandler = mockWin.webContents.openHandler!;

    // Allowed external protocol https
    const httpsResult = openHandler({ url: 'https://example.com' });
    expect(httpsResult).toEqual({ action: 'deny' });
    expect(mockShell.openExternal).toHaveBeenCalledWith('https://example.com');

    // Allowed external protocol mailto
    const mailtoResult = openHandler({ url: 'mailto:test@example.com' });
    expect(mailtoResult).toEqual({ action: 'deny' });
    expect(mockShell.openExternal).toHaveBeenCalledWith('mailto:test@example.com');

    // Forbidden protocol file
    mockShell.openExternal.mockClear();
    const fileResult = openHandler({ url: 'file:///etc/passwd' });
    expect(fileResult).toEqual({ action: 'deny' });
    expect(mockShell.openExternal).not.toHaveBeenCalled();
  });

  it('getWindowByWebContentsId returns window or undefined', () => {
    const win = WindowManager.createMainWindow();
    const found = WindowManager.getWindowByWebContentsId(win.webContents.id);
    expect(found).toBe(win);

    const notFound = WindowManager.getWindowByWebContentsId(9999);
    expect(notFound).toBeUndefined();
  });
});
