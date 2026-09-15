import type { NoteMetadata } from '@shared/types/note';
import type { INoteRepository } from '@main/domain/repositories/INoteRepository';

/**
 * Use case to retrieve all notes metadata ordered by updated_at DESC.
 * Omits heavy editor content for high-performance sidebar loading and startup.
 * Data is immediately consumable by timeSectioning logic on renderer.
 */
export class GetNotesUseCase {
  constructor(private readonly noteRepository: INoteRepository) {}

  /**
   * Executes notes retrieval query.
   *
   * @returns Array of lightweight note metadata records ordered by updated_at DESC.
   */
  public async execute(): Promise<NoteMetadata[]> {
    return this.noteRepository.getAll();
  }
}
