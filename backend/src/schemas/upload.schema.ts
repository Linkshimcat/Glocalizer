import { z } from 'zod';

export const completeUploadsSchema = z.object({
  assetIds: z.array(z.string().uuid()).min(1),
});

export type CompleteUploadsInput = z.infer<typeof completeUploadsSchema>;

export const projectParamsSchema = z.object({
  projectId: z.string().uuid(),
});
