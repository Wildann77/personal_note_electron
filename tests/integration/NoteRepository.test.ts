import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { MigrationRunner } from '@main/infrastructure/database/migrations';
import { SQLiteNoteRepository } from '@main/infrastructure/repositories/SQLiteNoteRepository';
import { DEFAULT_NOTE_TITLE } from '@main/domain/entities/Note';

describe('SQLiteNoteRepository (Integration)', () => {
  let db: Database.Database;
  let repo: SQLiteNoteRepository;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    MigrationRunner.run(db);
    repo = new SQLiteNoteRepository(db);
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  describe('create', () => {
    it('creates note with default values and revision 1', async () => {
      const note = await repo.create({});

      expect(note.id).toBeGreaterThan(0);
      expect(note.title).toBe(DEFAULT_NOTE_TITLE);
      expect(note.snippet).toBe('');
      expect(note.content).toEqual({ blocks: [] });
      expect(note.revision).toBe(1);
      expect(note.createdAt).toBeGreaterThan(0);
      expect(note.updatedAt).toBeGreaterThan(0);
      expect(note.updatedAt).toBe(note.createdAt);
    });

    it('creates note with custom title, snippet, and content blocks', async () => {
      const content = {
        time: Date.now(),
        blocks: [{ type: 'paragraph', data: { text: 'Halo dunia' } }],
        version: '2.31.0',
      };

      const note = await repo.create({
        title: 'Catatan Rapat',
        snippet: 'Ringkasan rapat mingguan',
        content,
      });

      expect(note.id).toBeGreaterThan(0);
      expect(note.title).toBe('Catatan Rapat');
      expect(note.snippet).toBe('Ringkasan rapat mingguan');
      expect(note.content).toEqual(content);
      expect(note.revision).toBe(1);
    });

    it('handles special characters, emojis, quotes, and HTML safely (PRD US#57)', async () => {
      const specialTitle = `Test ' " \` \n \t 🚀 <script>alert("hack")</script> & ' OR '1'='1`;
      const specialSnippet = `Special symbols: @#$%^&*()_+~|}{[]:;?><,./ and emojis: 📝💻🔥`;
      const specialContent = {
        blocks: [
          {
            type: 'paragraph',
            data: { text: `Quote: "Hello" and 'World' \`test\` \\ backslash &amp;` },
          },
        ],
      };

      const note = await repo.create({
        title: specialTitle,
        snippet: specialSnippet,
        content: specialContent,
      });

      expect(note.title).toBe(specialTitle.trim());
      expect(note.snippet).toBe(specialSnippet.trim());
      expect(note.content).toEqual(specialContent);

      const fetched = await repo.getById(note.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.title).toBe(specialTitle.trim());
      expect(fetched?.snippet).toBe(specialSnippet.trim());
      expect(fetched?.content).toEqual(specialContent);
    });

    it('creates note with explicit ID if provided', async () => {
      const note = await repo.create({
        id: 999,
        title: 'Explicit ID Note',
      });

      expect(note.id).toBe(999);
      const fetched = await repo.getById(999);
      expect(fetched).not.toBeNull();
      expect(fetched?.id).toBe(999);
    });
  });

  describe('getById', () => {
    it('returns null if note does not exist', async () => {
      const note = await repo.getById(99999);
      expect(note).toBeNull();
    });

    it('returns full domain entity for existing note', async () => {
      const created = await repo.create({
        title: 'Testing GetById',
        snippet: 'Snippet test',
        content: { blocks: [{ type: 'header', data: { text: 'Header 1' } }] },
      });

      const fetched = await repo.getById(created.id);
      expect(fetched).not.toBeNull();
      expect(fetched?.id).toBe(created.id);
      expect(fetched?.title).toBe(created.title);
      expect(fetched?.snippet).toBe(created.snippet);
      expect(fetched?.content).toEqual(created.content);
      expect(fetched?.revision).toBe(1);
    });

    it('gracefully handles malformed JSON content from database', async () => {
      db.prepare(
        `INSERT INTO notes (id, title, snippet, content, revision, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(555, 'Corrupt Note', '', 'INVALID_JSON{', 1, 1000, 1000);

      const fetched = await repo.getById(555);
      expect(fetched).not.toBeNull();
      expect(fetched?.id).toBe(555);
      expect(fetched?.content).toEqual({ blocks: [] });
    });
  });

  describe('getAll', () => {
    it('returns empty array when database has no notes', async () => {
      const list = await repo.getAll();
      expect(list).toEqual([]);
    });

    it('returns metadata ordered by updated_at DESC without content column', async () => {
      const now = Date.now();

      db.prepare(
        `INSERT INTO notes (id, title, snippet, content, revision, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        1,
        'Catatan Lama',
        'snippet 1',
        JSON.stringify({ blocks: [] }),
        1,
        now - 5000,
        now - 5000,
      );

      db.prepare(
        `INSERT INTO notes (id, title, snippet, content, revision, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        2,
        'Catatan Baru',
        'snippet 2',
        JSON.stringify({ blocks: [] }),
        1,
        now - 1000,
        now - 1000,
      );

      db.prepare(
        `INSERT INTO notes (id, title, snippet, content, revision, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        3,
        'Catatan Tengah',
        'snippet 3',
        JSON.stringify({ blocks: [] }),
        1,
        now - 3000,
        now - 3000,
      );

      const all = await repo.getAll();
      expect(all).toHaveLength(3);
      expect(all.map((n) => n.id)).toEqual([2, 3, 1]);

      for (const item of all) {
        expect(item).not.toHaveProperty('content');
        expect(item.id).toBeDefined();
        expect(item.title).toBeDefined();
        expect(item.snippet).toBeDefined();
        expect(item.revision).toBe(1);
        expect(item.createdAt).toBeDefined();
        expect(item.updatedAt).toBeDefined();
      }
    });
  });

  describe('update (OCC)', () => {
    it('increments revision and updates updatedAt when expectedRevision matches', async () => {
      const created = await repo.create({
        title: 'Initial Title',
        snippet: 'Initial Snippet',
        content: { blocks: [{ type: 'paragraph', data: { text: 'Initial' } }] },
      });

      const newContent = {
        blocks: [{ type: 'paragraph', data: { text: 'Updated content' } }],
      };

      const updated = await repo.update({
        id: created.id,
        expectedRevision: 1,
        content: newContent,
        title: 'Updated Title',
        snippet: 'Updated Snippet',
      });

      expect(updated).not.toBeNull();
      expect(updated?.id).toBe(created.id);
      expect(updated?.revision).toBe(2);
      expect(updated?.title).toBe('Updated Title');
      expect(updated?.snippet).toBe('Updated Snippet');
      expect(updated?.content).toEqual(newContent);
      expect(updated?.updatedAt).toBeGreaterThanOrEqual(created.updatedAt);

      const inDb = await repo.getById(created.id);
      expect(inDb?.revision).toBe(2);
      expect(inDb?.title).toBe('Updated Title');
    });

    it('returns null and does not modify database when expectedRevision does not match (OCC conflict)', async () => {
      const created = await repo.create({
        title: 'Original Title',
        content: { blocks: [{ type: 'paragraph', data: { text: 'Original' } }] },
      });

      // Try update with wrong expectedRevision (e.g., 999 instead of 1)
      const conflictResult = await repo.update({
        id: created.id,
        expectedRevision: 999,
        content: { blocks: [{ type: 'paragraph', data: { text: 'Conflict edit' } }] },
        title: 'Conflict Title',
      });

      expect(conflictResult).toBeNull();

      // Verify DB was NOT touched
      const inDb = await repo.getById(created.id);
      expect(inDb).not.toBeNull();
      expect(inDb?.revision).toBe(1);
      expect(inDb?.title).toBe('Original Title');
      expect(inDb?.content).toEqual(created.content);
    });

    it('preserves existing title and snippet when undefined in UpdateNoteDto', async () => {
      const created = await repo.create({
        title: 'Persistent Title',
        snippet: 'Persistent Snippet',
        content: { blocks: [] },
      });

      const newContent = {
        blocks: [{ type: 'paragraph', data: { text: 'Only Content Changed' } }],
      };

      const updated = await repo.update({
        id: created.id,
        expectedRevision: 1,
        content: newContent,
      });

      expect(updated).not.toBeNull();
      expect(updated?.title).toBe('Persistent Title');
      expect(updated?.snippet).toBe('Persistent Snippet');
      expect(updated?.content).toEqual(newContent);
      expect(updated?.revision).toBe(2);
    });

    it('returns null if note id does not exist', async () => {
      const result = await repo.update({
        id: 99999,
        expectedRevision: 1,
        content: { blocks: [] },
      });

      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('deletes note and returns true for existing note', async () => {
      const created = await repo.create({ title: 'To Be Deleted' });

      const deleted = await repo.delete(created.id);
      expect(deleted).toBe(true);

      const fetched = await repo.getById(created.id);
      expect(fetched).toBeNull();
    });

    it('returns false when deleting non-existent note', async () => {
      const deleted = await repo.delete(99999);
      expect(deleted).toBe(false);
    });
  });

  describe('rapid consecutive operations (PRD US#59)', () => {
    it('handles consecutive create, update, and read operations cleanly', async () => {
      const note = await repo.create({ title: 'Rapid Note' });
      let currentRevision = note.revision;

      for (let i = 1; i <= 20; i++) {
        const updateResult = await repo.update({
          id: note.id,
          expectedRevision: currentRevision,
          content: { blocks: [{ type: 'paragraph', data: { text: `Step ${i}` } }] },
          snippet: `Snippet ${i}`,
        });

        expect(updateResult).not.toBeNull();
        expect(updateResult?.revision).toBe(currentRevision + 1);
        currentRevision = updateResult!.revision;
      }

      const finalNote = await repo.getById(note.id);
      expect(finalNote?.revision).toBe(21);
      expect(finalNote?.snippet).toBe('Snippet 20');
    });
  });
});
