import { BrowserWindow } from 'electron';
import { WindowManager } from '@main/infrastructure/windows/WindowManager';

export type WindowResolver = (target?: BrowserWindow | number) => BrowserWindow | null;

/**
 * Use case to manage window chrome actions (minimize, toggle maximize, close)
 * for the calling window, handling cross-platform variance gracefully
 * (PRD US#43-45, Architecture §9, §17).
 */
export class WindowControlsUseCase {
  constructor(
    private readonly windowResolver: WindowResolver = (target) => {
      if (typeof target === 'number') {
        return WindowManager.getWindowByWebContentsId(target) ?? null;
      }
      if (target) {
        return target;
      }
      return BrowserWindow.getFocusedWindow() ?? WindowManager.getMainWindow();
    },
  ) {}

  /**
   * Minimizes the calling or resolved window.
   *
   * @param target Optional explicit BrowserWindow instance or webContents ID.
   */
  public minimize(target?: BrowserWindow | number): void {
    const win = this.resolveWindow(target);
    if (!win || win.isDestroyed()) {
      return;
    }
    win.minimize();
  }

  /**
   * Toggles maximization of the calling or resolved window.
   * If currently maximized, unmaximizes (restores); otherwise maximizes.
   *
   * @param target Optional explicit BrowserWindow instance or webContents ID.
   */
  public toggleMaximize(target?: BrowserWindow | number): void {
    const win = this.resolveWindow(target);
    if (!win || win.isDestroyed()) {
      return;
    }

    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }

  /**
   * Alias for toggleMaximize conforming to IWindowControlsAPI.maximize contract (PRD US#44).
   *
   * @param target Optional explicit BrowserWindow instance or webContents ID.
   */
  public maximize(target?: BrowserWindow | number): void {
    this.toggleMaximize(target);
  }

  /**
   * Closes the calling or resolved window.
   *
   * @param target Optional explicit BrowserWindow instance or webContents ID.
   */
  public close(target?: BrowserWindow | number): void {
    const win = this.resolveWindow(target);
    if (!win || win.isDestroyed()) {
      return;
    }
    win.close();
  }

  /**
   * Internal resolver to locate target BrowserWindow with safe fallback.
   */
  private resolveWindow(target?: BrowserWindow | number): BrowserWindow | null {
    return this.windowResolver(target);
  }
}
