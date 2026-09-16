import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { NoteItem, formatNoteTimestamp } from '@renderer/components/sidebar/NoteItem';
import type { NoteMetadata } from '@shared/types/note';

describe('NoteItem Component (Sidebar Note Item)', () => {
  const refDate = new Date('2026-09-15T12:00:00.000Z');
  const mockShowNote = vi.fn();

  const sampleNote: NoteMetadata = {
    id: 42,
    title: 'Catatan Arsitektur',
    snippet: 'Pembahasan mengenai Optimistic Concurrency Control...',
    revision: 1,
    createdAt: new Date('2026-09-15T10:00:00.000Z').getTime(),
    updatedAt: new Date('2026-09-15T10:30:00.000Z').getTime(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.electronAPI = {
      ...window.electronAPI,
      contextMenu: {
        showNote: mockShowNote,
      },
    };
  });

  afterEach(() => {
    cleanup();
  });

  describe('Timestamp Formatting (formatNoteTimestamp)', () => {
    it('formats today note as HH:mm', () => {
      const todayTime = new Date('2026-09-15T09:15:00').getTime();
      const result = formatNoteTimestamp(todayTime, refDate);
      expect(result).toBe('09:15');
    });

    it('formats yesterday note as Kemarin, HH:mm', () => {
      const yesterdayTime = new Date('2026-09-14T14:45:00').getTime();
      const result = formatNoteTimestamp(yesterdayTime, refDate);
      expect(result).toBe('Kemarin, 14:45');
    });

    it('formats previous note as DD MMM YYYY', () => {
      const previousTime = new Date('2026-09-10T08:00:00').getTime();
      const result = formatNoteTimestamp(previousTime, refDate);
      expect(result).toBe('10 Sep 2026');
    });

    it('returns empty string for invalid timestamp', () => {
      expect(formatNoteTimestamp(0)).toBe('');
      expect(formatNoteTimestamp(NaN)).toBe('');
    });
  });

  describe('Rendering & Fallbacks', () => {
    it('renders note title, snippet, and formatted timestamp', () => {
      render(<NoteItem note={sampleNote} referenceDate={refDate} />);

      expect(screen.getByText('Catatan Arsitektur')).toBeDefined();
      expect(
        screen.getByText('Pembahasan mengenai Optimistic Concurrency Control...'),
      ).toBeDefined();
      expect(screen.getByTestId('note-item-42')).toBeDefined();
    });

    it('renders fallback title when title is empty or whitespace', () => {
      const emptyTitleNote: NoteMetadata = {
        ...sampleNote,
        title: '   ',
      };
      render(<NoteItem note={emptyTitleNote} referenceDate={refDate} />);
      expect(screen.getByText('Catatan Tanpa Judul')).toBeDefined();
    });

    it('renders fallback snippet when snippet is empty', () => {
      const emptySnippetNote: NoteMetadata = {
        ...sampleNote,
        snippet: '',
      };
      render(<NoteItem note={emptySnippetNote} referenceDate={refDate} />);
      expect(screen.getByText('Belum ada konten tambahan')).toBeDefined();
    });
  });

  describe('Active & Idle States (DESIGN.md §5.1)', () => {
    it('renders active styling and ultraviolet left indicator when isActive=true', () => {
      render(<NoteItem note={sampleNote} isActive={true} referenceDate={refDate} />);

      const item = screen.getByTestId('note-item-42');
      expect(item.getAttribute('data-active')).toBe('true');
      expect(item.getAttribute('aria-selected')).toBe('true');
      expect(item.className).toContain('bg-card');

      const activeIndicator = screen.getByTestId('note-item-active-indicator');
      expect(activeIndicator).toBeDefined();
      expect(activeIndicator.className).toContain('w-[3px]');
      expect(activeIndicator.className).toContain('bg-[#9146ff]');
    });

    it('renders idle styling without ultraviolet indicator when isActive=false', () => {
      render(<NoteItem note={sampleNote} isActive={false} referenceDate={refDate} />);

      const item = screen.getByTestId('note-item-42');
      expect(item.getAttribute('data-active')).toBe('false');
      expect(item.getAttribute('aria-selected')).toBe('false');
      expect(item.className).toContain('bg-transparent');
      expect(screen.queryByTestId('note-item-active-indicator')).toBeNull();
    });
  });

  describe('Interaction & Selection', () => {
    it('triggers onSelect with noteId on click', () => {
      const handleSelect = vi.fn();
      render(<NoteItem note={sampleNote} onSelect={handleSelect} referenceDate={refDate} />);

      const item = screen.getByTestId('note-item-42');
      fireEvent.click(item);

      expect(handleSelect).toHaveBeenCalledWith(42);
    });

    it('triggers onSelect with noteId on Enter and Space keys', () => {
      const handleSelect = vi.fn();
      render(<NoteItem note={sampleNote} onSelect={handleSelect} referenceDate={refDate} />);

      const item = screen.getByTestId('note-item-42');
      fireEvent.keyDown(item, { key: 'Enter' });
      expect(handleSelect).toHaveBeenCalledTimes(1);
      expect(handleSelect).toHaveBeenCalledWith(42);

      fireEvent.keyDown(item, { key: ' ' });
      expect(handleSelect).toHaveBeenCalledTimes(2);
    });
  });

  describe('Delete Button (US#24)', () => {
    it('triggers onDelete callback without triggering onSelect', () => {
      const handleSelect = vi.fn();
      const handleDelete = vi.fn();

      render(
        <NoteItem
          note={sampleNote}
          onSelect={handleSelect}
          onDelete={handleDelete}
          referenceDate={refDate}
        />,
      );

      const deleteBtn = screen.getByTestId('note-item-delete-btn-42');
      expect(deleteBtn).toBeDefined();

      fireEvent.click(deleteBtn);

      expect(handleDelete).toHaveBeenCalledWith(42);
      expect(handleSelect).not.toHaveBeenCalled();
    });
  });

  describe('Context Menu (US#54, US#55)', () => {
    it('triggers contextMenu.showNote with the exact clicked noteId (not active note)', () => {
      // Inisialisasi catatan lain sebagai catatan aktif untuk menguji US#55
      render(<NoteItem note={sampleNote} isActive={false} referenceDate={refDate} />);

      const item = screen.getByTestId('note-item-42');
      fireEvent.contextMenu(item);

      expect(mockShowNote).toHaveBeenCalledTimes(1);
      expect(mockShowNote).toHaveBeenCalledWith(42);
    });
  });
});
