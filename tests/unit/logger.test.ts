import { describe, it, expect, vi, beforeEach } from 'vitest';
import log from 'electron-log';
import { logger, sanitize } from '@main/infrastructure/logger/logger';

describe('Zero-Leak Logger (Unit)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('configuration', () => {
    it('configures file transport with 5MB rotation limit and custom format', () => {
      expect(logger.transports.file.maxSize).toBe(5 * 1024 * 1024);
      expect(logger.transports.file.format).toBe('[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}] {text}');

      const resolvedPath = logger.transports.file.resolvePathFn?.(
        {} as Parameters<NonNullable<typeof logger.transports.file.resolvePathFn>>[0],
      );
      expect(resolvedPath).toBeDefined();
      expect(resolvedPath?.replace(/\\/g, '/')).toContain('logs/personal-note.log');
    });
  });

  describe('sanitize', () => {
    it('leaves primitive values intact', () => {
      expect(sanitize(null)).toBeNull();
      expect(sanitize(undefined)).toBeUndefined();
      expect(sanitize(123)).toBe(123);
      expect(sanitize('normal string')).toBe('normal string');
      expect(sanitize(true)).toBe(true);
    });

    it('leaves Date and RegExp instances intact', () => {
      const now = new Date();
      const regex = /^test$/;
      expect(sanitize(now)).toBe(now);
      expect(sanitize(regex)).toBe(regex);
    });

    it('redacts content and blocks at root level', () => {
      const input = {
        id: 1,
        title: 'Judul Catatan',
        content: { time: 123, blocks: [{ type: 'paragraph', text: 'rahasia' }] },
        blocks: [{ type: 'paragraph', text: 'rahasia' }],
      };

      const sanitized = sanitize(input);

      expect(sanitized.id).toBe(1);
      expect(sanitized.title).toBe('Judul Catatan');
      expect(sanitized.content).toBe('[REDACTED_CONTENT]');
      expect(sanitized.blocks).toBe('[REDACTED_BLOCKS]');
    });

    it('redacts content and blocks recursively in nested structures', () => {
      const nestedInput = {
        action: 'UPDATE_NOTE',
        payload: {
          noteId: 99,
          details: {
            content: 'isi catatan rahasia',
            blocks: [{ id: 'b1' }],
            tags: ['pribadi', 'kerja'],
          },
        },
      };

      const sanitized = sanitize(nestedInput);

      expect(sanitized.action).toBe('UPDATE_NOTE');
      expect(sanitized.payload.noteId).toBe(99);
      expect(sanitized.payload.details.content).toBe('[REDACTED_CONTENT]');
      expect(sanitized.payload.details.blocks).toBe('[REDACTED_BLOCKS]');
      expect(sanitized.payload.details.tags).toEqual(['pribadi', 'kerja']);
    });

    it('redacts content and blocks inside array elements', () => {
      const arrayInput = [
        { id: 1, content: 'Catatan 1' },
        { id: 2, blocks: ['b1', 'b2'] },
        { id: 3, safeField: 'Aman' },
      ];

      const sanitized = sanitize(arrayInput);

      expect(sanitized).toEqual([
        { id: 1, content: '[REDACTED_CONTENT]' },
        { id: 2, blocks: '[REDACTED_BLOCKS]' },
        { id: 3, safeField: 'Aman' },
      ]);
    });

    it('formats Error objects safely without throwing', () => {
      const err = new Error('Database disk image is malformed');
      const sanitized = sanitize(err);

      expect(sanitized.name).toBe('Error');
      expect(sanitized.message).toBe('Database disk image is malformed');
      expect(sanitized.stack).toBeDefined();
    });
  });

  describe('logger methods', () => {
    it('calls log.info with sanitized metadata', () => {
      const infoSpy = vi.spyOn(log, 'info').mockImplementation(() => {});

      logger.info('Note created', {
        id: 10,
        content: 'sensitive diary entry',
      });

      expect(infoSpy).toHaveBeenCalledTimes(1);
      expect(infoSpy).toHaveBeenCalledWith('Note created', {
        id: 10,
        content: '[REDACTED_CONTENT]',
      });
    });

    it('calls log.info with empty string when meta is omitted', () => {
      const infoSpy = vi.spyOn(log, 'info').mockImplementation(() => {});

      logger.info('Application ready');

      expect(infoSpy).toHaveBeenCalledTimes(1);
      expect(infoSpy).toHaveBeenCalledWith('Application ready', '');
    });

    it('calls log.warn with sanitized metadata', () => {
      const warnSpy = vi.spyOn(log, 'warn').mockImplementation(() => {});

      logger.warn('OCC Conflict detected', {
        noteId: 5,
        blocks: ['stale block 1'],
        revision: 2,
      });

      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith('OCC Conflict detected', {
        noteId: 5,
        blocks: '[REDACTED_BLOCKS]',
        revision: 2,
      });
    });

    it('calls log.error with Error stack or message', () => {
      const errorSpy = vi.spyOn(log, 'error').mockImplementation(() => {});
      const testError = new Error('Corrupt DB lock');

      logger.error('Failed to commit transaction', testError);

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith('Failed to commit transaction', testError.stack);
    });

    it('calls log.error with sanitized object when error is not an Error instance', () => {
      const errorSpy = vi.spyOn(log, 'error').mockImplementation(() => {});

      logger.error('Unknown failure', {
        reason: 'unexpected',
        content: 'sensitive payload in error',
      });

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith('Unknown failure', {
        reason: 'unexpected',
        content: '[REDACTED_CONTENT]',
      });
    });

    it('calls log.error without second arg when error is undefined', () => {
      const errorSpy = vi.spyOn(log, 'error').mockImplementation(() => {});

      logger.error('Generic error occurred');

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy).toHaveBeenCalledWith('Generic error occurred');
    });
  });
});
