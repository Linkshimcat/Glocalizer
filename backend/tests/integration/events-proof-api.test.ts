import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

process.env.ANALYTICS_INTERNAL_EMAILS = 'team@glocalizer.dev, second@glocalizer.dev';

vi.mock('../../src/repositories/analytics.repository.js', () => ({
  insertAnalyticsEvent: vi.fn(),
  listAnalyticsEvents: vi.fn(),
}));
vi.mock('../../src/repositories/user.repository.js', async (importOriginal) => ({ ...(await importOriginal<object>()), findUserById: vi.fn() }));

const { createApp } = await import('../../src/app.js');
const analyticsRepo = await import('../../src/repositories/analytics.repository.js');
const users = await import('../../src/repositories/user.repository.js');
const { signAuthToken } = await import('../../src/utils/jwt.js');

const app = createApp();
const USER_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
const ADMIN_KEY = process.env.DOWNLOAD_STATS_API_KEY!;

const event = (overrides: Record<string, unknown> = {}) => ({
  eventName: 'export_succeeded',
  clientEventId: '7d1f9b0e-3c2a-4b5d-8e6f-1a2b3c4d5e6f',
  occurredAt: new Date().toISOString(),
  anonymousSessionId: 'anon_session-1234',
  experimentGroup: 'external',
  durationMs: 1800,
  imageCount: 24,
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(analyticsRepo.insertAnalyticsEvent).mockResolvedValue(undefined);
});

describe('POST /api/v1/events', () => {
  it('비로그인 이벤트를 받아 서버가 정한 그룹으로 저장하고 204를 반환한다', async () => {
    const res = await request(app).post('/api/v1/events').send(event());
    expect(res.status).toBe(204);
    expect(analyticsRepo.insertAnalyticsEvent).toHaveBeenCalledWith({
      event_name: 'export_succeeded',
      client_event_id: '7d1f9b0e-3c2a-4b5d-8e6f-1a2b3c4d5e6f',
      occurred_at: expect.any(String),
      anonymous_session_id: 'anon_session-1234',
      project_id: null,
      experiment_group: 'external',
      duration_ms: 1800,
      image_count: 24,
    });
  });

  it('팀원 계정으로 보낸 이벤트는 클라이언트 값과 상관없이 internal로 저장한다', async () => {
    vi.mocked(users.findUserById).mockResolvedValue({ id: USER_ID, email: 'second@glocalizer.dev', session_version: 0 } as never);
    const res = await request(app).post('/api/v1/events')
      .set('Authorization', `Bearer ${signAuthToken({ sub: USER_ID, ver: 0 })}`)
      .send(event({ experimentGroup: 'external' }));
    expect(res.status).toBe(204);
    expect(vi.mocked(analyticsRepo.insertAnalyticsEvent).mock.calls[0]![0].experiment_group).toBe('internal');
  });

  it('토큰이 깨져 있어도 이벤트 수집은 막지 않고 익명으로 처리한다', async () => {
    const res = await request(app).post('/api/v1/events').set('Authorization', 'Bearer broken').send(event({ experimentGroup: 'internal' }));
    expect(res.status).toBe(204);
    expect(vi.mocked(analyticsRepo.insertAnalyticsEvent).mock.calls[0]![0].experiment_group).toBe('external');
  });

  it.each([
    ['계약에 없는 필드(개인정보 차단)', { email: 'someone@example.com' }],
    ['번역문 필드', { translatedText: 'hello' }],
    ['알 수 없는 이벤트 이름', { eventName: 'page_view' }],
    ['UUID가 아닌 clientEventId', { clientEventId: 'abc' }],
    ['이메일 모양 세션 ID', { anonymousSessionId: 'someone@example.com' }],
    ['음수 소요 시간', { durationMs: -5 }],
    ['너무 먼 미래 시각', { occurredAt: new Date(Date.now() + 3 * 86_400_000).toISOString() }],
  ])('%s은 400으로 거절하고 저장하지 않는다', async (_label, overrides) => {
    const res = await request(app).post('/api/v1/events').send(event(overrides));
    expect(res.status).toBe(400);
    expect(analyticsRepo.insertAnalyticsEvent).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/proof/*', () => {
  const rows = [
    { event_name: 'localization_started', client_event_id: 'c1', occurred_at: '2026-10-29T10:00:00.000Z', anonymous_session_id: 'project-p1', project_id: 'p1', experiment_group: 'external', duration_ms: null, image_count: null },
    { event_name: 'export_succeeded', client_event_id: 'c2', occurred_at: '2026-10-29T10:05:00.000Z', anonymous_session_id: 'anon-aaaa', project_id: 'p1', experiment_group: 'external', duration_ms: 900, image_count: 24 },
  ];

  it('관리자 키가 없으면 401이다', async () => {
    expect((await request(app).get('/api/v1/proof/summary')).status).toBe(401);
    expect((await request(app).get('/api/v1/proof/export.csv')).status).toBe(401);
  });

  it('summary는 기본으로 external 그룹만 집계한다', async () => {
    vi.mocked(analyticsRepo.listAnalyticsEvents).mockResolvedValue(rows as never);
    const res = await request(app).get('/api/v1/proof/summary').set('X-Admin-Key', ADMIN_KEY);
    expect(res.status).toBe(200);
    expect(analyticsRepo.listAnalyticsEvents).toHaveBeenCalledWith('external');
    expect(res.body.completion).toEqual({ startedProjects: 1, exportedProjects: 1, rate: 1 });
  });

  it('group 쿼리로 다른 그룹을 고를 수 있고, 모르는 값은 400이다', async () => {
    vi.mocked(analyticsRepo.listAnalyticsEvents).mockResolvedValue([]);
    expect((await request(app).get('/api/v1/proof/summary?group=demo').set('X-Admin-Key', ADMIN_KEY)).status).toBe(200);
    expect(analyticsRepo.listAnalyticsEvents).toHaveBeenCalledWith('demo');
    expect((await request(app).get('/api/v1/proof/summary?group=everyone').set('X-Admin-Key', ADMIN_KEY)).status).toBe(400);
  });

  it('export.csv는 text/csv로 원자료를 내려준다', async () => {
    vi.mocked(analyticsRepo.listAnalyticsEvents).mockResolvedValue(rows as never);
    const res = await request(app).get('/api/v1/proof/export.csv').set('X-Admin-Key', ADMIN_KEY);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text.split('\n')).toHaveLength(4); // 헤더 + 2행 + 끝 줄바꿈
  });
});
