import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { DeleteConfirmDialog } from '@renderer/components/dialogs/DeleteConfirmDialog';

describe('DeleteConfirmDialog Component (PRD US#24–28, DESIGN.md §5.3, TASK.md [P14-T1])', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders confirmation dialog with title, description, and action buttons', () => {
    render(
      <DeleteConfirmDialog
        open={true}
        onOpenChange={vi.fn()}
        onConfirm={vi.fn()}
        noteTitle="Catatan Rapat Desain UI"
      />,
    );

    expect(screen.getByTestId('delete-confirm-dialog')).toBeDefined();
    expect(screen.getByText('Hapus Catatan Ini?')).toBeDefined();
    expect(screen.getByText('Catatan Rapat Desain UI')).toBeDefined();
    expect(screen.getByTestId('delete-cancel-btn')).toBeDefined();
    expect(screen.getByTestId('delete-confirm-btn')).toBeDefined();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const mockConfirm = vi.fn();
    render(<DeleteConfirmDialog open={true} onOpenChange={vi.fn()} onConfirm={mockConfirm} />);

    const confirmBtn = screen.getByTestId('delete-confirm-btn');
    fireEvent.click(confirmBtn);

    expect(mockConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onOpenChange(false) when cancel button is clicked', () => {
    const mockOpenChange = vi.fn();
    const mockConfirm = vi.fn();
    render(
      <DeleteConfirmDialog open={true} onOpenChange={mockOpenChange} onConfirm={mockConfirm} />,
    );

    const cancelBtn = screen.getByTestId('delete-cancel-btn');
    fireEvent.click(cancelBtn);

    expect(mockOpenChange).toHaveBeenCalledWith(false);
    expect(mockConfirm).not.toHaveBeenCalled();
  });
});
