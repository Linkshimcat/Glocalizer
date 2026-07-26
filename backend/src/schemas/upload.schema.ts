import { z } from 'zod';

export const completeUploadsSchema = z.object({
  assetIds: z.array(z.string().uuid()).min(1).superRefine((assetIds, context) => {
    if (new Set(assetIds).size !== assetIds.length) {
      context.addIssue({ code: 'custom', message: 'assetIds에는 중복된 ID를 포함할 수 없습니다.' });
    }
  }),
});

export type CompleteUploadsInput = z.infer<typeof completeUploadsSchema>;

export const projectParamsSchema = z.object({
  projectId: z.string().uuid(),
});
