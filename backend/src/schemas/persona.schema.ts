import { z } from 'zod';

const text = (max: number) => z.string().trim().max(max).optional();

// 성격·말투·나이·금지 표현(모두 선택). 프롬프트에 그대로 들어가므로 길이를 짧게 제한한다.
export const personaSchema = z.object({
  personality: text(80),
  speechStyle: text(80),
  age: text(20),
  avoidExpressions: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
}).strict();

export const updatePersonaSchema = z.object({
  persona: personaSchema.nullable(),
}).strict();

export type UpdatePersonaInput = z.infer<typeof updatePersonaSchema>;
