import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { exportAccountData, getAccountSummary, getLoginHistory } from '../services/account.service.js';

export async function accountSummaryHandler(req: Request, res: Response) {
  res.status(200).json({ summary: await getAccountSummary(requireAuth(req).sub) });
}

export async function loginHistoryHandler(req: Request, res: Response) {
  res.status(200).json({ history: await getLoginHistory(requireAuth(req).sub, req.sid) });
}

export async function exportAccountDataHandler(req: Request, res: Response) {
  const data = await exportAccountData(requireAuth(req).sub, req.sid);
  res.setHeader('Content-Disposition', 'attachment; filename="glocalizer-my-data.json"');
  res.status(200).json(data);
}
