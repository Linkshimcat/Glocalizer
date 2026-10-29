import { createHash } from 'node:crypto';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { authenticateAccount } from '../middleware/auth.middleware.js';
import { insertAnalyticsEvent, listAnalyticsEvents } from '../repositories/analytics.repository.js';
import { findProjectById } from '../repositories/project.repository.js';
import { findUserById } from '../repositories/user.repository.js';
import type { AnalyticsEventInput } from '../schemas/analytics.schema.js';
import type { AnalyticsEventName, ExperimentGroup } from '../types/analytics.js';
import type { JobRow } from '../types/job.js';
import { safeLogError } from '../utils/log-error.js';
import { eventsToCsv, resolveExperimentGroup, summarizeEvents, type ProofSummary } from './proof.js';

/** 이벤트 수집은 로그인을 요구하지 않는다. 토큰이 있으면 팀원 판정에만 쓰고, 깨진 토큰이어도 익명으로 받는다. */
async function accountEmail(authorization: string | undefined): Promise<string | null> {
  if (!authorization) return null;
  try {
    return (await authenticateAccount(authorization)).email ?? null;
  } catch {
    return null;
  }
}

export async function recordClientEvent(input: AnalyticsEventInput, authorization: string | undefined): Promise<void> {
  const email = await accountEmail(authorization);
  await insertAnalyticsEvent({
    event_name: input.eventName as AnalyticsEventName,
    client_event_id: input.clientEventId,
    occurred_at: input.occurredAt,
    anonymous_session_id: input.anonymousSessionId,
    project_id: input.projectId ?? null,
    experiment_group: resolveExperimentGroup(input.experimentGroup, email, env.ANALYTICS_INTERNAL_EMAILS),
    duration_ms: input.durationMs ?? null,
    image_count: input.imageCount ?? null,
  });
}

/** 같은 작업·같은 이벤트면 항상 같은 UUID — 작업이 재시도돼도 한 번만 쌓인다. */
function jobEventId(jobId: string, eventName: AnalyticsEventName): string {
  const hex = createHash('sha256').update(`${jobId}:${eventName}`).digest('hex');
  const variant = ((parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/**
 * 워커가 남기는 서버 측 이벤트. 측정 때문에 현지화 작업이 실패하면 안 되므로 어떤 오류도 던지지 않는다.
 */
export async function recordJobEvent(
  job: Pick<JobRow, 'id' | 'project_id'>,
  eventName: AnalyticsEventName,
  extra: { durationMs?: number; imageCount?: number } = {},
): Promise<void> {
  try {
    const project = await findProjectById(job.project_id);
    const owner = project?.owner_id ? await findUserById(project.owner_id) : null;
    await insertAnalyticsEvent({
      event_name: eventName,
      client_event_id: jobEventId(job.id, eventName),
      occurred_at: new Date().toISOString(),
      anonymous_session_id: `project-${job.project_id}`,
      project_id: job.project_id,
      experiment_group: resolveExperimentGroup('external', owner?.email ?? null, env.ANALYTICS_INTERNAL_EMAILS),
      duration_ms: extra.durationMs ?? null,
      image_count: extra.imageCount ?? null,
    });
  } catch (err) {
    logger.warn({ jobId: job.id, eventName, err: safeLogError(err) }, 'Analytics job event was not recorded');
  }
}

export async function getProofSummary(group: ExperimentGroup): Promise<ProofSummary> {
  return summarizeEvents(await listAnalyticsEvents(group), group);
}

export async function getProofCsv(group: ExperimentGroup): Promise<string> {
  return eventsToCsv(await listAnalyticsEvents(group));
}
