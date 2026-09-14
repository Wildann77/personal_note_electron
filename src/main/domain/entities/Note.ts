import type { Note as NoteData, OutputData } from '@shared/types/note';
import { ValidationError } from '../errors/AppError';

export const DEFAULT_NOTE_TITLE = 'Catatan Tanpa Judul';

export interface CreateNoteParams {
  id?: number;
  title?: string;
  snippet?: string;
  content?: OutputData;
}

export interface RestoreNoteParams {
  id: number;
  title: string;
  snippet: string;
  content: OutputData;
  revision: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Pure domain entity representing a personal note with strict business invariants.
 * Enforces optimistic concurrency control (non-negative revision), title fallback,
 * and valid timestamps without any dependency on Electron, SQLite, or React.
 */
export class Note {
  private _id: number;
  private _title: string;
  private _snippet: string;
  private _content: OutputData;
  private _revision: number;
  private readonly _createdAt: number;
  private _updatedAt: number;

  private constructor(props: RestoreNoteParams) {
    this.validateId(props.id);
    this.validateRevision(props.revision);
    this.validateTimestamps(props.createdAt, props.updatedAt);

    this._id = props.id;
    this._title = this.normalizeTitle(props.title);
    this._snippet = (props.snippet ?? '').trim();
    this._content = this.normalizeContent(props.content);
    this._revision = props.revision;
    this._createdAt = props.createdAt;
    this._updatedAt = props.updatedAt;
  }

  /**
   * Factory method to create a new Note instance with default initial state.
   */
  public static create(params: CreateNoteParams = {}): Note {
    const now = Date.now();
    return new Note({
      id: params.id ?? 0,
      title: params.title ?? DEFAULT_NOTE_TITLE,
      snippet: params.snippet ?? '',
      content: params.content ?? { blocks: [] },
      revision: 0,
      createdAt: now,
      updatedAt: now,
    });
  }

  /**
   * Factory method to restore a Note from persistence storage or database row.
   */
  public static restore(props: RestoreNoteParams): Note {
    return new Note(props);
  }

  // --- Getters ---

  public get id(): number {
    return this._id;
  }

  public get title(): string {
    return this._title;
  }

  public get snippet(): string {
    return this._snippet;
  }

  public get content(): OutputData {
    return this._content;
  }

  public get revision(): number {
    return this._revision;
  }

  public get createdAt(): number {
    return this._createdAt;
  }

  public get updatedAt(): number {
    return this._updatedAt;
  }

  // --- Business Mutations ---

  /**
   * Updates note content, increments revision, and updates title/snippet if provided.
   */
  public updateContent(content: OutputData, title?: string, snippet?: string): void {
    this._content = this.normalizeContent(content);
    if (title !== undefined) {
      this._title = this.normalizeTitle(title);
    }
    if (snippet !== undefined) {
      this._snippet = snippet.trim();
    }
    this._revision += 1;
    this._updatedAt = Date.now();
  }

  /**
   * Increments revision by 1 and updates the updatedAt timestamp.
   */
  public incrementRevision(): void {
    this._revision += 1;
    this._updatedAt = Date.now();
  }

  /**
   * Sets the note title with trimming and fallback to default title.
   */
  public setTitle(title: string): void {
    this._title = this.normalizeTitle(title);
    this._updatedAt = Date.now();
  }

  /**
   * Sets the snippet text.
   */
  public setSnippet(snippet: string): void {
    this._snippet = snippet.trim();
    this._updatedAt = Date.now();
  }

  /**
   * Assigns a newly generated persistence ID.
   */
  public assignId(id: number): void {
    this.validateId(id);
    this._id = id;
  }

  /**
   * Serializes the entity to a plain Note object matching the shared interface.
   */
  public toPlainObject(): NoteData {
    return {
      id: this._id,
      title: this._title,
      snippet: this._snippet,
      content: JSON.parse(JSON.stringify(this._content)) as OutputData,
      revision: this._revision,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  public toJSON(): NoteData {
    return this.toPlainObject();
  }

  // --- Invariant Validations ---

  private validateId(id: number): void {
    if (!Number.isInteger(id) || id < 0) {
      throw new ValidationError(
        `ID catatan harus berupa bilangan bulat non-negatif, diterima: ${id}`,
      );
    }
  }

  private validateRevision(revision: number): void {
    if (!Number.isInteger(revision) || revision < 0) {
      throw new ValidationError(
        `Revisi catatan tidak boleh negatif atau non-integer, diterima: ${revision}`,
      );
    }
  }

  private validateTimestamps(createdAt: number, updatedAt: number): void {
    if (!Number.isInteger(createdAt) || createdAt <= 0) {
      throw new ValidationError(`createdAt harus berupa timestamp positif, diterima: ${createdAt}`);
    }
    if (!Number.isInteger(updatedAt) || updatedAt < createdAt) {
      throw new ValidationError(
        `updatedAt (${updatedAt}) tidak boleh lebih lampau dari createdAt (${createdAt})`,
      );
    }
  }

  private normalizeTitle(title?: string | null): string {
    if (!title || typeof title !== 'string') {
      return DEFAULT_NOTE_TITLE;
    }
    const trimmed = title.trim();
    return trimmed.length > 0 ? trimmed : DEFAULT_NOTE_TITLE;
  }

  private normalizeContent(content?: OutputData | null): OutputData {
    if (!content || !Array.isArray(content.blocks)) {
      return { blocks: [] };
    }
    return content;
  }
}
