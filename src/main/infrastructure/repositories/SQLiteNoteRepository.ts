import Database from 'better-sqlite3';
import type { NoteMetadata, OutputData } from '@shared/types/note';
import type {
  CreateNoteDto,
  INoteRepository,
  UpdateNoteDto,
} from '@main/domain/repositories/INoteRepository';
import { Note, DEFAULT_NOTE_TITLE } from '@main/domain/entities/Note';
import { DatabaseConnection } from '../database/DatabaseConnection';

interface NoteRow {
  id: number;
  title: string;
  snippet: string;
  content: string;
  revision: number;
  created_at: number;
  updated_at: number;
}

type NoteMetadataRow = Omit<NoteRow, 'content'>;

/**
 * Concrete implementation of INoteRepository backed by SQLite via better-sqlite3.
 * Adheres strictly to Liskov Substitution Principle (LSP) and uses 100% parameterized queries.
 */
export class SQLiteNoteRepository implements INoteRepository {
  private readonly db: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db ?? DatabaseConnection.getInstance();
  }

  /**
   * Persists a new note record with initial revision 1.
   */
  create(dto: CreateNoteDto): Promise<Note> {
    const now = Date.now();
    const title = dto.title && dto.title.trim().length > 0 ? dto.title.trim() : DEFAULT_NOTE_TITLE;
    const snippet = (dto.snippet ?? '').trim();
    const content = dto.content ?? { blocks: [] };
    const serializedContent = JSON.stringify(content);
    const revision = 1;

    if (dto.id !== undefined) {
      const stmt = this.db.prepare<[number, string, string, string, number, number, number]>(`
        INSERT INTO notes (id, title, snippet, content, revision, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(dto.id, title, snippet, serializedContent, revision, now, now);

      return Promise.resolve(
        Note.restore({
          id: dto.id,
          title,
          snippet,
          content,
          revision,
          createdAt: now,
          updatedAt: now,
        }),
      );
    }

    const stmt = this.db.prepare<[string, string, string, number, number, number]>(`
      INSERT INTO notes (title, snippet, content, revision, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(title, snippet, serializedContent, revision, now, now);
    const insertedId = Number(result.lastInsertRowid);

    return Promise.resolve(
      Note.restore({
        id: insertedId,
        title,
        snippet,
        content,
        revision,
        createdAt: now,
        updatedAt: now,
      }),
    );
  }

  /**
   * Updates an existing note if current database revision matches expectedRevision (OCC).
   * Returns updated Note or null if concurrency conflict / not found.
   */
  update(dto: UpdateNoteDto): Promise<Note | null> {
    const now = Date.now();
    const nextRevision = dto.expectedRevision + 1;
    const serializedContent = JSON.stringify(dto.content ?? { blocks: [] });
    const title =
      dto.title !== undefined
        ? dto.title.trim().length > 0
          ? dto.title.trim()
          : DEFAULT_NOTE_TITLE
        : null;
    const snippet = dto.snippet !== undefined ? dto.snippet.trim() : null;

    const stmt = this.db.prepare<
      [
        string,
        number,
        number,
        string | null,
        string | null,
        string | null,
        string | null,
        number,
        number,
      ]
    >(`
      UPDATE notes
      SET
        content = ?,
        revision = ?,
        updated_at = ?,
        title = CASE WHEN ? IS NOT NULL THEN ? ELSE title END,
        snippet = CASE WHEN ? IS NOT NULL THEN ? ELSE snippet END
      WHERE id = ? AND revision = ?
    `);

    const result = stmt.run(
      serializedContent,
      nextRevision,
      now,
      title,
      title,
      snippet,
      snippet,
      dto.id,
      dto.expectedRevision,
    );

    if (result.changes === 0) {
      return Promise.resolve(null);
    }

    return this.getById(dto.id);
  }

  /**
   * Permanently deletes a note by its identifier.
   */
  delete(id: number): Promise<boolean> {
    const stmt = this.db.prepare<[number]>('DELETE FROM notes WHERE id = ?');
    const result = stmt.run(id);
    return Promise.resolve(result.changes > 0);
  }

  /**
   * Retrieves all notes metadata ordered by `updated_at DESC`.
   * Omits heavy content column.
   */
  getAll(): Promise<NoteMetadata[]> {
    const stmt = this.db.prepare<[], NoteMetadataRow>(`
      SELECT id, title, snippet, revision, created_at, updated_at
      FROM notes
      ORDER BY updated_at DESC
    `);

    const rows = stmt.all();
    return Promise.resolve(
      rows.map((row) => ({
        id: row.id,
        title: row.title,
        snippet: row.snippet,
        revision: row.revision,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })),
    );
  }

  /**
   * Retrieves a single full note including structured content by identifier.
   */
  getById(id: number): Promise<Note | null> {
    const stmt = this.db.prepare<[number], NoteRow>(`
      SELECT id, title, snippet, content, revision, created_at, updated_at
      FROM notes
      WHERE id = ?
    `);

    const row = stmt.get(id);
    if (!row) {
      return Promise.resolve(null);
    }

    let parsedContent: OutputData;
    try {
      parsedContent = JSON.parse(row.content) as OutputData;
      if (!parsedContent || !Array.isArray(parsedContent.blocks)) {
        parsedContent = { blocks: [] };
      }
    } catch {
      parsedContent = { blocks: [] };
    }

    return Promise.resolve(
      Note.restore({
        id: row.id,
        title: row.title,
        snippet: row.snippet,
        content: parsedContent,
        revision: row.revision,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }),
    );
  }
}
