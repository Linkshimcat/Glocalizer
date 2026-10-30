import { authEntryRateLimit, passwordRateLimit, verificationCodeRateLimit } from '../middleware/auth-rate-limit.middleware.js';
import { Router } from 'express';
import { changePasswordHandler, deleteAccountHandler, sendVerificationCodeHandler, googleLoginHandler, kakaoCallbackHandler, listSessionsHandler, loginHandler, logoutHandler, meHandler, naverCallbackHandler, revokeOtherSessionsHandler, revokeSessionHandler, signupHandler, updateEmailPreferencesHandler, updateProfileHandler } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { changePasswordSchema, deleteAccountSchema, emailPreferencesSchema, verificationCodeRequestSchema, googleLoginSchema, kakaoCallbackSchema, loginSchema, naverCallbackSchema, sessionIdParamsSchema, signupSchema, updateProfileSchema } from '../schemas/auth.schema.js';
import { asyncHandler } from '../utils/async-handler.js';

export const authRouter = Router();

authRouter.post('/auth/signup', authEntryRateLimit, validate(signupSchema), asyncHandler(signupHandler));
authRouter.post('/auth/login', authEntryRateLimit, validate(loginSchema), asyncHandler(loginHandler));
authRouter.post('/auth/naver/callback', authEntryRateLimit, validate(naverCallbackSchema), asyncHandler(naverCallbackHandler));
authRouter.post('/auth/kakao/callback', authEntryRateLimit, validate(kakaoCallbackSchema), asyncHandler(kakaoCallbackHandler));
authRouter.post('/auth/google', authEntryRateLimit, validate(googleLoginSchema), asyncHandler(googleLoginHandler));
authRouter.get('/auth/me', authMiddleware, asyncHandler(meHandler));
authRouter.patch('/auth/me', authMiddleware, validate(updateProfileSchema), asyncHandler(updateProfileHandler));
authRouter.patch('/auth/me/email-preferences', authMiddleware, validate(emailPreferencesSchema), asyncHandler(updateEmailPreferencesHandler));
authRouter.patch('/auth/me/password', authMiddleware, passwordRateLimit, validate(changePasswordSchema), asyncHandler(changePasswordHandler));
// 탈퇴는 코드 대입을 막으려고 비밀번호 변경과 같은 사용자별 시도 제한을 함께 쓴다.
authRouter.delete('/auth/me', authMiddleware, passwordRateLimit, validate(deleteAccountSchema), asyncHandler(deleteAccountHandler));
authRouter.post('/auth/me/verification-code', authMiddleware, verificationCodeRateLimit, validate(verificationCodeRequestSchema), asyncHandler(sendVerificationCodeHandler));
authRouter.post('/auth/logout', authMiddleware, asyncHandler(logoutHandler));
authRouter.get('/auth/sessions', authMiddleware, asyncHandler(listSessionsHandler));
authRouter.post('/auth/sessions/revoke-others', authMiddleware, passwordRateLimit, asyncHandler(revokeOtherSessionsHandler));
authRouter.delete('/auth/sessions/:id', authMiddleware, validate(sessionIdParamsSchema, 'params'), asyncHandler(revokeSessionHandler));
