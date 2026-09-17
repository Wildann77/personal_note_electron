import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { App } from '@renderer/App';
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

const sampleNote: Note = {
  id: 1,
  title: 'Judul Catatan Utama',
  snippet: 'Snippet catatan utama',
  content: {
    time: Date.now(),
    blocks: [{ id: 'b1', type: 'paragraph', data: { text: 'Konten utama' } }],
    version: '2.31.0',
  },
  revision: 1,
  createdAt: 1700000000000,
  updatedAt: 1700000000000,
};

describe('App Component Branching (Architecture §9, §17 Kategori E, PRD US#32)', () => {
  const originalLocation = window.location;

  const mockGetAll = vi.fn().mockResolvedValue({ success: true, data: [sampleNote] });
  const mockGetById = vi.fn().mockResolvedValue({ success: true, data: sampleNote });

  beforeEach(() => {
    vi.clearAllMocks();
    useNotesStore.getState().reset();
    useUIStore.setState({ theme: 'dark', activeNoteId: null });

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
        getAll: mockGetAll,
        getById: mockGetById,
        update: vi.fn().mockResolvedValue({ success: true, data: sampleNote }),
        onBroadcastChanged: vi.fn().mockReturnValue(() => {}),
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

  it('renders MainWindowLayout with sidebar and editor when no type=child param exists', async () => {
    setLocationSearch('');

    render(<App />);

    expect(screen.getByTestId('main-window-layout')).toBeDefined();
    expect(screen.getByTestId('main-layout-sidebar')).toBeDefined();
    expect(screen.getByTestId('main-layout-content')).toBeDefined();
    expect(screen.queryByTestId('child-window-layout')).toBeNull();

    await waitFor(() => {
      expect(mockGetAll).toHaveBeenCalled();
    });
  });

  it('renders ChildWindowLayout without sidebar when URL param ?type=child is present', async () => {
    setLocationSearch('?type=child&noteId=1');

    render(<App />);

    expect(screen.getByTestId('child-window-layout')).toBeDefined();
    expect(screen.queryByTestId('main-window-layout')).toBeNull();
    expect(screen.queryByTestId('main-layout-sidebar')).toBeNull();

    await waitFor(() => {
      expect(mockGetById).toHaveBeenCalledWith(1);
    });
  });

  it('syncs theme class to document.documentElement', async () => {
    setLocationSearch('');

    useUIStore.setState({ theme: 'dark' });
    render(<App />);
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    useUIStore.setState({ theme: 'light' });
    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });
});
