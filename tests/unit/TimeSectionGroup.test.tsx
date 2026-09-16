import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { TimeSectionGroup } from '@renderer/components/sidebar/TimeSectionGroup';
import type { NoteMetadata } from '@shared/types/note';

describe('TimeSectionGroup Component', () => {
  const refDate = new Date('2026-09-15T12:00:00.000Z');

  const notesList: NoteMetadata[] = [
    {
      id: 1,
      title: 'Catatan Pertama',
      snippet: 'Isi ringkas catatan satu',
      revision: 1,
      createdAt: new Date('2026-09-15T09:00:00.000Z').getTime(),
      updatedAt: new Date('2026-09-15T09:30:00.000Z').getTime(),
    },
    {
      id: 2,
      title: 'Catatan Kedua',
      snippet: 'Isi ringkas catatan dua',
      revision: 1,
      createdAt: new Date('2026-09-15T10:00:00.000Z').getTime(),
      updatedAt: new Date('2026-09-15T10:30:00.000Z').getTime(),
    },
  ];

  afterEach(() => {
    cleanup();
  });

  it('renders nothing (null) when notes array is empty', () => {
    const { container } = render(
      <TimeSectionGroup title="Hari ini" notes={[]} referenceDate={refDate} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders section header and all notes when notes are provided', () => {
    render(<TimeSectionGroup title="Hari ini" notes={notesList} referenceDate={refDate} />);

    const heading = screen.getByTestId('time-section-hari-ini-heading');
    expect(heading).toBeDefined();
    expect(heading.textContent).toBe('Hari ini');

    expect(screen.getByText('Catatan Pertama')).toBeDefined();
    expect(screen.getByText('Catatan Kedua')).toBeDefined();
  });

  it('marks the note matching activeNoteId as active', () => {
    render(
      <TimeSectionGroup
        title="Hari ini"
        notes={notesList}
        activeNoteId={2}
        referenceDate={refDate}
      />,
    );

    const note1 = screen.getByTestId('note-item-1');
    const note2 = screen.getByTestId('note-item-2');

    expect(note1.getAttribute('data-active')).toBe('false');
    expect(note2.getAttribute('data-active')).toBe('true');
  });

  it('forwards onSelectNote and onDeleteNote to NoteItem children', () => {
    const handleSelect = vi.fn();
    const handleDelete = vi.fn();

    render(
      <TimeSectionGroup
        title="Kemarin"
        notes={notesList}
        onSelectNote={handleSelect}
        onDeleteNote={handleDelete}
        referenceDate={refDate}
      />,
    );

    fireEvent.click(screen.getByTestId('note-item-1'));
    expect(handleSelect).toHaveBeenCalledWith(1);

    fireEvent.click(screen.getByTestId('note-item-delete-btn-2'));
    expect(handleDelete).toHaveBeenCalledWith(2);
  });
});
