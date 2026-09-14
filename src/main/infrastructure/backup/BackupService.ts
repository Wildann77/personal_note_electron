import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import type Database from 'better-sqlite3';
import { DatabaseConnection } from '../database/DatabaseConnection';

/**
 * Service responsible for creating automated rolling snapshots of the SQLite database.
 * Utilizes SQLite Online Backup API (db.backup()) to ensure zero locking and maximum durability.
 * Maintains at most MAX_SNAPSHOTS (3) backup files.
 */
export class BackupService {
  public static readonly MAX_SNAPSHOTS = 3;

  /**
   * Creates a rolling snapshot of the database.
   * Rotates existing backups: backup-2 -> backup-3, backup-1 -> backup-2, then saves backup-1.
   *
   * @param database Optional database instance (defaults to DatabaseConnection.getInstance()).
   * @param customBackupDir Optional backup directory path (defaults to userData/backups).
   * @returns The absolute path to the latest backup file (notes.backup-1.db).
   */
  static async createRollingSnapshot(
    database?: Database.Database,
    customBackupDir?: string,
  ): Promise<string> {
    const db = database ?? DatabaseConnection.getInstance();
    const backupDir = customBackupDir ?? path.join(app.getPath('userData'), 'backups');

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Rotate older snapshots: index 2 -> 3, index 1 -> 2
    for (let i = this.MAX_SNAPSHOTS - 1; i >= 1; i--) {
      const source = path.join(backupDir, `notes.backup-${i}.db`);
      const dest = path.join(backupDir, `notes.backup-${i + 1}.db`);
      if (fs.existsSync(source)) {
        fs.copyFileSync(source, dest);
      }
    }

    const latestBackupPath = path.join(backupDir, 'notes.backup-1.db');
    await db.backup(latestBackupPath);

    // Clean up any extraneous backup files exceeding MAX_SNAPSHOTS
    const files = fs.readdirSync(backupDir);
    for (const file of files) {
      const match = file.match(/^notes\.backup-(\d+)\.db$/);
      if (match) {
        const index = parseInt(match[1], 10);
        if (index > this.MAX_SNAPSHOTS) {
          try {
            fs.unlinkSync(path.join(backupDir, file));
          } catch {
            // Ignore error during cleanup of excess snapshot
          }
        }
      }
    }

    console.log('[BackupService] Rolling snapshot berhasil disimpan:', latestBackupPath);
    return latestBackupPath;
  }
}
