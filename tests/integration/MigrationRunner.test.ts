import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { MigrationRunner } from '@main/infrastructure/database/migrations';

describe('MigrationRunner (Integration)', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  it('runs pending migration 001_create_notes_table and sets user_version to 1', () => {
    const initialVersion = db.pragma('user_version', { simple: true });
    expect(initialVersion).toBe(0);

    MigrationRunner.run(db);

    const versionAfterMigration = db.pragma('user_version', { simple: true });
    expect(versionAfterMigration).toBe(1);

    const tableInfo = db.prepare("PRAGMA table_info('notes')").all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
      pk: number;
    }>;

    const columnNames = tableInfo.map((col) => col.name);
    expect(columnNames).toEqual([
      'id',
      'title',
      'snippet',
      'content',
      'revision',
      'created_at',
      'updated_at',
    ]);

    const indexList = db.prepare("PRAGMA index_list('notes')").all() as Array<{
      seq: number;
      name: string;
      unique: number;
    }>;
    const hasUpdatedAtIndex = indexList.some((idx) => idx.name === 'idx_notes_updated_at');
    expect(hasUpdatedAtIndex).toBe(true);
  });

  it('is idempotent when run multiple times on the same database', () => {
    MigrationRunner.run(db);
    expect(db.pragma('user_version', { simple: true })).toBe(1);

    const now = Date.now();
    db.prepare(
      `INSERT INTO notes (title, snippet, content, revision, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run('Test Note', 'Snippet test', '{"blocks":[]}', 1, now, now);

    MigrationRunner.run(db);
    expect(db.pragma('user_version', { simple: true })).toBe(1);

    const row = db.prepare('SELECT * FROM notes WHERE title = ?').get('Test Note') as {
      id: number;
      title: string;
      snippet: string;
      content: string;
      revision: number;
    };
    expect(row).toBeDefined();
    expect(row.title).toBe('Test Note');
    expect(row.snippet).toBe('Snippet test');
  });

  it('applies correct column default values when inserting minimal fields', () => {
    MigrationRunner.run(db);

    const now = Date.now();
    const result = db
      .prepare(
        `INSERT INTO notes (content, created_at, updated_at)
         VALUES (?, ?, ?)`,
      )
      .run('{"blocks":[]}', now, now);

    const inserted = db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid) as {
      id: number;
      title: string;
      snippet: string;
      content: string;
      revision: number;
      created_at: number;
      updated_at: number;
    };

    expect(inserted.title).toBe('Catatan Tanpa Judul');
    expect(inserted.snippet).toBe('');
    expect(inserted.revision).toBe(1);
    expect(inserted.created_at).toBe(now);
    expect(inserted.updated_at).toBe(now);
  });

  it('does nothing if current user_version is already equal to or greater than available migrations', () => {
    db.pragma('user_version = 10');

    MigrationRunner.run(db);

    expect(db.pragma('user_version', { simple: true })).toBe(10);
    const tableExists = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='notes'")
      .get();
    expect(tableExists).toBeUndefined();
  });
});
