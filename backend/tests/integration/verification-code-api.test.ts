import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

process.env.VERIFICATION_CODE_MAX_PER_HOUR = '100';
process.env.PASSWORD_RATE_LIMIT_MAX_REQUESTS = '100';

vi.mock('../../src/repositories/user.repository.js', async (importOriginal) => ({ ...(await importOriginal<object>()), findUserById: vi.fn(), updateUserPassword: vi.fn() }));
vi.mock('../../src/repositories/session.repository.js', async (importOriginal) => ({
  ...(await importOriginal<object>()), findSessionById: vi.fn(), touchSessionIfStale: vi.fn(), revokeOtherSessions: vi.fn(),
}));
vi.mock('../../src/services/deletion.service.js', () => ({ deleteDurably: vi.fn() }));
vi.mock('../../src/services/email.service.js', async (importOriginal) => ({ ...(await importOriginal<object>()), sendEmail: vi.fn(), sendPasswordChangedEmail: vi.fn() }));

const { createApp } = await import('../../src/app.js');
const users = await import('../../src/repositories/user.repository.js');
const { deleteDurably } = await import('../../src/services/deletion.service.js');
const email = await import('../../src/services/email.service.js');
const { signAuthToken } = await import('../../src/utils/jwt.js');
const { hashPassword } = await import('../../src/utils/password.js');

const app = createApp();
const OWNER = '00000000-0000-4000-8000-000000000001';
const OTHER = '00000000-0000-4000-8000-000000000002';
const bearer = (sub = OWNER) => `Bearer ${signAuthToken({ sub, ver: 0 })}`;
const userRow = (patch: object = {}) => ({
  id: OWNER, email: 'me@example.com', password_hash: 'hash', naver_id: null, kakao_id: null, supabase_auth_id: null, signup_method: 'email',
  name: '윤재', avatar_url: null, name_customized: false, avatar_customized: false, session_version: 0, deleting_at: null,
  security_email_notifications: true, created_at: '2026-10-01T00:00:00Z', updated_at: '', ...patch,
});

/** 코드를 요청하고, 메일 본문에서 코드를 꺼내 챌린지와 함께 돌려준다. */
async function requestCode(purpose: 'delete-account' | 'change-password', sub = OWNER) {
  const res = await request(app).post('/api/v1/auth/me/verification-code').set('Authorization', bearer(sub)).send({ purpose });
  expect(res.status).toBe(200);
  const mail = vi.mocked(email.sendEmail).mock.calls.at(-1)![0];
  const code = /\b(\d{6})\b/.exec(mail.text)![1]!;
  return { challenge: res.body.challenge as string, code, body: res.body, mail };
}

const otherCode = (code: string) => String((Number(code) + 1) % 1_000_000).padStart(6, '0');

beforeEach(() => {
  vi.resetAllMocks();
  vi.useRealTimers();
  vi.mocked(users.findUserById).mockResolvedValue(userRow() as never);
  vi.mocked(email.sendEmail).mockResolvedValue(true);
  vi.mocked(deleteDurably).mockResolvedValue(undefined);
});

describe('POST /auth/me/verification-code', () => {
  it('requires login and a known purpose', async () => {
    expect((await request(app).post('/api/v1/auth/me/verification-code').send({ purpose: 'delete-account' })).status).toBe(401);
    expect((await request(app).post('/api/v1/auth/me/verification-code').set('Authorization', bearer()).send({ purpose: 'other' })).status).toBe(400);
  });

  it('mails a 6-digit code to the account email and never returns the code itself', async () => {
    const { body, mail, code } = await requestCode('delete-account');
    expect(mail.to).toBe('me@example.com');
    expect(mail.subject).toContain('인증');
    expect(mail.html).toContain(code);
    expect(body).toMatchObject({ sentTo: 'm*@example.com', expiresInSeconds: 600 });
    expect(JSON.stringify(body)).not.toContain(code);
    expect(Buffer.from(body.challenge.split('.')[0], 'base64url').toString()).not.toContain(code);
  });

  it('rejects accounts without an email (400) and unconfigured SMTP (503)', async () => {
    vi.mocked(users.findUserById).mockResolvedValue(userRow({ email: null }) as never);
    expect((await request(app).post('/api/v1/auth/me/verification-code').set('Authorization', bearer()).send({ purpose: 'delete-account' })).body.error.code).toBe('EMAIL_REQUIRED');
    vi.mocked(users.findUserById).mockResolvedValue(userRow() as never);
    vi.mocked(email.sendEmail).mockResolvedValue(false);
    const res = await request(app).post('/api/v1/auth/me/verification-code').set('Authorization', bearer()).send({ purpose: 'delete-account' });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('EMAIL_NOT_CONFIGURED');
  });

  it('does not send password-change codes to social accounts without a password', async () => {
    vi.mocked(users.findUserById).mockResolvedValue(userRow({ password_hash: null, signup_method: 'google' }) as never);
    const res = await request(app).post('/api/v1/auth/me/verification-code').set('Authorization', bearer()).send({ purpose: 'change-password' });
    expect(res.body.error.code).toBe('PASSWORD_CHANGE_UNAVAILABLE');
    expect(email.sendEmail).not.toHaveBeenCalled();
  });
});

describe('DELETE /auth/me with a verification code', () => {
  it('deletes the account with the mailed code', async () => {
    const { challenge, code } = await requestCode('delete-account');
    const res = await request(app).delete('/api/v1/auth/me').set('Authorization', bearer()).send({ challenge, code });
    expect(res.status).toBe(200);
    expect(deleteDurably).toHaveBeenCalledWith('account', OWNER);
  });

  it('requires a code for accounts with an email', async () => {
    const res = await request(app).delete('/api/v1/auth/me').set('Authorization', bearer()).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VERIFICATION_CODE_REQUIRED');
    expect(deleteDurably).not.toHaveBeenCalled();
  });

  it('rejects a wrong code, a code for another purpose, and another user\'s challenge', async () => {
    const own = await requestCode('delete-account');
    const wrong = await request(app).delete('/api/v1/auth/me').set('Authorization', bearer()).send({ challenge: own.challenge, code: otherCode(own.code) });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.code).toBe('VERIFICATION_CODE_INVALID');

    const password = await requestCode('change-password');
    expect((await request(app).delete('/api/v1/auth/me').set('Authorization', bearer()).send(password)).body.error?.code).toBe('VERIFICATION_CODE_INVALID');

    vi.mocked(users.findUserById).mockResolvedValue(userRow({ id: OTHER }) as never);
    const other = await requestCode('delete-account', OTHER);
    vi.mocked(users.findUserById).mockResolvedValue(userRow() as never);
    expect((await request(app).delete('/api/v1/auth/me').set('Authorization', bearer()).send({ challenge: other.challenge, code: other.code })).body.error?.code).toBe('VERIFICATION_CODE_INVALID');

    const tampered = `${own.challenge.slice(0, -2)}xx`;
    expect((await request(app).delete('/api/v1/auth/me').set('Authorization', bearer()).send({ challenge: tampered, code: own.code })).body.error?.code).toBe('VERIFICATION_CODE_INVALID');
    expect(deleteDurably).not.toHaveBeenCalled();
  });

  it('rejects an expired code', async () => {
    const { challenge, code } = await requestCode('delete-account');
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(Date.now() + 11 * 60 * 1000);
    const res = await request(app).delete('/api/v1/auth/me').set('Authorization', bearer()).send({ challenge, code });
    expect(res.body.error?.code).toBe('VERIFICATION_CODE_EXPIRED');
    expect(deleteDurably).not.toHaveBeenCalled();
  });

  it('invalidates the code once the session version or password changes', async () => {
    const { challenge, code } = await requestCode('delete-account');
    vi.mocked(users.findUserById).mockResolvedValue(userRow({ session_version: 1 }) as never);
    const token = `Bearer ${signAuthToken({ sub: OWNER, ver: 1 })}`;
    expect((await request(app).delete('/api/v1/auth/me').set('Authorization', token).send({ challenge, code })).body.error?.code).toBe('VERIFICATION_CODE_INVALID');
  });

  it('lets accounts without an email delete with the checkbox flow only', async () => {
    vi.mocked(users.findUserById).mockResolvedValue(userRow({ email: null, password_hash: null, signup_method: 'kakao' }) as never);
    expect((await request(app).delete('/api/v1/auth/me').set('Authorization', bearer()).send({})).status).toBe(200);
    expect(deleteDurably).toHaveBeenCalledWith('account', OWNER);
  });
});

describe('PATCH /auth/me/password with a verification code', () => {
  it('changes the password with the mailed code instead of the current password', async () => {
    vi.mocked(users.findUserById).mockResolvedValue(userRow({ password_hash: await hashPassword('old-password') }) as never);
    const { challenge, code } = await requestCode('change-password');
    const res = await request(app).patch('/api/v1/auth/me/password').set('Authorization', bearer()).send({ challenge, code, newPassword: 'new-password' });
    expect(res.status).toBe(200);
    expect(users.updateUserPassword).toHaveBeenCalledOnce();
  });

  it('rejects a wrong code, a delete-account code, and a body with neither proof', async () => {
    vi.mocked(users.findUserById).mockResolvedValue(userRow({ password_hash: await hashPassword('old-password') }) as never);
    const own = await requestCode('change-password');
    expect((await request(app).patch('/api/v1/auth/me/password').set('Authorization', bearer()).send({ challenge: own.challenge, code: otherCode(own.code), newPassword: 'new-password' })).body.error?.code).toBe('VERIFICATION_CODE_INVALID');
    const del = await requestCode('delete-account');
    expect((await request(app).patch('/api/v1/auth/me/password').set('Authorization', bearer()).send({ ...del, newPassword: 'new-password' })).body.error?.code).toBe('VERIFICATION_CODE_INVALID');
    expect((await request(app).patch('/api/v1/auth/me/password').set('Authorization', bearer()).send({ newPassword: 'new-password' })).status).toBe(400);
    expect(users.updateUserPassword).not.toHaveBeenCalled();
  });

  it('still accepts the current password', async () => {
    vi.mocked(users.findUserById).mockResolvedValue(userRow({ password_hash: await hashPassword('old-password') }) as never);
    const res = await request(app).patch('/api/v1/auth/me/password').set('Authorization', bearer()).send({ currentPassword: 'old-password', newPassword: 'new-password' });
    expect(res.status).toBe(200);
  });
});
