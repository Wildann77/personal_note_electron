import { registerNoteHandlers, type NoteUseCases } from './handlers/noteHandlers';
import { registerWindowHandlers, type WindowHandlerDependencies } from './handlers/windowHandlers';
import { registerBackupHandlers, type BackupHandlerDependencies } from './handlers/backupHandlers';
import { registerUpdateHandlers, type UpdateHandlerDependencies } from './handlers/updateHandlers';

export interface IpcRegistryDependencies {
  noteUseCases?: Partial<NoteUseCases>;
  windowDependencies?: WindowHandlerDependencies;
  backupDependencies?: BackupHandlerDependencies;
  updateDependencies?: UpdateHandlerDependencies;
}

/**
 * Single registration entry point for all IPC handlers across the application (Architecture §14).
 * Call this function once during Electron app readiness to activate note, window, backup, and update IPC routes.
 *
 * @param dependencies Optional overrides for testing or modular bootstrapping.
 */
export function registerIpcHandlers(dependencies?: IpcRegistryDependencies): void {
  registerNoteHandlers(dependencies?.noteUseCases);
  registerWindowHandlers(dependencies?.windowDependencies);
  registerBackupHandlers(dependencies?.backupDependencies);
  registerUpdateHandlers(dependencies?.updateDependencies);
}

// Re-export specific registration functions and types for convenience
export { registerNoteHandlers, type NoteUseCases };
export { registerWindowHandlers, type WindowHandlerDependencies };
export { registerBackupHandlers, type BackupHandlerDependencies };
export { registerUpdateHandlers, type UpdateHandlerDependencies };
export * from './security/validateSender';
export * from './schemas/noteSchemas';
export * from './utils/createHandler';
