import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { SidebarToolbar } from '@renderer/components/sidebar/SidebarToolbar';
import { useNotesStore } from '@renderer/stores/useNotesStore';
import { useUIStore } from '@renderer/stores/useUIStore';
import type { Note } from '@shared/types/note';

describe('SidebarToolbar Component (PRD US#2, US#20, DESIGN.md §4.1)', () => {
  const mockCreateNote = vi.fn();

  const createdNote: Note = {
    id: 202,
    title: 'Catatan Toolbar',
    snippet: 'Konten dibuat dari toolbar...',
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

  it('renders default title and "Catatan Baru" button', () => {
    render(<SidebarToolbar />);

    expect(screen.getByTestId('sidebar-toolbar')).toBeDefined();
    expect(screen.getByTestId('sidebar-toolbar-title').textContent).toBe('Catatan');

    const button = screen.getByTestId('sidebar-create-note-button');
    expect(button).toBeDefined();
    expect(button.textContent).toContain('Catatan Baru');
  });

  it('renders custom title when provided', () => {
    render(<SidebarToolbar title="Semua Catatan" />);
    expect(screen.getByTestId('sidebar-toolbar-title').textContent).toBe('Semua Catatan');
  });

  it('triggers executeCreateNote and updates stores on toolbar button click', async () => {
    render(<SidebarToolbar />);

    const button = screen.getByTestId('sidebar-create-note-button');
    fireEvent.click(button);

    expect(mockCreateNote).toHaveBeenCalledTimes(1);

    await vi.waitFor(() => {
      expect(useNotesStore.getState().notes).toHaveLength(1);
      expect(useNotesStore.getState().notes[0].id).toBe(202);
      expect(useUIStore.getState().activeNoteId).toBe(202);
    });
  });

  it('hides create button when showCreateButton is false', () => {
    render(<SidebarToolbar showCreateButton={false} />);
    expect(screen.queryByTestId('sidebar-create-note-button')).toBeNull();
  });

  it('calls custom onCreateNote prop when provided', () => {
    const customOnCreate = vi.fn();
    render(<SidebarToolbar onCreateNote={customOnCreate} />);

    const button = screen.getByTestId('sidebar-create-note-button');
    fireEvent.click(button);

    expect(customOnCreate).toHaveBeenCalledTimes(1);
    expect(mockCreateNote).not.toHaveBeenCalled();
  });
});
