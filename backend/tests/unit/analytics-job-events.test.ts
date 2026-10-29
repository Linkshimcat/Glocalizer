import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.ANALYTICS_INTERNAL_EMAILS = 'team@glocalizer.dev';

vi.mock('../../src/repositories/analytics.repository.js', () => ({ insertAnalyticsEvent: vi.fn(), listAnalyticsEvents: vi.fn() }));
vi.mock('../../src/repositories/project.repository.js', () => ({ findProjectById: vi.fn() }));
vi.mock('../../src/repositories/user.repository.js', () => ({ findUserById: vi.fn() }));

const { recordJobEvent } = await import('../../src/analytics/analytics.service.js');
const analyticsRepo = await import('../../src/repositories/analytics.repository.js');
const projects = await import('../../src/repositories/project.repository.js');
const users = await import('../../src/repositories/user.repository.js');

const JOB = { id: 'f0e1d2c3-b4a5-4968-8776-655443322110', project_id: 'c3d4e5f6-a7b8-4c9d-8e0f-1a2b3c4d5e6f' };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(analyticsRepo.insertAnalyticsEvent).mockResolvedValue(undefined);
  vi.mocked(projects.findProjectById).mockResolvedValue({ id: JOB.project_id, owner_id: null } as never);
});

describe('recordJobEvent', () => {
  it('같은 작업의 같은 이벤트는 재시도해도 같은 clientEventId라 한 번만 쌓인다', async () => {
    await recordJobEvent(JOB, 'localization_started');
    await recordJobEvent(JOB, 'localization_started');
    await recordJobEvent(JOB, 'localization_completed', { durationMs: 1234, imageCount: 3 });
    const ids = vi.mocked(analyticsRepo.insertAnalyticsEvent).mock.calls.map(([r]) => r.client_event_id);
    expect(ids[0]).toBe(ids[1]);
    expect(ids[2]).not.toBe(ids[0]);
    expect(ids[0]).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('프로젝트 단위 익명 ID와 소요 시간·이미지 수를 저장한다', async () => {
    await recordJobEvent(JOB, 'localization_completed', { durationMs: 5000, imageCount: 24 });
    expect(analyticsRepo.insertAnalyticsEvent).toHaveBeenCalledWith(expect.objectContaining({
      event_name: 'localization_completed', project_id: JOB.project_id, anonymous_session_id: `project-${JOB.project_id}`,
      experiment_group: 'external', duration_ms: 5000, image_count: 24,
    }));
  });

  it('팀원이 소유한 프로젝트는 internal로 기록한다', async () => {
    vi.mocked(projects.findProjectById).mockResolvedValue({ id: JOB.project_id, owner_id: 'u1' } as never);
    vi.mocked(users.findUserById).mockResolvedValue({ id: 'u1', email: 'team@glocalizer.dev' } as never);
    await recordJobEvent(JOB, 'localization_started');
    expect(vi.mocked(analyticsRepo.insertAnalyticsEvent).mock.calls[0]![0].experiment_group).toBe('internal');
  });

  it('저장에 실패해도 던지지 않는다 (측정 때문에 현지화 작업이 실패하면 안 된다)', async () => {
    vi.mocked(analyticsRepo.insertAnalyticsEvent).mockRejectedValue(new Error('db down'));
    await expect(recordJobEvent(JOB, 'localization_started')).resolves.toBeUndefined();
  });
});
