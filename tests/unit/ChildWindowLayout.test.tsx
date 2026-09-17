import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { ChildWindowLayout } from '@renderer/layouts/ChildWindowLayout';
import { useUIStore } from '@renderer/stores/useUIStore';
import { useNotesStore } from '@renderer/stores/useNotesStore';
import type { Note } from '@shared/types/note';

// Mock EditorJS class & tools
vi.mock('@editorjs/editorjs', () => ({
  default: class MockEditorJS {
    destroy = vi.fn();
    save = vi.fn().mockResolvedValue({ time: Date.now(), blocks: [] });
    render = vi.fn().mockResolvedValue(undefined);
    isReady = Promise.resolve();

    constructor(config: { onReady?: () => void }) {
      if (typeof config?.onReady === 'function') {
        setTimeout(config.onReady, 0);
      }
    }
  },
}));
vi.mock('@editorjs/header', () => ({ default: class Header {} }));
vi.mock('@editorjs/list', () => ({ default: class List {} }));
vi.mock('@editorjs/checklist', () => ({ default: class Checklist {} }));
vi.mock('@editorjs/quote', () => ({ default: class Quote {} }));
vi.mock('@editorjs/code', () => ({ default: class Code {} }));
vi.mock('@editorjs/delimiter', () => ({ default: class Delimiter {} }));
vi.mock('editorjs-drag-drop', () => ({ default: class DragDrop {} }));

const mockNote: Note = {
  id: 42,
  title: 'Catatan Spesifik Child',
  snippet: 'Snippet catatan untuk child window',
  content: {
    time: Date.now(),
    blocks: [{ id: 'b1', type: 'paragraph', data: { text: 'Konten child window' } }],
    version: '2.31.0',
  },
  revision: 1,
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

describe('ChildWindowLayout Component (Architecture §9, §17 Kategori E, PRD US#32, US#33)', () => {
  const originalLocation = window.location;

  const mockGetById = vi.fn().mockResolvedValue({ success: true, data: mockNote });

  beforeEach(() => {
    vi.clearAllMocks();
    useNotesStore.getState().reset();
    useUIStore.setState({ theme: 'dark' });

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    window.electronAPI = {
      ...window.electronAPI,
      platform: 'linux',
      windowControls: {
        minimize: vi.fn(),
        maximize: vi.fn(),
        close: vi.fn(),
      },
      notes: {
        ...window.electronAPI?.notes,
        getById: mockGetById,
        getAll: vi.fn().mockResolvedValue({ success: true, data: [mockNote] }),
        update: vi.fn().mockResolvedValue({ success: true, data: mockNote }),
      },
    };
  });

  const setLocationSearch = (search: string) => {
    Object.defineProperty(window, 'location', {
      writable: true,
      value: {
        ...originalLocation,
        search,
      },
    });
  };

  afterEach(() => {
    cleanup();
    Object.defineProperty(window, 'location', {
      writable: true,
      value: originalLocation,
    });
  });

  it('renders child layout with editor and zero sidebar (PRD US#32)', async () => {
    // Set URL with ?type=child&noteId=42
    setLocationSearch('?type=child&noteId=42');

    render(<ChildWindowLayout />);

    expect(screen.getByTestId('child-window-layout')).toBeDefined();
    expect(screen.getByTestId('child-layout-content')).toBeDefined();

    // Pastikan jendela anak TIDAK PERNAH me-render sidebar atau splitter
    expect(screen.queryByTestId('main-layout-sidebar')).toBeNull();
    expect(screen.queryByTestId('sidebar-splitter')).toBeNull();

    await waitFor(() => {
      expect(mockGetById).toHaveBeenCalledWith(42);
      expect(screen.getByTestId('note-editor-container')).toBeDefined();
      expect(screen.queryByTestId('editor-open-child-btn')).toBeNull();
    });
  });

  it('displays note title in TitleBar and synchronizes with loaded note (PRD US#33)', async () => {
    render(<ChildWindowLayout noteId={42} />);

    await waitFor(() => {
      expect(screen.getByText('/ Catatan Spesifik Child')).toBeDefined();
    });

    expect(screen.getByTestId('window-controls')).toBeDefined();
  });

  it('displays error message if noteId is not found or invalid', async () => {
    window.electronAPI.notes.getById = vi.fn().mockResolvedValue({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Catatan dengan ID 999 tidak ditemukan' },
    });

    render(<ChildWindowLayout noteId={999} />);

    await waitFor(() => {
      expect(screen.getByTestId('child-layout-error')).toBeDefined();
      expect(screen.getByText('Catatan Tidak Ditemukan')).toBeDefined();
      expect(screen.getByText('Catatan dengan ID 999 tidak ditemukan')).toBeDefined();
    });
  });

  it('shows error state if no noteId is present in URL or props', () => {
    setLocationSearch('?type=child');

    render(<ChildWindowLayout />);

    expect(screen.getByTestId('child-layout-error')).toBeDefined();
    expect(screen.getByText('ID Catatan tidak valid atau tidak disertakan di URL.')).toBeDefined();
  });
});
