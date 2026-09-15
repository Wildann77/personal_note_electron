import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import Database from 'better-sqlite3';
import { MigrationRunner } from '@main/infrastructure/database/migrations';
import { SQLiteNoteRepository } from '@main/infrastructure/repositories/SQLiteNoteRepository';
import { DeleteNoteUseCase } from '@main/application/notes/DeleteNoteUseCase';
import type { IEventHub } from '@main/domain/services/IEventHub';
import type { NoteMutationPayload } from '@shared/types/note';

describe('DeleteNoteUseCase (Integration)', () => {
  let db: Database.Database;
  let repo: SQLiteNoteRepository;
  let broadcastMock: Mock<(payload: NoteMutationPayload) => void>;
  let mockEventHub: IEventHub;
  let useCase: DeleteNoteUseCase;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    MigrationRunner.run(db);

    repo = new SQLiteNoteRepository(db);
    broadcastMock = vi.fn<(payload: NoteMutationPayload) => void>();
    mockEventHub = {
      broadcastNoteMutation: broadcastMock,
    };
    useCase = new DeleteNoteUseCase(repo, mockEventHub);
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
    vi.restoreAllMocks();
  });

  it('deletes an existing note, removes it from database, and broadcasts deletion event', async () => {
    const note = await repo.create({ title: 'Catatan Untuk Dihapus' });
    expect(await repo.getById(note.id)).not.toBeNull();

    const result = await useCase.execute(note.id);

    expect(result).toBe(true);
    expect(await repo.getById(note.id)).toBeNull();

    expect(broadcastMock).toHaveBeenCalledTimes(1);
    expect(broadcastMock).toHaveBeenCalledWith({
      type: 'delete',
      noteId: note.id,
    });
  });

  it('returns false and does not broadcast mutation when deleting a non-existent note', async () => {
    const nonExistentId = 77777;

    const result = await useCase.execute(nonExistentId);

    expect(result).toBe(false);
    expect(broadcastMock).not.toHaveBeenCalled();
  });

  it('accepts both object input { id } and primitive numeric id', async () => {
    const note1 = await repo.create({ title: 'Catatan 1' });
    const note2 = await repo.create({ title: 'Catatan 2' });

    const res1 = await useCase.execute(note1.id);
    const res2 = await useCase.execute({ id: note2.id });

    expect(res1).toBe(true);
    expect(res2).toBe(true);
    expect(await repo.getById(note1.id)).toBeNull();
    expect(await repo.getById(note2.id)).toBeNull();
  });

  it('handles rapid consecutive deletions cleanly without error or unresponsiveness (PRD US#29)', async () => {
    const notesCount = 50;
    const createdNotes = [];

    for (let i = 0; i < notesCount; i++) {
      const note = await repo.create({ title: `Catatan Batch ${i}` });
      createdNotes.push(note);
    }

    const allBefore = await repo.getAll();
    expect(allBefore).toHaveLength(notesCount);

    // Rapid consecutive deletion loop
    for (const note of createdNotes) {
      const deleted = await useCase.execute(note.id);
      expect(deleted).toBe(true);
    }

    const allAfter = await repo.getAll();
    expect(allAfter).toHaveLength(0);
    expect(broadcastMock).toHaveBeenCalledTimes(notesCount);
  });
});
