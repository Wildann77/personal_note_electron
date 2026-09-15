import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEditor, getDefaultEditorTools, AUTOSAVE_DEBOUNCE_MS } from '@renderer/hooks/useEditor';
import { useNotesStore } from '@renderer/stores/useNotesStore';
import type { Note } from '@shared/types/note';

// Mock EditorJS class
const mockDestroy = vi.fn();
const mockSave = vi.fn();
const mockRender = vi.fn();

interface MockEditorConfig {
  holder?: string;
  data?: unknown;
  onChange?: () => void;
  onReady?: () => void;
}

let mockInstanceConfig: MockEditorConfig = {};

vi.mock('@editorjs/editorjs', () => {
  return {
    default: class MockEditorJS {
      destroy = mockDestroy;
      save = mockSave;
      render = mockRender;
      isReady = Promise.resolve();

      constructor(config: MockEditorConfig) {
        mockInstanceConfig = config;
        if (typeof config.onReady === 'function') {
          setTimeout(config.onReady, 0);
        }
      }
    },
  };
});

// Mock individual tool packages
vi.mock('@editorjs/header', () => ({ default: class Header {} }));
vi.mock('@editorjs/list', () => ({ default: class List {} }));
vi.mock('@editorjs/checklist', () => ({ default: class Checklist {} }));
vi.mock('@editorjs/quote', () => ({ default: class Quote {} }));
vi.mock('@editorjs/code', () => ({ default: class Code {} }));
vi.mock('@editorjs/delimiter', () => ({ default: class Delimiter {} }));

describe('useEditor hook', () => {
  const dummyNote: Note = {
    id: 101,
    title: 'Catatan Rencana',
    snippet: 'Konten awal...',
    content: {
      time: 1710000000000,
      blocks: [{ type: 'paragraph', data: { text: 'Paragraf pertama' } }],
    },
    revision: 3,
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  };

  const mockGetById = vi.fn();
  const mockUpdate = vi.fn();
  const mockGetAll = vi.fn();
  const mockCreate = vi.fn();
  const mockDelete = vi.fn();
  const mockOnBroadcastChanged = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    useNotesStore.getState().reset();

    const holder = document.createElement('div');
    holder.id = 'editorjs';
    document.body.appendChild(holder);

    mockSave.mockResolvedValue({
      time: Date.now(),
      blocks: [{ type: 'paragraph', data: { text: 'Teks terupdate' } }],
    });
    mockDestroy.mockReturnValue(undefined);
    mockRender.mockResolvedValue(undefined);

    mockGetById.mockResolvedValue({ success: true, data: dummyNote });
    mockUpdate.mockResolvedValue({
      success: true,
      data: { ...dummyNote, revision: 4, updatedAt: Date.now() },
    });
    mockOnBroadcastChanged.mockReturnValue(() => {});

    window.electronAPI = {
      notes: {
        getAll: mockGetAll,
        getById: mockGetById,
        create: mockCreate,
        update: mockUpdate,
        delete: mockDelete,
        onBroadcastChanged: mockOnBroadcastChanged,
      },
      windowControls: {
        minimize: vi.fn(),
        maximize: vi.fn(),
        close: vi.fn(),
      },
      windows: {
        openChild: vi.fn(),
      },
      contextMenu: {
        showNote: vi.fn(),
      },
      backup: {
        triggerBackup: vi.fn(),
      },
      theme: {
        getSystemTheme: vi.fn().mockResolvedValue('dark'),
        onThemeChanged: vi.fn().mockReturnValue(() => {}),
      },
    };
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    const holder = document.getElementById('editorjs');
    if (holder) {
      document.body.removeChild(holder);
    }
  });

  it('menyediakan konfigurasi getDefaultEditorTools lengkap', () => {
    const tools = getDefaultEditorTools();
    expect(tools).toHaveProperty('header');
    expect(tools).toHaveProperty('list');
    expect(tools).toHaveProperty('checklist');
    expect(tools).toHaveProperty('quote');
    expect(tools).toHaveProperty('code');
    expect(tools).toHaveProperty('delimiter');
  });

  it('menginisialisasi EditorJS saat note tersedia dan memanggil destroy saat unmount', async () => {
    const { unmount } = renderHook(() => useEditor({ note: dummyNote }));

    expect(mockInstanceConfig.holder).toBe('editorjs');
    expect(mockInstanceConfig.data).toEqual(dummyNote.content);

    unmount();
    await vi.runAllTimersAsync();
    expect(mockDestroy).toHaveBeenCalledTimes(1);
  });

  it('menjalankan autosave setelah jeda debounce 600ms dan memperbarui revisi lokal', async () => {
    const onSaveSuccess = vi.fn();
    const { result } = renderHook(() =>
      useEditor({
        note: dummyNote,
        onSaveSuccess,
      }),
    );

    act(() => {
      const onChange = mockInstanceConfig.onChange;
      if (onChange) {
        onChange();
      }
    });

    vi.advanceTimersByTime(300);
    expect(mockUpdate).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(300);
      await Promise.resolve();
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: dummyNote.id,
        expectedRevision: 3,
      }),
    );

    expect(result.current.saveStatus).toBe('saved');
    expect(onSaveSuccess).toHaveBeenCalled();
  });

  it('menggabungkan ketukan cepat sehingga hanya 1 save terjadi setelah henti mengetik', async () => {
    renderHook(() => useEditor({ note: dummyNote }));

    const onChange = mockInstanceConfig.onChange;

    act(() => {
      if (onChange) onChange();
    });
    vi.advanceTimersByTime(200);

    act(() => {
      if (onChange) onChange();
    });
    vi.advanceTimersByTime(200);

    act(() => {
      if (onChange) onChange();
    });
    vi.advanceTimersByTime(200);

    expect(mockUpdate).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
      await Promise.resolve();
    });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  it('menangani CONCURRENCY_ERROR dan mengubah status menjadi conflict', async () => {
    const onConflict = vi.fn();

    mockUpdate.mockResolvedValueOnce({
      success: false,
      error: {
        code: 'CONCURRENCY_ERROR',
        message: 'Versi catatan telah berubah di jendela lain',
      },
    });

    const { result } = renderHook(() =>
      useEditor({
        note: dummyNote,
        onConflict,
      }),
    );

    act(() => {
      const onChange = mockInstanceConfig.onChange;
      if (onChange) onChange();
    });

    await act(async () => {
      vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
      await Promise.resolve();
    });

    expect(result.current.isConflict).toBe(true);
    expect(result.current.saveStatus).toBe('conflict');
    expect(result.current.conflictData?.error.code).toBe('CONCURRENCY_ERROR');
    expect(onConflict).toHaveBeenCalledTimes(1);
  });

  it('resolveReload memuat ulang data dari database dan merender ulang editor', async () => {
    const freshNote: Note = {
      ...dummyNote,
      revision: 5,
      content: {
        time: Date.now(),
        blocks: [{ type: 'paragraph', data: { text: 'Konten segar dari window lain' } }],
      },
    };

    mockGetById.mockResolvedValueOnce({
      success: true,
      data: freshNote,
    });

    const { result } = renderHook(() => useEditor({ note: dummyNote }));

    await act(async () => {
      await result.current.resolveReload();
    });

    expect(mockGetById).toHaveBeenCalledWith(dummyNote.id);
    expect(mockRender).toHaveBeenCalledWith(freshNote.content);
    expect(result.current.isConflict).toBe(false);
  });

  it('resolveKeepLocal menimpa database menggunakan revisi terkini server', async () => {
    const serverNote: Note = { ...dummyNote, revision: 7 };

    mockGetById.mockResolvedValueOnce({
      success: true,
      data: serverNote,
    });
    mockUpdate.mockResolvedValueOnce({
      success: true,
      data: { ...serverNote, revision: 8 },
    });

    const { result } = renderHook(() => useEditor({ note: dummyNote }));

    await act(async () => {
      await result.current.resolveKeepLocal();
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: dummyNote.id,
        expectedRevision: 7,
      }),
    );
    expect(result.current.isConflict).toBe(false);
    expect(result.current.saveStatus).toBe('saved');
  });

  it('forceSave memicu penyimpanan seketika tanpa menunggu debounce', async () => {
    const { result } = renderHook(() => useEditor({ note: dummyNote }));

    await act(async () => {
      await result.current.forceSave();
    });

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(result.current.saveStatus).toBe('saved');
  });
});
