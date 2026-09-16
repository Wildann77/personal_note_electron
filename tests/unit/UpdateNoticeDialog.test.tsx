import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import {
  UpdateNoticeDialog,
  UpdateNoticeToast,
} from '@renderer/components/dialogs/UpdateNoticeDialog';

describe('UpdateNoticeDialog Component (Architecture §15.3, PRD US#61, DESIGN.md §5.3, TASK.md [P14-T3])', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders update dialog with version, description, changelog and action buttons', () => {
    render(
      <UpdateNoticeDialog
        open={true}
        onOpenChange={vi.fn()}
        currentVersion="1.0.0"
        latestVersion="1.1.0"
        releaseUrl="https://github.com/owner/personal_note_electron/releases/tag/v1.1.0"
        releaseName="Rilis v1.1.0 — Peningkatan Sinkronisasi"
        releaseNotes="- Optimistic concurrency guard perbaikan\n- Performa virtual list dipercepat"
        publishedAt="15 September 2026"
      />,
    );

    expect(screen.getByTestId('update-notice-dialog')).toBeDefined();
    expect(screen.getByText('Pembaruan Tersedia')).toBeDefined();
    expect(screen.getByTestId('update-version-badge')).toBeDefined();
    expect(screen.getByText('1.0.0')).toBeDefined();
    expect(screen.getByText('1.1.0')).toBeDefined();
    expect(screen.getByText('Rilis v1.1.0 — Peningkatan Sinkronisasi')).toBeDefined();
    expect(screen.getByTestId('update-changelog')).toBeDefined();
    expect(screen.getByTestId('update-later-btn')).toBeDefined();
    expect(screen.getByTestId('update-download-btn')).toBeDefined();
  });

  it('calls onDownload when download button is clicked', () => {
    const mockDownload = vi.fn();
    const mockOpenChange = vi.fn();

    render(
      <UpdateNoticeDialog
        open={true}
        onOpenChange={mockOpenChange}
        latestVersion="1.1.0"
        releaseUrl="https://github.com/owner/personal_note_electron/releases/tag/v1.1.0"
        onDownload={mockDownload}
      />,
    );

    fireEvent.click(screen.getByTestId('update-download-btn'));
    expect(mockDownload).toHaveBeenCalledTimes(1);
    expect(mockOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls window.open with release URL when onDownload prop is omitted', () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const mockOpenChange = vi.fn();

    render(
      <UpdateNoticeDialog
        open={true}
        onOpenChange={mockOpenChange}
        latestVersion="1.2.0"
        releaseUrl="https://github.com/owner/personal_note_electron/releases/tag/v1.2.0"
      />,
    );

    fireEvent.click(screen.getByTestId('update-download-btn'));
    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://github.com/owner/personal_note_electron/releases/tag/v1.2.0',
      '_blank',
      'noopener,noreferrer',
    );
    expect(mockOpenChange).toHaveBeenCalledWith(false);
  });

  it('closes dialog when later button is clicked', () => {
    const mockOpenChange = vi.fn();

    render(
      <UpdateNoticeDialog
        open={true}
        onOpenChange={mockOpenChange}
        latestVersion="1.1.0"
        releaseUrl="https://github.com/owner/personal_note_electron/releases/tag/v1.1.0"
      />,
    );

    fireEvent.click(screen.getByTestId('update-later-btn'));
    expect(mockOpenChange).toHaveBeenCalledWith(false);
  });
});

describe('UpdateNoticeToast Component (Architecture §15.3, TASK.md [P14-T3])', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders floating toast with version, download button, and close button', () => {
    const mockClose = vi.fn();
    const mockDownload = vi.fn();
    const mockDetails = vi.fn();

    render(
      <UpdateNoticeToast
        open={true}
        onClose={mockClose}
        latestVersion="1.2.0"
        releaseUrl="https://github.com/owner/personal_note_electron/releases/tag/v1.2.0"
        releaseNotes="Perbaikan bug dan stabilitas"
        onDownload={mockDownload}
        onOpenDetails={mockDetails}
      />,
    );

    expect(screen.getByTestId('update-notice-toast')).toBeDefined();
    expect(screen.getByText('v1.2.0')).toBeDefined();
    expect(screen.getByText('Perbaikan bug dan stabilitas')).toBeDefined();

    fireEvent.click(screen.getByTestId('toast-details-btn'));
    expect(mockDetails).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('toast-download-btn'));
    expect(mockDownload).toHaveBeenCalledTimes(1);
    expect(mockClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('toast-close-btn'));
    expect(mockClose).toHaveBeenCalledTimes(2);
  });

  it('does not render when open is false', () => {
    render(
      <UpdateNoticeToast
        open={false}
        onClose={vi.fn()}
        latestVersion="1.2.0"
        releaseUrl="https://github.com/owner/personal_note_electron/releases/tag/v1.2.0"
      />,
    );

    expect(screen.queryByTestId('update-notice-toast')).toBeNull();
  });

  it('calls window.open with release URL when onDownload prop is omitted in toast', () => {
    const windowOpenSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const mockClose = vi.fn();

    render(
      <UpdateNoticeToast
        open={true}
        onClose={mockClose}
        latestVersion="1.2.0"
        releaseUrl="https://github.com/owner/personal_note_electron/releases/tag/v1.2.0"
      />,
    );

    fireEvent.click(screen.getByTestId('toast-download-btn'));
    expect(windowOpenSpy).toHaveBeenCalledWith(
      'https://github.com/owner/personal_note_electron/releases/tag/v1.2.0',
      '_blank',
      'noopener,noreferrer',
    );
    expect(mockClose).toHaveBeenCalledWith();
  });
});
