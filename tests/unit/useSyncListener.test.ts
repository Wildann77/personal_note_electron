import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSyncListener } from '@renderer/hooks/useSyncListener';
import { useNotesStore } from '@renderer/stores/useNotesStore';
import type { Note, NoteMutationPayload } from '@shared/types/note';

describe('useSyncListener hook', () => {
  let broadcastCallback: ((payload: NoteMutationPayload) => void) | null = null;
  const mockUnsubscribe = vi.fn();
  const mockGetById = vi.fn();
  const mockOnBroadcastChanged = vi.fn();

  const dummyNote: Note = {
    id: 42,
    title: 'Catatan Sinkronisasi',
    snippet: 'Konten sinkron...',
    content: {
      time: 1710000000000,
      blocks: [],
    },
    revision: 1,
    createdAt: 1710000000000,
    updatedAt: 1710000000000,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useNotesStore.getState().reset();
    broadcastCallback = null;

    mockOnBroadcastChanged.mockImplementation((cb: (payload: NoteMutationPayload) => void) => {
      broadcastCallback = cb;
      return mockUnsubscribe;
    });

    window.electronAPI = {
      notes: {
        getAll: vi.fn(),
        getById: mockGetById,
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
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

  it('mendaftarkan listener broadcast saat mount dan memanggil unsubscribe saat unmount', () => {
    const { unmount } = renderHook(() => useSyncListener());

    expect(mockOnBroadcastChanged).toHaveBeenCalledTimes(1);
    expect(broadcastCallback).toBeTypeOf('function');

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });

  it('memperbarui store saat menerima event create dengan entity note', () => {
    renderHook(() => useSyncListener());

    expect(broadcastCallback).not.toBeNull();
    act(() => {
      broadcastCallback?.({
        type: 'create',
        noteId: dummyNote.id,
        note: dummyNote,
      });
    });

    const state = useNotesStore.getState();
    expect(state.notes).toHaveLength(1);
    expect(state.notes[0].id).toBe(dummyNote.id);
    expect(state.notes[0].title).toBe(dummyNote.title);
  });

  it('memperbarui store saat menerima event update dengan entity note', () => {
    useNotesStore.getState().upsertNote(dummyNote);

    renderHook(() => useSyncListener());

    const updatedNote: Note = {
      ...dummyNote,
      title: 'Judul Diubah Lintas Jendela',
      revision: 2,
      updatedAt: 1710000005000,
    };

    act(() => {
      broadcastCallback?.({
        type: 'update',
        noteId: dummyNote.id,
        note: updatedNote,
      });
    });

    const state = useNotesStore.getState();
    expect(state.notes).toHaveLength(1);
    expect(state.notes[0].title).toBe('Judul Diubah Lintas Jendela');
    expect(state.notes[0].revision).toBe(2);
  });

  it('menghapus note dari store saat menerima event delete', () => {
    useNotesStore.getState().upsertNote(dummyNote);
    expect(useNotesStore.getState().notes).toHaveLength(1);

    renderHook(() => useSyncListener());

    act(() => {
      broadcastCallback?.({
        type: 'delete',
        noteId: dummyNote.id,
      });
    });

    expect(useNotesStore.getState().notes).toHaveLength(0);
  });

  it('melakukan fetch getById sebagai fallback jika payload update tidak membawa object note', async () => {
    mockGetById.mockResolvedValueOnce({
      success: true,
      data: { ...dummyNote, title: 'Fetched via fallback' },
    });

    renderHook(() => useSyncListener());

    await act(async () => {
      broadcastCallback?.({
        type: 'update',
        noteId: dummyNote.id,
      });
      await Promise.resolve();
    });

    expect(mockGetById).toHaveBeenCalledWith(dummyNote.id);
    const state = useNotesStore.getState();
    expect(state.notes).toHaveLength(1);
    expect(state.notes[0].title).toBe('Fetched via fallback');
  });

  it('memanggil opsi callback onMutation jika diberikan', () => {
    const onMutation = vi.fn();
    renderHook(() => useSyncListener({ onMutation }));

    const payload: NoteMutationPayload = {
      type: 'create',
      noteId: dummyNote.id,
      note: dummyNote,
    };

    act(() => {
      broadcastCallback?.(payload);
    });

    expect(onMutation).toHaveBeenCalledWith(payload);
  });

  it('beroperasi aman tanpa melempar exception jika window.electronAPI tidak tersedia', () => {
    // @ts-expect-error intentionally clearing electronAPI to simulate non-electron env
    delete window.electronAPI;

    expect(() => {
      const { unmount } = renderHook(() => useSyncListener());
      unmount();
    }).not.toThrow();
  });
});
