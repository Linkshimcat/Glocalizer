import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/config/supabase.js', () => ({
  supabase: { auth: { getUser: vi.fn() } },
}));
vi.mock('../../src/repositories/user.repository.js', () => ({
  findUserById: vi.fn(), findUserByEmail: vi.fn(), findUserByNaverId: vi.fn(), findUserBySupabaseAuthId: vi.fn(), insertEmailUser: vi.fn(), insertGoogleUser: vi.fn(), insertNaverUser: vi.fn(), linkGoogleProfile: vi.fn(), linkNaverProfile: vi.fn(), updateUserProfile: vi.fn(),
}));
vi.mock('../../src/services/email.service.js', () => ({ sendWelcomeEmail: vi.fn() }));

const { createApp } = await import('../../src/app.js');
const { supabase } = await import('../../src/config/supabase.js');
const users = await import('../../src/repositories/user.repository.js');
const { sendWelcomeEmail } = await import('../../src/services/email.service.js');
const app = createApp();

const row = (patch: object = {}) => ({
  id: '00000000-0000-4000-8000-000000000001',
  email: 'user@example.com',
  password_hash: null,
  naver_id: null,
  supabase_auth_id: null,
  signup_method: 'email' as const,
  name: 'User',
  avatar_url: null,
  name_customized: false,
  avatar_customized: false,
  created_at: '',
  updated_at: '',
  ...patch,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(users.findUserByEmail).mockResolvedValue(null);
  vi.mocked(users.findUserBySupabaseAuthId).mockResolvedValue(null);
});

describe('welcome email on account creation', () => {
  it('sends one welcome email after an email signup', async () => {
    const created = row({ password_hash: 'hash' });
    vi.mocked(users.insertEmailUser).mockResolvedValue(created);
    const res = await request(app).post('/api/v1/auth/signup').send({ email: 'user@example.com', password: 'password123', name: 'User' });
    expect(res.status).toBe(201);
    expect(sendWelcomeEmail).toHaveBeenCalledTimes(1);
    expect(sendWelcomeEmail).toHaveBeenCalledWith(created);
  });

  it('sends it for a new Google account but not when linking an existing account', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: '00000000-0000-4000-8000-000000000002', email: 'user@example.com', email_confirmed_at: '2026-10-11T00:00:00Z', identities: [{ provider: 'google', identity_data: {} }] } },
      error: null,
    } as never);
    vi.mocked(users.insertGoogleUser).mockResolvedValue(row({ signup_method: 'google' }));
    expect((await request(app).post('/api/v1/auth/google').send({ accessToken: 'token' })).status).toBe(200);
    expect(sendWelcomeEmail).toHaveBeenCalledTimes(1);

    vi.mocked(sendWelcomeEmail).mockClear();
    vi.mocked(users.findUserByEmail).mockResolvedValue(row({ password_hash: 'hash' }));
    vi.mocked(users.linkGoogleProfile).mockResolvedValue(row({ password_hash: 'hash' }));
    expect((await request(app).post('/api/v1/auth/google').send({ accessToken: 'token' })).status).toBe(200);
    expect(sendWelcomeEmail).not.toHaveBeenCalled();
  });

  it('does not wait for the email before answering the signup', async () => {
    vi.mocked(users.insertEmailUser).mockResolvedValue(row({ password_hash: 'hash' }));
    vi.mocked(sendWelcomeEmail).mockReturnValue(new Promise(() => {}));
    const res = await request(app).post('/api/v1/auth/signup').send({ email: 'user@example.com', password: 'password123' });
    expect(res.status).toBe(201);
  });
});
