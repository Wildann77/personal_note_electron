import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import {
  outputBlockDataSchema,
  outputDataSchema,
  createNoteSchema,
  updateNoteSchema,
  getNoteByIdSchema,
  deleteNoteSchema,
  emptySchema,
} from '@main/ipc/schemas/noteSchemas';

describe('noteSchemas (Unit - Architecture §4, §5.2)', () => {
  describe('outputBlockDataSchema & outputDataSchema', () => {
    it('validates a complete Editor.js output document', () => {
      const doc = {
        time: 1710400000000,
        version: '2.31.0',
        blocks: [
          {
            id: 'b-1',
            type: 'header',
            data: { text: 'Judul Dokumen', level: 1 },
          },
          {
            type: 'paragraph',
            data: { text: 'Isi paragraf pertama.' },
            tunes: { alignment: 'left' },
          },
        ],
      };

      const parsed = outputDataSchema.parse(doc);
      expect(parsed.blocks).toHaveLength(2);
      expect(parsed.blocks[0].type).toBe('header');
      expect(parsed.blocks[1].tunes).toEqual({ alignment: 'left' });
    });

    it('allows document with empty blocks array', () => {
      const parsed = outputDataSchema.parse({ blocks: [] });
      expect(parsed.blocks).toEqual([]);
      expect(parsed.time).toBeUndefined();
      expect(parsed.version).toBeUndefined();
    });

    it('rejects block missing type or with empty type', () => {
      expect(() =>
        outputBlockDataSchema.parse({
          type: '',
          data: {},
        }),
      ).toThrow(ZodError);

      expect(() =>
        outputBlockDataSchema.parse({
          data: {},
        }),
      ).toThrow(ZodError);
    });

    it('rejects block when data is not an object', () => {
      expect(() =>
        outputBlockDataSchema.parse({
          type: 'paragraph',
          data: 'invalid string data',
        }),
      ).toThrow(ZodError);
    });
  });

  describe('createNoteSchema', () => {
    it('defaults to empty object when undefined or omitted', () => {
      expect(createNoteSchema.parse(undefined)).toEqual({});
    });

    it('parses valid note creation input with optional fields', () => {
      const input = {
        title: 'Catatan Baru',
        snippet: 'Cuplikan awal',
        content: {
          blocks: [
            {
              type: 'paragraph',
              data: { text: 'Halo dunia' },
            },
          ],
        },
      };

      const parsed = createNoteSchema.parse(input);
      expect(parsed.title).toBe('Catatan Baru');
      expect(parsed.snippet).toBe('Cuplikan awal');
      expect(parsed.content?.blocks).toHaveLength(1);
    });

    it('rejects invalid ID (negative or float)', () => {
      expect(() => createNoteSchema.parse({ id: -1 })).toThrow(ZodError);
      expect(() => createNoteSchema.parse({ id: 0 })).toThrow(ZodError);
      expect(() => createNoteSchema.parse({ id: 2.5 })).toThrow(ZodError);
    });

    it('rejects non-string title or snippet', () => {
      expect(() => createNoteSchema.parse({ title: 123 })).toThrow(ZodError);
      expect(() => createNoteSchema.parse({ snippet: true })).toThrow(ZodError);
    });
  });

  describe('updateNoteSchema', () => {
    const validContent = {
      blocks: [
        {
          type: 'paragraph',
          data: { text: 'Konten terupdate' },
        },
      ],
    };

    it('validates a correct update payload with OCC revision guard', () => {
      const input = {
        id: 42,
        expectedRevision: 3,
        content: validContent,
        title: 'Judul Diperbarui',
        snippet: 'Cuplikan baru',
      };

      const parsed = updateNoteSchema.parse(input);
      expect(parsed.id).toBe(42);
      expect(parsed.expectedRevision).toBe(3);
      expect(parsed.content.blocks).toHaveLength(1);
      expect(parsed.title).toBe('Judul Diperbarui');
    });

    it('accepts expectedRevision equal to 0 (initial revision)', () => {
      const input = {
        id: 1,
        expectedRevision: 0,
        content: { blocks: [] },
      };

      const parsed = updateNoteSchema.parse(input);
      expect(parsed.expectedRevision).toBe(0);
    });

    it('rejects missing mandatory fields (id, expectedRevision, or content)', () => {
      expect(() => updateNoteSchema.parse({ expectedRevision: 1, content: validContent })).toThrow(
        ZodError,
      );
      expect(() => updateNoteSchema.parse({ id: 1, content: validContent })).toThrow(ZodError);
      expect(() => updateNoteSchema.parse({ id: 1, expectedRevision: 1 })).toThrow(ZodError);
    });

    it('rejects negative or non-integer revision or id', () => {
      expect(() =>
        updateNoteSchema.parse({
          id: -1,
          expectedRevision: 1,
          content: validContent,
        }),
      ).toThrow(ZodError);

      expect(() =>
        updateNoteSchema.parse({
          id: 1,
          expectedRevision: -1,
          content: validContent,
        }),
      ).toThrow(ZodError);

      expect(() =>
        updateNoteSchema.parse({
          id: 1.5,
          expectedRevision: 1,
          content: validContent,
        }),
      ).toThrow(ZodError);

      expect(() =>
        updateNoteSchema.parse({
          id: 1,
          expectedRevision: 1.2,
          content: validContent,
        }),
      ).toThrow(ZodError);
    });
  });

  describe('getNoteByIdSchema', () => {
    it('accepts object payload { id: number }', () => {
      expect(getNoteByIdSchema.parse({ id: 7 })).toEqual({ id: 7 });
    });

    it('accepts primitive number and normalizes to { id: number }', () => {
      expect(getNoteByIdSchema.parse(7)).toEqual({ id: 7 });
    });

    it('rejects non-positive numbers or zero', () => {
      expect(() => getNoteByIdSchema.parse(0)).toThrow(ZodError);
      expect(() => getNoteByIdSchema.parse(-5)).toThrow(ZodError);
      expect(() => getNoteByIdSchema.parse({ id: 0 })).toThrow(ZodError);
      expect(() => getNoteByIdSchema.parse({ id: -5 })).toThrow(ZodError);
    });

    it('rejects float or string values', () => {
      expect(() => getNoteByIdSchema.parse(3.14)).toThrow(ZodError);
      expect(() => getNoteByIdSchema.parse('7')).toThrow(ZodError);
      expect(() => getNoteByIdSchema.parse({ id: 3.14 })).toThrow(ZodError);
      expect(() => getNoteByIdSchema.parse({})).toThrow(ZodError);
    });
  });

  describe('deleteNoteSchema', () => {
    it('accepts object payload { id: number }', () => {
      expect(deleteNoteSchema.parse({ id: 10 })).toEqual({ id: 10 });
    });

    it('accepts primitive number and normalizes to { id: number }', () => {
      expect(deleteNoteSchema.parse(10)).toEqual({ id: 10 });
    });

    it('rejects non-positive numbers or zero', () => {
      expect(() => deleteNoteSchema.parse(0)).toThrow(ZodError);
      expect(() => deleteNoteSchema.parse(-10)).toThrow(ZodError);
      expect(() => deleteNoteSchema.parse({ id: 0 })).toThrow(ZodError);
    });

    it('rejects invalid types', () => {
      expect(() => deleteNoteSchema.parse('10')).toThrow(ZodError);
      expect(() => deleteNoteSchema.parse(null)).toThrow(ZodError);
      expect(() => deleteNoteSchema.parse({})).toThrow(ZodError);
    });
  });

  describe('emptySchema', () => {
    it('accepts undefined or void input', () => {
      expect(emptySchema.parse(undefined)).toBeUndefined();
    });

    it('rejects non-void input', () => {
      expect(() => emptySchema.parse('unexpected argument')).toThrow(ZodError);
      expect(() => emptySchema.parse({ unexpected: true })).toThrow(ZodError);
    });
  });
});
