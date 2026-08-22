import { z } from 'zod';
import { targetLanguageSchema } from './project.schema.js';

export const recordDownloadSchema = z.object({
  kind: z.enum(['single', 'zip']),
  languageCode: targetLanguageSchema.optional(),
});
