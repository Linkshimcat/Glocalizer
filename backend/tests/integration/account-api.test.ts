import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/repositories/user.repository.js', () => ({
  findUserById: vi.fn(), findUserByEmail: vi.fn(), findUserByNaverId: vi.fn(), findUserBySupabaseAuthId: vi.fn(), insertEmailUser: vi.fn(), insertGoogleUser: vi.fn(), insertNaverUser: vi.fn(), linkGoogleProfile: vi.fn(), linkNaverProfile: vi.fn(), updateUserPassword: vi.fn(), updateUserProfile: vi.fn(), updateSecurityEmailPreferences: vi.fn(), bumpSessionVersion: vi.fn(),
}));
vi.mock('../../src/repositories/session.repository.js', () => ({
  insertSession: vi.fn(), findSessionById: vi.fn(), touchSessionIfStale: vi.fn(), listActiveSessions: vi.fn(), listLoginHistory: vi.fn(), revokeSession: vi.fn(), revokeOtherSessions: vi.fn(), extendSession: vi.fn(),
}));
vi.mock('../../src/repositories/project.repository.js', async importOriginal => ({ ...(await importOriginal<object>()), findProjectsByOwner: vi.fn() }));
vi.mock('../../src/repositories/payment.repository.js', async importOriginal => ({ ...(await importOriginal<object>()), listPaymentsByUser: vi.fn() }));
const { createApp } = await import('../../src/app.js');
const users = await import('../../src/repositories/user.repository.js');
const sessions = await import('../../src/repositories/session.repository.js');
const projects = await import('../../src/repositories/project.repository.js');
const payments = await import('../../src/repositories/payment.repository.js');
const { signAuthToken } = await import('../../src/utils/jwt.js');
const app = createApp();
const owner = '00000000-0000-4000-8000-000000000001';
const sidA = '00000000-0000-4000-8000-0000000000aa';
const sidB = '00000000-0000-4000-8000-0000000000bb';
const future = () => new Date(Date.now() + 3600_000).toISOString();
const userRow = (patch: object = {}) => ({ id: owner, email: 'a@b.com', password_hash: 'hash', naver_id: null, kakao_id: null, supabase_auth_id: null, signup_method: 'email' as const, name: '기존', avatar_url: null, name_customized: false, avatar_customized: false, session_version: 0, security_email_notifications: true, created_at: '2026-10-01T00:00:00Z', updated_at: '', ...patch });
const sessionRow = (id: string, patch: object = {}) => ({ id, user_id: owner, login_method: 'email' as const, user_agent: 'ua', device_label: 'Chrome · macOS', ip_masked: '203.0.113.x', created_at: '2026-10-19T00:00:00Z', last_seen_at: '2026-10-19T01:00:00Z', expires_at: future(), revoked_at: null, ...patch });
const projectRow = (id: string, patch: object = {}) => ({ id, name: `프로젝트 ${id}`, status: 'completed', result_ready: true, target_languages: ['en'], created_at: '2026-10-02T00:00:00Z', updated_at: '2026-10-03T00:00:00Z', ...patch });
const bearer = (sid = sidA) => `Bearer ${signAuthToken({ sub: owner, ver: 0, sid })}`;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(users.findUserById).mockResolvedValue(userRow() as never);
  vi.mocked(sessions.findSessionById).mockImplementation(async id => (id === sidA || id === sidB ? sessionRow(id) : null) as never);
});

describe('GET /auth/me/summary', () => {
  it('counts projects and completed results', async () => {
    vi.mocked(projects.findProjectsByOwner).mockResolvedValue([projectRow('b'), projectRow('a', { result_ready: false })] as never);
    const res = await request(app).get('/api/v1/auth/me/summary').set('Authorization', bearer());
    expect(res.status).toBe(200);
    expect(res.body.summary).toEqual({ projectCount: 2, completedProjectCount: 1, lastActivityAt: '2026-10-03T00:00:00Z' });
  });

  it('returns zeros for an empty account', async () => {
    vi.mocked(projects.findProjectsByOwner).mockResolvedValue([]);
    const res = await request(app).get('/api/v1/auth/me/summary').set('Authorization', bearer());
    expect(res.body.summary).toEqual({ projectCount: 0, completedProjectCount: 0, lastActivityAt: null });
  });

  it('requires a login', async () => {
    expect((await request(app).get('/api/v1/auth/me/summary')).status).toBe(401);
  });
});

describe('GET /auth/login-history', () => {
  it('includes revoked sessions and marks the current one', async () => {
    vi.mocked(sessions.listLoginHistory).mockResolvedValue([sessionRow(sidA), sessionRow(sidB, { revoked_at: '2026-10-20T00:00:00Z', device_label: 'Safari · iOS' })] as never);
    const res = await request(app).get('/api/v1/auth/login-history').set('Authorization', bearer());
    expect(res.status).toBe(200);
    expect(res.body.history[0]).toMatchObject({ id: sidA, current: true, active: true });
    expect(res.body.history[1]).toMatchObject({ id: sidB, current: false, active: false, deviceLabel: 'Safari · iOS' });
    expect(JSON.stringify(res.body)).not.toContain('user_agent');
  });
});

describe('GET /payments', () => {
  it('maps rows to a public shape without payment keys', async () => {
    vi.mocked(payments.listPaymentsByUser).mockResolvedValue([{ id: 'p1', order_id: 'order_1', user_id: owner, plan_id: 'creator', amount: 9900, status: 'done', method: '카드', approved_at: '2026-10-25T00:00:00Z', created_at: '2026-10-25T00:00:00Z', updated_at: '' }] as never);
    const res = await request(app).get('/api/v1/payments').set('Authorization', bearer());
    expect(res.status).toBe(200);
    expect(res.body.payments).toEqual([{ orderId: 'order_1', planName: '크리에이터 멤버십', amount: 9900, status: 'done', method: '카드', approvedAt: '2026-10-25T00:00:00Z', createdAt: '2026-10-25T00:00:00Z' }]);
    expect(JSON.stringify(res.body)).not.toMatch(/payment_key|raw_response|toss/i);
  });
});

describe('GET /auth/me/export', () => {
  it('downloads profile, projects, login history and payments as JSON', async () => {
    vi.mocked(projects.findProjectsByOwner).mockResolvedValue([projectRow('a')] as never);
    vi.mocked(sessions.listLoginHistory).mockResolvedValue([sessionRow(sidA)] as never);
    vi.mocked(payments.listPaymentsByUser).mockResolvedValue([]);
    const res = await request(app).get('/api/v1/auth/me/export').set('Authorization', bearer());
    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toContain('attachment');
    expect(res.body).toMatchObject({ profile: { email: 'a@b.com' }, projects: [{ id: 'a', targetLanguages: ['en'] }], loginHistory: [{ id: sidA }], payments: [] });
    expect(JSON.stringify(res.body)).not.toMatch(/password_hash|"hash"/);
  });
});

describe('PATCH /auth/me/email-preferences', () => {
  it('accepts a single per-type change', async () => {
    vi.mocked(users.updateSecurityEmailPreferences).mockResolvedValue(userRow({ security_email_new_device: false }) as never);
    const res = await request(app).patch('/api/v1/auth/me/email-preferences').set('Authorization', bearer()).send({ newDeviceLogin: false });
    expect(res.status).toBe(200);
    expect(users.updateSecurityEmailPreferences).toHaveBeenCalledWith(owner, { newDeviceLogin: false });
    expect(res.body.user.securityEmailTypes).toEqual({ newDeviceLogin: false, passwordChanged: true, otherSessionsSignedOut: true });
  });

  it('rejects an empty body', async () => {
    expect((await request(app).patch('/api/v1/auth/me/email-preferences').set('Authorization', bearer()).send({})).status).toBe(400);
  });
});
