import { describe, it, expect } from 'vitest';
import { groupByTimeSection } from '@shared/utils/timeSectioning';
import type { NoteMetadata } from '@shared/types/note';

describe('timeSectioning (groupByTimeSection)', () => {
  // Reference date: 2026-03-15 at 14:30:00 local time
  const referenceDate = new Date(2026, 2, 15, 14, 30, 0, 0);

  const startOfToday = new Date(2026, 2, 15, 0, 0, 0, 0).getTime();
  const startOfYesterday = new Date(2026, 2, 14, 0, 0, 0, 0).getTime();

  const createNote = (id: number, updatedAt: number): NoteMetadata => ({
    id,
    title: `Catatan ${id}`,
    snippet: `Cuplikan ${id}`,
    revision: 1,
    createdAt: updatedAt - 1000,
    updatedAt,
  });

  it('returns empty groups when notes array is empty', () => {
    const result = groupByTimeSection([], referenceDate);
    expect(result).toEqual({
      today: [],
      yesterday: [],
      previous: [],
    });
  });

  describe('Midnight Boundary Cases', () => {
    it('correctly places notes on exact start of today and 1ms before', () => {
      const noteAtMidnightToday = createNote(1, startOfToday);
      const note1MsBeforeToday = createNote(2, startOfToday - 1);

      const result = groupByTimeSection([noteAtMidnightToday, note1MsBeforeToday], referenceDate);

      expect(result.today.map((n) => n.id)).toEqual([1]);
      expect(result.yesterday.map((n) => n.id)).toEqual([2]);
    });

    it('correctly places notes on exact start of yesterday and 1ms before', () => {
      const noteAtMidnightYesterday = createNote(3, startOfYesterday);
      const note1MsBeforeYesterday = createNote(4, startOfYesterday - 1);

      const result = groupByTimeSection(
        [noteAtMidnightYesterday, note1MsBeforeYesterday],
        referenceDate,
      );

      expect(result.yesterday.map((n) => n.id)).toEqual([3]);
      expect(result.previous.map((n) => n.id)).toEqual([4]);
    });
  });

  describe('Categorization by Time Sections', () => {
    it('groups notes correctly across today, yesterday, and previous', () => {
      const noteToday = createNote(10, startOfToday + 3600 * 1000); // 1 hour into today
      const noteYesterday = createNote(20, startOfYesterday + 7200 * 1000); // 2 hours into yesterday
      const notePrevious = createNote(30, startOfYesterday - 86400 * 1000); // 2 days ago

      const result = groupByTimeSection([noteYesterday, notePrevious, noteToday], referenceDate);

      expect(result.today.map((n) => n.id)).toEqual([10]);
      expect(result.yesterday.map((n) => n.id)).toEqual([20]);
      expect(result.previous.map((n) => n.id)).toEqual([30]);
    });

    it('handles notes with timestamps in the future by placing them in today', () => {
      const noteFuture = createNote(99, referenceDate.getTime() + 1000000);
      const result = groupByTimeSection([noteFuture], referenceDate);

      expect(result.today.map((n) => n.id)).toEqual([99]);
    });
  });

  describe('Descending Order and Deterministic Secondary Sorting', () => {
    it('sorts notes within each section from newest to oldest updatedAt', () => {
      const noteTodayOlder = createNote(1, startOfToday + 1000);
      const noteTodayNewer = createNote(2, startOfToday + 5000);
      const noteTodayNewest = createNote(3, startOfToday + 10000);

      const result = groupByTimeSection(
        [noteTodayOlder, noteTodayNewest, noteTodayNewer],
        referenceDate,
      );

      expect(result.today.map((n) => n.id)).toEqual([3, 2, 1]);
    });

    it('uses id descending as tie-breaker when updatedAt is identical', () => {
      const sameTime = startOfToday + 2000;
      const noteA = createNote(101, sameTime);
      const noteB = createNote(205, sameTime);
      const noteC = createNote(150, sameTime);

      const result = groupByTimeSection([noteA, noteB, noteC], referenceDate);

      expect(result.today.map((n) => n.id)).toEqual([205, 150, 101]);
    });

    it('sorts yesterday and previous groups descending with tie-breaker', () => {
      const timeYesterday1 = startOfYesterday + 1000;
      const timeYesterday2 = startOfYesterday + 2000;

      const y1 = createNote(10, timeYesterday1);
      const y2 = createNote(20, timeYesterday2);
      const y3 = createNote(30, timeYesterday1); // tie with y1, higher id

      const p1 = createNote(1, startOfYesterday - 10000);
      const p2 = createNote(2, startOfYesterday - 5000);

      const result = groupByTimeSection([y1, p1, y2, p2, y3], referenceDate);

      expect(result.yesterday.map((n) => n.id)).toEqual([20, 30, 10]);
      expect(result.previous.map((n) => n.id)).toEqual([2, 1]);
    });
  });

  describe('Array Immutability & Default Date', () => {
    it('does not mutate the input array', () => {
      const originalList = [createNote(1, startOfToday + 100), createNote(2, startOfToday + 500)];
      const frozenInput = Object.freeze([...originalList]);

      expect(() => groupByTimeSection(frozenInput, referenceDate)).not.toThrow();
      expect(frozenInput[0].id).toBe(1);
    });

    it('works when referenceDate argument is omitted (uses current date)', () => {
      const now = Date.now();
      const currentNote = createNote(1, now);

      const result = groupByTimeSection([currentNote]);
      expect(result.today.map((n) => n.id)).toEqual([1]);
    });
  });
});
