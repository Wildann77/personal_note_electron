import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  NotFoundError,
  ConcurrencyError,
  DatabaseError,
  IpcSecurityError,
  BackupError,
  InternalError,
} from '@main/domain/errors/AppError';

describe('AppError & Domain Error Subclasses', () => {
  it('should instantiate base AppError with correct properties', () => {
    const error = new AppError('INTERNAL_ERROR', 'Terjadi kesalahan sistem', { foo: 'bar' });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe('AppError');
    expect(error.code).toBe('INTERNAL_ERROR');
    expect(error.message).toBe('Terjadi kesalahan sistem');
    expect(error.details).toEqual({ foo: 'bar' });
  });

  it('should produce structured AppErrorPayload with toPayload()', () => {
    const errWithDetails = new AppError('VALIDATION_ERROR', 'Payload tidak valid', {
      field: 'title',
    });
    expect(errWithDetails.toPayload()).toEqual({
      code: 'VALIDATION_ERROR',
      message: 'Payload tidak valid',
      details: { field: 'title' },
    });

    const errWithoutDetails = new AppError('NOT_FOUND', 'Catatan tidak ditemukan');
    expect(errWithoutDetails.toPayload()).toEqual({
      code: 'NOT_FOUND',
      message: 'Catatan tidak ditemukan',
    });
  });

  describe('Subclasses inherit from AppError with correct ErrorCode', () => {
    it('ValidationError', () => {
      const err = new ValidationError('Input salah', { field: 'id' });
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.name).toBe('ValidationError');
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.message).toBe('Input salah');
      expect(err.details).toEqual({ field: 'id' });
    });

    it('NotFoundError', () => {
      const err = new NotFoundError('Catatan #42 tidak ditemukan');
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(NotFoundError);
      expect(err.code).toBe('NOT_FOUND');
      expect(err.message).toBe('Catatan #42 tidak ditemukan');
    });

    it('ConcurrencyError', () => {
      const err = new ConcurrencyError('Revisi catatan tidak cocok', { expected: 2, actual: 3 });
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(ConcurrencyError);
      expect(err.code).toBe('CONCURRENCY_ERROR');
      expect(err.details).toEqual({ expected: 2, actual: 3 });
    });

    it('DatabaseError', () => {
      const err = new DatabaseError('Gagal mengeksekusi query SQL');
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(DatabaseError);
      expect(err.code).toBe('DATABASE_ERROR');
    });

    it('IpcSecurityError', () => {
      const err = new IpcSecurityError('Akses sender tidak diizinkan');
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(IpcSecurityError);
      expect(err.code).toBe('IPC_SECURITY_ERROR');
    });

    it('BackupError', () => {
      const err = new BackupError('Gagal membuat snapshot database');
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(BackupError);
      expect(err.code).toBe('BACKUP_ERROR');
    });

    it('InternalError', () => {
      const err = new InternalError('Kesalahan internal tidak terduga');
      expect(err).toBeInstanceOf(AppError);
      expect(err).toBeInstanceOf(InternalError);
      expect(err.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('Static factory helpers on AppError', () => {
    it('creates appropriate subclasses via static methods', () => {
      expect(AppError.validation('val')).toBeInstanceOf(ValidationError);
      expect(AppError.notFound('not')).toBeInstanceOf(NotFoundError);
      expect(AppError.concurrency('occ')).toBeInstanceOf(ConcurrencyError);
      expect(AppError.database('db')).toBeInstanceOf(DatabaseError);
      expect(AppError.ipcSecurity('sec')).toBeInstanceOf(IpcSecurityError);
      expect(AppError.backup('bk')).toBeInstanceOf(BackupError);
      expect(AppError.internal('int')).toBeInstanceOf(InternalError);
    });
  });
});
