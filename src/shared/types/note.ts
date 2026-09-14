/**
 * Editor.js Output Block Data interface.
 * Represents a single block in the Editor.js document structure.
 */
export interface OutputBlockData<
  Type extends string = string,
  Data extends object = Record<string, unknown>,
> {
  id?: string;
  type: Type;
  data: Data;
  tunes?: Record<string, unknown>;
}

/**
 * Editor.js Output Data interface.
 * Clean, pure TypeScript representation of Editor.js saved data.
 */
export interface OutputData {
  time?: number;
  blocks: OutputBlockData[];
  version?: string;
}

/**
 * Full domain entity representing a personal note.
 */
export interface Note {
  id: number;
  title: string;
  snippet: string;
  content: OutputData;
  revision: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Lightweight note metadata without the heavy content payload,
 * used for list rendering and sidebar grouping.
 */
export type NoteMetadata = Omit<Note, 'content'>;

/**
 * Grouped notes divided by calendar time sections.
 */
export interface GroupedNotes {
  today: NoteMetadata[];
  yesterday: NoteMetadata[];
  previous: NoteMetadata[];
}

/**
 * Mutation operation types broadcasted across windows.
 */
export type NoteMutationType = 'create' | 'update' | 'delete';

/**
 * Payload broadcasted when a note is created, updated, or deleted.
 */
export interface NoteMutationPayload {
  type: NoteMutationType;
  noteId: number;
  note?: Note;
}
