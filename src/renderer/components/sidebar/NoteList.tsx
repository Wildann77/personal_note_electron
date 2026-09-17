import * as React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@renderer/lib/utils';
import { useNotesStore } from '@renderer/stores/useNotesStore';
import { useUIStore } from '@renderer/stores/useUIStore';
import { groupByTimeSection } from '@shared/utils/timeSectioning';
import { TimeSectionGroup } from './TimeSectionGroup';
import { NoteItem } from './NoteItem';
import { SidebarEmptyState } from './SidebarEmptyState';
import { SidebarSkeleton } from './SidebarSkeleton';
import { DeleteConfirmDialog } from '@renderer/components/dialogs/DeleteConfirmDialog';
import type { NoteMetadata } from '@shared/types/note';

/**
 * Ambang batas jumlah catatan untuk mengaktifkan virtualisasi otomatis (Architecture §12, §17).
 */
export const VIRTUALIZATION_THRESHOLD = 300;

export interface NoteListProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Daftar catatan (opsional, jika tidak disediakan akan mengambil dari useNotesStore).
   */
  notes?: NoteMetadata[];

  /**
   * ID catatan yang aktif (opsional, jika tidak disediakan akan mengambil dari useUIStore).
   */
  activeNoteId?: number | null;

  /**
   * Callback ketika catatan dipilih/diklik.
   */
  onSelectNote?: (id: number) => void;

  /**
   * Callback ketika tombol hapus pada catatan diklik.
   */
  onDeleteNote?: (id: number) => void;

  /**
   * Callback ketika tombol buat catatan diklik pada empty state.
   */
  onCreateNote?: () => void;

  /**
   * Tanggal acuan untuk pengelompokan seksi waktu (opsional).
   */
  referenceDate?: Date;

  /**
   * Ambang batas kustom untuk mengaktifkan virtualisasi (default: 300).
   */
  virtualizationThreshold?: number;
}

export type VirtualListItem =
  | {
      type: 'header';
      id: string;
      title: string;
    }
  | {
      type: 'note';
      id: string;
      note: NoteMetadata;
    };

/**
 * NoteList (Architecture §12, §17 Kategori C, PRD US#14–19).
 * - Render daftar catatan terkelompok ("Hari ini", "Kemarin", "Sebelumnya").
 * - Di bawah 300 catatan: render biasa via `TimeSectionGroup`.
 * - Di atas 300 catatan: otomatis beralih ke `@tanstack/react-virtual` dengan array virtual datar.
 * - Scroll area independen yang mulus dan responsif.
 */
export const NoteList: React.FC<NoteListProps> = ({
  notes: propNotes,
  activeNoteId: propActiveNoteId,
  onSelectNote,
  onDeleteNote,
  onCreateNote,
  referenceDate,
  virtualizationThreshold = VIRTUALIZATION_THRESHOLD,
  className,
  ...props
}) => {
  // Store subscriptions (hybrid approach)
  const storeNotes = useNotesStore((state) => state.notes);
  const storeIsLoading = useNotesStore((state) => state.isLoading);
  const storeActiveNoteId = useUIStore((state) => state.activeNoteId);

  const notes = propNotes ?? storeNotes;
  const isLoading = propNotes === undefined ? storeIsLoading : false;
  const activeNoteId = propActiveNoteId !== undefined ? propActiveNoteId : storeActiveNoteId;

  const handleSelectNote = React.useCallback(
    (id: number) => {
      if (onSelectNote) {
        onSelectNote(id);
      } else {
        useUIStore.getState().setActiveNoteId(id);
        if (typeof window !== 'undefined' && window.electronAPI?.notes?.getById) {
          void window.electronAPI.notes.getById(id).then((result) => {
            if (result.success) {
              useNotesStore.getState().setField('activeNote', result.data);
              useNotesStore.getState().upsertNote(result.data);
            }
          });
        }
      }
    },
    [onSelectNote],
  );

  const [pendingDeleteId, setPendingDeleteId] = React.useState<number | null>(null);

  const pendingDeleteNote = React.useMemo(() => {
    if (pendingDeleteId === null) return undefined;
    return notes.find((n) => n.id === pendingDeleteId);
  }, [notes, pendingDeleteId]);

  const handleDeleteNote = React.useCallback(
    (id: number) => {
      if (onDeleteNote) {
        onDeleteNote(id);
      } else {
        setPendingDeleteId(id);
      }
    },
    [onDeleteNote],
  );

  // Listen to native Context Menu "Hapus" trigger (PRD US#54, US#55)
  React.useEffect(() => {
    if (typeof window === 'undefined' || !window.electronAPI?.notes?.onDeleteRequested) {
      return;
    }
    const unsubscribe = window.electronAPI.notes.onDeleteRequested((noteId: number) => {
      handleDeleteNote(noteId);
    });
    return () => {
      unsubscribe();
    };
  }, [handleDeleteNote]);

  const handleConfirmDelete = React.useCallback(() => {
    if (pendingDeleteId === null) return;
    const idToDelete = pendingDeleteId;
    setPendingDeleteId(null);

    if (typeof window !== 'undefined' && window.electronAPI?.notes?.delete) {
      void window.electronAPI.notes.delete(idToDelete).then((res) => {
        if (res.success) {
          useNotesStore.getState().deleteNote(idToDelete);

          // Fallback pemilihan catatan aktif jika yang dihapus adalah catatan aktif (PRD US#28)
          const currentActive = useUIStore.getState().activeNoteId;
          if (currentActive === idToDelete) {
            const remaining = useNotesStore.getState().notes.filter((n) => n.id !== idToDelete);
            useUIStore.getState().setActiveNoteId(remaining.length > 0 ? remaining[0].id : null);
          }
        }
      });
    }
  }, [pendingDeleteId]);

  // Kelompokkan catatan ke dalam time sections
  const grouped = React.useMemo(() => {
    return groupByTimeSection(notes, referenceDate);
  }, [notes, referenceDate]);

  const shouldVirtualize = notes.length > virtualizationThreshold;

  // Siapkan flat array untuk virtualizer saat dataset > threshold
  const flatItems = React.useMemo<VirtualListItem[]>(() => {
    if (!shouldVirtualize) return [];

    const items: VirtualListItem[] = [];

    if (grouped.today.length > 0) {
      items.push({ type: 'header', id: 'header-today', title: 'Hari ini' });
      for (const note of grouped.today) {
        items.push({ type: 'note', id: `note-${note.id}`, note });
      }
    }

    if (grouped.yesterday.length > 0) {
      items.push({ type: 'header', id: 'header-yesterday', title: 'Kemarin' });
      for (const note of grouped.yesterday) {
        items.push({ type: 'note', id: `note-${note.id}`, note });
      }
    }

    if (grouped.previous.length > 0) {
      items.push({ type: 'header', id: 'header-previous', title: 'Sebelumnya' });
      for (const note of grouped.previous) {
        items.push({ type: 'note', id: `note-${note.id}`, note });
      }
    }

    return items;
  }, [grouped, shouldVirtualize]);

  const parentRef = React.useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      return flatItems[index]?.type === 'header' ? 28 : 68;
    },
    overscan: 6,
    getItemKey: (index) => flatItems[index]?.id ?? index,
    enabled: shouldVirtualize,
  });

  return (
    <div
      ref={parentRef}
      data-testid={shouldVirtualize ? 'note-list-virtualized' : 'note-list-standard'}
      data-virtualized={shouldVirtualize ? 'true' : 'false'}
      className={cn(
        'w-full h-full overflow-y-auto px-2 py-1 select-none scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent',
        className,
      )}
      {...props}
    >
      {notes.length === 0 ? (
        isLoading ? (
          <SidebarSkeleton />
        ) : (
          <SidebarEmptyState onCreateNote={onCreateNote} />
        )
      ) : shouldVirtualize ? (
        /* Mode Virtualized (>300 item) */
        <div
          data-testid="virtual-items-container"
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = flatItems[virtualRow.index];
            if (!item) return null;

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={rowVirtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {item.type === 'header' ? (
                  <h3
                    data-testid={`virtual-heading-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
                    className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground px-3 py-1 select-none"
                  >
                    {item.title}
                  </h3>
                ) : (
                  <NoteItem
                    note={item.note}
                    isActive={activeNoteId === item.note.id}
                    onSelect={handleSelectNote}
                    onDelete={handleDeleteNote}
                    referenceDate={referenceDate}
                  />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Mode Standar (<=300 item) */
        <div data-testid="standard-items-container" className="flex flex-col space-y-2">
          <TimeSectionGroup
            title="Hari ini"
            notes={grouped.today}
            activeNoteId={activeNoteId}
            onSelectNote={handleSelectNote}
            onDeleteNote={handleDeleteNote}
            referenceDate={referenceDate}
          />
          <TimeSectionGroup
            title="Kemarin"
            notes={grouped.yesterday}
            activeNoteId={activeNoteId}
            onSelectNote={handleSelectNote}
            onDeleteNote={handleDeleteNote}
            referenceDate={referenceDate}
          />
          <TimeSectionGroup
            title="Sebelumnya"
            notes={grouped.previous}
            activeNoteId={activeNoteId}
            onSelectNote={handleSelectNote}
            onDeleteNote={handleDeleteNote}
            referenceDate={referenceDate}
          />
        </div>
      )}

      {/* Dialog Konfirmasi Hapus (shadcn/ui AlertDialog) */}
      <DeleteConfirmDialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDeleteId(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        noteTitle={pendingDeleteNote?.title}
      />
    </div>
  );
};

NoteList.displayName = 'NoteList';
