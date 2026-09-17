import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MainWindowLayout } from '@renderer/layouts/MainWindowLayout';
import { useUIStore, SIDEBAR_DEFAULT_WIDTH } from '@renderer/stores/useUIStore';
import { useNotesStore } from '@renderer/stores/useNotesStore';

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

describe('MainWindowLayout Component (PRD US#38–47, Architecture §14, §17)', () => {
  const mockGetAll = vi.fn().mockResolvedValue({ success: true, data: [] });
  const mockGetById = vi.fn().mockResolvedValue({ success: false, error: { code: 'NOT_FOUND' } });

  beforeEach(() => {
    vi.clearAllMocks();
    useNotesStore.getState().reset();
    useUIStore.setState({ sidebarWidth: SIDEBAR_DEFAULT_WIDTH, activeNoteId: null });

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
      },
    };
  });

  afterEach(() => {
    cleanup();
  });

  it('performs single initial fetch on mount (Further Note #2, US#22, US#23)', async () => {
    render(<MainWindowLayout />);

    await waitFor(() => {
      expect(mockGetAll).toHaveBeenCalledTimes(1);
    });
  });

  it('renders TitleBar, sidebar container, splitter, and content canvas', () => {
    render(
      <MainWindowLayout
        title="My Notes"
        sidebarContent={<div data-testid="test-sidebar">Sidebar Content</div>}
      >
        <div data-testid="test-editor">Editor Canvas</div>
      </MainWindowLayout>,
    );

    expect(screen.getByTestId('main-window-layout')).toBeDefined();
    expect(screen.getByTestId('titlebar-chrome')).toBeDefined();
    expect(screen.getByTestId('titlebar-title').textContent).toBe('My Notes');

    const sidebar = screen.getByTestId('main-layout-sidebar');
    expect(sidebar).toBeDefined();
    expect(sidebar.style.width).toBe(`${SIDEBAR_DEFAULT_WIDTH}px`);
    expect(screen.getByTestId('test-sidebar')).toBeDefined();

    expect(screen.getByTestId('sidebar-splitter')).toBeDefined();

    const content = screen.getByTestId('main-layout-content');
    expect(content).toBeDefined();
    expect(screen.getByTestId('test-editor')).toBeDefined();
  });

  it('binds sidebar width reactively to useUIStore.sidebarWidth', () => {
    useUIStore.setState({ sidebarWidth: 350 });

    render(
      <MainWindowLayout>
        <div>Content</div>
      </MainWindowLayout>,
    );

    const sidebar = screen.getByTestId('main-layout-sidebar');
    expect(sidebar.style.width).toBe('350px');
  });

  it('renders custom header slots in TitleBar', () => {
    render(
      <MainWindowLayout
        headerLeftContent={<button>Left Action</button>}
        headerRightContent={<span>Sync OK</span>}
      >
        <div>Content</div>
      </MainWindowLayout>,
    );

    expect(screen.getByRole('button', { name: 'Left Action' })).toBeDefined();
    expect(screen.getByText('Sync OK')).toBeDefined();
    expect(screen.getByTestId('window-controls')).toBeDefined();
  });

  it('renders independent ScrollArea in sidebar isolating scroll from main content (PRD US#19)', () => {
    render(
      <MainWindowLayout
        sidebarContent={<div data-testid="sidebar-items">Daftar Catatan Banyak</div>}
      >
        <div data-testid="editor-items">Konten Editor</div>
      </MainWindowLayout>,
    );

    const scrollArea = screen.getByTestId('sidebar-scroll-area');
    expect(scrollArea).toBeDefined();
    expect(screen.getByTestId('sidebar-items')).toBeDefined();

    const sidebar = screen.getByTestId('main-layout-sidebar');
    const content = screen.getByTestId('main-layout-content');

    // Pastikan kedua kontainer memiliki isolasi overflow mandiri
    expect(sidebar.className).toContain('overflow-hidden');
    expect(content.className).toContain('overflow-hidden');
  });

  it('triggers executeCreateNote when onCreateRequested event is emitted from Menu Bar (PRD US#52, US#53)', async () => {
    let triggerCreateRequested: (() => void) | undefined;
    const mockOnCreateRequested = vi.fn((cb: () => void) => {
      triggerCreateRequested = cb;
      return () => {};
    });

    const mockCreate = vi.fn().mockResolvedValue({
      success: true,
      data: {
        id: 999,
        title: 'Catatan Baru Dari Menu Bar',
        snippet: '',
        content: { time: Date.now(), blocks: [] },
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
        onCreateRequested: mockOnCreateRequested,
      },
    };

    render(<MainWindowLayout />);

    expect(mockOnCreateRequested).toHaveBeenCalledTimes(1);

    // Trigger Menu Bar "Catatan Baru" / CmdOrCtrl+N event
    triggerCreateRequested?.();

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledTimes(1);
      expect(useUIStore.getState().activeNoteId).toBe(999);
      expect(useNotesStore.getState().activeNote?.id).toBe(999);
    });
  });
});
