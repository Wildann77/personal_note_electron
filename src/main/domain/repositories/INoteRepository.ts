import type { NoteMetadata, OutputData } from '@shared/types/note';
import type { Note } from '../entities/Note';

/**
 * Parameters for creating a new note record in persistence storage.
 */
export interface CreateNoteDto {
  id?: number;
  title?: string;
  snippet?: string;
  content?: OutputData;
}

/**
 * Parameters for updating a note record with Optimistic Concurrency Control (OCC).
 */
export interface UpdateNoteDto {
  id: number;
  expectedRevision: number;
  content: OutputData;
  title?: string;
  snippet?: string;
}

/**
 * Abstract repository interface for note persistence operations.
 * Enforces Dependency Inversion Principle (DIP): use cases depend on this contract,
 * allowing interchangeable SQLite, in-memory, or mock implementations.
 */
export interface INoteRepository {
  /**
   * Persists a new note record with initial revision 1.
   *
   * @param dto Initial note data.
   * @returns The created domain Note entity with its assigned ID and revision.
   */
  create(dto: CreateNoteDto): Promise<Note>;

  /**
   * Updates an existing note if the current database revision matches expectedRevision.
   *
   * @param dto Update parameters including expected revision.
   * @returns Updated domain Note entity if revision matched and updated; null on OCC conflict or not found.
   */
  update(dto: UpdateNoteDto): Promise<Note | null>;

  /**
   * Permanently deletes a note by its identifier.
   *
   * @param id The note unique identifier.
   * @returns True if a record was deleted, false if not found.
   */
  delete(id: number): Promise<boolean>;

  /**
   * Retrieves all notes metadata ordered by `updated_at DESC`.
   * Omits heavy content payload for fast sidebar indexing and rendering.
   *
   * @returns Array of lightweight note metadata.
   */
  getAll(): Promise<NoteMetadata[]>;

  /**
   * Retrieves a single full note including structured content by identifier.
   *
   * @param id The note unique identifier.
   * @returns The domain Note entity if found, or null if it does not exist.
   */
  getById(id: number): Promise<Note | null>;
}
