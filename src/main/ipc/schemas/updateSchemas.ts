import { z } from 'zod';

/**
 * Schema for update download request input payload.
 * Requires a valid web URL for the target release page.
 */
export const downloadUpdateSchema = z.object({
  releaseUrl: z.string().url('URL rilis harus berupa format URL valid'),
});

export type DownloadUpdateInput = z.infer<typeof downloadUpdateSchema>;
