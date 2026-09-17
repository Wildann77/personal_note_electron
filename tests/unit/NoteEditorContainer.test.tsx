import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { NoteEditorContainer } from '@renderer/components/editor/NoteEditorContainer';
import { useNotesStore } from '@renderer/stores/useNotesStore';
import { useUIStore } from '@renderer/stores/useUIStore';
import type { Note } from '@shared/types/note';

// Mock EditorJS class
const mockDestroy = vi.fn();
const mockSave = vi.fn().mockResolvedValue({ time: Date.now(), blocks: [] });
const mockRender = vi.fn().mockResolvedValue(undefined);

vi.mock('@editorjs/editorjs', () => {
  return {
    default: class MockEditorJS {
      destroy = mockDestroy;
      save = mockSave;
      render = mockRender;
      isReady = Promise.resolve();

      constructor(config: { onReady?: () => void }) {
        if (typeof config.onReady === 'function') {
          setTimeout(config.onReady, 0);
        }
      }
    },
  };
});

vi.mock('@editorjs/header', () => ({ default: class Header {} }));
vi.mock('@editorjs/list', () => ({ default: class List {} }));
vi.mock('@editorjs/checklist', () => ({ default: class Checklist {} }));
vi.mock('@editorjs/quote', () => ({ default: class Quote {} }));
vi.mock('@editorjs/code', () => ({ default: class Code {} }));
vi.mock('@editorjs/delimiter', () => ({ default: class Delimiter {} }));
vi.mock('editorjs-drag-drop', () => ({ default: class DragDrop {} }));

describe('NoteEditorContainer Component (Architecture §17 Kategori B, PRD US#12, US#13, US#21)', () => {
  const noteA: Note = {
    id: 1,
    title: 'Catatan Alpha',
    snippet: 'Isi catatan Alpha...',
    content: {
      time: 1710000000000,
      blocks: [{ type: 'paragraph', data: { text: 'Paragraf Alpha' } }],
    },
    revision: 1,
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  };

  const noteB: Note = {
    id: 2,
    title: 'Catatan Beta',
    snippet: 'Isi catatan Beta...',
    content: {
      time: 1710001000000,
      blocks: [{ type: 'paragraph', data: { text: 'Paragraf Beta' } }],
    },
    revision: 1,
    createdAt: 1710001000000,
    updatedAt: 1710001000000,
  };

  beforeEach(() => {
    useNotesStore.getState().reset();
    useUIStore.getState().resetUI();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders EditorEmptyState when active note is null (PRD US#21)', () => {
    render(<NoteEditorContainer note={null} />);

    expect(screen.getByTestId('note-editor-container-empty')).toBeDefined();
    expect(screen.getByTestId('editor-empty-state')).toBeDefined();
  });

  it('renders editor instance and sticky header when note is provided', () => {
    render(<NoteEditorContainer note={noteA} />);

    expect(screen.getByTestId('note-editor-container')).toBeDefined();
    expect(screen.getByTestId('note-editor-instance-1')).toBeDefined();
    expect(screen.getByTestId('editor-sticky-header')).toBeDefined();
    expect(screen.getByTestId('editor-save-status')).toBeDefined();
    expect(screen.getByTestId('editor-scroll-viewport')).toBeDefined();
    expect(screen.getByTestId('editorjs-holder')).toBeDefined();
  });

  it('remounts editor instance with new key when switching from note A to note B (PRD US#13)', () => {
    const { rerender } = render(<NoteEditorContainer note={noteA} />);

    expect(screen.getByTestId('note-editor-instance-1')).toBeDefined();
    expect(screen.queryByTestId('note-editor-instance-2')).toBeNull();

    // Berpindah ke note B
    rerender(<NoteEditorContainer note={noteB} />);

    // Verifikasi instance 1 unmounted dan instance 2 dimount bersih
    expect(screen.queryByTestId('note-editor-instance-1')).toBeNull();
    expect(screen.getByTestId('note-editor-instance-2')).toBeDefined();
  });

  it('triggers Buka di Jendela Baru via window.electronAPI.windows.openChild (PRD US#30)', () => {
    const mockOpenChild = vi.fn();
    window.electronAPI = {
      ...window.electronAPI,
      windows: {
        openChild: mockOpenChild,
      },
    };

    render(<NoteEditorContainer note={noteA} />);

    const openBtn = screen.getByTestId('editor-open-child-btn');
    fireEvent.click(openBtn);

    expect(mockOpenChild).toHaveBeenCalledWith(1);
  });

  it('supports custom onOpenChildWindow callback prop', () => {
    const handleOpen = vi.fn();
    render(<NoteEditorContainer note={noteA} onOpenChildWindow={handleOpen} />);

    const openBtn = screen.getByTestId('editor-open-child-btn');
    fireEvent.click(openBtn);

    expect(handleOpen).toHaveBeenCalledWith(1);
  });

  it('hides Buka di Jendela Baru button when showOpenChildButton is false', () => {
    render(<NoteEditorContainer note={noteA} showOpenChildButton={false} />);

    expect(screen.queryByTestId('editor-open-child-btn')).toBeNull();
  });

  it('loads active note from IPC when activeNoteId is set in UI store but activeNote is not yet loaded', async () => {
    const mockGetById = vi.fn().mockResolvedValue({
      success: true,
      data: noteA,
    });

    window.electronAPI = {
      ...window.electronAPI,
      notes: {
        ...window.electronAPI?.notes,
        getById: mockGetById,
      },
    };

    useUIStore.getState().setActiveNoteId(1);

    render(<NoteEditorContainer />);

    await waitFor(() => {
      expect(mockGetById).toHaveBeenCalledWith(1);
    });

    await waitFor(() => {
      expect(screen.getByTestId('note-editor-instance-1')).toBeDefined();
    });
  });

  it('renders EditorSkeleton while activeNote is being fetched from IPC', () => {
    // Unresolved promise simulates ongoing fetch
    const mockGetById = vi.fn().mockReturnValue(new Promise(() => {}));

    window.electronAPI = {
      ...window.electronAPI,
      notes: {
        ...window.electronAPI?.notes,
        getById: mockGetById,
      },
    };

    useUIStore.getState().setActiveNoteId(999);
    render(<NoteEditorContainer />);

    expect(screen.getByTestId('note-editor-container-loading')).toBeDefined();
    expect(screen.getByTestId('editor-skeleton')).toBeDefined();
    expect(screen.queryByTestId('note-editor-container-empty')).toBeNull();
  });

  it('renders EditorSkeleton during initial notes loading even if activeNoteId is null', () => {
    useNotesStore.getState().setField('isLoading', true);
    useUIStore.getState().setActiveNoteId(null);

    render(<NoteEditorContainer />);

    expect(screen.getByTestId('note-editor-container-loading')).toBeDefined();
    expect(screen.getByTestId('editor-skeleton')).toBeDefined();
    expect(screen.queryByTestId('note-editor-container-empty')).toBeNull();
  });
});
