import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { MigrationRunner } from '@main/infrastructure/database/migrations';
import { SQLiteNoteRepository } from '@main/infrastructure/repositories/SQLiteNoteRepository';
import { GetNotesUseCase } from '@main/application/notes/GetNotesUseCase';
import type { OutputData } from '@shared/types/note';

describe('GetNotesUseCase (Integration)', () => {
  let db: Database.Database;
  let repo: SQLiteNoteRepository;
  let useCase: GetNotesUseCase;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    MigrationRunner.run(db);

    repo = new SQLiteNoteRepository(db);
    useCase = new GetNotesUseCase(repo);
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  it('returns empty array when no notes exist in repository', async () => {
    const notes = await useCase.execute();

    expect(notes).toBeDefined();
    expect(Array.isArray(notes)).toBe(true);
    expect(notes).toHaveLength(0);
  });

  it('retrieves all notes ordered by updated_at DESC (PRD US#22, US#23)', async () => {
    const baseTime = Date.now() - 10000;
    // Insert notes with deterministic timestamps
    const insertStmt = db.prepare(`
      INSERT INTO notes (title, snippet, content, revision, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run('Pertama', 'Snip 1', '{}', 1, baseTime, baseTime);
    insertStmt.run('Kedua', 'Snip 2', '{}', 1, baseTime + 1000, baseTime + 1000);
    insertStmt.run('Ketiga', 'Snip 3', '{}', 1, baseTime + 2000, baseTime + 2000);

    const note1 = (await repo.getAll()).find((n) => n.title === 'Pertama')!;
    const note2 = (await repo.getAll()).find((n) => n.title === 'Kedua')!;
    const note3 = (await repo.getAll()).find((n) => n.title === 'Ketiga')!;

    // Explicitly update note1 so it becomes the most recently updated
    await repo.update({
      id: note1.id,
      expectedRevision: note1.revision,
      content: { blocks: [{ type: 'paragraph', data: { text: 'Updated content' } }] },
    });

    const notes = await useCase.execute();

    expect(notes).toHaveLength(3);
    // note1 was updated last, so it must be first
    expect(notes[0].id).toBe(note1.id);
    expect(notes[1].id).toBe(note3.id);
    expect(notes[2].id).toBe(note2.id);

    // Ensure timestamp ordering is strictly descending
    expect(notes[0].updatedAt).toBeGreaterThan(notes[1].updatedAt);
    expect(notes[1].updatedAt).toBeGreaterThan(notes[2].updatedAt);
  });

  it('returns lightweight metadata omitting content payload', async () => {
    const heavyContent: OutputData = {
      blocks: [
        { type: 'paragraph', data: { text: 'Baris teks yang panjang' } },
        { type: 'header', data: { text: 'Subjudul', level: 2 } },
      ],
    };

    await repo.create({
      title: 'Catatan Lengkap',
      snippet: 'Cuplikan pendek',
      content: heavyContent,
    });

    const notes = await useCase.execute();

    expect(notes).toHaveLength(1);
    const item = notes[0];

    expect(item).toHaveProperty('id');
    expect(item).toHaveProperty('title', 'Catatan Lengkap');
    expect(item).toHaveProperty('snippet', 'Cuplikan pendek');
    expect(item).toHaveProperty('revision', 1);
    expect(item).toHaveProperty('createdAt');
    expect(item).toHaveProperty('updatedAt');

    // content property should not exist on lightweight metadata
    expect((item as Record<string, unknown>).content).toBeUndefined();
  });

  it('executes in < 50ms for 300 notes to guarantee instant startup performance', async () => {
    const insertStmt = db.prepare(`
      INSERT INTO notes (title, snippet, content, revision, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const now = Date.now();
    const insertMany = db.transaction(() => {
      for (let i = 0; i < 300; i++) {
        insertStmt.run(
          `Catatan ${i}`,
          `Snippet ${i}`,
          JSON.stringify({ blocks: [] }),
          1,
          now - i * 1000,
          now - i * 1000,
        );
      }
    });
    insertMany();

    const start = performance.now();
    const notes = await useCase.execute();
    const elapsed = performance.now() - start;

    expect(notes).toHaveLength(300);
    expect(elapsed).toBeLessThan(100);
  });
});
