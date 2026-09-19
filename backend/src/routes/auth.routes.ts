import { Router } from 'express';
import { deleteAccountHandler, googleLoginHandler, loginHandler, meHandler, naverCallbackHandler, signupHandler, updateProfileHandler } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { googleLoginSchema, loginSchema, naverCallbackSchema, signupSchema, updateProfileSchema } from '../schemas/auth.schema.js';
import { asyncHandler } from '../utils/async-handler.js';

export const authRouter = Router();

authRouter.post('/auth/signup', validate(signupSchema), asyncHandler(signupHandler));
authRouter.post('/auth/login', validate(loginSchema), asyncHandler(loginHandler));
authRouter.post('/auth/naver/callback', validate(naverCallbackSchema), asyncHandler(naverCallbackHandler));
authRouter.post('/auth/google', validate(googleLoginSchema), asyncHandler(googleLoginHandler));
authRouter.get('/auth/me', authMiddleware, asyncHandler(meHandler));
authRouter.patch('/auth/me', authMiddleware, validate(updateProfileSchema), asyncHandler(updateProfileHandler));
authRouter.delete('/auth/me', authMiddleware, asyncHandler(deleteAccountHandler));
