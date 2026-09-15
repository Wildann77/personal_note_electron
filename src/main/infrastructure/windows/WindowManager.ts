import { BrowserWindow } from 'electron';
import path from 'path';
import { applySecurityPolicies } from '../../app/security';

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined;
declare const MAIN_WINDOW_VITE_NAME: string;

/**
 * Infrastructure manager responsible for tracking and lifecycle management
 * of all active application BrowserWindow instances (main and child windows).
 */
export class WindowManager {
  private static windows: Map<number, BrowserWindow> = new Map();
  private static mainWindow: BrowserWindow | null = null;

  /**
   * Creates and registers the primary application BrowserWindow.
   * Enforces frameless chrome and security policies (Architecture §4.1, §4.2, §9).
   */
  static createMainWindow(): BrowserWindow {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      if (this.mainWindow.isMinimized()) {
        this.mainWindow.restore();
      }
      this.mainWindow.focus();
      return this.mainWindow;
    }

    const win = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      frame: false,
      backgroundColor: '#000000',
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    applySecurityPolicies(win);
    this.registerWindow(win, true);

    win.webContents.on('did-finish-load', () => {
      win.webContents.invalidate();
      if (
        typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' &&
        MAIN_WINDOW_VITE_DEV_SERVER_URL
      ) {
        void win.webContents.executeJavaScript(`
          if (!document.getElementById('root')?.hasChildNodes()) {
            import('/main.tsx').catch(console.error);
          }
        `);
      }
    });

    if (typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' && MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      void win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
      const filePath = path.join(
        __dirname,
        `../renderer/${typeof MAIN_WINDOW_VITE_NAME !== 'undefined' ? MAIN_WINDOW_VITE_NAME : 'main_window'}/index.html`,
      );
      void win.loadFile(filePath);
    }

    return win;
  }

  /**
   * Creates and registers a child (secondary) BrowserWindow dedicated
   * to editing a specific note without sidebar clutter (PRD US#30-37, Architecture §9, §17).
   *
   * @param noteId Identifier of the note to be loaded in the child window.
   */
  static createChildWindow(noteId: number): BrowserWindow {
    const win = new BrowserWindow({
      width: 800,
      height: 600,
      minWidth: 500,
      minHeight: 400,
      frame: false,
      backgroundColor: '#000000',
      webPreferences: {
        sandbox: true,
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        allowRunningInsecureContent: false,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    applySecurityPolicies(win);
    this.registerWindow(win, false);

    win.webContents.on('did-finish-load', () => {
      win.webContents.invalidate();
      if (
        typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' &&
        MAIN_WINDOW_VITE_DEV_SERVER_URL
      ) {
        void win.webContents.executeJavaScript(`
          if (!document.getElementById('root')?.hasChildNodes()) {
            import('/main.tsx').catch(console.error);
          }
        `);
      }
    });

    if (typeof MAIN_WINDOW_VITE_DEV_SERVER_URL !== 'undefined' && MAIN_WINDOW_VITE_DEV_SERVER_URL) {
      const url = new URL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
      url.searchParams.set('type', 'child');
      url.searchParams.set('noteId', String(noteId));
      void win.loadURL(url.toString());
    } else {
      const filePath = path.join(
        __dirname,
        `../renderer/${typeof MAIN_WINDOW_VITE_NAME !== 'undefined' ? MAIN_WINDOW_VITE_NAME : 'main_window'}/index.html`,
      );
      void win.loadFile(filePath, {
        query: {
          type: 'child',
          noteId: String(noteId),
        },
      });
    }

    return win;
  }

  /**
   * Retrieves the main application BrowserWindow, or null if none is open.
   */
  static getMainWindow(): BrowserWindow | null {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      return this.mainWindow;
    }
    return null;
  }

  /**
   * Retrieves an array of all currently active BrowserWindow instances that are not destroyed.
   */
  static getAllWindows(): BrowserWindow[] {
    const activeWindows: BrowserWindow[] = [];
    for (const win of this.windows.values()) {
      if (!win.isDestroyed()) {
        activeWindows.push(win);
      }
    }
    return activeWindows;
  }

  /**
   * Checks whether a webContents ID belongs to an officially registered and active window.
   * Crucial for IPC sender authorization (Architecture §4.3).
   *
   * @param webContentsId The ID from event.sender.id
   */
  static isValidWebContents(webContentsId: number): boolean {
    const win = this.windows.get(webContentsId);
    if (!win) {
      return false;
    }
    return !win.isDestroyed();
  }

  /**
   * Retrieves a window by its webContents ID if present and active.
   */
  static getWindowByWebContentsId(webContentsId: number): BrowserWindow | undefined {
    const win = this.windows.get(webContentsId);
    if (win && !win.isDestroyed()) {
      return win;
    }
    return undefined;
  }

  /**
   * Registers a window in the internal tracking map and sets up cleanup listeners.
   */
  private static registerWindow(win: BrowserWindow, isMain: boolean): void {
    const id = win.webContents.id;
    this.windows.set(id, win);

    if (isMain) {
      this.mainWindow = win;
    }

    win.on('closed', () => {
      this.windows.delete(id);
      if (this.mainWindow === win) {
        this.mainWindow = null;
      }
    });
  }

  /**
   * Helper to reset tracking state (useful for test isolation).
   */
  static resetForTesting(): void {
    this.windows.clear();
    this.mainWindow = null;
  }
}
