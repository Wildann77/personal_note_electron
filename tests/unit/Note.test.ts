import { describe, it, expect } from 'vitest';
import { Note, DEFAULT_NOTE_TITLE } from '@main/domain/entities/Note';
import { ValidationError } from '@main/domain/errors/AppError';
import type { OutputData } from '@shared/types/note';

describe('Note Domain Entity', () => {
  const sampleContent: OutputData = {
    time: 1710000000000,
    blocks: [
      {
        id: 'b1',
        type: 'paragraph',
        data: { text: 'Halo dunia' },
      },
    ],
    version: '2.31.0',
  };

  describe('Note.create()', () => {
    it('creates note with default fallback values', () => {
      const before = Date.now();
      const note = Note.create();
      const after = Date.now();

      expect(note.id).toBe(0);
      expect(note.title).toBe(DEFAULT_NOTE_TITLE);
      expect(note.snippet).toBe('');
      expect(note.content).toEqual({ blocks: [] });
      expect(note.revision).toBe(0);
      expect(note.createdAt).toBeGreaterThanOrEqual(before);
      expect(note.createdAt).toBeLessThanOrEqual(after);
      expect(note.updatedAt).toBe(note.createdAt);
    });

    it('creates note with custom title and trims whitespace', () => {
      const note = Note.create({ title: '   Rencana Belajar   ' });
      expect(note.title).toBe('Rencana Belajar');
    });

    it('falls back to default title if title is empty or only whitespace', () => {
      const emptyNote = Note.create({ title: '' });
      expect(emptyNote.title).toBe(DEFAULT_NOTE_TITLE);

      const spaceNote = Note.create({ title: '    ' });
      expect(spaceNote.title).toBe(DEFAULT_NOTE_TITLE);
    });

    it('creates note with provided content and snippet', () => {
      const note = Note.create({
        title: 'Judul Catatan',
        snippet: 'Ringkasan singkat...',
        content: sampleContent,
      });

      expect(note.title).toBe('Judul Catatan');
      expect(note.snippet).toBe('Ringkasan singkat...');
      expect(note.content).toEqual(sampleContent);
    });
  });

  describe('Note.restore() & Invariants', () => {
    it('restores valid note from persistence props', () => {
      const note = Note.restore({
        id: 42,
        title: 'Catatan Tersimpan',
        snippet: 'Cuplikan',
        content: sampleContent,
        revision: 5,
        createdAt: 1000,
        updatedAt: 2000,
      });

      expect(note.id).toBe(42);
      expect(note.title).toBe('Catatan Tersimpan');
      expect(note.revision).toBe(5);
      expect(note.createdAt).toBe(1000);
      expect(note.updatedAt).toBe(2000);
    });

    it('throws ValidationError when revision is negative', () => {
      expect(() =>
        Note.restore({
          id: 1,
          title: 'Judul',
          snippet: '',
          content: { blocks: [] },
          revision: -1,
          createdAt: 1000,
          updatedAt: 1000,
        }),
      ).toThrow(ValidationError);
    });

    it('throws ValidationError when revision is not an integer', () => {
      expect(() =>
        Note.restore({
          id: 1,
          title: 'Judul',
          snippet: '',
          content: { blocks: [] },
          revision: 2.5,
          createdAt: 1000,
          updatedAt: 1000,
        }),
      ).toThrow(ValidationError);
    });

    it('throws ValidationError when id is negative', () => {
      expect(() =>
        Note.restore({
          id: -5,
          title: 'Judul',
          snippet: '',
          content: { blocks: [] },
          revision: 0,
          createdAt: 1000,
          updatedAt: 1000,
        }),
      ).toThrow(ValidationError);
    });

    it('throws ValidationError when createdAt is non-positive', () => {
      expect(() =>
        Note.restore({
          id: 1,
          title: 'Judul',
          snippet: '',
          content: { blocks: [] },
          revision: 0,
          createdAt: 0,
          updatedAt: 1000,
        }),
      ).toThrow(ValidationError);
    });

    it('throws ValidationError when updatedAt is earlier than createdAt', () => {
      expect(() =>
        Note.restore({
          id: 1,
          title: 'Judul',
          snippet: '',
          content: { blocks: [] },
          revision: 0,
          createdAt: 2000,
          updatedAt: 1000,
        }),
      ).toThrow(ValidationError);
    });
  });

  describe('Business Mutations', () => {
    it('updateContent() updates content, increments revision, and updates timestamp', async () => {
      const note = Note.create({ title: 'Judul Awal' });
      const initialRev = note.revision;
      const initialUpdatedAt = note.updatedAt;

      // Small delay to ensure timestamp advancement
      await new Promise((resolve) => setTimeout(resolve, 5));

      note.updateContent(sampleContent, 'Judul Baru', 'Cuplikan baru');

      expect(note.content).toEqual(sampleContent);
      expect(note.title).toBe('Judul Baru');
      expect(note.snippet).toBe('Cuplikan baru');
      expect(note.revision).toBe(initialRev + 1);
      expect(note.updatedAt).toBeGreaterThanOrEqual(initialUpdatedAt);
    });

    it('incrementRevision() increments revision by 1', () => {
      const note = Note.create();
      note.incrementRevision();
      expect(note.revision).toBe(1);
      note.incrementRevision();
      expect(note.revision).toBe(2);
    });

    it('setTitle() sets title with trimming and fallback', () => {
      const note = Note.create();
      note.setTitle('  Judul Spesifik  ');
      expect(note.title).toBe('Judul Spesifik');

      note.setTitle('');
      expect(note.title).toBe(DEFAULT_NOTE_TITLE);
    });

    it('setSnippet() sets snippet with trimming', () => {
      const note = Note.create();
      note.setSnippet('   Ringkasan   ');
      expect(note.snippet).toBe('Ringkasan');
    });

    it('assignId() assigns valid integer id and rejects negative id', () => {
      const note = Note.create();
      note.assignId(123);
      expect(note.id).toBe(123);

      expect(() => note.assignId(-1)).toThrow(ValidationError);
    });
  });

  describe('Serialization', () => {
    it('toPlainObject() and toJSON() return clean Note structure', () => {
      const note = Note.create({
        id: 7,
        title: 'Catatan Rapat',
        snippet: 'Poin 1',
        content: sampleContent,
      });

      const plain = note.toPlainObject();
      expect(plain).toEqual({
        id: 7,
        title: 'Catatan Rapat',
        snippet: 'Poin 1',
        content: sampleContent,
        revision: 0,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
      });

      expect(note.toJSON()).toEqual(plain);
    });
  });
});
