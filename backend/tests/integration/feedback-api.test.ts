import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/repositories/user.repository.js', () => ({
  findUserById: vi.fn(), findUserByEmail: vi.fn(), findUserByNaverId: vi.fn(), findUserBySupabaseAuthId: vi.fn(), insertEmailUser: vi.fn(), insertGoogleUser: vi.fn(), insertNaverUser: vi.fn(), linkGoogleProfile: vi.fn(), linkNaverProfile: vi.fn(), updateUserProfile: vi.fn(),
}));

const { createApp } = await import('../../src/app.js');
const { env } = await import('../../src/config/env.js');
const users = await import('../../src/repositories/user.repository.js');
const { signAuthToken } = await import('../../src/utils/jwt.js');
const app = createApp();
const owner = '00000000-0000-4000-8000-000000000001';
const auth = `Bearer ${signAuthToken({ sub: owner })}`;
const row = (patch: object = {}) => ({ id: owner, email: 'a@b.com', password_hash: 'hash', naver_id: null, supabase_auth_id: null, signup_method: 'email' as const, name: '기존', avatar_url: null, name_customized: false, avatar_customized: false, created_at: '', updated_at: '', ...patch });

const originalToken = env.GITHUB_FEEDBACK_TOKEN;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(users.findUserById).mockResolvedValue(row());
});

afterEach(() => {
  vi.unstubAllGlobals();
  (env as { GITHUB_FEEDBACK_TOKEN?: string }).GITHUB_FEEDBACK_TOKEN = originalToken;
});

describe('POST /feedback', () => {
  it('requires login', async () => {
    expect((await request(app).post('/api/v1/feedback').send({ category: 'bug', message: '개선했으면 하는 부분이 있어요' })).status).toBe(401);
  });

  it('rejects a message that is too short', async () => {
    (env as { GITHUB_FEEDBACK_TOKEN?: string }).GITHUB_FEEDBACK_TOKEN = 'token';
    expect((await request(app).post('/api/v1/feedback').set('Authorization', auth).send({ category: 'bug', message: '짧음' })).status).toBe(400);
  });

  it('rejects an unknown category', async () => {
    (env as { GITHUB_FEEDBACK_TOKEN?: string }).GITHUB_FEEDBACK_TOKEN = 'token';
    expect((await request(app).post('/api/v1/feedback').set('Authorization', auth).send({ category: 'idea', message: '개선했으면 하는 부분이 있어요' })).status).toBe(400);
  });

  it('returns 503 when no GitHub token is configured', async () => {
    (env as { GITHUB_FEEDBACK_TOKEN?: string }).GITHUB_FEEDBACK_TOKEN = undefined;
    const res = await request(app).post('/api/v1/feedback').set('Authorization', auth).send({ category: 'bug', message: '개선했으면 하는 부분이 있어요' });
    expect(res.status).toBe(503);
  });

  it('creates a GitHub issue labeled with the chosen category', async () => {
    (env as { GITHUB_FEEDBACK_TOKEN?: string }).GITHUB_FEEDBACK_TOKEN = 'token';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ html_url: 'https://github.com/Linkshimcat/Glocalizer/issues/1' }) });
    vi.stubGlobal('fetch', fetchMock);

    const res = await request(app).post('/api/v1/feedback').set('Authorization', auth).send({ category: 'feature', message: '개선했으면 하는 부분이 있어요' });

    expect(res.status).toBe(201);
    expect(res.body.issueUrl).toBe('https://github.com/Linkshimcat/Glocalizer/issues/1');
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.github.com/repos/Linkshimcat/Glocalizer/issues',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.title).toBe('[기능 제안] 개선했으면 하는 부분이 있어요');
    expect(body.body).toContain('제출자: 기존 (a@b.com)');
    expect(body.labels).toEqual(['feedback', 'enhancement']);
  });

  it('falls back to email alone when the profile has no nickname', async () => {
    (env as { GITHUB_FEEDBACK_TOKEN?: string }).GITHUB_FEEDBACK_TOKEN = 'token';
    vi.mocked(users.findUserById).mockResolvedValue(row({ name: null }));
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ html_url: 'https://github.com/Linkshimcat/Glocalizer/issues/1' }) });
    vi.stubGlobal('fetch', fetchMock);

    await request(app).post('/api/v1/feedback').set('Authorization', auth).send({ category: 'other', message: '개선했으면 하는 부분이 있어요' });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.body).toContain('제출자: a@b.com');
    expect(body.body).not.toContain('기존');
  });

  it('surfaces a failure when GitHub rejects the request', async () => {
    (env as { GITHUB_FEEDBACK_TOKEN?: string }).GITHUB_FEEDBACK_TOKEN = 'token';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }));

    const res = await request(app).post('/api/v1/feedback').set('Authorization', auth).send({ category: 'other', message: '개선했으면 하는 부분이 있어요' });
    expect(res.status).toBe(502);
  });
});
