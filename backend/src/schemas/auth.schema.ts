import { z } from 'zod';
import { VERIFICATION_PURPOSES } from '../utils/verification-code.js';

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(8, '비밀번호는 8자 이상이어야 합니다.').max(72),
  name: z.string().trim().min(1).max(60).optional(),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('올바른 이메일 형식이 아닙니다.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.').max(72),
});

const verificationCodeFields = {
  challenge: z.string().min(1).max(2048).optional(),
  code: z.string().regex(/^\d{6}$/, '6자리 인증코드를 입력해주세요.').optional(),
};

// 현재 비밀번호 대신 이메일 인증코드(challenge + code)로 본인을 확인할 수도 있다.
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, '현재 비밀번호를 입력해주세요.').max(72).optional(),
  ...verificationCodeFields,
  newPassword: z.string().min(8, '새 비밀번호는 8자 이상이어야 합니다.').max(72),
}).refine((value) => value.currentPassword !== undefined || (value.challenge !== undefined && value.code !== undefined), {
  message: '현재 비밀번호 또는 인증코드를 입력해주세요.',
  path: ['currentPassword'],
});

export const verificationCodeRequestSchema = z.object({ purpose: z.enum(VERIFICATION_PURPOSES) });

/** 이메일이 있는 계정은 인증코드가 필요하다(서비스에서 확인). 이메일이 없는 계정은 빈 본문으로 탈퇴한다. */
export const deleteAccountSchema = z.object(verificationCodeFields).default({});

export const emailPreferencesSchema = z.object({
  securityEmailNotifications: z.boolean().optional(),
  newDeviceLogin: z.boolean().optional(),
  passwordChanged: z.boolean().optional(),
  otherSessionsSignedOut: z.boolean().optional(),
}).refine(value => Object.values(value).some(item => item !== undefined), { message: '변경할 설정이 필요합니다.' });

export const naverCallbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(1),
});

export const kakaoCallbackSchema = z.object({
  code: z.string().min(1),
  // 카카오 토큰 API는 인가 요청 때와 정확히 같은 redirect_uri를 요구한다(네이버는 불필요).
  redirectUri: z.string().url(),
});

export const googleLoginSchema = z.object({
  accessToken: z.string().min(1),
});

// 프로필 사진은 프론트에서 축소한 뒤 data URL로 보낸다(express.json 1mb 제한 안쪽).
export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1, '닉네임을 입력해주세요.').max(30, '닉네임은 30자 이하여야 합니다.').optional(),
    avatar: z
      .string()
      .max(900_000, '프로필 사진 용량이 너무 큽니다.')
      .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, '지원하지 않는 이미지 형식입니다. (PNG·JPG·WebP)')
      .nullable()
      .optional(),
  })
  .refine((value) => value.name !== undefined || value.avatar !== undefined, '변경할 항목이 없습니다.');

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
export type EmailPreferencesInput = z.infer<typeof emailPreferencesSchema>;
export type NaverCallbackInput = z.infer<typeof naverCallbackSchema>;
export type KakaoCallbackInput = z.infer<typeof kakaoCallbackSchema>;
export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const sessionIdParamsSchema = z.object({ id: z.string().uuid() });
