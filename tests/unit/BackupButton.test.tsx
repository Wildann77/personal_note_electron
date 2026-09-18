import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import { BackupButton } from '@renderer/components/chrome/BackupButton';

describe('BackupButton Component (PRD US#62, DESIGN.md §4.2, §5.3, TASK.md [P11-T5])', () => {
  let mockCreateBackup: ReturnType<typeof vi.fn>;
  let mockTriggerBackup: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useRealTimers();
    mockCreateBackup = vi.fn().mockResolvedValue({
      success: true,
      data: '/path/to/backup/notes-2026-09-16.db',
    });
    mockTriggerBackup = vi.fn().mockResolvedValue({
      success: true,
      data: '/path/to/backup/notes-2026-09-16.db',
    });

    window.electronAPI = {
      ...window.electronAPI,
      backup: {
        create: mockCreateBackup as unknown as typeof window.electronAPI.backup.create,
        triggerBackup:
          mockTriggerBackup as unknown as typeof window.electronAPI.backup.triggerBackup,
      },
    };
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders correctly with HardDrive icon and accessible labels', () => {
    render(<BackupButton />);

    const button = screen.getByTestId('backup-database-button');
    expect(button).toBeDefined();
    expect(button.getAttribute('aria-label')).toBe('Cadangkan Database');
    expect(button.getAttribute('title')).toBe('Cadangkan Database');
    expect(button.getAttribute('role')).toBe('button');

    const icon = screen.getByTestId('backup-icon-harddrive');
    expect(icon).toBeDefined();
    expect(screen.queryByTestId('backup-feedback-toast')).toBeNull();
  });

  it('triggers backup API on click and displays success toast feedback', async () => {
    const onComplete = vi.fn();
    render(<BackupButton onBackupComplete={onComplete} />);

    const button = screen.getByTestId('backup-database-button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockCreateBackup).toHaveBeenCalledTimes(1);
    });

    // Success toast appears
    const toast = await screen.findByTestId('backup-feedback-toast');
    expect(toast).toBeDefined();
    expect(screen.getByTestId('backup-toast-success-icon')).toBeDefined();
    expect(screen.getByText('Database Berhasil Dicadangkan')).toBeDefined();
    expect(screen.getByText('/path/to/backup/notes-2026-09-16.db')).toBeDefined();

    expect(onComplete).toHaveBeenCalledWith({
      success: true,
      data: '/path/to/backup/notes-2026-09-16.db',
    });
  });

  it('handles backup failure and displays error toast feedback', async () => {
    mockCreateBackup.mockResolvedValueOnce({
      success: false,
      error: {
        code: 'STORAGE_ERROR',
        message: 'Kapasitas disk penyimpanan tidak mencukupi',
      },
    });

    render(<BackupButton />);

    const button = screen.getByTestId('backup-database-button');
    fireEvent.click(button);

    const toast = await screen.findByTestId('backup-feedback-toast');
    expect(toast).toBeDefined();
    expect(screen.getByTestId('backup-toast-error-icon')).toBeDefined();
    expect(screen.getByText('Gagal Membuat Cadangan Database')).toBeDefined();
    expect(screen.getByText('Kapasitas disk penyimpanan tidak mencukupi')).toBeDefined();
  });

  it('allows manual dismiss of the floating toast via close button', async () => {
    render(<BackupButton />);

    fireEvent.click(screen.getByTestId('backup-database-button'));

    const closeBtn = await screen.findByTestId('backup-toast-close-btn');
    fireEvent.click(closeBtn);

    expect(screen.queryByTestId('backup-feedback-toast')).toBeNull();
  });

  it('auto-dismisses toast after 3500ms timeout', async () => {
    vi.useFakeTimers();

    render(<BackupButton />);

    await act(async () => {
      fireEvent.click(screen.getByTestId('backup-database-button'));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByTestId('backup-feedback-toast')).toBeDefined();

    // Fast-forward timer by 3600ms
    act(() => {
      vi.advanceTimersByTime(3600);
    });

    expect(screen.queryByTestId('backup-feedback-toast')).toBeNull();
  });

  it('falls back to triggerBackup if create is undefined', async () => {
    const fallbackMock = vi.fn().mockResolvedValue({
      success: true,
      data: '/backup/fallback.db',
    });

    window.electronAPI = {
      ...window.electronAPI,
      backup: {
        triggerBackup: fallbackMock,
      } as unknown as typeof window.electronAPI.backup,
    };

    render(<BackupButton />);
    fireEvent.click(screen.getByTestId('backup-database-button'));

    await waitFor(() => {
      expect(fallbackMock).toHaveBeenCalledTimes(1);
    });
  });
});
