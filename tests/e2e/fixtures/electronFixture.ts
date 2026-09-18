import {
  test as base,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';

export interface ElectronTestFixtures {
  /**
   * Direktori data sementara untuk isolasi SQLite database & single-instance lock per test run.
   */
  tempDir: string;

  /**
   * Handle aplikasi Electron yang sedang berjalan.
   */
  electronApp: ElectronApplication;

  /**
   * Page objek jendela utama aplikasi.
   */
  mainWindow: Page;

  /**
   * Helper untuk menunggu dan menangkap jendela anak (child window) spesifik catatan.
   */
  waitForChildWindow: (noteId?: number, timeout?: number) => Promise<Page>;
}

export const test = base.extend<ElectronTestFixtures>({
  // eslint-disable-next-line no-empty-pattern
  tempDir: async ({}, use) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'electron-e2e-'));
    await use(dir);
    try {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    } catch (err) {
      console.warn('[electronFixture] Gagal membersihkan tempDir:', err);
    }
  },

  electronApp: async ({ tempDir }, use) => {
    const rootDir = path.resolve(__dirname, '../../..');
    const app = await electron.launch({
      args: [
        '.',
        '--no-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        `--user-data-dir=${tempDir}`,
      ],
      cwd: rootDir,
      env: {
        ...process.env,
        NODE_ENV: 'test',
      },
      timeout: 25000,
    });

    await use(app);

    try {
      await app.close();
    } catch {
      // Abaikan jika aplikasi sudah ditutup secara manual di dalam test
    }
  },

  mainWindow: async ({ electronApp }, use) => {
    const win = await electronApp.firstWindow();
    await win.waitForSelector('[data-testid="main-window-layout"], #root', {
      state: 'visible',
      timeout: 15000,
    });
    await use(win);
  },

  waitForChildWindow: async ({ electronApp }, use) => {
    const helper = async (noteId?: number, timeout = 15000): Promise<Page> => {
      // Periksa daftar window yang sudah terbuka terlebih dahulu
      const windows = electronApp.windows();
      for (const win of windows) {
        const url = win.url();
        if (url.includes('type=child')) {
          if (!noteId || url.includes(`noteId=${noteId}`)) {
            await win.waitForLoadState('domcontentloaded');
            return win;
          }
        }
      }

      // Tunggu kemunculan window baru dari event Electron
      const childWin = await electronApp.waitForEvent('window', {
        predicate: (page) => {
          const url = page.url();
          if (url.includes('type=child')) {
            if (!noteId || url.includes(`noteId=${noteId}`)) {
              return true;
            }
          }
          return false;
        },
        timeout,
      });

      await childWin.waitForLoadState('domcontentloaded');
      return childWin;
    };

    await use(helper);
  },
});

export { expect };
