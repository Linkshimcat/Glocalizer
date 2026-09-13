import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { getCurrentUser, login, loginWithNaver, signup } from '../services/auth.service.js';

export async function signupHandler(req: Request, res: Response) {
  const result = await signup(req.body);
  res.status(201).json(result);
}

export async function loginHandler(req: Request, res: Response) {
  const result = await login(req.body);
  res.status(200).json(result);
}

export async function naverCallbackHandler(req: Request, res: Response) {
  const { code, state } = req.body;
  const result = await loginWithNaver(code, state);
  res.status(200).json(result);
}

export async function meHandler(req: Request, res: Response) {
  const user = await getCurrentUser(requireAuth(req).sub);
  res.status(200).json({ user });
}
