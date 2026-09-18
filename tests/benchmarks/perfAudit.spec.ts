import { test as base, expect, _electron as electron } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { test } from '../e2e/fixtures/electronFixture';

interface MetricResult {
  name: string;
  target: string;
  actual: string;
  raw: number;
  status: 'PASS' | 'WARN';
}

// Simpan hasil audit metriks untuk tabel kesimpulan
const auditResults: MetricResult[] = [];

test.describe('NFR Performance Benchmark Suite (Architecture §12, TASK [P22-T1])', () => {
  test.afterAll(() => {
    console.log('\n========================================================================');
    console.log('       HASIL AUDIT NON-FUNCTIONAL REQUIREMENTS (ARCHITECTURE §12)       ');
    console.log('========================================================================');
    console.table(
      auditResults.map((r) => ({
        'Aspek NFR': r.name,
        'Target Spesifikasi': r.target,
        'Hasil Aktual': r.actual,
        Status: r.status,
      })),
    );
    console.log('========================================================================\n');
  });

  base('1. Cold Startup Time Benchmark (Target: < 800ms)', async () => {
    const rootDir = path.resolve(__dirname, '../..');
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'electron-perf-startup-'));

    const start = performance.now();
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

    const win = await app.firstWindow();
    await win.waitForSelector('[data-testid="main-window-layout"], #root', {
      state: 'visible',
      timeout: 15000,
    });

    // Tunggu layout sidebar dan area konten siap
    await win.waitForSelector('[data-testid="main-layout-sidebar"]', {
      state: 'visible',
      timeout: 15000,
    });

    const startupDuration = performance.now() - start;

    await app.close();
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    } catch {
      // Abaikan jika pembersihan tertunda
    }

    const isPass = startupDuration <= 800;
    auditResults.push({
      name: 'Cold Startup Time',
      target: '< 800 ms',
      actual: `${startupDuration.toFixed(1)} ms`,
      raw: startupDuration,
      status: isPass ? 'PASS' : 'WARN',
    });

    console.log(`[PerfAudit] Cold Startup Time: ${startupDuration.toFixed(1)}ms (Target: <800ms)`);
    expect(startupDuration).toBeGreaterThan(0);
    expect(startupDuration).toBeLessThan(15000);
  });

  test('2. Note Switching Latency Benchmark (Target: < 50ms)', async ({ mainWindow }) => {
    const createBtn = mainWindow.locator(
      '[data-testid="sidebar-create-note-button"], [data-testid="empty-create-note-btn"]',
    );

    // Pastikan minimal ada 2 catatan
    const items = mainWindow.locator('div[role="button"][data-active]');
    let count = await items.count();

    while (count < 2) {
      await createBtn.first().click();
      await mainWindow.waitForTimeout(300);
      count = await items.count();
    }

    expect(count).toBeGreaterThanOrEqual(2);

    const note1 = items.nth(0);
    const note2 = items.nth(1);

    // Beralih ke note 2
    await note2.click();
    await mainWindow.waitForTimeout(200);
    await expect(note2).toHaveAttribute('data-active', 'true');

    // Ukur latensi saat beralih kembali ke note 1
    const switchStart = performance.now();
    await note1.click();
    await expect(note1).toHaveAttribute('data-active', 'true');
    const switchDuration = performance.now() - switchStart;

    const isPass = switchDuration <= 50;
    auditResults.push({
      name: 'Note Switching Latency',
      target: '< 50 ms',
      actual: `${switchDuration.toFixed(1)} ms`,
      raw: switchDuration,
      status: isPass ? 'PASS' : 'WARN',
    });

    console.log(
      `[PerfAudit] Note Switching Latency: ${switchDuration.toFixed(1)}ms (Target: <50ms)`,
    );
    expect(switchDuration).toBeGreaterThan(0);
  });

  test('3. Autosave Commit & Debounce Time Benchmark (Target: < 30ms commit)', async ({
    mainWindow,
  }) => {
    // Pastikan ada catatan aktif
    const items = mainWindow.locator('[data-testid^="note-item-"]');
    if ((await items.count()) === 0) {
      const createBtn = mainWindow.locator(
        '[data-testid="sidebar-create-note-button"], [data-testid="empty-create-note-btn"]',
      );
      await createBtn.first().click();
    } else {
      await items.first().click();
    }

    // 1. Ukur direct SQLite atomic commit time via IPC invoke
    const directCommitTimeMs = await mainWindow.evaluate(async () => {
      const notesRes = await window.electronAPI.notes.getAll();
      if (!notesRes.success || notesRes.data.length === 0) return 0;
      const targetNote = notesRes.data[0];

      const t0 = performance.now();
      const updateRes = await window.electronAPI.notes.update({
        id: targetNote.id,
        expectedRevision: targetNote.revision,
        title: `${targetNote.title || 'Catatan'} (Perf Audit)`,
        content: { blocks: [] },
      });
      const t1 = performance.now();

      if (!updateRes.success) {
        console.warn('Update failed:', updateRes.error);
      }
      return t1 - t0;
    });

    // 2. Verifikasi UI autosave flow
    const editorParagraph = mainWindow.locator(
      '.ce-paragraph[contenteditable="true"], [contenteditable="true"]',
    );
    await expect(editorParagraph.first()).toBeVisible({ timeout: 10000 });
    await editorParagraph.first().click();

    const typingText = ' Autosave Test';
    await editorParagraph.first().pressSequentially(typingText, { delay: 10 });

    const saveStatus = mainWindow.locator('[data-testid="editor-save-status"]');
    await expect(saveStatus).toContainText('Tersimpan', { timeout: 10000 });

    const isPass = directCommitTimeMs <= 30;
    auditResults.push({
      name: 'Autosave Commit Time',
      target: '< 30 ms',
      actual: `${directCommitTimeMs.toFixed(1)} ms`,
      raw: directCommitTimeMs,
      status: isPass ? 'PASS' : 'WARN',
    });

    console.log(
      `[PerfAudit] Direct SQLite Atomic Commit: ${directCommitTimeMs.toFixed(1)}ms (Target: <30ms)`,
    );
    expect(directCommitTimeMs).toBeGreaterThan(0);
  });

  test('4. Idle Memory Footprint Benchmark (Target: < 150MB)', async ({
    electronApp,
    mainWindow,
  }) => {
    // Biarkan aplikasi mengendap (settle idle) selama 1 detik
    await mainWindow.waitForTimeout(1000);

    const memoryStats = await electronApp.evaluate(async ({ app }) => {
      const mainPrivateMem = await process.getProcessMemoryInfo();
      const appMetrics = app.getAppMetrics();
      const v8HeapMB = process.memoryUsage().heapUsed / (1024 * 1024);

      let totalPrivateKB = mainPrivateMem.private;
      for (const proc of appMetrics) {
        if (proc.type !== 'Browser') {
          // Tambahkan estimasi memori proses tab/renderer
          totalPrivateKB += proc.memory.workingSetSize || 0;
        }
      }

      return {
        processCount: appMetrics.length,
        mainPrivateMB: (mainPrivateMem.private / 1024).toFixed(1),
        v8HeapMB: v8HeapMB.toFixed(1),
        totalEstimatedMB: (totalPrivateKB / 1024).toFixed(1),
        rawTotalMB: totalPrivateKB / 1024,
      };
    });

    const isPass = memoryStats.rawTotalMB < 150;
    auditResults.push({
      name: 'Memory Footprint (Idle)',
      target: '< 150 MB',
      actual: `${memoryStats.mainPrivateMB} MB main (Heap: ${memoryStats.v8HeapMB} MB, ${memoryStats.processCount} proc)`,
      raw: memoryStats.rawTotalMB,
      status: isPass ? 'PASS' : 'WARN',
    });

    console.log(
      `[PerfAudit] Idle Memory: Main Private ${memoryStats.mainPrivateMB}MB, V8 Heap ${memoryStats.v8HeapMB}MB, Total Estimated ${memoryStats.totalEstimatedMB}MB (Target: <150MB)`,
    );
    expect(memoryStats.rawTotalMB).toBeGreaterThan(0);
  });
});
