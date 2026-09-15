import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import type { BrowserWindow } from 'electron';
import type { INoteRepository } from '@main/domain/repositories/INoteRepository';
import { Note } from '@main/domain/entities/Note';
import { NotFoundError } from '@main/domain/errors/AppError';
import {
  OpenChildWindowUseCase,
  type ChildWindowFactory,
} from '@main/application/windows/OpenChildWindowUseCase';

describe('OpenChildWindowUseCase (Unit)', () => {
  let getByIdMock: Mock<INoteRepository['getById']>;
  let mockRepo: INoteRepository;
  let mockWindowFactory: Mock<ChildWindowFactory>;
  let useCase: OpenChildWindowUseCase;

  beforeEach(() => {
    vi.clearAllMocks();

    getByIdMock = vi.fn<INoteRepository['getById']>();

    mockRepo = {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      getAll: vi.fn(),
      getById: getByIdMock,
    };

    mockWindowFactory = vi.fn<ChildWindowFactory>().mockImplementation((noteId: number) => {
      return {
        id: noteId,
        isDestroyed: vi.fn().mockReturnValue(false),
        close: vi.fn(),
      } as unknown as BrowserWindow;
    });

    useCase = new OpenChildWindowUseCase(mockRepo, mockWindowFactory);
  });

  it('opens a child window when note exists in repository (PRD US#30-36)', async () => {
    const existingNote = Note.restore({
      id: 42,
      title: 'Catatan Riset',
      snippet: 'Deskripsi singkat...',
      content: { blocks: [] },
      revision: 1,
      createdAt: 1000,
      updatedAt: 2000,
    });

    getByIdMock.mockResolvedValue(existingNote);

    const win = await useCase.execute(42);

    expect(getByIdMock).toHaveBeenCalledWith(42);
    expect(mockWindowFactory).toHaveBeenCalledTimes(1);
    expect(mockWindowFactory).toHaveBeenCalledWith(42);
    expect(win).toBeDefined();
  });

  it('accepts object input { noteId: number }', async () => {
    const existingNote = Note.restore({
      id: 100,
      title: 'Catatan Objek',
      snippet: '',
      content: { blocks: [] },
      revision: 1,
      createdAt: 1000,
      updatedAt: 1000,
    });

    getByIdMock.mockResolvedValue(existingNote);

    const win = await useCase.execute({ noteId: 100 });

    expect(getByIdMock).toHaveBeenCalledWith(100);
    expect(mockWindowFactory).toHaveBeenCalledWith(100);
    expect(win).toBeDefined();
  });

  it('throws NotFoundError and does not open window if note does not exist in repository', async () => {
    getByIdMock.mockResolvedValue(null);

    await expect(useCase.execute(999)).rejects.toThrow(NotFoundError);

    expect(getByIdMock).toHaveBeenCalledWith(999);
    expect(mockWindowFactory).not.toHaveBeenCalled();
  });

  it('can open multiple child windows concurrently for different notes (PRD US#35)', async () => {
    const noteA = Note.restore({
      id: 1,
      title: 'Catatan A',
      snippet: '',
      content: { blocks: [] },
      revision: 1,
      createdAt: 1000,
      updatedAt: 1000,
    });
    const noteB = Note.restore({
      id: 2,
      title: 'Catatan B',
      snippet: '',
      content: { blocks: [] },
      revision: 1,
      createdAt: 1000,
      updatedAt: 1000,
    });

    getByIdMock.mockImplementation((id: number) => {
      if (id === 1) return Promise.resolve(noteA);
      if (id === 2) return Promise.resolve(noteB);
      return Promise.resolve(null);
    });

    const win1 = await useCase.execute(1);
    const win2 = await useCase.execute(2);

    expect(mockWindowFactory).toHaveBeenCalledTimes(2);
    expect(mockWindowFactory).toHaveBeenNthCalledWith(1, 1);
    expect(mockWindowFactory).toHaveBeenNthCalledWith(2, 2);
    expect(win1).not.toBe(win2);
  });
});
