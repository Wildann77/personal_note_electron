import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { IpcMainInvokeEvent } from 'electron';
import Database from 'better-sqlite3';
import { IPC_CHANNELS } from '@shared/constants/ipc';
import { Note } from '@main/domain/entities/Note';
import { AppError } from '@main/domain/errors/AppError';
import { WindowManager } from '@main/infrastructure/windows/WindowManager';
import { DatabaseConnection } from '@main/infrastructure/database/DatabaseConnection';

const { mockHandle, mockRemoveHandler } = vi.hoisted(() => ({
  mockHandle: vi.fn(),
  mockRemoveHandler: vi.fn(),
}));

vi.mock('electron', () => ({
  ipcMain: {
    handle: mockHandle,
    removeHandler: mockRemoveHandler,
  },
}));

import {
  registerNoteHandlers,
  createDefaultNoteUseCases,
  type NoteUseCases,
} from '@main/ipc/handlers/noteHandlers';

describe('noteHandlers (Unit - [P6-T4], Architecture §5.2, §14, §17)', () => {
  const handlersMap = new Map<
    string,
    (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<unknown>
  >();

  const validEvent = {
    sender: { id: 101 },
  } as unknown as IpcMainInvokeEvent;

  let createSpy: ReturnType<typeof vi.fn>;
  let updateSpy: ReturnType<typeof vi.fn>;
  let deleteSpy: ReturnType<typeof vi.fn>;
  let getAllSpy: ReturnType<typeof vi.fn>;
  let getByIdSpy: ReturnType<typeof vi.fn>;
  let mockUseCases: NoteUseCases;

  beforeEach(() => {
    vi.restoreAllMocks();
    handlersMap.clear();

    vi.spyOn(WindowManager, 'isValidWebContents').mockReturnValue(true);

    mockRemoveHandler.mockImplementation(() => {});
    mockHandle.mockImplementation(
      (
        channel: string,
        handler: (event: IpcMainInvokeEvent, ...args: unknown[]) => Promise<unknown>,
      ) => {
        handlersMap.set(channel, handler);
      },
    );

    createSpy = vi.fn();
    updateSpy = vi.fn();
    deleteSpy = vi.fn();
    getAllSpy = vi.fn();
    getByIdSpy = vi.fn();

    mockUseCases = {
      createNoteUseCase: { execute: createSpy } as unknown as NoteUseCases['createNoteUseCase'],
      updateNoteUseCase: { execute: updateSpy } as unknown as NoteUseCases['updateNoteUseCase'],
      deleteNoteUseCase: { execute: deleteSpy } as unknown as NoteUseCases['deleteNoteUseCase'],
      getNotesUseCase: { execute: getAllSpy } as unknown as NoteUseCases['getNotesUseCase'],
      getNoteByIdUseCase: { execute: getByIdSpy } as unknown as NoteUseCases['getNoteByIdUseCase'],
    };
  });

  it('registers all 5 note channels with ipcMain.handle', () => {
    registerNoteHandlers(mockUseCases);

    expect(handlersMap.has(IPC_CHANNELS.NOTES_CREATE)).toBe(true);
    expect(handlersMap.has(IPC_CHANNELS.NOTES_UPDATE)).toBe(true);
    expect(handlersMap.has(IPC_CHANNELS.NOTES_DELETE)).toBe(true);
    expect(handlersMap.has(IPC_CHANNELS.NOTES_GET_ALL)).toBe(true);
    expect(handlersMap.has(IPC_CHANNELS.NOTES_GET_BY_ID)).toBe(true);
  });

  describe('notes:create handler', () => {
    it('executes createNoteUseCase and returns plain Note object', async () => {
      const noteEntity = Note.restore({
        id: 1,
        title: 'Catatan Baru',
        snippet: 'Cuplikan',
        content: { blocks: [] },
        revision: 1,
        createdAt: 1000,
        updatedAt: 1000,
      });

      createSpy.mockResolvedValue(noteEntity);

      registerNoteHandlers(mockUseCases);
      const handler = handlersMap.get(IPC_CHANNELS.NOTES_CREATE)!;

      const payload = { title: 'Catatan Baru' };
      const result = (await handler(validEvent, payload)) as {
        success: boolean;
        data?: unknown;
      };

      expect(result.success).toBe(true);
      expect(result.data).toEqual(noteEntity.toPlainObject());
      expect(createSpy).toHaveBeenCalledWith(payload);
    });
  });

  describe('notes:update handler', () => {
    it('executes updateNoteUseCase and returns plain Note object', async () => {
      const updatedEntity = Note.restore({
        id: 1,
        title: 'Judul Baru',
        snippet: 'Snippet Baru',
        content: { blocks: [{ type: 'paragraph', data: { text: 'Hello' } }] },
        revision: 2,
        createdAt: 1000,
        updatedAt: 2000,
      });

      updateSpy.mockResolvedValue(updatedEntity);

      registerNoteHandlers(mockUseCases);
      const handler = handlersMap.get(IPC_CHANNELS.NOTES_UPDATE)!;

      const payload = {
        id: 1,
        expectedRevision: 1,
        content: { blocks: [{ type: 'paragraph', data: { text: 'Hello' } }] },
      };

      const result = (await handler(validEvent, payload)) as {
        success: boolean;
        data?: unknown;
      };

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedEntity.toPlainObject());
      expect(updateSpy).toHaveBeenCalledWith(payload);
    });

    it('returns CONCURRENCY_ERROR result when OCC fails in use case', async () => {
      updateSpy.mockRejectedValue(
        AppError.concurrency('Konflik versi', { currentRevision: 3, expectedRevision: 1 }),
      );

      registerNoteHandlers(mockUseCases);
      const handler = handlersMap.get(IPC_CHANNELS.NOTES_UPDATE)!;

      const payload = {
        id: 1,
        expectedRevision: 1,
        content: { blocks: [] },
      };

      const result = (await handler(validEvent, payload)) as {
        success: boolean;
        error?: { code: string; message: string; details?: unknown };
      };

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('CONCURRENCY_ERROR');
      expect(result.error?.details).toEqual({ currentRevision: 3, expectedRevision: 1 });
    });
  });

  describe('notes:delete handler', () => {
    it('executes deleteNoteUseCase and returns boolean result', async () => {
      deleteSpy.mockResolvedValue(true);

      registerNoteHandlers(mockUseCases);
      const handler = handlersMap.get(IPC_CHANNELS.NOTES_DELETE)!;

      const result = (await handler(validEvent, { id: 10 })) as {
        success: boolean;
        data?: unknown;
      };

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(deleteSpy).toHaveBeenCalledWith(10);
    });
  });

  describe('notes:getAll handler', () => {
    it('executes getNotesUseCase and returns metadata array', async () => {
      const mockList = [
        {
          id: 1,
          title: 'Catatan 1',
          snippet: 'Halo',
          revision: 1,
          createdAt: 1000,
          updatedAt: 1000,
        },
      ];

      getAllSpy.mockResolvedValue(mockList);

      registerNoteHandlers(mockUseCases);
      const handler = handlersMap.get(IPC_CHANNELS.NOTES_GET_ALL)!;

      const result = (await handler(validEvent)) as {
        success: boolean;
        data?: unknown;
      };

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockList);
      expect(getAllSpy).toHaveBeenCalled();
    });
  });

  describe('notes:getById handler', () => {
    it('executes getNoteByIdUseCase and returns plain Note', async () => {
      const noteEntity = Note.restore({
        id: 5,
        title: 'Catatan 5',
        snippet: 'Snippet 5',
        content: { blocks: [] },
        revision: 1,
        createdAt: 1000,
        updatedAt: 1000,
      });

      getByIdSpy.mockResolvedValue(noteEntity);

      registerNoteHandlers(mockUseCases);
      const handler = handlersMap.get(IPC_CHANNELS.NOTES_GET_BY_ID)!;

      const result = (await handler(validEvent, { id: 5 })) as {
        success: boolean;
        data?: unknown;
      };

      expect(result.success).toBe(true);
      expect(result.data).toEqual(noteEntity.toPlainObject());
      expect(getByIdSpy).toHaveBeenCalledWith(5);
    });

    it('returns NOT_FOUND result when note does not exist', async () => {
      getByIdSpy.mockRejectedValue(AppError.notFound('Catatan tidak ditemukan'));

      registerNoteHandlers(mockUseCases);
      const handler = handlersMap.get(IPC_CHANNELS.NOTES_GET_BY_ID)!;

      const result = (await handler(validEvent, { id: 999 })) as {
        success: boolean;
        error?: { code: string; message: string };
      };

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('createDefaultNoteUseCases', () => {
    it('instantiates all 5 use cases when defaults are requested', () => {
      vi.spyOn(DatabaseConnection, 'getInstance').mockReturnValue(
        {} as unknown as Database.Database,
      );
      const defaults = createDefaultNoteUseCases();
      expect(defaults.createNoteUseCase).toBeDefined();
      expect(defaults.updateNoteUseCase).toBeDefined();
      expect(defaults.deleteNoteUseCase).toBeDefined();
      expect(defaults.getNotesUseCase).toBeDefined();
      expect(defaults.getNoteByIdUseCase).toBeDefined();
    });
  });
});
