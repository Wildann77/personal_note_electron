import type { BrowserWindow } from 'electron';
import type { INoteRepository } from '@main/domain/repositories/INoteRepository';
import { AppError } from '@main/domain/errors/AppError';
import { WindowManager } from '@main/infrastructure/windows/WindowManager';

export type ChildWindowFactory = (noteId: number) => BrowserWindow;

export interface OpenChildWindowInput {
  noteId: number;
}

/**
 * Use case to spawn a secondary (child) BrowserWindow dedicated to editing a specific note.
 * URL is configured with `?type=child&noteId=<id>` so the child window independently
 * manages its active note without shared global state (Architecture §9, §17, PRD US#30-36).
 * Validates that note exists in repository before opening the window.
 */
export class OpenChildWindowUseCase {
  constructor(
    private readonly noteRepository: INoteRepository,
    private readonly windowFactory: ChildWindowFactory = (id) =>
      WindowManager.createChildWindow(id),
  ) {}

  /**
   * Executes opening of a child window for a specific note.
   *
   * @param input Note ID as object or primitive number.
   * @returns Newly spawned child BrowserWindow instance.
   * @throws NotFoundError if the requested note does not exist in repository.
   */
  public async execute(input: OpenChildWindowInput | number): Promise<BrowserWindow> {
    const noteId = typeof input === 'number' ? input : input.noteId;

    const note = await this.noteRepository.getById(noteId);
    if (!note) {
      throw AppError.notFound(`Catatan dengan ID ${noteId} tidak ditemukan`);
    }

    return this.windowFactory(noteId);
  }
}
