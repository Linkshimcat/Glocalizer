import type { Request, Response } from 'express';
import { getProofCsv, getProofSummary, recordClientEvent } from '../analytics/analytics.service.js';
import type { AnalyticsEventInput } from '../schemas/analytics.schema.js';
import type { ExperimentGroup } from '../types/analytics.js';

export async function recordEventHandler(req: Request, res: Response) {
  await recordClientEvent(req.body as AnalyticsEventInput, req.header('authorization'));
  res.status(204).end();
}

export async function proofSummaryHandler(req: Request, res: Response) {
  // 키 없는 공개 요청만 짧게 캐시한다. 키를 보낸 요청은 원자료(CSV)와 대조할 수 있도록 항상 최신값이다.
  res.json(await getProofSummary((req.query as { group: ExperimentGroup }).group, { cached: res.locals.proofPublic === true }));
}

export async function proofCsvHandler(req: Request, res: Response) {
  const group = (req.query as { group: ExperimentGroup }).group;
  res.type('text/csv; charset=utf-8')
    .attachment(`glocalizer-events-${group}.csv`)
    .send(await getProofCsv(group));
}
