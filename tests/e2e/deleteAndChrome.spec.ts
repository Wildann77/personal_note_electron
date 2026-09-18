import { test, expect } from './fixtures/electronFixture';

test.describe('Delete Confirm & Window Chrome Drag Region (Fase 21, TASK P21-T3, PRD US#26, US#40)', () => {
  test('skenario dialog konfirmasi hapus: batal vs konfirmasi hapus permanen', async ({
    mainWindow,
  }) => {
    // 1. Buat catatan baru
    const createBtn = mainWindow.locator(
      '[data-testid="sidebar-create-note-button"], [data-testid="empty-create-note-btn"]',
    );
    await createBtn.first().click();

    const noteItem = mainWindow.locator('[data-testid^="note-item-"]').first();
    await expect(noteItem).toBeVisible({ timeout: 10000 });

    // 2. Arahkan kursor dan klik tombol hapus (tempat sampah) pada item catatan
    await noteItem.hover();
    const deleteBtn = mainWindow.locator('[data-testid^="note-item-delete-btn-"]').first();
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();

    // 3. Verifikasi modal dialog konfirmasi hapus muncul
    const dialog = mainWindow.locator('[data-testid="delete-confirm-dialog"]');
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // 4. Klik tombol "Batal"
    const cancelBtn = mainWindow.locator('[data-testid="delete-cancel-btn"]');
    await cancelBtn.click();

    // Verifikasi dialog tertutup dan catatan tetap ada
    await expect(dialog).not.toBeVisible();
    await expect(noteItem).toBeVisible();

    // 5. Klik tombol hapus sekali lagi
    await noteItem.hover();
    await deleteBtn.click();
    await expect(dialog).toBeVisible();

    // 6. Klik tombol "Hapus Catatan" (konfirmasi destruktif)
    const confirmBtn = mainWindow.locator('[data-testid="delete-confirm-btn"]');
    await confirmBtn.click();

    // Verifikasi dialog tertutup dan catatan terhapus permanen dari daftar
    await expect(dialog).not.toBeVisible();
    await expect(noteItem).not.toBeVisible({ timeout: 5000 });
  });

  test('verifikasi titlebar drag region tidak menelan interaksi tombol window controls', async ({
    mainWindow,
  }) => {
    // 1. Periksa elemen TitleBar memiliki penanda drag-region
    const titleBar = mainWindow.locator('[data-testid="titlebar-chrome"]');
    await expect(titleBar).toBeVisible();
    await expect(titleBar).toHaveClass(/drag-region/);

    // 2. Periksa container window-controls dan tombol-tombolnya memiliki kelas no-drag
    const windowControls = mainWindow.locator('[data-testid="window-controls"]');
    if (await windowControls.isVisible()) {
      await expect(windowControls).toHaveClass(/no-drag/);

      const minimizeBtn = mainWindow.locator('[data-testid="window-control-minimize"]');
      const maximizeBtn = mainWindow.locator('[data-testid="window-control-maximize"]');
      const closeBtn = mainWindow.locator('[data-testid="window-control-close"]');

      await expect(minimizeBtn).toHaveClass(/no-drag/);
      await expect(maximizeBtn).toHaveClass(/no-drag/);
      await expect(closeBtn).toHaveClass(/no-drag/);

      // Verifikasi CSS computed style -webkit-app-region
      const titleBarRegion = await titleBar.evaluate((el) =>
        window.getComputedStyle(el).getPropertyValue('-webkit-app-region'),
      );
      const controlRegion = await minimizeBtn.evaluate((el) =>
        window.getComputedStyle(el).getPropertyValue('-webkit-app-region'),
      );

      expect(titleBarRegion).toBe('drag');
      expect(controlRegion).toBe('no-drag');
    }
  });
});
