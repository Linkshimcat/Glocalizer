import type { Request, Response } from 'express';
import { AppError } from '../errors/app-error.js';
import { requireProject } from '../middleware/project-auth.middleware.js';
import { getProjectQaSummary, inspectProjectQa } from '../qa/qa.service.js';

/** 파일 파트의 필드 이름이 곧 assetId다. 같은 이미지를 두 번 보내면 어느 쪽을 검사했는지 모호해져 거절한다. */
function uploadsByAsset(files: Express.Multer.File[] | undefined): Map<string, Buffer> {
  const uploads = new Map<string, Buffer>();
  for (const file of files ?? []) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(file.fieldname) || uploads.has(file.fieldname)) {
      throw new AppError('INVALID_REQUEST', { field: file.fieldname }, '이미지 파일은 assetId를 필드 이름으로 한 번씩만 보내야 합니다.');
    }
    uploads.set(file.fieldname.toLowerCase(), file.buffer);
  }
  return uploads;
}

export async function inspectQaHandler(req: Request, res: Response) {
  const uploads = uploadsByAsset(req.files as Express.Multer.File[] | undefined);
  res.json(await inspectProjectQa(requireProject(req), uploads, (req.body as { assetId?: string }).assetId?.toLowerCase()));
}

export async function getQaHandler(req: Request, res: Response) {
  res.json(await getProjectQaSummary(requireProject(req).id));
}
