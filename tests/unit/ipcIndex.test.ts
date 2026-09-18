import { describe, it, expect, vi } from 'vitest';
import * as noteHandlersModule from '@main/ipc/handlers/noteHandlers';
import * as windowHandlersModule from '@main/ipc/handlers/windowHandlers';
import * as backupHandlersModule from '@main/ipc/handlers/backupHandlers';
import * as updateHandlersModule from '@main/ipc/handlers/updateHandlers';
import { registerIpcHandlers } from '@main/ipc/index';

describe('registerIpcHandlers (Unit - [P6-T6], [P7-T1], Architecture §14)', () => {
  it('calls registerNoteHandlers, registerWindowHandlers, registerBackupHandlers, and registerUpdateHandlers with provided dependencies', () => {
    const spyNote = vi
      .spyOn(noteHandlersModule, 'registerNoteHandlers')
      .mockImplementation(() => {});
    const spyWindow = vi
      .spyOn(windowHandlersModule, 'registerWindowHandlers')
      .mockImplementation(() => {});
    const spyBackup = vi
      .spyOn(backupHandlersModule, 'registerBackupHandlers')
      .mockImplementation(() => {});
    const spyUpdate = vi
      .spyOn(updateHandlersModule, 'registerUpdateHandlers')
      .mockImplementation(() => {});

    const mockNoteUseCases = {} as unknown as noteHandlersModule.NoteUseCases;
    const mockWindowDeps = {} as unknown as windowHandlersModule.WindowHandlerDependencies;
    const mockBackupDeps = {} as unknown as backupHandlersModule.BackupHandlerDependencies;
    const mockUpdateDeps = {} as unknown as updateHandlersModule.UpdateHandlerDependencies;

    registerIpcHandlers({
      noteUseCases: mockNoteUseCases,
      windowDependencies: mockWindowDeps,
      backupDependencies: mockBackupDeps,
      updateDependencies: mockUpdateDeps,
    });

    expect(spyNote).toHaveBeenCalledWith(mockNoteUseCases);
    expect(spyWindow).toHaveBeenCalledWith(mockWindowDeps);
    expect(spyBackup).toHaveBeenCalledWith(mockBackupDeps);
    expect(spyUpdate).toHaveBeenCalledWith(mockUpdateDeps);
  });
});
