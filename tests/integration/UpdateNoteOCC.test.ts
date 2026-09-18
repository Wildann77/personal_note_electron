import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import Database from 'better-sqlite3';
import { MigrationRunner } from '@main/infrastructure/database/migrations';
import { SQLiteNoteRepository } from '@main/infrastructure/repositories/SQLiteNoteRepository';
import { UpdateNoteUseCase } from '@main/application/notes/UpdateNoteUseCase';
import type { IEventHub } from '@main/domain/services/IEventHub';
import { ConcurrencyError, NotFoundError } from '@main/domain/errors/AppError';
import { Note } from '@main/domain/entities/Note';
import type { OutputData, NoteMutationPayload } from '@shared/types/note';

describe('UpdateNoteUseCase - OCC Guard (Integration)', () => {
  let db: Database.Database;
  let repo: SQLiteNoteRepository;
  let broadcastMock: Mock<(payload: NoteMutationPayload) => void>;
  let mockEventHub: IEventHub;
  let useCase: UpdateNoteUseCase;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    MigrationRunner.run(db);

    repo = new SQLiteNoteRepository(db);
    broadcastMock = vi.fn<(payload: NoteMutationPayload) => void>();
    mockEventHub = {
      broadcastNoteMutation: broadcastMock,
    };
    useCase = new UpdateNoteUseCase(repo, mockEventHub);
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
    vi.restoreAllMocks();
  });

  it('updates note and increments revision when expectedRevision matches, broadcasting update', async () => {
    const initialNote = await repo.create({
      title: 'Judul Awal',
      snippet: 'Kutipan Awal',
      content: { blocks: [{ type: 'paragraph', data: { text: 'Paragraf Pertama' } }] },
    });
    expect(initialNote.revision).toBe(1);

    const updatedContent: OutputData = {
      blocks: [
        { type: 'header', data: { text: 'Bab 1: Pengantar' } },
        { type: 'paragraph', data: { text: 'Ini ringkasan bab satu...' } },
      ],
    };

    const updated = await useCase.execute({
      id: initialNote.id,
      expectedRevision: 1,
      content: updatedContent,
    });

    expect(updated.id).toBe(initialNote.id);
    expect(updated.revision).toBe(2);
    expect(updated.title).toBe('Bab 1: Pengantar');
    expect(updated.snippet).toBe('Ini ringkasan bab satu...');
    expect(updated.content).toEqual(updatedContent);
    expect(updated.updatedAt).toBeGreaterThanOrEqual(initialNote.updatedAt);

    expect(broadcastMock).toHaveBeenCalledTimes(1);
    expect(broadcastMock).toHaveBeenCalledWith({
      type: 'update',
      noteId: initialNote.id,
      note: updated.toPlainObject(),
    });

    const persisted = await repo.getById(initialNote.id);
    expect(persisted?.revision).toBe(2);
    expect(persisted?.title).toBe('Bab 1: Pengantar');
  });

  it('throws ConcurrencyError and rejects update without silent overwrite when expectedRevision mismatches (OCC Guard)', async () => {
    const initialNote = await repo.create({
      title: 'Catatan Rapat',
      content: { blocks: [] },
    });
    expect(initialNote.revision).toBe(1);

    const staleRevision = 99;
    const updateAttempt = useCase.execute({
      id: initialNote.id,
      expectedRevision: staleRevision,
      content: { blocks: [{ type: 'paragraph', data: { text: 'Timpa diam-diam' } }] },
    });

    await expect(updateAttempt).rejects.toThrow(ConcurrencyError);

    try {
      await updateAttempt;
    } catch (err) {
      const occError = err as ConcurrencyError;
      expect(occError.code).toBe('CONCURRENCY_ERROR');
      expect(occError.message).toContain('Versi catatan telah berubah di jendela lain');
      expect(occError.details).toEqual({
        currentRevision: 1,
        expectedRevision: staleRevision,
      });
    }

    // Ensure database remained unchanged
    const currentNote = await repo.getById(initialNote.id);
    expect(currentNote?.revision).toBe(1);
    expect(currentNote?.title).toBe('Catatan Rapat');
    expect(broadcastMock).not.toHaveBeenCalled();
  });

  it('handles multi-window concurrent editing: first window succeeds, second window fails with OCC conflict', async () => {
    const initialNote = await repo.create({
      title: 'Catatan Kolaborasi',
      content: { blocks: [] },
    });
    expect(initialNote.revision).toBe(1);

    // Both Window 1 and Window 2 read initialNote at revision 1
    const win1Save = useCase.execute({
      id: initialNote.id,
      expectedRevision: 1,
      content: { blocks: [{ type: 'paragraph', data: { text: 'Perubahan Jendela 1' } }] },
    });

    const win1Result = await win1Save;
    expect(win1Result.revision).toBe(2);
    expect(win1Result.title).toBe('Perubahan Jendela 1');

    // Window 2 attempts save with stale expectedRevision 1
    const win2Save = useCase.execute({
      id: initialNote.id,
      expectedRevision: 1,
      content: { blocks: [{ type: 'paragraph', data: { text: 'Perubahan Jendela 2' } }] },
    });

    await expect(win2Save).rejects.toThrow(ConcurrencyError);

    // DB has only Window 1 changes
    const finalNote = await repo.getById(initialNote.id);
    expect(finalNote?.revision).toBe(2);
    expect(finalNote?.title).toBe('Perubahan Jendela 1');
  });

  it('throws NotFoundError when trying to update a non-existent note', async () => {
    const nonExistentId = 88888;

    const attempt = useCase.execute({
      id: nonExistentId,
      expectedRevision: 1,
      content: { blocks: [] },
    });

    await expect(attempt).rejects.toThrow(NotFoundError);

    try {
      await attempt;
    } catch (err) {
      const notFoundErr = err as NotFoundError;
      expect(notFoundErr.code).toBe('NOT_FOUND');
      expect(notFoundErr.message).toContain(`ID ${nonExistentId} tidak ditemukan`);
    }

    expect(broadcastMock).not.toHaveBeenCalled();
  });

  it('preserves explicit title and snippet overrides during update', async () => {
    const initialNote = await repo.create({ content: { blocks: [] } });

    const updated = await useCase.execute({
      id: initialNote.id,
      expectedRevision: 1,
      content: { blocks: [{ type: 'paragraph', data: { text: 'Teks terabaikan' } }] },
      title: 'Judul Override',
      snippet: 'Kutipan Override',
    });

    expect(updated.title).toBe('Judul Override');
    expect(updated.snippet).toBe('Kutipan Override');
  });

  it('simulates simultaneous race condition across multiple virtual windows: exactly 1 update succeeds and all others receive CONCURRENCY_ERROR', async () => {
    const initialNote = await repo.create({
      title: 'Catatan Race Condition',
      content: { blocks: [{ type: 'paragraph', data: { text: 'Awal' } }] },
    });
    expect(initialNote.revision).toBe(1);

    const virtualWindowCount = 10;
    // Launch 10 simultaneous updates from 10 virtual windows targeting revision 1
    const updatePromises = Array.from({ length: virtualWindowCount }, (_, i) => {
      return useCase.execute({
        id: initialNote.id,
        expectedRevision: 1,
        content: {
          blocks: [{ type: 'paragraph', data: { text: `Konten dari Jendela ${i + 1}` } }],
        },
      });
    });

    const results = await Promise.allSettled(updatePromises);

    const fulfilled = results.filter(
      (r): r is PromiseFulfilledResult<Note> => r.status === 'fulfilled',
    );
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');

    // Exactly 1 virtual window must succeed, 9 must fail
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(virtualWindowCount - 1);

    // The single winner must have revision incremented to 2
    const winningNote = fulfilled[0].value;
    expect(winningNote.id).toBe(initialNote.id);
    expect(winningNote.revision).toBe(2);

    // All rejected promises must be ConcurrencyError with code CONCURRENCY_ERROR
    for (const rej of rejected) {
      expect(rej.reason).toBeInstanceOf(ConcurrencyError);
      const err = rej.reason as ConcurrencyError;
      expect(err.code).toBe('CONCURRENCY_ERROR');
      expect(err.details).toEqual({
        currentRevision: 2,
        expectedRevision: 1,
      });
    }

    // Broadcast mutation was emitted exactly once for the winning update
    expect(broadcastMock).toHaveBeenCalledTimes(1);
    expect(broadcastMock).toHaveBeenCalledWith({
      type: 'update',
      noteId: initialNote.id,
      note: winningNote.toPlainObject(),
    });

    // Database state strictly matches the winning update with revision 2
    const persisted = await repo.getById(initialNote.id);
    expect(persisted).not.toBeNull();
    expect(persisted?.revision).toBe(2);
    expect(persisted?.title).toBe(winningNote.title);
    expect(persisted?.content).toEqual(winningNote.content);
  });

  it('simulates multi-turn concurrent editing across revisions without silent data overwrite', async () => {
    const note = await repo.create({
      title: 'Catatan Multi-Turn',
      content: { blocks: [] },
    });
    expect(note.revision).toBe(1);

    // Turn 1: Window A updates from rev 1 -> 2
    const winAResult = await useCase.execute({
      id: note.id,
      expectedRevision: 1,
      content: { blocks: [{ type: 'paragraph', data: { text: 'Turn 1 A' } }] },
    });
    expect(winAResult.revision).toBe(2);

    // Turn 2: Window B (stale rev 1) vs Window C (fresh rev 2)
    const winBPromise = useCase.execute({
      id: note.id,
      expectedRevision: 1, // stale
      content: { blocks: [{ type: 'paragraph', data: { text: 'Turn 2 B stale' } }] },
    });
    const winCPromise = useCase.execute({
      id: note.id,
      expectedRevision: 2, // fresh
      content: { blocks: [{ type: 'paragraph', data: { text: 'Turn 2 C fresh' } }] },
    });

    const [bResult, cResult] = await Promise.allSettled([winBPromise, winCPromise]);

    expect(bResult.status).toBe('rejected');
    if (bResult.status === 'rejected') {
      expect((bResult.reason as ConcurrencyError).code).toBe('CONCURRENCY_ERROR');
    }

    expect(cResult.status).toBe('fulfilled');
    if (cResult.status === 'fulfilled') {
      expect(cResult.value.revision).toBe(3);
      expect(cResult.value.title).toBe('Turn 2 C fresh');
    }

    const currentDbNote = await repo.getById(note.id);
    expect(currentDbNote?.revision).toBe(3);
    expect(currentDbNote?.title).toBe('Turn 2 C fresh');
  });
});
