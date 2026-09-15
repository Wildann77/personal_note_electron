import type { INoteRepository } from '@main/domain/repositories/INoteRepository';
import type { Note } from '@main/domain/entities/Note';
import { AppError } from '@main/domain/errors/AppError';

export interface GetNoteByIdInput {
  id: number;
}

/**
 * Use case to retrieve a single complete note with full Editor.js content payload.
 * Used when opening child windows or when selecting a note item in the sidebar.
 * Strictly throws NotFoundError if the requested ID does not exist in persistence storage.
 */
export class GetNoteByIdUseCase {
  constructor(private readonly noteRepository: INoteRepository) {}

  /**
   * Executes single note retrieval by identifier.
   *
   * @param input Note ID as object or primitive number.
   * @returns Complete domain Note entity including content blocks.
   * @throws NotFoundError if the note ID does not exist.
   */
  public async execute(input: GetNoteByIdInput | number): Promise<Note> {
    const id = typeof input === 'number' ? input : input.id;

    const note = await this.noteRepository.getById(id);
    if (!note) {
      throw AppError.notFound(`Catatan dengan ID ${id} tidak ditemukan`);
    }

    return note;
  }
}
