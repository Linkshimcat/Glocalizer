import { z } from 'zod';

export const signupSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.').max(72),
  name: z.string().trim().min(1).max(60).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});

export const naverCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type NaverCallbackInput = z.infer<typeof naverCallbackSchema>;
