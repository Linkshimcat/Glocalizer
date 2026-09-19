import { z } from 'zod';

export const ogqStickersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(40).default(12),
  query: z.string().trim().min(1).max(100).optional(),
});
