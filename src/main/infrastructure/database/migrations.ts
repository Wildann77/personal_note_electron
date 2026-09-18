import Database from 'better-sqlite3';
import { logger } from '../logger/logger';

export interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: '001_create_notes_table',
    up: (db) => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL DEFAULT 'Catatan Tanpa Judul',
          snippet TEXT NOT NULL DEFAULT '',
          content TEXT NOT NULL,
          revision INTEGER NOT NULL DEFAULT 1,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
      `);
    },
  },
];

export class MigrationRunner {
  static run(db: Database.Database): void {
    const currentVersion = db.pragma('user_version', { simple: true }) as number;

    const pendingMigrations = MIGRATIONS.filter((m) => m.version > currentVersion).sort(
      (a, b) => a.version - b.version,
    );

    if (pendingMigrations.length === 0) return;

    for (const migration of pendingMigrations) {
      logger.info(
        `[MigrationRunner] Menjalankan migrasi database v${migration.version}: ${migration.name}`,
      );

      const executeTransaction = db.transaction(() => {
        migration.up(db);
        db.pragma(`user_version = ${migration.version}`);
      });

      executeTransaction();
    }
  }
}
