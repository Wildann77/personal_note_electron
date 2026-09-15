import type { OutputData } from '@shared/types/note';
import type { INoteRepository } from '@main/domain/repositories/INoteRepository';
import type { IEventHub } from '@main/domain/services/IEventHub';
import { Note } from '@main/domain/entities/Note';
import { NoteContentExtractor } from '@main/domain/services/NoteContentExtractor';

export interface CreateNoteInput {
  id?: number;
  title?: string;
  snippet?: string;
  content?: OutputData;
}

/**
 * Use case to orchestrate the creation of a new note.
 * Persists note via INoteRepository and broadcasts mutation via IEventHub.
 * Adheres strictly to Clean Architecture (DIP) and zero external dependencies.
 */
export class CreateNoteUseCase {
  constructor(
    private readonly noteRepository: INoteRepository,
    private readonly eventHub: IEventHub,
  ) {}

  /**
   * Executes the creation of a note.
   *
   * @param input Optional initial content, title, snippet, or preset ID.
   * @returns Newly created domain Note entity with assigned ID and initial revision.
   */
  public async execute(input: CreateNoteInput = {}): Promise<Note> {
    const content = input.content ?? { blocks: [] };

    let title = input.title;
    let snippet = input.snippet;

    if (title === undefined || snippet === undefined) {
      const extracted = NoteContentExtractor.extract(content);
      if (title === undefined) {
        title = extracted.title;
      }
      if (snippet === undefined) {
        snippet = extracted.snippet;
      }
    }

    const note = await this.noteRepository.create({
      id: input.id,
      title,
      snippet,
      content,
    });

    this.eventHub.broadcastNoteMutation({
      type: 'create',
      noteId: note.id,
      note: note.toPlainObject(),
    });

    return note;
  }
}
