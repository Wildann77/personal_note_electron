import * as React from 'react';
import { cn } from '@renderer/lib/utils';
import { NoteItem } from './NoteItem';
import type { NoteMetadata } from '@shared/types/note';

export interface TimeSectionGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Judul seksi waktu (mis. "Hari ini", "Kemarin", "Sebelumnya").
   */
  title: string;

  /**
   * Daftar catatan dalam seksi waktu ini.
   */
  notes: NoteMetadata[];

  /**
   * ID catatan yang sedang aktif/terpilih.
   */
  activeNoteId?: number | null;

  /**
   * Callback saat item catatan dipilih/diklik.
   */
  onSelectNote?: (id: number) => void;

  /**
   * Callback saat tombol hapus pada item catatan diklik.
   */
  onDeleteNote?: (id: number) => void;

  /**
   * Tanggal acuan untuk kalkulasi timestamp item catatan.
   */
  referenceDate?: Date;
}

/**
 * TimeSectionGroup (Architecture §17, PRD US#15, US#16, DESIGN.md §3.1, §4.1).
 * - Menampilkan header seksi waktu kapital kecil bertrack (tracked small-caps).
 * - Merender deretan `NoteItem` di dalam grup.
 * - Mengembalikan null jika `notes` kosong (tidak memunculkan seksi kosong aneh).
 */
export const TimeSectionGroup: React.FC<TimeSectionGroupProps> = ({
  title,
  notes,
  activeNoteId,
  onSelectNote,
  onDeleteNote,
  referenceDate,
  className,
  ...props
}) => {
  // Jika tidak ada catatan di grup ini, sembunyikan seksi sepenuhnya
  if (!notes || notes.length === 0) {
    return null;
  }

  const sectionId = `time-section-${title.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <section
      data-testid={sectionId}
      aria-labelledby={`${sectionId}-heading`}
      className={cn('flex flex-col space-y-0.5 py-1', className)}
      {...props}
    >
      {/* Header Grup Waktu (Tracked Small Caps 10-11px, letter-spacing: 0.05em) */}
      <h3
        id={`${sectionId}-heading`}
        data-testid={`${sectionId}-heading`}
        className="text-[11px] font-semibold uppercase tracking-[0.05em] text-muted-foreground px-3 py-1 select-none"
      >
        {title}
      </h3>

      {/* Daftar Item Catatan */}
      <div className="flex flex-col space-y-0.5" role="list">
        {notes.map((note) => (
          <NoteItem
            key={note.id}
            note={note}
            isActive={activeNoteId === note.id}
            onSelect={onSelectNote}
            onDelete={onDeleteNote}
            referenceDate={referenceDate}
          />
        ))}
      </div>
    </section>
  );
};

TimeSectionGroup.displayName = 'TimeSectionGroup';
