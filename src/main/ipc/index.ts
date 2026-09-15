import { registerNoteHandlers, type NoteUseCases } from './handlers/noteHandlers';
import { registerWindowHandlers, type WindowHandlerDependencies } from './handlers/windowHandlers';
import { registerBackupHandlers, type BackupHandlerDependencies } from './handlers/backupHandlers';

export interface IpcRegistryDependencies {
  noteUseCases?: Partial<NoteUseCases>;
  windowDependencies?: WindowHandlerDependencies;
  backupDependencies?: BackupHandlerDependencies;
}

/**
 * Single registration entry point for all IPC handlers across the application (Architecture §14).
 * Call this function once during Electron app readiness to activate note, window, and backup IPC routes.
 *
 * @param dependencies Optional overrides for testing or modular bootstrapping.
 */
export function registerIpcHandlers(dependencies?: IpcRegistryDependencies): void {
  registerNoteHandlers(dependencies?.noteUseCases);
  registerWindowHandlers(dependencies?.windowDependencies);
  registerBackupHandlers(dependencies?.backupDependencies);
}

// Re-export specific registration functions and types for convenience
export { registerNoteHandlers, type NoteUseCases };
export { registerWindowHandlers, type WindowHandlerDependencies };
export { registerBackupHandlers, type BackupHandlerDependencies };
export * from './security/validateSender';
export * from './schemas/noteSchemas';
export * from './utils/createHandler';
