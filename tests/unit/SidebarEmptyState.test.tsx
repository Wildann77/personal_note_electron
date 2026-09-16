import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SidebarEmptyState } from '@renderer/components/sidebar/SidebarEmptyState';
import { useNotesStore } from '@renderer/stores/useNotesStore';
import { useUIStore } from '@renderer/stores/useUIStore';
import type { Note } from '@shared/types/note';

describe('SidebarEmptyState Component (PRD US#1, US#20, DESIGN.md §5.4)', () => {
  const mockCreateNote = vi.fn();

  const createdNote: Note = {
    id: 101,
    title: 'Catatan Baru Dibuat',
    snippet: 'Konten awal...',
    content: { time: Date.now(), blocks: [], version: '2.31.6' },
    revision: 1,
    createdAt: 1700000000000,
    updatedAt: 1700000000000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useNotesStore.getState().reset();
    useUIStore.getState().resetUI();

    window.electronAPI = {
      ...window.electronAPI,
      notes: {
        ...window.electronAPI?.notes,
        create: mockCreateNote.mockResolvedValue({
          success: true,
          data: createdNote,
        }),
      },
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('renders empty state illustration, text, and CTA button', () => {
    render(<SidebarEmptyState />);

    expect(screen.getByTestId('sidebar-empty-state')).toBeDefined();
    expect(screen.getByText('Belum ada catatan')).toBeDefined();
    expect(screen.getByText('Mulai menulis ide dan catatan baru untuk hari ini.')).toBeDefined();

    const button = screen.getByTestId('empty-state-create-button');
    expect(button).toBeDefined();
    expect(button.textContent).toContain('Catatan Baru');
  });

  it('triggers executeCreateNote use case and updates stores on CTA button click', async () => {
    render(<SidebarEmptyState />);

    const button = screen.getByTestId('empty-state-create-button');
    fireEvent.click(button);

    expect(mockCreateNote).toHaveBeenCalledTimes(1);

    // Wait for microtask/promise resolution
    await vi.waitFor(() => {
      expect(useNotesStore.getState().notes).toHaveLength(1);
      expect(useNotesStore.getState().notes[0].id).toBe(101);
      expect(useUIStore.getState().activeNoteId).toBe(101);
    });
  });

  it('calls custom onCreateNote prop when provided', () => {
    const customOnCreate = vi.fn();
    render(<SidebarEmptyState onCreateNote={customOnCreate} />);

    const button = screen.getByTestId('empty-state-create-button');
    fireEvent.click(button);

    expect(customOnCreate).toHaveBeenCalledTimes(1);
    expect(mockCreateNote).not.toHaveBeenCalled();
  });
});
