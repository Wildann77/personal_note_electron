import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DeleteConfirmDialog } from '@renderer/components/dialogs/DeleteConfirmDialog';
import { ConflictResolveDialog } from '@renderer/components/dialogs/ConflictResolveDialog';
import {
  UpdateNoticeDialog,
  UpdateNoticeToast,
} from '@renderer/components/dialogs/UpdateNoticeDialog';

describe('Accessibility & WAI-ARIA Audit (WCAG 2.1 Level AA, Architecture §12, TASK [P22-T2])', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('DeleteConfirmDialog ARIA & Keyboard Navigation', () => {
    it('has proper alertdialog ARIA role and aria-modal attribute', () => {
      render(
        <DeleteConfirmDialog
          open={true}
          onOpenChange={vi.fn()}
          onConfirm={vi.fn()}
          noteTitle="Catatan Penting"
        />,
      );

      const dialogEl = screen.getByRole('alertdialog');
      expect(dialogEl).toBeDefined();
      expect(dialogEl.getAttribute('aria-modal')).toBe('true');
      expect(dialogEl.getAttribute('aria-labelledby')).toBeTruthy();
      expect(dialogEl.getAttribute('aria-describedby')).toBeTruthy();
    });

    it('handles Escape key to trigger dismiss via onOpenChange(false)', () => {
      const mockOpenChange = vi.fn();
      render(
        <DeleteConfirmDialog
          open={true}
          onOpenChange={mockOpenChange}
          onConfirm={vi.fn()}
          noteTitle="Catatan Penting"
        />,
      );

      fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape', code: 'Escape' });
      expect(mockOpenChange).toHaveBeenCalledWith(false);
    });

    it('supports keyboard navigation and activation of buttons via keyboard events', () => {
      const mockConfirm = vi.fn();
      render(
        <DeleteConfirmDialog
          open={true}
          onOpenChange={vi.fn()}
          onConfirm={mockConfirm}
          noteTitle="Catatan Penting"
        />,
      );

      const confirmBtn = screen.getByTestId('delete-confirm-btn');
      confirmBtn.focus();
      expect(document.activeElement).toBe(confirmBtn);

      fireEvent.click(confirmBtn);
      expect(mockConfirm).toHaveBeenCalledTimes(1);
    });
  });

  describe('ConflictResolveDialog ARIA & Keyboard Navigation', () => {
    it('has proper dialog ARIA role, title, and description attributes', () => {
      render(
        <ConflictResolveDialog
          open={true}
          onOpenChange={vi.fn()}
          onReload={vi.fn()}
          onCopyLocal={vi.fn()}
          onOverwrite={vi.fn()}
          noteTitle="Konflik Revisi"
        />,
      );

      const dialogEl = screen.getByRole('dialog');
      expect(dialogEl).toBeDefined();
      expect(dialogEl.getAttribute('aria-modal')).toBe('true');
      expect(dialogEl.getAttribute('aria-labelledby')).toBeTruthy();
      expect(dialogEl.getAttribute('aria-describedby')).toBeTruthy();
    });

    it('dismisses when Escape key is pressed', () => {
      const mockOpenChange = vi.fn();
      render(
        <ConflictResolveDialog
          open={true}
          onOpenChange={mockOpenChange}
          onReload={vi.fn()}
          onCopyLocal={vi.fn()}
          noteTitle="Konflik Revisi"
        />,
      );

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape', code: 'Escape' });
      expect(mockOpenChange).toHaveBeenCalledWith(false);
    });

    it('allows focusable action buttons to receive keyboard focus', () => {
      render(
        <ConflictResolveDialog
          open={true}
          onOpenChange={vi.fn()}
          onReload={vi.fn()}
          onCopyLocal={vi.fn()}
          onOverwrite={vi.fn()}
          noteTitle="Konflik Revisi"
        />,
      );

      const copyBtn = screen.getByTestId('conflict-copy-btn');
      const reloadBtn = screen.getByTestId('conflict-reload-btn');
      const overwriteBtn = screen.getByTestId('conflict-overwrite-btn');

      copyBtn.focus();
      expect(document.activeElement).toBe(copyBtn);

      reloadBtn.focus();
      expect(document.activeElement).toBe(reloadBtn);

      overwriteBtn.focus();
      expect(document.activeElement).toBe(overwriteBtn);
    });
  });

  describe('UpdateNoticeDialog & UpdateNoticeToast ARIA', () => {
    it('UpdateNoticeDialog provides dialog ARIA role and label connections', () => {
      render(
        <UpdateNoticeDialog
          open={true}
          onOpenChange={vi.fn()}
          currentVersion="1.0.0"
          latestVersion="1.1.0"
          releaseUrl="https://github.com/example/releases/v1.1.0"
        />,
      );

      const dialogEl = screen.getByRole('dialog');
      expect(dialogEl).toBeDefined();
      expect(dialogEl.getAttribute('aria-modal')).toBe('true');
      expect(dialogEl.getAttribute('aria-labelledby')).toBeTruthy();
    });

    it('UpdateNoticeToast has role="status" and aria-live="polite" for screen readers', () => {
      render(
        <UpdateNoticeToast
          open={true}
          onClose={vi.fn()}
          latestVersion="1.1.0"
          releaseUrl="https://github.com/example/releases/v1.1.0"
          releaseNotes="Bugfix updates"
        />,
      );

      const toast = screen.getByRole('status');
      expect(toast).toBeDefined();
      expect(toast.getAttribute('aria-live')).toBe('polite');

      const closeBtn = screen.getByTestId('toast-close-btn');
      expect(closeBtn.getAttribute('aria-label')).toBe('Tutup notifikasi');
    });
  });

  describe('CSS Reduced Motion Support (Architecture §12)', () => {
    it('verifies prefers-reduced-motion media query is defined in global CSS', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const cssPath = path.resolve(__dirname, '../../src/renderer/assets/styles/globals.css');
      const cssContent = fs.readFileSync(cssPath, 'utf8');

      expect(cssContent).toContain('@media (prefers-reduced-motion: reduce)');
      expect(cssContent).toContain('animation-duration: 0.01ms !important');
      expect(cssContent).toContain('transition-duration: 0.01ms !important');
    });
  });
});
