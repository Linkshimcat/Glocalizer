import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/repositories/user.repository.js', () => ({
  findUserById: vi.fn(), findUserByEmail: vi.fn(), findUserByNaverId: vi.fn(), findUserBySupabaseAuthId: vi.fn(), insertEmailUser: vi.fn(), insertGoogleUser: vi.fn(), insertNaverUser: vi.fn(), linkGoogleProfile: vi.fn(), linkNaverProfile: vi.fn(), updateUserPassword: vi.fn(), updateUserProfile: vi.fn(), bumpSessionVersion: vi.fn(),
}));
vi.mock('../../src/repositories/session.repository.js', () => ({
  insertSession: vi.fn(), findSessionById: vi.fn(), touchSessionIfStale: vi.fn(), listActiveSessions: vi.fn(), revokeSession: vi.fn(), revokeOtherSessions: vi.fn(), extendSession: vi.fn(),
}));
const { createApp } = await import('../../src/app.js');
const users = await import('../../src/repositories/user.repository.js');
const sessions = await import('../../src/repositories/session.repository.js');
const { signAuthToken, verifyAuthToken } = await import('../../src/utils/jwt.js');
const app = createApp();
const owner = '00000000-0000-4000-8000-000000000001';
const sidA = '00000000-0000-4000-8000-0000000000aa';
const sidB = '00000000-0000-4000-8000-0000000000bb';
const future = () => new Date(Date.now() + 3600_000).toISOString();
const userRow = (patch: object = {}) => ({ id: owner, email: 'a@b.com', password_hash: 'hash', naver_id: null, supabase_auth_id: null, signup_method: 'email' as const, name: '기존', avatar_url: null, name_customized: false, avatar_customized: false, session_version: 0, created_at: '', updated_at: '', ...patch });
const sessionRow = (id: string, patch: object = {}) => ({ id, user_id: owner, login_method: 'email' as const, user_agent: 'ua', device_label: 'Chrome · macOS', ip_masked: '203.0.113.x', created_at: '2026-10-19T00:00:00Z', last_seen_at: '2026-10-19T01:00:00Z', expires_at: future(), revoked_at: null, ...patch });
const bearer = (sid?: string, ver = 0) => `Bearer ${signAuthToken({ sub: owner, ver, ...(sid ? { sid } : {}) })}`;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(users.findUserById).mockResolvedValue(userRow() as never);
  vi.mocked(sessions.findSessionById).mockImplementation(async (id) => (id === sidA || id === sidB ? sessionRow(id) : null) as never);
});

describe('GET /auth/sessions', () => {
  it('lists active sessions and marks the current one', async () => {
    vi.mocked(sessions.listActiveSessions).mockResolvedValue([sessionRow(sidA), sessionRow(sidB, { device_label: 'Safari · iOS' })] as never);
    const res = await request(app).get('/api/v1/auth/sessions').set('Authorization', bearer(sidA));
    expect(res.status).toBe(200);
    expect(res.body.sessions).toHaveLength(2);
    expect(res.body.sessions.find((s: { id: string }) => s.id === sidA)).toMatchObject({ current: true, deviceLabel: 'Chrome · macOS', ipMasked: '203.0.113.x' });
    expect(res.body.sessions.find((s: { id: string }) => s.id === sidB)).toMatchObject({ current: false, deviceLabel: 'Safari · iOS' });
    expect(JSON.stringify(res.body)).not.toContain('user_agent');
  });

  it('shows a legacy entry first for tokens issued before device sessions', async () => {
    vi.mocked(sessions.listActiveSessions).mockResolvedValue([sessionRow(sidB)] as never);
    const res = await request(app).get('/api/v1/auth/sessions').set('Authorization', bearer());
    expect(res.status).toBe(200);
    expect(res.body.sessions[0]).toMatchObject({ id: 'legacy', legacy: true, current: true });
    expect(res.body.sessions[1]).toMatchObject({ id: sidB, current: false });
  });

  it('requires a login', async () => {
    expect((await request(app).get('/api/v1/auth/sessions')).status).toBe(401);
  });
});

describe('DELETE /auth/sessions/:id', () => {
  it('revokes one of the caller\'s own sessions', async () => {
    vi.mocked(sessions.revokeSession).mockResolvedValue(true);
    const res = await request(app).delete(`/api/v1/auth/sessions/${sidB}`).set('Authorization', bearer(sidA));
    expect(res.status).toBe(200);
    expect(sessions.revokeSession).toHaveBeenCalledWith(owner, sidB);
  });

  it('returns 404 when the session is not the caller\'s or already revoked', async () => {
    vi.mocked(sessions.revokeSession).mockResolvedValue(false);
    expect((await request(app).delete(`/api/v1/auth/sessions/${sidB}`).set('Authorization', bearer(sidA))).status).toBe(404);
  });

  it('rejects a malformed id', async () => {
    expect((await request(app).delete('/api/v1/auth/sessions/not-a-uuid').set('Authorization', bearer(sidA))).status).toBe(400);
  });

  it('makes the revoked device\'s token fail on its next request', async () => {
    vi.mocked(sessions.findSessionById).mockResolvedValue(sessionRow(sidB, { revoked_at: new Date().toISOString() }) as never);
    expect((await request(app).get('/api/v1/auth/me').set('Authorization', bearer(sidB))).status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('revokes the current session', async () => {
    vi.mocked(sessions.revokeSession).mockResolvedValue(true);
    const res = await request(app).post('/api/v1/auth/logout').set('Authorization', bearer(sidA));
    expect(res.status).toBe(200);
    expect(sessions.revokeSession).toHaveBeenCalledWith(owner, sidA);
  });

  it('succeeds without touching the database for legacy tokens', async () => {
    const res = await request(app).post('/api/v1/auth/logout').set('Authorization', bearer());
    expect(res.status).toBe(200);
    expect(sessions.revokeSession).not.toHaveBeenCalled();
  });
});

describe('POST /auth/sessions/revoke-others', () => {
  it('revokes every other device and returns a fresh token for this one', async () => {
    vi.mocked(users.bumpSessionVersion).mockResolvedValue(1);
    const res = await request(app).post('/api/v1/auth/sessions/revoke-others').set('Authorization', bearer(sidA));
    expect(res.status).toBe(200);
    expect(users.bumpSessionVersion).toHaveBeenCalledWith(owner, 0);
    expect(sessions.revokeOtherSessions).toHaveBeenCalledWith(owner, sidA);
    expect(sessions.extendSession).toHaveBeenCalledWith(sidA, expect.any(Date));
    expect(verifyAuthToken(res.body.token)).toMatchObject({ sub: owner, ver: 1, sid: sidA });
  });

  it('creates a session row for a legacy token so this device stays signed in', async () => {
    vi.mocked(users.bumpSessionVersion).mockResolvedValue(1);
    vi.mocked(sessions.insertSession).mockResolvedValue(sessionRow(sidB) as never);
    const res = await request(app).post('/api/v1/auth/sessions/revoke-others').set('Authorization', bearer()).set('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36');
    expect(res.status).toBe(200);
    expect(sessions.revokeOtherSessions).toHaveBeenCalledWith(owner, null);
    expect(sessions.insertSession).toHaveBeenCalledWith(expect.objectContaining({ userId: owner, deviceLabel: 'Chrome · macOS' }));
    expect(verifyAuthToken(res.body.token)).toMatchObject({ ver: 1, sid: sidB });
  });
});
