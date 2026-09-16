import * as React from 'react';
import { Trash2 } from 'lucide-react';
import { cn } from '@renderer/lib/utils';
import type { NoteMetadata } from '@shared/types/note';

export interface NoteItemProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'> {
  /**
   * Data metadata catatan yang ditampilkan.
   */
  note: NoteMetadata;

  /**
   * Status apakah catatan ini sedang aktif/terpilih.
   */
  isActive?: boolean;

  /**
   * Callback saat item catatan dipilih/diklik.
   */
  onSelect?: (id: number) => void;

  /**
   * Callback saat tombol ikon tempat sampah diklik untuk memicu konfirmasi hapus.
   */
  onDelete?: (id: number) => void;

  /**
   * Tanggal acuan untuk format waktu relatif (opsional, bawaan: new Date()).
   */
  referenceDate?: Date;
}

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

/**
 * Format timestamp catatan secara kontekstual berbasis native Date:
 * - Hari ini: 'HH:mm' (mis. '09:15')
 * - Kemarin: 'Kemarin, HH:mm'
 * - Sebelumnya: 'DD MMM YYYY' (mis. '12 Sep 2026')
 */
export function formatNoteTimestamp(timestamp: number, referenceDate: Date = new Date()): string {
  if (!timestamp || Number.isNaN(timestamp)) {
    return '';
  }

  const date = new Date(timestamp);
  const startOfToday = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    0,
    0,
    0,
    0,
  ).getTime();
  const startOfYesterday = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate() - 1,
    0,
    0,
    0,
    0,
  ).getTime();

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  if (timestamp >= startOfToday) {
    return timeStr;
  }

  if (timestamp >= startOfYesterday) {
    return `Kemarin, ${timeStr}`;
  }

  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTH_NAMES[date.getMonth()] ?? '';
  const year = date.getFullYear();

  return `${day} ${month} ${year}`;
}

/**
 * NoteItem (Architecture §17, PRD US#17, US#18, US#24, US#54, US#55, DESIGN.md §5.1).
 * - Menampilkan judul catatan, cuplikan teks, dan timestamp terakhir diperbarui.
 * - Indikator aktif: latar `bg-card` dan garis vertikal 3px Ultraviolet di sisi kiri.
 * - Tombol hapus (Trash2): muncul saat hover/fokus, mencegah seleksi saat diklik.
 * - Context menu: mengirim `noteId` item yang benar-benar diklik ke Main Process.
 */
export const NoteItem = React.forwardRef<HTMLDivElement, NoteItemProps>(
  (
    {
      note,
      isActive = false,
      onSelect,
      onDelete,
      referenceDate,
      className,
      onClick,
      onKeyDown,
      onContextMenu,
      ...props
    },
    ref,
  ) => {
    const displayTitle = note.title?.trim() ? note.title.trim() : 'Catatan Tanpa Judul';
    const displaySnippet = note.snippet?.trim() ? note.snippet.trim() : 'Belum ada konten tambahan';
    const displayTimestamp = formatNoteTimestamp(note.updatedAt, referenceDate);

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      onClick?.(e);
      if (!e.defaultPrevented) {
        onSelect?.(note.id);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);
      if (!e.defaultPrevented && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onSelect?.(note.id);
      }
    };

    const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (onContextMenu) {
        onContextMenu(e);
      }

      // Pastikan selalu mengirim noteId dari item yang benar-benar diklik (US#55)
      if (typeof window !== 'undefined' && window.electronAPI?.contextMenu?.showNote) {
        window.electronAPI.contextMenu.showNote(note.id);
      }
    };

    const handleDeleteClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();

      if (onDelete) {
        onDelete(note.id);
      } else if (typeof window !== 'undefined') {
        const confirmed = window.confirm(
          'Apakah Anda yakin ingin menghapus catatan ini? Tindakan ini tidak dapat dibatalkan.',
        );
        if (confirmed && window.electronAPI?.notes?.delete) {
          void window.electronAPI.notes.delete(note.id);
        }
      }
    };

    return (
      <div
        ref={ref}
        role="button"
        tabIndex={0}
        aria-selected={isActive}
        data-testid={`note-item-${note.id}`}
        data-active={isActive ? 'true' : 'false'}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onContextMenu={handleContextMenu}
        className={cn(
          'group relative flex flex-col justify-center px-3 py-2 rounded-md cursor-pointer select-none transition-colors duration-120 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 w-full min-w-0 max-w-full overflow-hidden',
          isActive
            ? 'bg-card text-card-foreground shadow-xs'
            : 'bg-transparent text-foreground hover:bg-muted/50',
          className,
        )}
        {...props}
      >
        {/* Penanda Aksen Kiri Aktif (DESIGN.md §5.1) */}
        {isActive && (
          <span
            aria-hidden="true"
            data-testid="note-item-active-indicator"
            className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-[2px] bg-[#9146ff]"
          />
        )}

        {/* Header Baris Atas: Judul & Tombol Hapus */}
        <div className="flex items-center justify-between gap-2 min-w-0 w-full">
          <span
            className={cn(
              'text-[13px] font-semibold truncate leading-snug min-w-0 flex-1',
              isActive ? 'text-foreground' : 'text-foreground/90 group-hover:text-foreground',
            )}
            title={displayTitle}
          >
            {displayTitle}
          </span>

          {/* Tombol Hapus (Tempat Sampah) - US#24 */}
          <button
            type="button"
            data-testid={`note-item-delete-btn-${note.id}`}
            aria-label="Hapus catatan"
            title="Hapus catatan"
            onClick={handleDeleteClick}
            className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 transition-opacity duration-120 p-1 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-destructive shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Baris Bawah: Cuplikan Teks & Timestamp */}
        <div className="flex items-center justify-between gap-2 mt-0.5 text-muted-foreground min-w-0 w-full">
          <p className="text-[12px] truncate leading-normal min-w-0 flex-1" title={displaySnippet}>
            {displaySnippet}
          </p>

          {displayTimestamp && (
            <span className="text-[11px] shrink-0 whitespace-nowrap font-normal opacity-80">
              {displayTimestamp}
            </span>
          )}
        </div>
      </div>
    );
  },
);

NoteItem.displayName = 'NoteItem';
