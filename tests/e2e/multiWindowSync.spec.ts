import { test, expect } from './fixtures/electronFixture';

test.describe('Multi-Window Real-time Sync (Fase 21, TASK P21-T1, PRD US#37)', () => {
  test('membuka window anak, mengedit konten, dan memverifikasi update instan di window utama', async ({
    electronApp,
    mainWindow,
    waitForChildWindow,
  }) => {
    // 1. Buat catatan baru di window utama
    const createBtn = mainWindow.locator(
      '[data-testid="sidebar-create-note-button"], [data-testid="empty-create-note-btn"]',
    );
    await createBtn.first().click();

    // Tunggu catatan aktif terpasang di editor window utama dan autosave awal stabil
    const editorContainer = mainWindow.locator('[data-testid^="note-editor-instance-"]');
    await expect(editorContainer).toBeVisible({ timeout: 10000 });
    await mainWindow.waitForTimeout(1000);

    // 2. Klik tombol "Buka di Jendela Baru" di header editor
    const openChildBtn = mainWindow.locator('[data-testid="editor-open-child-btn"]');
    await expect(openChildBtn).toBeVisible();
    await openChildBtn.click();

    // 3. Tunggu hingga child window terbuka dan siap
    const childWindow = await waitForChildWindow();

    await expect(childWindow.locator('[data-testid="child-window-layout"]')).toBeVisible({
      timeout: 10000,
    });

    await electronApp.evaluate(({ BrowserWindow }) => {
      const wins = BrowserWindow.getAllWindows();
      for (const w of wins) {
        if (w.webContents.getURL().includes('type=child')) {
          w.show();
          w.focus();
        }
      }
    });
    await childWindow.bringToFront();

    // Pastikan editor di child window sudah ter-mount dan siap
    const childEditorParagraph = childWindow.locator('.ce-paragraph').first();
    await expect(childEditorParagraph).toBeVisible({ timeout: 10000 });

    // Tunggu sejenak agar Editor.js menyelesaikan isReady
    await childWindow.waitForTimeout(500);

    // 4. Ketik teks baru di child window
    const newTitle = 'Judul Dari Window Anak';
    await childEditorParagraph.click();
    await childEditorParagraph.fill(newTitle);

    // 5. Tunggu hingga autosave di child window selesai (status menjadi Tersimpan)
    const childSaveStatus = childWindow.locator('[data-testid="editor-save-status"]');
    await expect(childSaveStatus).toContainText('Tersimpan', { timeout: 10000 });

    // 6. Verifikasi window utama menerima pembaruan secara real-time via event broadcast tanpa reload
    const sidebarItem = mainWindow.locator('[data-testid^="note-item-"]').first();
    await expect(sidebarItem).toContainText(newTitle, { timeout: 10000 });

    // Tutup child window
    await childWindow.close();
  });
});
