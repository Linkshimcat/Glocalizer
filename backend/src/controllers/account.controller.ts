import type { Request, Response } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { logger } from '../config/logger.js';
import { exportAccountData, getAccountSummary, getLoginHistory } from '../services/account.service.js';
import { sendDataExportEmail, writeAccountExport } from '../services/data-export.service.js';
import { safeLogError } from '../utils/log-error.js';

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

export async function exportAccountZipHandler(req: Request, res: Response) {
  const userId = requireAuth(req).sub;
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  res.status(200).type('application/zip').attachment(`glocalizer-my-data-${date}.zip`).setHeader('Cache-Control', 'no-store');
  try {
    await writeAccountExport(userId, req.sid, res);
  } catch (err) {
    // 이미 ZIP을 보내기 시작했으면 오류 JSON을 덧붙일 수 없으니 연결을 끊어 받다 만 파일임을 알린다.
    if (res.headersSent) {
      logger.warn({ userId, err: safeLogError(err) }, 'Account export stream failed');
      res.destroy(err instanceof Error ? err : undefined);
      return;
    }
    res.removeHeader('Content-Disposition');
    throw err;
  }
}

export async function emailAccountExportHandler(req: Request, res: Response) {
  res.status(202).json(await sendDataExportEmail(requireAuth(req).sub, `${req.protocol}://${req.get('host')}`));
}
