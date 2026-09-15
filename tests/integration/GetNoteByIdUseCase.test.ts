import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { MigrationRunner } from '@main/infrastructure/database/migrations';
import { SQLiteNoteRepository } from '@main/infrastructure/repositories/SQLiteNoteRepository';
import { GetNoteByIdUseCase } from '@main/application/notes/GetNoteByIdUseCase';
import { NotFoundError } from '@main/domain/errors/AppError';
import type { OutputData } from '@shared/types/note';

describe('GetNoteByIdUseCase (Integration)', () => {
  let db: Database.Database;
  let repo: SQLiteNoteRepository;
  let useCase: GetNoteByIdUseCase;

  beforeEach(() => {
    db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    MigrationRunner.run(db);

    repo = new SQLiteNoteRepository(db);
    useCase = new GetNoteByIdUseCase(repo);
  });

  afterEach(() => {
    if (db && db.open) {
      db.close();
    }
  });

  it('retrieves an existing note by numeric ID including full content blocks (PRD US#33)', async () => {
    const content: OutputData = {
      time: 1700000000000,
      blocks: [
        { type: 'header', data: { text: 'Rencana Peluncuran', level: 1 } },
        { type: 'paragraph', data: { text: 'Detail peluncuran aplikasi desktop...' } },
      ],
      version: '2.31.0',
    };

    const created = await repo.create({
      title: 'Rencana Peluncuran',
      snippet: 'Detail peluncuran...',
      content,
    });

    const found = await useCase.execute(created.id);

    expect(found).toBeDefined();
    expect(found.id).toBe(created.id);
    expect(found.title).toBe('Rencana Peluncuran');
    expect(found.snippet).toBe('Detail peluncuran...');
    expect(found.content).toEqual(content);
    expect(found.revision).toBe(1);
    expect(found.createdAt).toBe(created.createdAt);
    expect(found.updatedAt).toBe(created.updatedAt);
  });

  it('accepts object input { id: number } cleanly', async () => {
    const created = await repo.create({ title: 'Catatan Objek' });

    const found = await useCase.execute({ id: created.id });

    expect(found).toBeDefined();
    expect(found.id).toBe(created.id);
    expect(found.title).toBe('Catatan Objek');
  });

  it('throws structured NotFoundError when ID does not exist in repository', async () => {
    const nonExistentId = 98765;

    await expect(useCase.execute(nonExistentId)).rejects.toThrow(NotFoundError);

    try {
      await useCase.execute(nonExistentId);
      expect.fail('Expected NotFoundError to be thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(NotFoundError);
      const appErr = err as NotFoundError;
      expect(appErr.code).toBe('NOT_FOUND');
      expect(appErr.message).toContain('98765');
      expect(appErr.toPayload()).toEqual({
        code: 'NOT_FOUND',
        message: 'Catatan dengan ID 98765 tidak ditemukan',
      });
    }
  });

  it('preserves empty blocks content if stored note had empty content', async () => {
    const created = await repo.create({ title: 'Kosong' });

    const found = await useCase.execute(created.id);

    expect(found.content).toEqual({ blocks: [] });
  });
});
