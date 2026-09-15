import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '@shared/constants/ipc';
import type { Note, NoteMetadata } from '@shared/types/note';
import { createProtectedHandler } from '@main/ipc/utils/createHandler';
import {
  createNoteSchema,
  updateNoteSchema,
  deleteNoteSchema,
  emptySchema,
  getNoteByIdSchema,
  type CreateNotePayload,
  type UpdateNotePayload,
  type DeleteNotePayload,
  type GetNoteByIdPayload,
} from '@main/ipc/schemas/noteSchemas';
import { CreateNoteUseCase } from '@main/application/notes/CreateNoteUseCase';
import { UpdateNoteUseCase } from '@main/application/notes/UpdateNoteUseCase';
import { DeleteNoteUseCase } from '@main/application/notes/DeleteNoteUseCase';
import { GetNotesUseCase } from '@main/application/notes/GetNotesUseCase';
import { GetNoteByIdUseCase } from '@main/application/notes/GetNoteByIdUseCase';
import { SQLiteNoteRepository } from '@main/infrastructure/repositories/SQLiteNoteRepository';
import { ElectronEventHub } from '@main/infrastructure/events/ElectronEventHub';

export interface NoteUseCases {
  createNoteUseCase: CreateNoteUseCase;
  updateNoteUseCase: UpdateNoteUseCase;
  deleteNoteUseCase: DeleteNoteUseCase;
  getNotesUseCase: GetNotesUseCase;
  getNoteByIdUseCase: GetNoteByIdUseCase;
}

/**
 * Creates default instances of note use cases backed by SQLiteNoteRepository and ElectronEventHub.
 */
export function createDefaultNoteUseCases(): NoteUseCases {
  const noteRepository = new SQLiteNoteRepository();
  const eventHub = new ElectronEventHub();

  return {
    createNoteUseCase: new CreateNoteUseCase(noteRepository, eventHub),
    updateNoteUseCase: new UpdateNoteUseCase(noteRepository, eventHub),
    deleteNoteUseCase: new DeleteNoteUseCase(noteRepository, eventHub),
    getNotesUseCase: new GetNotesUseCase(noteRepository),
    getNoteByIdUseCase: new GetNoteByIdUseCase(noteRepository),
  };
}

/**
 * Registers protected ipcMain handlers for all note-related operations.
 * Maps 1:1 to application use cases without leaking business logic into presentation layer.
 * All handlers return Result<T, AppErrorPayload> (Architecture §5.2, §14, §17).
 *
 * @param customUseCases Optional partial use case overrides for testing or specialized orchestration.
 */
export function registerNoteHandlers(customUseCases?: Partial<NoteUseCases>): void {
  let defaultUseCases: NoteUseCases | undefined;
  const getDefaults = (): NoteUseCases => {
    if (!defaultUseCases) {
      defaultUseCases = createDefaultNoteUseCases();
    }
    return defaultUseCases;
  };

  const useCases: NoteUseCases = {
    createNoteUseCase: customUseCases?.createNoteUseCase ?? getDefaults().createNoteUseCase,
    updateNoteUseCase: customUseCases?.updateNoteUseCase ?? getDefaults().updateNoteUseCase,
    deleteNoteUseCase: customUseCases?.deleteNoteUseCase ?? getDefaults().deleteNoteUseCase,
    getNotesUseCase: customUseCases?.getNotesUseCase ?? getDefaults().getNotesUseCase,
    getNoteByIdUseCase: customUseCases?.getNoteByIdUseCase ?? getDefaults().getNoteByIdUseCase,
  };

  // 1. notes:create
  ipcMain.removeHandler(IPC_CHANNELS.NOTES_CREATE);
  ipcMain.handle(
    IPC_CHANNELS.NOTES_CREATE,
    createProtectedHandler<CreateNotePayload, Note>(
      createNoteSchema,
      async (input: CreateNotePayload) => {
        const note = await useCases.createNoteUseCase.execute(input);
        return note.toPlainObject();
      },
    ),
  );

  // 2. notes:update
  ipcMain.removeHandler(IPC_CHANNELS.NOTES_UPDATE);
  ipcMain.handle(
    IPC_CHANNELS.NOTES_UPDATE,
    createProtectedHandler<UpdateNotePayload, Note>(
      updateNoteSchema,
      async (input: UpdateNotePayload) => {
        const updated = await useCases.updateNoteUseCase.execute(input);
        return updated.toPlainObject();
      },
    ),
  );

  // 3. notes:delete
  ipcMain.removeHandler(IPC_CHANNELS.NOTES_DELETE);
  ipcMain.handle(
    IPC_CHANNELS.NOTES_DELETE,
    createProtectedHandler<DeleteNotePayload, boolean>(
      deleteNoteSchema,
      async (input: DeleteNotePayload) => {
        return useCases.deleteNoteUseCase.execute(input.id);
      },
    ),
  );

  // 4. notes:getAll
  ipcMain.removeHandler(IPC_CHANNELS.NOTES_GET_ALL);
  ipcMain.handle(
    IPC_CHANNELS.NOTES_GET_ALL,
    createProtectedHandler<void, NoteMetadata[]>(emptySchema, async () => {
      return useCases.getNotesUseCase.execute();
    }),
  );

  // 5. notes:getById
  ipcMain.removeHandler(IPC_CHANNELS.NOTES_GET_BY_ID);
  ipcMain.handle(
    IPC_CHANNELS.NOTES_GET_BY_ID,
    createProtectedHandler<GetNoteByIdPayload, Note>(
      getNoteByIdSchema,
      async (input: GetNoteByIdPayload) => {
        const note = await useCases.getNoteByIdUseCase.execute(input.id);
        return note.toPlainObject();
      },
    ),
  );
}
