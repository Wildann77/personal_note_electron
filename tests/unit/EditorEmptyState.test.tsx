import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { EditorEmptyState } from '@renderer/components/editor/EditorEmptyState';
import { useNotesStore } from '@renderer/stores/useNotesStore';
import { useUIStore } from '@renderer/stores/useUIStore';

describe('EditorEmptyState Component (PRD US#21, DESIGN.md §5.4)', () => {
  beforeEach(() => {
    useNotesStore.getState().reset();
    useUIStore.getState().resetUI();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders friendly description text matching DESIGN.md §5.4', () => {
    render(<EditorEmptyState />);

    expect(screen.getByTestId('editor-empty-state')).toBeDefined();
    expect(screen.getByText('Tidak ada catatan yang dipilih')).toBeDefined();
    expect(
      screen.getByText(
        'Pilih catatan dari daftar di samping, atau buat catatan baru untuk mulai menulis.',
      ),
    ).toBeDefined();
  });

  it('triggers onCreateNote callback when provided', () => {
    const handleCreate = vi.fn();
    render(<EditorEmptyState onCreateNote={handleCreate} />);

    const createBtn = screen.getByTestId('editor-empty-state-create-btn');
    fireEvent.click(createBtn);

    expect(handleCreate).toHaveBeenCalledTimes(1);
  });

  it('calls window.electronAPI.notes.create when no callback is provided', async () => {
    const mockCreate = vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: 99,
        title: 'Catatan Baru',
        snippet: '',
        revision: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    });

    window.electronAPI = {
      ...window.electronAPI,
      notes: {
        ...window.electronAPI?.notes,
        create: mockCreate,
      },
    };

    render(<EditorEmptyState />);
    const createBtn = screen.getByTestId('editor-empty-state-create-btn');
    fireEvent.click(createBtn);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledTimes(1);
    });

    expect(useUIStore.getState().activeNoteId).toBe(99);
    expect(useNotesStore.getState().notes.some((n) => n.id === 99)).toBe(true);
  });
});
