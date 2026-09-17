import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, within } from '@testing-library/react';
import { NoteList, VIRTUALIZATION_THRESHOLD } from '@renderer/components/sidebar/NoteList';
import { useNotesStore } from '@renderer/stores/useNotesStore';
import { useUIStore } from '@renderer/stores/useUIStore';
import type { NoteMetadata } from '@shared/types/note';

describe('NoteList Component (Grouped & Virtualized)', () => {
  const refDate = new Date('2026-09-15T12:00:00.000Z');

  const createNotes = (count: number, baseTimestamp: number): NoteMetadata[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      title: `Catatan #${i + 1}`,
      snippet: `Cuplikan catatan nomor ${i + 1}`,
      revision: 1,
      createdAt: baseTimestamp - i * 1000,
      updatedAt: baseTimestamp - i * 1000,
    }));
  };

  beforeEach(() => {
    useNotesStore.getState().reset();
    useUIStore.getState().resetUI();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('exports VIRTUALIZATION_THRESHOLD = 300 per Architecture §12', () => {
    expect(VIRTUALIZATION_THRESHOLD).toBe(300);
  });

  describe('Standard Mode (<= 300 Notes)', () => {
    it('renders groups in correct order: Hari ini -> Kemarin -> Sebelumnya', () => {
      const todayTime = new Date('2026-09-15T10:00:00.000Z').getTime();
      const yesterdayTime = new Date('2026-09-14T10:00:00.000Z').getTime();
      const previousTime = new Date('2026-09-10T10:00:00.000Z').getTime();

      const mixedNotes: NoteMetadata[] = [
        {
          id: 1,
          title: 'Catatan Hari Ini',
          snippet: 'Snippet 1',
          revision: 1,
          createdAt: todayTime,
          updatedAt: todayTime,
        },
        {
          id: 2,
          title: 'Catatan Kemarin',
          snippet: 'Snippet 2',
          revision: 1,
          createdAt: yesterdayTime,
          updatedAt: yesterdayTime,
        },
        {
          id: 3,
          title: 'Catatan Lawas',
          snippet: 'Snippet 3',
          revision: 1,
          createdAt: previousTime,
          updatedAt: previousTime,
        },
      ];

      render(<NoteList notes={mixedNotes} referenceDate={refDate} />);

      expect(screen.getByTestId('note-list-standard')).toBeDefined();
      expect(screen.getByTestId('standard-items-container')).toBeDefined();

      const headings = screen.getAllByRole('heading', { level: 3 });
      expect(headings).toHaveLength(3);
      expect(headings[0].textContent).toBe('Hari ini');
      expect(headings[1].textContent).toBe('Kemarin');
      expect(headings[2].textContent).toBe('Sebelumnya');
    });

    it('does not render empty time sections (PRD US#15, US#16)', () => {
      const todayTime = new Date('2026-09-15T10:00:00.000Z').getTime();
      const onlyTodayNotes: NoteMetadata[] = [
        {
          id: 1,
          title: 'Catatan Hari Ini Saja',
          snippet: 'Snippet',
          revision: 1,
          createdAt: todayTime,
          updatedAt: todayTime,
        },
      ];

      render(<NoteList notes={onlyTodayNotes} referenceDate={refDate} />);

      expect(screen.queryByTestId('time-section-hari-ini')).not.toBeNull();
      expect(screen.queryByTestId('time-section-kemarin')).toBeNull();
      expect(screen.queryByTestId('time-section-sebelumnya')).toBeNull();
    });

    it('connects to useNotesStore and useUIStore by default', () => {
      const todayTime = new Date('2026-09-15T10:00:00.000Z').getTime();
      useNotesStore.getState().upsertNote({
        id: 10,
        title: 'Dari Store Catatan',
        snippet: 'Snippet store',
        revision: 1,
        createdAt: todayTime,
        updatedAt: todayTime,
      });
      useUIStore.getState().setActiveNoteId(10);

      render(<NoteList referenceDate={refDate} />);

      const activeItem = screen.getByTestId('note-item-10');
      expect(activeItem.getAttribute('data-active')).toBe('true');
    });

    it('updates useUIStore.activeNoteId on note item click when onSelectNote is not provided', () => {
      const todayTime = new Date('2026-09-15T10:00:00.000Z').getTime();
      const notes: NoteMetadata[] = [
        {
          id: 5,
          title: 'Catatan 5',
          snippet: 'Snippet 5',
          revision: 1,
          createdAt: todayTime,
          updatedAt: todayTime,
        },
      ];

      render(<NoteList notes={notes} referenceDate={refDate} />);

      expect(useUIStore.getState().activeNoteId).toBeNull();
      fireEvent.click(screen.getByTestId('note-item-5'));
      expect(useUIStore.getState().activeNoteId).toBe(5);
    });

    it('renders SidebarEmptyState when notes is empty (PRD US#1, US#20)', () => {
      const mockOnCreate = vi.fn();
      render(<NoteList notes={[]} onCreateNote={mockOnCreate} />);

      expect(screen.getByTestId('sidebar-empty-state')).toBeDefined();
      expect(screen.getByText('Belum ada catatan')).toBeDefined();

      const cta = screen.getByTestId('empty-state-create-button');
      fireEvent.click(cta);
      expect(mockOnCreate).toHaveBeenCalledTimes(1);
    });

    it('renders SidebarSkeleton when notes list is empty and isLoading is true (Anti-Glitch UX)', () => {
      useNotesStore.getState().setField('isLoading', true);

      render(<NoteList />);

      expect(screen.getByTestId('sidebar-skeleton')).toBeDefined();
      expect(screen.queryByTestId('sidebar-empty-state')).toBeNull();
    });

    it('renders SidebarEmptyState when notes is empty and isLoading is false', () => {
      useNotesStore.getState().setField('isLoading', false);

      render(<NoteList />);

      expect(screen.getByTestId('sidebar-empty-state')).toBeDefined();
      expect(screen.queryByTestId('sidebar-skeleton')).toBeNull();
    });
  });

  describe('Virtualized Mode (> 300 Notes / custom threshold)', () => {
    it('activates virtualized list when items exceed virtualization threshold', () => {
      // Menggunakan threshold kecil untuk menguji aktivasi virtualisasi
      const notes = createNotes(10, refDate.getTime());

      render(<NoteList notes={notes} referenceDate={refDate} virtualizationThreshold={5} />);

      expect(screen.getByTestId('note-list-virtualized')).toBeDefined();
      expect(screen.getByTestId('virtual-items-container')).toBeDefined();
      expect(screen.queryByTestId('note-list-standard')).toBeNull();
    });

    it('keeps standard mode when items are <= threshold', () => {
      const notes = createNotes(5, refDate.getTime());

      render(<NoteList notes={notes} referenceDate={refDate} virtualizationThreshold={5} />);

      expect(screen.getByTestId('note-list-standard')).toBeDefined();
      expect(screen.queryByTestId('note-list-virtualized')).toBeNull();
    });
  });

  describe('Context Menu Wiring (PRD US#54, US#55)', () => {
    it('opens DeleteConfirmDialog for targeted note when onDeleteRequested fires', () => {
      let triggerDeleteRequested: ((noteId: number) => void) | undefined;
      const mockOnDeleteRequested = vi.fn((cb: (noteId: number) => void) => {
        triggerDeleteRequested = cb;
        return () => {};
      });

      window.electronAPI = {
        ...window.electronAPI,
        platform: 'linux',
        windowControls: {
          minimize: vi.fn(),
          maximize: vi.fn(),
          close: vi.fn(),
        },
        windows: { openChild: vi.fn() },
        contextMenu: { showNote: vi.fn() },
        backup: { triggerBackup: vi.fn(), create: vi.fn() },
        theme: { getSystemTheme: vi.fn(), onThemeChanged: vi.fn() },
        notes: {
          getAll: vi.fn(),
          getById: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
          delete: vi.fn(),
          onBroadcastChanged: vi.fn().mockReturnValue(() => {}),
          onDeleteRequested: mockOnDeleteRequested,
        },
      };

      const notes: NoteMetadata[] = [
        {
          id: 101,
          title: 'Catatan Spesifik Klik Kanan',
          snippet: 'Cuplikan',
          revision: 1,
          createdAt: refDate.getTime(),
          updatedAt: refDate.getTime(),
        },
      ];

      render(<NoteList notes={notes} referenceDate={refDate} />);

      expect(mockOnDeleteRequested).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('delete-confirm-dialog')).toBeNull();

      // Trigger context menu "Hapus" event from main process
      act(() => {
        triggerDeleteRequested?.(101);
      });

      // Verify DeleteConfirmDialog opens and targets the exact note
      const dialog = screen.getByTestId('delete-confirm-dialog');
      expect(dialog).toBeDefined();
      expect(within(dialog).getByText('Catatan Spesifik Klik Kanan')).toBeDefined();
    });
  });
});
