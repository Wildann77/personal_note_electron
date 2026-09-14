import type { NoteMutationPayload } from '@shared/types/note';

/**
 * Pure domain abstraction for broadcasting note mutations across application windows.
 * Decoupled from Electron BrowserWindow and webContents.
 */
export interface IEventHub {
  /**
   * Broadcasts a note mutation event (create, update, delete) to all listening windows.
   *
   * @param payload Mutation details including type, noteId, and optional updated Note data.
   */
  broadcastNoteMutation(payload: NoteMutationPayload): void;
}
