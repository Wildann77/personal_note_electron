import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { ConflictResolveDialog } from '@renderer/components/dialogs/ConflictResolveDialog';

describe('ConflictResolveDialog Component (Architecture §7.1, PRD US#60, DESIGN.md §5.3, TASK.md [P14-T2])', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders conflict resolve dialog with title, description, and action buttons', () => {
    render(
      <ConflictResolveDialog
        open={true}
        onOpenChange={vi.fn()}
        onReload={vi.fn()}
        onCopyLocal={vi.fn()}
        onOverwrite={vi.fn()}
        noteTitle="Rencana Rilis 2026"
      />,
    );

    expect(screen.getByTestId('conflict-resolve-dialog')).toBeDefined();
    expect(screen.getByText('Konflik Revisi Catatan')).toBeDefined();
    expect(screen.getByText('Rencana Rilis 2026')).toBeDefined();
    expect(screen.getByTestId('conflict-copy-btn')).toBeDefined();
    expect(screen.getByTestId('conflict-reload-btn')).toBeDefined();
    expect(screen.getByTestId('conflict-overwrite-btn')).toBeDefined();
  });

  it('calls onReload and closes dialog when reload button is clicked', async () => {
    const mockReload = vi.fn().mockResolvedValue(undefined);
    const mockOpenChange = vi.fn();

    render(
      <ConflictResolveDialog
        open={true}
        onOpenChange={mockOpenChange}
        onReload={mockReload}
        onCopyLocal={vi.fn()}
        onOverwrite={vi.fn()}
      />,
    );

    const reloadBtn = screen.getByTestId('conflict-reload-btn');
    fireEvent.click(reloadBtn);

    await waitFor(() => {
      expect(mockReload).toHaveBeenCalledTimes(1);
      expect(mockOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('calls onCopyLocal and shows feedback when copy button is clicked', async () => {
    const mockCopy = vi.fn().mockResolvedValue(undefined);

    render(
      <ConflictResolveDialog
        open={true}
        onOpenChange={vi.fn()}
        onReload={vi.fn()}
        onCopyLocal={mockCopy}
        onOverwrite={vi.fn()}
      />,
    );

    const copyBtn = screen.getByTestId('conflict-copy-btn');
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(mockCopy).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Tersalin!')).toBeDefined();
    });
  });

  it('calls onOverwrite and closes dialog when overwrite button is clicked', async () => {
    const mockOverwrite = vi.fn().mockResolvedValue(undefined);
    const mockOpenChange = vi.fn();

    render(
      <ConflictResolveDialog
        open={true}
        onOpenChange={mockOpenChange}
        onReload={vi.fn()}
        onCopyLocal={vi.fn()}
        onOverwrite={mockOverwrite}
      />,
    );

    const overwriteBtn = screen.getByTestId('conflict-overwrite-btn');
    fireEvent.click(overwriteBtn);

    await waitFor(() => {
      expect(mockOverwrite).toHaveBeenCalledTimes(1);
      expect(mockOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('does not render overwrite button if onOverwrite is not provided', () => {
    render(
      <ConflictResolveDialog
        open={true}
        onOpenChange={vi.fn()}
        onReload={vi.fn()}
        onCopyLocal={vi.fn()}
      />,
    );

    expect(screen.queryByTestId('conflict-overwrite-btn')).toBeNull();
  });
});
