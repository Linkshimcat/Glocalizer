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

// 프로필 사진은 프론트에서 축소한 뒤 data URL로 보낸다(express.json 1mb 제한 안쪽).
export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1, '닉네임을 입력해주세요.').max(30, '닉네임은 30자 이하여야 합니다.').optional(),
    avatar: z
      .string()
      .max(900_000, '프로필 사진 용량이 너무 큽니다.')
      .regex(/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/, '지원하지 않는 이미지 형식입니다.')
      .nullable()
      .optional(),
  })
  .refine((value) => value.name !== undefined || value.avatar !== undefined, '변경할 항목이 없습니다.');

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type NaverCallbackInput = z.infer<typeof naverCallbackSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
