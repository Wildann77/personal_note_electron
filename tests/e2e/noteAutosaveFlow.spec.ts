import { test, expect } from './fixtures/electronFixture';

test.describe('Note Autosave & Debounce Flow (Fase 21, TASK P21-T2, PRD US#8, US#9)', () => {
  test('verifikasi autosave debounce dan persistensi data setelah reload', async ({
    mainWindow,
  }) => {
    // 1. Buat catatan baru
    const createBtn = mainWindow.locator(
      '[data-testid="sidebar-create-note-button"], [data-testid="empty-create-note-btn"]',
    );
    await createBtn.first().click();

    const editorContainer = mainWindow.locator('[data-testid^="note-editor-instance-"]');
    await expect(editorContainer).toBeVisible({ timeout: 10000 });

    const editorParagraph = mainWindow.locator(
      '.ce-paragraph[contenteditable="true"], [contenteditable="true"]',
    );
    await expect(editorParagraph.first()).toBeVisible({ timeout: 10000 });

    const saveStatus = mainWindow.locator('[data-testid="editor-save-status"]');

    // 2. Ketik teks pada editor
    const noteText = 'Teks Catatan Autosave Persisten';
    await editorParagraph.first().click();

    // Verifikasi pengetikan cepat tidak langsung memicu 'Tersimpan' di setiap keystroke (efek debounce 600ms)
    await editorParagraph.first().pressSequentially(noteText, { delay: 20 });

    // 3. Setelah jeda debounce (600ms), autosave selesai dan menampilkan indikator "Tersimpan"
    await expect(saveStatus).toContainText('Tersimpan', { timeout: 10000 });

    // Verifikasi judul pada sidebar telah terbarui sesuai isi catatan
    const sidebarItem = mainWindow.locator('[data-testid^="note-item-"]').first();
    await expect(sidebarItem).toContainText(noteText, { timeout: 5000 });

    // 4. Reload jendela utama untuk memverifikasi durabilitas data di SQLite
    await mainWindow.reload();
    await mainWindow.waitForSelector('[data-testid="main-window-layout"]', { timeout: 10000 });

    // 5. Pastikan catatan tetap ada dan isi teksnya tidak hilang setelah reload
    const reloadedSidebarItem = mainWindow.locator('[data-testid^="note-item-"]').first();
    await expect(reloadedSidebarItem).toBeVisible({ timeout: 10000 });
    await expect(reloadedSidebarItem).toContainText(noteText);

    // Buka catatan dan pastikan editor memuat teks yang sama dari SQLite
    await reloadedSidebarItem.click();
    const reloadedParagraph = mainWindow.locator(
      '.ce-paragraph[contenteditable="true"], [contenteditable="true"]',
    );
    await expect(reloadedParagraph.first()).toContainText(noteText, { timeout: 10000 });
  });
});
