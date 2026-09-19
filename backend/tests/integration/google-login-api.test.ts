import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/config/supabase.js', () => ({
  supabase: { auth: { getUser: vi.fn() } },
}));
vi.mock('../../src/repositories/user.repository.js', () => ({
  findUserById: vi.fn(), findUserByEmail: vi.fn(), findUserByNaverId: vi.fn(), findUserBySupabaseAuthId: vi.fn(), insertEmailUser: vi.fn(), insertGoogleUser: vi.fn(), insertNaverUser: vi.fn(), linkGoogleProfile: vi.fn(), linkNaverProfile: vi.fn(), updateUserProfile: vi.fn(),
}));

const { createApp } = await import('../../src/app.js');
const { supabase } = await import('../../src/config/supabase.js');
const users = await import('../../src/repositories/user.repository.js');
const app = createApp();
const owner = '00000000-0000-4000-8000-000000000001';
const authUserId = '00000000-0000-4000-8000-000000000002';

const row = (patch: object = {}) => ({
  id: owner,
  email: 'user@example.com',
  password_hash: null,
  naver_id: null,
  supabase_auth_id: authUserId,
  signup_method: 'google' as const,
  name: 'Google User',
  avatar_url: 'https://example.com/avatar.png',
  name_customized: false,
  avatar_customized: false,
  created_at: '',
  updated_at: '',
  ...patch,
});

const verifiedGoogleUser = {
  id: authUserId,
  email: 'User@Example.com',
  email_confirmed_at: '2026-09-19T00:00:00Z',
  identities: [{ provider: 'google', identity_data: { name: 'Google User', avatar_url: 'https://example.com/avatar.png' } }],
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: verifiedGoogleUser }, error: null } as never);
  vi.mocked(users.findUserBySupabaseAuthId).mockResolvedValue(null);
  vi.mocked(users.findUserByEmail).mockResolvedValue(null);
  vi.mocked(users.insertGoogleUser).mockResolvedValue(row());
});

describe('POST /auth/google', () => {
  it('creates a Google account from a verified Supabase identity', async () => {
    const res = await request(app).post('/api/v1/auth/google').send({ accessToken: 'verified-token' });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email: 'user@example.com', signupMethod: 'google' });
    expect(res.body.token).toEqual(expect.any(String));
    expect(users.insertGoogleUser).toHaveBeenCalledWith({
      supabaseAuthId: authUserId,
      email: 'user@example.com',
      name: 'Google User',
      avatarUrl: 'https://example.com/avatar.png',
    });
  });

  it('links a verified Google identity to an existing email account', async () => {
    const existing = row({ supabase_auth_id: null, password_hash: 'hash', signup_method: 'email' });
    vi.mocked(users.findUserByEmail).mockResolvedValue(existing);
    vi.mocked(users.linkGoogleProfile).mockResolvedValue(row({ password_hash: 'hash', signup_method: 'email' }));
    const res = await request(app).post('/api/v1/auth/google').send({ accessToken: 'verified-token' });
    expect(res.status).toBe(200);
    expect(res.body.user.signupMethod).toBe('email');
    expect(users.linkGoogleProfile).toHaveBeenCalledWith(existing, expect.objectContaining({ supabaseAuthId: authUserId }));
  });

  it('does not overwrite an email account linked to another Google identity', async () => {
    vi.mocked(users.findUserByEmail).mockResolvedValue(row({ supabase_auth_id: '00000000-0000-4000-8000-000000000099' }));
    const res = await request(app).post('/api/v1/auth/google').send({ accessToken: 'verified-token' });
    expect(res.status).toBe(409);
    expect(users.linkGoogleProfile).not.toHaveBeenCalled();
  });

  it('rejects tokens that are invalid or not backed by a Google identity', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } } as never);
    expect((await request(app).post('/api/v1/auth/google').send({ accessToken: 'bad-token' })).status).toBe(401);

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { ...verifiedGoogleUser, identities: [{ provider: 'email', identity_data: {} }] } },
      error: null,
    } as never);
    expect((await request(app).post('/api/v1/auth/google').send({ accessToken: 'email-token' })).status).toBe(401);
  });

  it('rejects a missing access token before calling Supabase', async () => {
    const res = await request(app).post('/api/v1/auth/google').send({});
    expect(res.status).toBe(400);
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
  });
});
