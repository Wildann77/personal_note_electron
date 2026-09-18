import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { MigrationRunner } from './migrations';
import { logger } from '../logger/logger';

export class DatabaseConnection {
  private static instance: Database.Database | null = null;

  static initialize(): Database.Database {
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    const dbPath = path.join(userDataPath, 'personal_notes.db');
    logger.info('[DatabaseConnection] Initializing SQLite database at:', dbPath);
    let db: Database.Database;

    try {
      db = new Database(dbPath);
      const check = db.pragma('integrity_check', { simple: true });
      if (check !== 'ok') {
        throw new Error(`Database corrupted: ${String(check)}`);
      }
    } catch (err) {
      logger.error(
        '[DatabaseConnection] CRITICAL: Database SQLite terkorupsi atau gagal dibuka. Melakukan isolasi...',
        err,
      );
      try {
        if (db! && typeof db.close === 'function') {
          db.close();
        }
      } catch {
        // ignore close error on corrupt handle
      }

      const corruptPath = path.join(userDataPath, `personal_notes.corrupt.${Date.now()}.db`);
      if (fs.existsSync(dbPath)) {
        fs.renameSync(dbPath, corruptPath);
      }
      db = new Database(dbPath);
    }

    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');

    MigrationRunner.run(db);

    this.instance = db;
    logger.info('[DatabaseConnection] SQLite connection active with WAL mode');
    return db;
  }

  static getInstance(): Database.Database {
    if (!this.instance) {
      throw new Error('Database belum diinisialisasi.');
    }
    return this.instance;
  }

  static close(): void {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
      logger.info('[DatabaseConnection] SQLite connection closed');
    }
  }
}
