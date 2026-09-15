import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import Database from 'better-sqlite3';
import { MigrationRunner } from '@main/infrastructure/database/migrations';
import { SQLiteNoteRepository } from '@main/infrastructure/repositories/SQLiteNoteRepository';
import { CreateNoteUseCase } from '@main/application/notes/CreateNoteUseCase';
import type { IEventHub } from '@main/domain/services/IEventHub';
import { DEFAULT_NOTE_TITLE } from '@main/domain/entities/Note';
import { NoteContentExtractor } from '@main/domain/services/NoteContentExtractor';
import type { OutputData, NoteMutationPayload } from '@shared/types/note';

describe('CreateNoteUseCase (Integration)', () => {
  let db: Database.Database;
  let repo: SQLiteNoteRepository;
  let broadcastMock: Mock<(payload: NoteMutationPayload) => void>;
  let mockEventHub: IEventHub;
  let useCase: CreateNoteUseCase;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    MigrationRunner.run(db);

    repo = new SQLiteNoteRepository(db);
    broadcastMock = vi.fn<(payload: NoteMutationPayload) => void>();
    mockEventHub = {
      broadcastNoteMutation: broadcastMock,
    };
    useCase = new CreateNoteUseCase(repo, mockEventHub);
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
    vi.restoreAllMocks();
  });

  it('creates an empty note with default title, snippet, and revision 1, broadcasting mutation', async () => {
    const note = await useCase.execute();

    expect(note.id).toBeGreaterThan(0);
    expect(note.title).toBe(DEFAULT_NOTE_TITLE);
    expect(note.snippet).toBe(NoteContentExtractor.EMPTY_SNIPPET_FALLBACK);
    expect(note.content).toEqual({ blocks: [] });
    expect(note.revision).toBe(1);

    expect(broadcastMock).toHaveBeenCalledTimes(1);
    expect(broadcastMock).toHaveBeenCalledWith({
      type: 'create',
      noteId: note.id,
      note: note.toPlainObject(),
    });

    const persisted = await repo.getById(note.id);
    expect(persisted).not.toBeNull();
    expect(persisted?.title).toBe(DEFAULT_NOTE_TITLE);
    expect(persisted?.revision).toBe(1);
  });

  it('creates note with structured Editor.js content and automatically extracts title & snippet', async () => {
    const content: OutputData = {
      time: Date.now(),
      blocks: [
        { type: 'header', data: { text: 'Arsitektur Clean' } },
        { type: 'paragraph', data: { text: 'Prinsip pemisahan lapisan aplikasi...' } },
      ],
      version: '2.31.0',
    };

    const note = await useCase.execute({ content });

    expect(note.id).toBeGreaterThan(0);
    expect(note.title).toBe('Arsitektur Clean');
    expect(note.snippet).toBe('Prinsip pemisahan lapisan aplikasi...');
    expect(note.content).toEqual(content);
    expect(note.revision).toBe(1);

    expect(broadcastMock).toHaveBeenCalledTimes(1);
    expect(broadcastMock).toHaveBeenCalledWith({
      type: 'create',
      noteId: note.id,
      note: note.toPlainObject(),
    });
  });

  it('honors explicit title and snippet overrides when provided', async () => {
    const content: OutputData = {
      blocks: [{ type: 'paragraph', data: { text: 'Teks terabaikan untuk ekstraksi' } }],
    };

    const note = await useCase.execute({
      title: 'Judul Kustom',
      snippet: 'Kutipan Kustom',
      content,
    });

    expect(note.title).toBe('Judul Kustom');
    expect(note.snippet).toBe('Kutipan Kustom');
  });

  it('creates note with explicit ID if provided', async () => {
    const note = await useCase.execute({ id: 9999 });

    expect(note.id).toBe(9999);
    const persisted = await repo.getById(9999);
    expect(persisted).not.toBeNull();
    expect(persisted?.id).toBe(9999);
  });

  it('executes in < 1 second end-to-end to satisfy interaction NFR (Architecture §17)', async () => {
    const start = performance.now();

    const note = await useCase.execute({
      content: {
        blocks: [{ type: 'paragraph', data: { text: 'Catatan Cepat' } }],
      },
    });

    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(1000);
    expect(note.id).toBeGreaterThan(0);
  });
});
