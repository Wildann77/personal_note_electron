import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

/**
 * Mendapatkan timestamp modifikasi berkas terbaru di dalam direktori secara rekursif.
 */
function getMaxMtime(dirPath: string): number {
  let maxTime = 0;
  if (!fs.existsSync(dirPath)) return 0;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const subMax = getMaxMtime(fullPath);
      if (subMax > maxTime) maxTime = subMax;
    } else {
      const stats = fs.statSync(fullPath);
      if (stats.mtimeMs > maxTime) {
        maxTime = stats.mtimeMs;
      }
    }
  }
  return maxTime;
}

/**
 * Playwright globalSetup hook (Architecture §13, TASK P21-T0).
 * Memastikan artefak build Electron (.vite/build & .vite/renderer) telah siap
 * dan terkini sebelum test suite E2E dijalankan.
 */
export default function globalSetup(): void {
  const rootDir = path.resolve(__dirname, '../../..');
  const mainBundle = path.join(rootDir, '.vite/build/main.js');
  const rendererBundle = path.join(rootDir, '.vite/renderer/main_window/index.html');
  const srcDir = path.join(rootDir, 'src');

  const mainExists = fs.existsSync(mainBundle);
  const rendererExists = fs.existsSync(rendererBundle);

  let needBuild = false;

  if (!mainExists || !rendererExists) {
    needBuild = true;
    console.log('[Playwright globalSetup] Bundle .vite belum lengkap, memulai build...');
  } else {
    const rendererMtime = fs.statSync(rendererBundle).mtimeMs;
    const srcLatestMtime = getMaxMtime(srcDir);

    if (srcLatestMtime > rendererMtime) {
      needBuild = true;
      console.log('[Playwright globalSetup] Perubahan kode sumber terdeteksi, memicu rebuild...');
    } else {
      console.log('[Playwright globalSetup] Bundle .vite sudah terkini. Melewati tahap build.');
    }
  }

  if (needBuild) {
    console.log('[Playwright globalSetup] Menjalankan `npx electron-forge package`...');
    execSync('npx electron-forge package', {
      cwd: rootDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        VITE_CONFIG_NATIVE_IGNORE_WARNING: 'true',
      },
    });
    console.log('[Playwright globalSetup] Build selesai.');
  }
}
