import type { Note, NoteMetadata, NoteMutationPayload, OutputData } from './note';
import type { Result } from './result';

/**
 * Payload parameters for creating a new note from the renderer.
 */
export interface CreateNoteInput {
  title?: string;
  snippet?: string;
  content?: OutputData;
}

/**
 * Payload parameters for updating an existing note with OCC guard.
 */
export interface UpdateNoteInput {
  id: number;
  expectedRevision: number;
  content: OutputData;
  title?: string;
  snippet?: string;
}

/**
 * Note-related operations exposed to the renderer process.
 */
export interface INotesAPI {
  getAll(): Promise<Result<NoteMetadata[]>>;
  getById(id: number): Promise<Result<Note>>;
  create(input?: CreateNoteInput): Promise<Result<Note>>;
  update(input: UpdateNoteInput): Promise<Result<Note>>;
  delete(id: number): Promise<Result<boolean>>;
  onBroadcastChanged(callback: (payload: NoteMutationPayload) => void): () => void;
  onCreateRequested?(callback: () => void): () => void;
  onDeleteRequested?(callback: (noteId: number) => void): () => void;
}

/**
 * Standard window controls for custom titlebar chrome.
 */
export interface IWindowControlsAPI {
  minimize(): void;
  maximize(): void;
  close(): void;
}

/**
 * Multi-window orchestration APIs.
 */
export interface IWindowsAPI {
  openChild(noteId: number): void;
}

/**
 * Native context menu actions.
 */
export interface IContextMenuAPI {
  showNote(noteId: number): void;
}

/**
 * Database backup triggers if exposed to the UI.
 */
export interface IBackupAPI {
  triggerBackup(): Promise<Result<string>>;
  create(): Promise<Result<string>>;
}

/**
 * System theme inspection and sync listener.
 */
export interface IThemeAPI {
  getSystemTheme(): Promise<'dark' | 'light'>;
  onThemeChanged(callback: (theme: 'dark' | 'light') => void): () => void;
}

/**
 * Aggregated contract interface exposed via preload contextBridge at `window.electronAPI`.
 * Adheres strictly to Interface Segregation Principle (ISP).
 */
export interface ElectronAPI {
  readonly notes: INotesAPI;
  readonly windowControls: IWindowControlsAPI;
  readonly windows: IWindowsAPI;
  readonly contextMenu: IContextMenuAPI;
  readonly backup: IBackupAPI;
  readonly theme: IThemeAPI;
  readonly platform?: string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
