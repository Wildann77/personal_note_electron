import type { NoteMetadata, GroupedNotes } from '../types/note';

/**
 * Pure domain service for grouping notes by local calendar time sections:
 * - 'today': Updated today (from local midnight 00:00:00.000 to now/future)
 * - 'yesterday': Updated yesterday (from local midnight yesterday to 23:59:59.999 yesterday)
 * - 'previous': Updated before yesterday
 *
 * Each group is sorted descending by `updatedAt` (most recent first).
 * If `updatedAt` is identical, secondary sort by `id` descending guarantees deterministic ordering.
 *
 * @param notes List of notes or note metadata items to group.
 * @param referenceDate Reference date representing the current time (defaults to new Date()).
 */
export function groupByTimeSection<T extends NoteMetadata = NoteMetadata>(
  notes: readonly T[],
  referenceDate: Date = new Date(),
): { today: T[]; yesterday: T[]; previous: T[] } {
  const year = referenceDate.getFullYear();
  const month = referenceDate.getMonth();
  const date = referenceDate.getDate();

  const startOfToday = new Date(year, month, date, 0, 0, 0, 0).getTime();
  const startOfYesterday = new Date(year, month, date - 1, 0, 0, 0, 0).getTime();

  const grouped: {
    today: T[];
    yesterday: T[];
    previous: T[];
  } = {
    today: [],
    yesterday: [],
    previous: [],
  };

  for (const note of notes) {
    if (note.updatedAt >= startOfToday) {
      grouped.today.push(note);
    } else if (note.updatedAt >= startOfYesterday) {
      grouped.yesterday.push(note);
    } else {
      grouped.previous.push(note);
    }
  }

  const sortDesc = (a: T, b: T): number => {
    if (b.updatedAt !== a.updatedAt) {
      return b.updatedAt - a.updatedAt;
    }
    return b.id - a.id;
  };

  grouped.today.sort(sortDesc);
  grouped.yesterday.sort(sortDesc);
  grouped.previous.sort(sortDesc);

  return grouped;
}

export type { GroupedNotes };
