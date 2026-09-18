import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import path from 'path';
import fs from 'fs';
import os from 'os';
import Database from 'better-sqlite3';

let currentTestDir = '';

vi.mock('electron', () => ({
  app: {
    getPath: (name: string) => {
      if (name === 'userData') {
        return currentTestDir;
      }
      return currentTestDir;
    },
  },
}));

import { DatabaseConnection } from '@main/infrastructure/database/DatabaseConnection';
import { logger } from '@main/infrastructure/logger/logger';

describe('DatabaseConnection (Integration)', () => {
  beforeEach(() => {
    currentTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'db-connection-test-'));
    DatabaseConnection.close();
  });

  afterEach(() => {
    DatabaseConnection.close();
    if (currentTestDir && fs.existsSync(currentTestDir)) {
      try {
        fs.rmSync(currentTestDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup error
      }
    }
  });

  it('throws an error if getInstance() is called before initialize()', () => {
    expect(() => DatabaseConnection.getInstance()).toThrow('Database belum diinisialisasi.');
  });

  it('initializes database, applies PRAGMAs, runs migrations, and returns singleton instance', () => {
    const db = DatabaseConnection.initialize();
    expect(db).toBeDefined();
    expect(DatabaseConnection.getInstance()).toBe(db);

    const dbPath = path.join(currentTestDir, 'personal_notes.db');
    expect(fs.existsSync(dbPath)).toBe(true);

    const journalMode = db.pragma('journal_mode', { simple: true });
    expect(journalMode).toBe('wal');

    const synchronous = db.pragma('synchronous', { simple: true });
    // NORMAL synchronous mode in SQLite is 1
    expect(synchronous).toBe(1);

    const foreignKeys = db.pragma('foreign_keys', { simple: true });
    expect(foreignKeys).toBe(1);

    const busyTimeout = db.pragma('busy_timeout', { simple: true });
    expect(busyTimeout).toBe(5000);

    const userVersion = db.pragma('user_version', { simple: true });
    expect(userVersion).toBe(1);

    const table = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='notes'")
      .get();
    expect(table).toBeDefined();
  });

  it('closes connection and resets instance on close()', () => {
    const db = DatabaseConnection.initialize();
    expect(db.open).toBe(true);

    DatabaseConnection.close();
    expect(db.open).toBe(false);
    expect(() => DatabaseConnection.getInstance()).toThrow('Database belum diinisialisasi.');
  });

  it('automatically quarantines corrupt database files and recreates a fresh database', () => {
    const dbPath = path.join(currentTestDir, 'personal_notes.db');
    fs.writeFileSync(dbPath, 'Corrupted binary junk not a valid SQLite database header!!');

    const loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

    const db = DatabaseConnection.initialize();

    expect(loggerErrorSpy).toHaveBeenCalled();
    loggerErrorSpy.mockRestore();

    expect(db).toBeDefined();
    expect(db.open).toBe(true);

    const files = fs.readdirSync(currentTestDir);
    const corruptBackupFile = files.find(
      (f) => f.startsWith('personal_notes.corrupt.') && f.endsWith('.db'),
    );

    expect(corruptBackupFile).toBeDefined();
    const corruptContent = fs.readFileSync(path.join(currentTestDir, corruptBackupFile!), 'utf8');
    expect(corruptContent).toBe('Corrupted binary junk not a valid SQLite database header!!');

    const check = db.pragma('integrity_check', { simple: true });
    expect(check).toBe('ok');

    const table = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='notes'")
      .get();
    expect(table).toBeDefined();
  });

  it('recovers when database exists but fails integrity check', () => {
    const dbPath = path.join(currentTestDir, 'personal_notes.db');
    const initialDb = new Database(dbPath);
    initialDb.exec('CREATE TABLE test (id INT);');
    initialDb.close();

    // Damage SQLite file by overwriting bytes in the middle of the file
    const fileBuffer = fs.readFileSync(dbPath);
    for (let i = 100; i < Math.min(fileBuffer.length, 300); i++) {
      fileBuffer[i] = 0xff;
    }
    fs.writeFileSync(dbPath, fileBuffer);

    const loggerErrorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

    const db = DatabaseConnection.initialize();

    expect(loggerErrorSpy).toHaveBeenCalled();
    loggerErrorSpy.mockRestore();

    expect(db).toBeDefined();
    expect(db.open).toBe(true);

    const files = fs.readdirSync(currentTestDir);
    const corruptBackupFile = files.find(
      (f) => f.startsWith('personal_notes.corrupt.') && f.endsWith('.db'),
    );
    expect(corruptBackupFile).toBeDefined();

    const check = db.pragma('integrity_check', { simple: true });
    expect(check).toBe('ok');
  });
});
