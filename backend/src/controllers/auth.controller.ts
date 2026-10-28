import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { changePassword, deleteAccount, getCurrentUser, getSessions, login, loginWithGoogle, loginWithKakao, loginWithNaver, logoutSession, revokeOtherUserSessions, revokeUserSession, signup, updateEmailPreferences, updateProfile } from '../services/auth.service.js';
import type { SessionContext } from '../types/session.js';

function sessionContext(req: Request): SessionContext {
  const deviceId = req.get('x-glocalizer-device-id');
  return {
    userAgent: req.get('user-agent') ?? undefined,
    ip: req.ip,
    deviceId: deviceId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(deviceId) ? deviceId : undefined,
  };
}

export async function signupHandler(req: Request, res: Response) {
  const result = await signup(req.body, sessionContext(req));
  res.status(201).json(result);
}

export async function loginHandler(req: Request, res: Response) {
  const result = await login(req.body, sessionContext(req));
  res.status(200).json(result);
}

export async function naverCallbackHandler(req: Request, res: Response) {
  const { code, state } = req.body;
  const result = await loginWithNaver(code, state, sessionContext(req));
  res.status(200).json(result);
}

export async function kakaoCallbackHandler(req: Request, res: Response) {
  const { code, redirectUri } = req.body;
  const result = await loginWithKakao(code, redirectUri, sessionContext(req));
  res.status(200).json(result);
}

export async function googleLoginHandler(req: Request, res: Response) {
  const result = await loginWithGoogle(req.body, sessionContext(req));
  res.status(200).json(result);
}

export async function meHandler(req: Request, res: Response) {
  const user = await getCurrentUser(requireAuth(req).sub);
  res.status(200).json({ user });
}

export async function updateProfileHandler(req: Request, res: Response) {
  const user = await updateProfile(requireAuth(req).sub, req.body);
  res.status(200).json({ user });
}

export async function updateEmailPreferencesHandler(req: Request, res: Response) {
  const user = await updateEmailPreferences(requireAuth(req).sub, req.body);
  res.status(200).json({ user });
}

export async function changePasswordHandler(req: Request, res: Response) {
  await changePassword(requireAuth(req).sub, req.body);
  res.status(200).json({ success: true });
}

export async function deleteAccountHandler(req: Request, res: Response) {
  await deleteAccount(requireAuth(req).sub);
  res.status(200).json({ success: true });
}

export async function listSessionsHandler(req: Request, res: Response) {
  const sessions = await getSessions(requireAuth(req).sub, req.sid);
  res.status(200).json({ sessions });
}

export async function logoutHandler(req: Request, res: Response) {
  await logoutSession(requireAuth(req).sub, req.sid);
  res.status(200).json({ success: true });
}

export async function revokeSessionHandler(req: Request, res: Response) {
  await revokeUserSession(requireAuth(req).sub, String(req.params.id));
  res.status(200).json({ success: true });
}

export async function revokeOtherSessionsHandler(req: Request, res: Response) {
  const result = await revokeOtherUserSessions(requireAuth(req).sub, req.sid, sessionContext(req));
  res.status(200).json(result);
}
