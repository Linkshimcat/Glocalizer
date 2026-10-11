import { authEntryRateLimit, passwordRateLimit } from '../middleware/auth-rate-limit.middleware.js';
import { Router } from 'express';
import { changePasswordHandler, deleteAccountHandler, googleLoginHandler, loginHandler, meHandler, naverCallbackHandler, signupHandler, updateProfileHandler } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { changePasswordSchema, googleLoginSchema, loginSchema, naverCallbackSchema, signupSchema, updateProfileSchema } from '../schemas/auth.schema.js';
import { asyncHandler } from '../utils/async-handler.js';

export const authRouter = Router();

authRouter.post('/auth/signup', authEntryRateLimit, validate(signupSchema), asyncHandler(signupHandler));
authRouter.post('/auth/login', authEntryRateLimit, validate(loginSchema), asyncHandler(loginHandler));
authRouter.post('/auth/naver/callback', authEntryRateLimit, validate(naverCallbackSchema), asyncHandler(naverCallbackHandler));
authRouter.post('/auth/google', authEntryRateLimit, validate(googleLoginSchema), asyncHandler(googleLoginHandler));
authRouter.get('/auth/me', authMiddleware, asyncHandler(meHandler));
authRouter.patch('/auth/me', authMiddleware, validate(updateProfileSchema), asyncHandler(updateProfileHandler));
authRouter.patch('/auth/me/password', authMiddleware, passwordRateLimit, validate(changePasswordSchema), asyncHandler(changePasswordHandler));
authRouter.delete('/auth/me', authMiddleware, asyncHandler(deleteAccountHandler));
