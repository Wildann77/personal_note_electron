import type { INoteRepository } from '@main/domain/repositories/INoteRepository';
import type { IEventHub } from '@main/domain/services/IEventHub';

export interface DeleteNoteInput {
  id: number;
}

/**
 * Use case to orchestrate deleting a personal note.
 * Permanently removes note record via INoteRepository and broadcasts mutation via IEventHub.
 * Adheres to idempotent deletion: returns false if record did not exist without throwing.
 */
export class DeleteNoteUseCase {
  constructor(
    private readonly noteRepository: INoteRepository,
    private readonly eventHub: IEventHub,
  ) {}

  /**
   * Executes deletion of a note by identifier.
   *
   * @param input DeleteNoteInput containing note ID, or numeric ID directly.
   * @returns True if deleted and mutation broadcasted; false if note did not exist.
   */
  public async execute(input: DeleteNoteInput | number): Promise<boolean> {
    const id = typeof input === 'number' ? input : input.id;

    const deleted = await this.noteRepository.delete(id);

    if (deleted) {
      this.eventHub.broadcastNoteMutation({
        type: 'delete',
        noteId: id,
      });
    }

    return deleted;
  }
}
