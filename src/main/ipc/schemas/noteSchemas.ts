import { z } from 'zod';

/**
 * Zod validation schema for single Editor.js block data.
 */
export const outputBlockDataSchema = z.object({
  id: z.string().optional(),
  type: z.string().min(1, 'Tipe blok tidak boleh kosong'),
  data: z.record(z.string(), z.unknown()).default({}),
  tunes: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Zod validation schema for full Editor.js document output data.
 */
export const outputDataSchema = z.object({
  time: z.number().optional(),
  blocks: z.array(outputBlockDataSchema),
  version: z.string().optional(),
});

/**
 * Schema for note creation payload.
 * Defaults to empty object if undefined is passed.
 */
export const createNoteSchema = z
  .object({
    id: z.number().int().positive().optional(),
    title: z.string().optional(),
    snippet: z.string().optional(),
    content: outputDataSchema.optional(),
  })
  .optional()
  .default({});

/**
 * Schema for note update payload guarded by OCC (expectedRevision).
 */
export const updateNoteSchema = z.object({
  id: z.number().int().positive('ID catatan harus integer positif'),
  expectedRevision: z
    .number()
    .int()
    .nonnegative('expectedRevision harus bilangan bulat non-negatif'),
  content: outputDataSchema,
  title: z.string().optional(),
  snippet: z.string().optional(),
});

/**
 * Flexible schema for note retrieval by ID:
 * Accepts either an object { id: number } or a primitive number directly,
 * normalizing both forms to { id: number }.
 */
export const getNoteByIdSchema = z.union([
  z.object({
    id: z.number().int().positive('ID catatan harus integer positif'),
  }),
  z
    .number()
    .int()
    .positive('ID catatan harus integer positif')
    .transform((id) => ({ id })),
]);

/**
 * Flexible schema for note deletion:
 * Accepts either an object { id: number } or a primitive number directly,
 * normalizing both forms to { id: number }.
 */
export const deleteNoteSchema = z.union([
  z.object({
    id: z.number().int().positive('ID catatan harus integer positif'),
  }),
  z
    .number()
    .int()
    .positive('ID catatan harus integer positif')
    .transform((id) => ({ id })),
]);

/**
 * Schema for parameterless endpoints (e.g. notes:getAll).
 */
export const emptySchema = z.void().optional();

export type OutputBlockDataPayload = z.infer<typeof outputBlockDataSchema>;
export type OutputDataPayload = z.infer<typeof outputDataSchema>;
export type CreateNotePayload = z.infer<typeof createNoteSchema>;
export type UpdateNotePayload = z.infer<typeof updateNoteSchema>;
export type GetNoteByIdPayload = z.infer<typeof getNoteByIdSchema>;
export type DeleteNotePayload = z.infer<typeof deleteNoteSchema>;
