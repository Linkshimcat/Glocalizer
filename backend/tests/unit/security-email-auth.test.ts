import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/repositories/user.repository.js', () => ({
  findUserByEmail: vi.fn(), findUserById: vi.fn(), findUserByNaverId: vi.fn(), findUserByKakaoId: vi.fn(), findUserBySupabaseAuthId: vi.fn(),
  insertEmailUser: vi.fn(), insertGoogleUser: vi.fn(), insertKakaoUser: vi.fn(), insertNaverUser: vi.fn(), linkGoogleProfile: vi.fn(), linkKakaoProfile: vi.fn(), linkNaverProfile: vi.fn(),
  updateUserPassword: vi.fn(), updateUserProfile: vi.fn(), updateSecurityEmailPreferences: vi.fn(), bumpSessionVersion: vi.fn(),
}));
vi.mock('../../src/repositories/session.repository.js', () => ({ insertSession: vi.fn(), revokeOtherSessions: vi.fn(), revokeSession: vi.fn(), listActiveSessions: vi.fn(), extendSession: vi.fn() }));
vi.mock('../../src/repositories/known-device.repository.js', () => ({ rememberDevice: vi.fn() }));
vi.mock('../../src/utils/password.js', () => ({ hashPassword: vi.fn(async () => 'new-hash'), verifyPassword: vi.fn(async () => true) }));
vi.mock('../../src/utils/jwt.js', () => ({ AUTH_TOKEN_TTL_SECONDS: 60, signAuthToken: vi.fn(() => 'token') }));
vi.mock('../../src/services/email.service.js', () => ({ sendWelcomeEmail: vi.fn(), sendNewDeviceLoginEmail: vi.fn(), sendPasswordChangedEmail: vi.fn(), sendOtherSessionsSignedOutEmail: vi.fn() }));

const users = await import('../../src/repositories/user.repository.js');
const sessions = await import('../../src/repositories/session.repository.js');
const devices = await import('../../src/repositories/known-device.repository.js');
const emails = await import('../../src/services/email.service.js');
const auth = await import('../../src/services/auth.service.js');

const user = (patch: object = {}) => ({
  id: '00000000-0000-4000-8000-000000000001', session_version: 0, deleting_at: null, email: 'user@example.com', password_hash: 'hash',
  naver_id: null, kakao_id: null, supabase_auth_id: null, signup_method: 'email' as const, name: 'User', avatar_url: null,
  name_customized: false, avatar_customized: false, membership_plan: null, membership_expires_at: null, security_email_notifications: true, created_at: '', updated_at: '', ...patch,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(sessions.insertSession).mockResolvedValue({ id: '00000000-0000-4000-8000-0000000000aa' } as never);
  vi.mocked(users.findUserByEmail).mockResolvedValue(user() as never);
  vi.mocked(users.findUserById).mockResolvedValue(user() as never);
  vi.mocked(devices.rememberDevice).mockResolvedValue(true);
});

describe('security email auth events', () => {
  const context = { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36', ip: '203.0.113.42', deviceId: '00000000-0000-4000-8000-000000000099' };

  it('alerts only for the first successful login from a browser', async () => {
    await auth.login({ email: 'user@example.com', password: 'password123' }, context);
    expect(devices.rememberDevice).toHaveBeenCalledWith(user().id, context.deviceId);
    expect(emails.sendNewDeviceLoginEmail).toHaveBeenCalledWith(expect.objectContaining({ id: user().id }), 'Chrome · macOS', '203.0.113.x');

    vi.mocked(emails.sendNewDeviceLoginEmail).mockClear();
    vi.mocked(devices.rememberDevice).mockResolvedValue(false);
    await auth.login({ email: 'user@example.com', password: 'password123' }, context);
    expect(emails.sendNewDeviceLoginEmail).not.toHaveBeenCalled();
  });

  it('does not send a new-browser email for initial signup', async () => {
    vi.mocked(users.findUserByEmail).mockResolvedValue(null);
    vi.mocked(users.insertEmailUser).mockResolvedValue(user() as never);
    await auth.signup({ email: 'user@example.com', password: 'password123' }, context);
    expect(emails.sendWelcomeEmail).toHaveBeenCalledTimes(1);
    expect(emails.sendNewDeviceLoginEmail).not.toHaveBeenCalled();
  });

  it('sends completion notices only after successful security actions', async () => {
    await auth.changePassword(user().id, { currentPassword: 'old-password', newPassword: 'new-password' });
    expect(emails.sendPasswordChangedEmail).toHaveBeenCalledWith(expect.objectContaining({ id: user().id }));

    vi.mocked(users.bumpSessionVersion).mockResolvedValue(1);
    await auth.revokeOtherUserSessions(user().id, '00000000-0000-4000-8000-0000000000aa', context);
    expect(emails.sendOtherSessionsSignedOutEmail).toHaveBeenCalledWith(expect.objectContaining({ id: user().id }));
  });

  it('returns the updated preference in the public user response', async () => {
    vi.mocked(users.updateSecurityEmailPreferences).mockResolvedValue(user({ security_email_notifications: false }) as never);
    await expect(auth.updateEmailPreferences(user().id, { securityEmailNotifications: false })).resolves.toMatchObject({ securityEmailNotifications: false });
    expect(users.updateSecurityEmailPreferences).toHaveBeenCalledWith(user().id, { securityEmailNotifications: false });
  });

  it('exposes per-type preferences, defaulting to on when the columns are missing', async () => {
    vi.mocked(users.updateSecurityEmailPreferences).mockResolvedValue(user({ security_email_password_changed: false }) as never);
    const result = await auth.updateEmailPreferences(user().id, { passwordChanged: false });
    expect(result.securityEmailTypes).toEqual({ newDeviceLogin: true, passwordChanged: false, otherSessionsSignedOut: true });
  });
});
