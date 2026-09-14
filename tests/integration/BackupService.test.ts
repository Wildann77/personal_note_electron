import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import Database from 'better-sqlite3';
import { MigrationRunner } from '@main/infrastructure/database/migrations';
import { DatabaseConnection } from '@main/infrastructure/database/DatabaseConnection';

let testRootDir = '';

vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      if (name === 'userData') {
        return testRootDir;
      }
      return testRootDir;
    },
  },
}));

import { BackupService } from '@main/infrastructure/backup/BackupService';

describe('BackupService (Integration)', () => {
  let db: Database.Database;

  beforeEach(() => {
    testRootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-service-test-'));
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    MigrationRunner.run(db);
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
    DatabaseConnection.close();
    if (testRootDir && fs.existsSync(testRootDir)) {
      try {
        fs.rmSync(testRootDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup error
      }
    }
  });

  it('creates backup directory and first snapshot notes.backup-1.db', async () => {
    const backupDir = path.join(testRootDir, 'backups');
    expect(fs.existsSync(backupDir)).toBe(false);

    const backupPath = await BackupService.createRollingSnapshot(db, backupDir);

    expect(fs.existsSync(backupDir)).toBe(true);
    expect(backupPath).toBe(path.join(backupDir, 'notes.backup-1.db'));
    expect(fs.existsSync(backupPath)).toBe(true);

    const files = fs.readdirSync(backupDir);
    expect(files).toEqual(['notes.backup-1.db']);
  });

  it('correctly rotates snapshots across multiple invocations without exceeding 3 files', async () => {
    const backupDir = path.join(testRootDir, 'backups');

    // Populate distinct records in db for each snapshot
    db.prepare(
      'INSERT INTO notes (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)',
    ).run('Note V1', JSON.stringify({ blocks: [] }), 100, 100);
    await BackupService.createRollingSnapshot(db, backupDir);

    let files = fs.readdirSync(backupDir).sort();
    expect(files).toEqual(['notes.backup-1.db']);

    // Snapshot 2
    db.prepare(
      'INSERT INTO notes (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)',
    ).run('Note V2', JSON.stringify({ blocks: [] }), 200, 200);
    await BackupService.createRollingSnapshot(db, backupDir);

    files = fs.readdirSync(backupDir).sort();
    expect(files).toEqual(['notes.backup-1.db', 'notes.backup-2.db']);

    // Snapshot 3
    db.prepare(
      'INSERT INTO notes (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)',
    ).run('Note V3', JSON.stringify({ blocks: [] }), 300, 300);
    await BackupService.createRollingSnapshot(db, backupDir);

    files = fs.readdirSync(backupDir).sort();
    expect(files).toEqual(['notes.backup-1.db', 'notes.backup-2.db', 'notes.backup-3.db']);

    // Snapshot 4: must stay at max 3 files (backup-3 replaced by backup-2, backup-2 by backup-1, backup-1 gets new)
    db.prepare(
      'INSERT INTO notes (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)',
    ).run('Note V4', JSON.stringify({ blocks: [] }), 400, 400);
    await BackupService.createRollingSnapshot(db, backupDir);

    files = fs.readdirSync(backupDir).sort();
    expect(files).toEqual(['notes.backup-1.db', 'notes.backup-2.db', 'notes.backup-3.db']);
    expect(files.length).toBe(3);

    // Verify content of the oldest snapshot (backup-3) contains Note V2, and latest (backup-1) contains Note V4
    const backup1Db = new Database(path.join(backupDir, 'notes.backup-1.db'));
    const rows1 = backup1Db.prepare('SELECT title FROM notes').all() as { title: string }[];
    backup1Db.close();
    expect(rows1.map((r) => r.title)).toContain('Note V4');

    const backup3Db = new Database(path.join(backupDir, 'notes.backup-3.db'));
    const rows3 = backup3Db.prepare('SELECT title FROM notes').all() as { title: string }[];
    backup3Db.close();
    expect(rows3.map((r) => r.title)).toContain('Note V2');
    expect(rows3.map((r) => r.title)).not.toContain('Note V3');
    expect(rows3.map((r) => r.title)).not.toContain('Note V4');
  });

  it('prunes extraneous backup files exceeding MAX_SNAPSHOTS if present', async () => {
    const backupDir = path.join(testRootDir, 'backups');
    fs.mkdirSync(backupDir, { recursive: true });

    // Artificially create excess files
    fs.writeFileSync(path.join(backupDir, 'notes.backup-4.db'), 'dummy');
    fs.writeFileSync(path.join(backupDir, 'notes.backup-5.db'), 'dummy');

    await BackupService.createRollingSnapshot(db, backupDir);

    const files = fs.readdirSync(backupDir).sort();
    expect(files).toContain('notes.backup-1.db');
    expect(files).not.toContain('notes.backup-4.db');
    expect(files).not.toContain('notes.backup-5.db');
    expect(files.length).toBeLessThanOrEqual(BackupService.MAX_SNAPSHOTS);
  });

  it('preserves database integrity and allows non-blocking concurrent operations during backup', async () => {
    const backupDir = path.join(testRootDir, 'backups');

    for (let i = 0; i < 50; i++) {
      db.prepare(
        'INSERT INTO notes (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)',
      ).run(
        `Note ${i}`,
        JSON.stringify({ blocks: [{ type: 'paragraph', data: { text: `Text ${i}` } }] }),
        Date.now(),
        Date.now(),
      );
    }

    // Launch backup promise
    const backupPromise = BackupService.createRollingSnapshot(db, backupDir);

    // Concurrently perform insert on main database while backup completes
    db.prepare(
      'INSERT INTO notes (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)',
    ).run('Concurrent Note', JSON.stringify({ blocks: [] }), Date.now(), Date.now());

    const backupPath = await backupPromise;
    expect(fs.existsSync(backupPath)).toBe(true);

    // Verify snapshot can be read as a valid SQLite database with PRAGMA integrity_check
    const snapshotDb = new Database(backupPath);
    const integrity = snapshotDb.pragma('integrity_check', { simple: true });
    expect(integrity).toBe('ok');

    const totalNotes = snapshotDb.prepare('SELECT COUNT(*) as count FROM notes').get() as {
      count: number;
    };
    expect(totalNotes.count).toBeGreaterThanOrEqual(50);
    snapshotDb.close();
  });

  it('uses default DatabaseConnection and default app userData path when arguments omitted', async () => {
    const initDb = DatabaseConnection.initialize();
    initDb
      .prepare('INSERT INTO notes (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)')
      .run('Default Connection Note', JSON.stringify({ blocks: [] }), Date.now(), Date.now());

    const backupPath = await BackupService.createRollingSnapshot();

    const expectedDir = path.join(testRootDir, 'backups');
    expect(backupPath).toBe(path.join(expectedDir, 'notes.backup-1.db'));
    expect(fs.existsSync(backupPath)).toBe(true);

    const snapshotDb = new Database(backupPath);
    const note = snapshotDb
      .prepare('SELECT title FROM notes WHERE title = ?')
      .get('Default Connection Note');
    expect(note).toBeDefined();
    snapshotDb.close();
  });
});
