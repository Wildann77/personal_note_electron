import type { OutputData } from '@shared/types/note';
import type { INoteRepository } from '@main/domain/repositories/INoteRepository';
import type { IEventHub } from '@main/domain/services/IEventHub';
import { Note } from '@main/domain/entities/Note';
import { AppError } from '@main/domain/errors/AppError';
import { NoteContentExtractor } from '@main/domain/services/NoteContentExtractor';

export interface UpdateNoteInput {
  id: number;
  expectedRevision: number;
  content: OutputData;
  title?: string;
  snippet?: string;
}

/**
 * Use case to orchestrate updating a note with Optimistic Concurrency Control (OCC).
 * Validates revision against database, extracts updated title and snippet from content,
 * updates persistence storage, and broadcasts mutation via IEventHub.
 */
export class UpdateNoteUseCase {
  constructor(
    private readonly noteRepository: INoteRepository,
    private readonly eventHub: IEventHub,
  ) {}

  /**
   * Executes note update guarded by expectedRevision.
   *
   * @param input Note update parameters including expectedRevision.
   * @returns Updated domain Note entity with incremented revision.
   * @throws NotFoundError if note with given ID does not exist.
   * @throws ConcurrencyError if expectedRevision does not match current database revision.
   */
  public async execute(input: UpdateNoteInput): Promise<Note> {
    let title = input.title;
    let snippet = input.snippet;

    if (title === undefined || snippet === undefined) {
      const extracted = NoteContentExtractor.extract(input.content);
      if (title === undefined) {
        title = extracted.title;
      }
      if (snippet === undefined) {
        snippet = extracted.snippet;
      }
    }

    const updated = await this.noteRepository.update({
      id: input.id,
      expectedRevision: input.expectedRevision,
      content: input.content,
      title,
      snippet,
    });

    if (!updated) {
      const existing = await this.noteRepository.getById(input.id);
      if (!existing) {
        throw AppError.notFound(`Catatan dengan ID ${input.id} tidak ditemukan`);
      }

      throw AppError.concurrency(
        `Versi catatan telah berubah di jendela lain. Revisi saat ini: ${existing.revision}, diharapkan: ${input.expectedRevision}`,
        {
          currentRevision: existing.revision,
          expectedRevision: input.expectedRevision,
        },
      );
    }

    this.eventHub.broadcastNoteMutation({
      type: 'update',
      noteId: updated.id,
      note: updated.toPlainObject(),
    });

    return updated;
  }
}
