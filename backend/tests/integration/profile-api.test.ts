import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import sharp from 'sharp';

vi.mock('../../src/repositories/user.repository.js', () => ({
  findUserById: vi.fn(), findUserByEmail: vi.fn(), findUserByNaverId: vi.fn(), findUserBySupabaseAuthId: vi.fn(), insertEmailUser: vi.fn(), insertGoogleUser: vi.fn(), insertNaverUser: vi.fn(), linkGoogleProfile: vi.fn(), linkNaverProfile: vi.fn(), updateUserProfile: vi.fn(),
}));
const { createApp } = await import('../../src/app.js');
const users = await import('../../src/repositories/user.repository.js');
const { signAuthToken } = await import('../../src/utils/jwt.js');
const app = createApp();
const owner = '00000000-0000-4000-8000-000000000001';
const auth = `Bearer ${signAuthToken({ sub: owner })}`;
const row = (patch: object = {}) => ({ id: owner, email: 'a@b.com', password_hash: 'hash', naver_id: null, supabase_auth_id: null, signup_method: 'email' as const, name: '기존', avatar_url: null, name_customized: false, avatar_customized: false, created_at: '', updated_at: '', ...patch });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(users.findUserById).mockResolvedValue(row());
  vi.mocked(users.updateUserProfile).mockImplementation(async (_id, input) => row({ name: input.name ?? '기존', avatar_url: input.avatarUrl ?? null }));
});

describe('GET /auth/me', () => {
  it('returns the original email signup method even when Naver is linked', async () => {
    vi.mocked(users.findUserById).mockResolvedValue(row({ naver_id: 'naver-id' }));
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body.user.signupMethod).toBe('email');
  });

  it('returns the Naver signup method for a social account', async () => {
    vi.mocked(users.findUserById).mockResolvedValue(row({ password_hash: null, naver_id: 'naver-id', signup_method: 'naver' }));
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body.user.signupMethod).toBe('naver');
  });
});

describe('PATCH /auth/me', () => {
  it('requires login', async () => {
    expect((await request(app).patch('/api/v1/auth/me').send({ name: 'x' })).status).toBe(401);
  });
  it('updates the nickname', async () => {
    const res = await request(app).patch('/api/v1/auth/me').set('Authorization', auth).send({ name: '  새닉네임 ' });
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('새닉네임');
    expect(users.updateUserProfile).toHaveBeenCalledWith(owner, { name: '새닉네임', avatarUrl: undefined });
  });
  it('rejects empty or too long nicknames', async () => {
    expect((await request(app).patch('/api/v1/auth/me').set('Authorization', auth).send({ name: '   ' })).status).toBe(400);
    expect((await request(app).patch('/api/v1/auth/me').set('Authorization', auth).send({ name: 'x'.repeat(31) })).status).toBe(400);
    expect((await request(app).patch('/api/v1/auth/me').set('Authorization', auth).send({})).status).toBe(400);
  });
  it('re-encodes the avatar to a 256px webp', async () => {
    const png = await sharp({ create: { width: 800, height: 400, channels: 3, background: '#ff0000' } }).png().toBuffer();
    const res = await request(app).patch('/api/v1/auth/me').set('Authorization', auth).send({ avatar: `data:image/png;base64,${png.toString('base64')}` });
    expect(res.status).toBe(200);
    const saved = vi.mocked(users.updateUserProfile).mock.calls[0][1].avatarUrl!;
    expect(saved.startsWith('data:image/webp;base64,')).toBe(true);
    const meta = await sharp(Buffer.from(saved.split(',')[1], 'base64')).metadata();
    expect([meta.width, meta.height]).toEqual([256, 256]);
  });
  it('resets the avatar with null and rejects broken images', async () => {
    expect((await request(app).patch('/api/v1/auth/me').set('Authorization', auth).send({ avatar: null })).status).toBe(200);
    expect(users.updateUserProfile).toHaveBeenCalledWith(owner, { name: undefined, avatarUrl: null });
    expect((await request(app).patch('/api/v1/auth/me').set('Authorization', auth).send({ avatar: 'data:image/png;base64,AAAA' })).status).toBe(422);
    expect((await request(app).patch('/api/v1/auth/me').set('Authorization', auth).send({ avatar: 'https://evil.example/x.png' })).status).toBe(400);
  });
});
