import { BrowserWindow, shell } from 'electron';

/**
 * Applies security policies to a BrowserWindow instance (Architecture §4.2, PRD Security Protocol):
 * 1. Blocks arbitrary in-window navigation (will-navigate).
 * 2. Intercepts window.open / target="_blank" via setWindowOpenHandler:
 *    - Allows only 'https:', 'http:', and 'mailto:' protocols opened in the external system browser.
 *    - Blocks all dangerous or arbitrary protocols ('file:', 'javascript:', 'data:', 'shell:').
 *    - Always denies internal window creation ({ action: 'deny' }).
 */
export function applySecurityPolicies(win: BrowserWindow): void {
  win.webContents.on('will-navigate', (event) => {
    event.preventDefault();
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    try {
      const parsed = new URL(url);
      const allowedProtocols = ['https:', 'http:', 'mailto:'];
      if (allowedProtocols.includes(parsed.protocol)) {
        void shell.openExternal(url);
      }
    } catch {
      // Ignore invalid / malformed URLs
    }
    return { action: 'deny' };
  });
}
