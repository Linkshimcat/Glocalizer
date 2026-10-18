import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('../../src/repositories/user.repository.js', () => ({ findUserById: vi.fn() }));
vi.mock('../../src/repositories/session.repository.js', () => ({ findSessionById: vi.fn(), touchSessionIfStale: vi.fn() }));
const users = await import('../../src/repositories/user.repository.js');
const sessions = await import('../../src/repositories/session.repository.js');
const { authenticateSession } = await import('../../src/middleware/auth.middleware.js');
const { signAuthToken, verifyAuthToken } = await import('../../src/utils/jwt.js');
const id = '00000000-0000-4000-8000-000000000001';
const sid = '00000000-0000-4000-8000-0000000000aa';
const future = () => new Date(Date.now() + 60_000).toISOString();
const session = (patch: object = {}) => ({ id: sid, user_id: id, revoked_at: null, expires_at: future(), last_seen_at: new Date().toISOString(), ...patch });
const header = () => 'Bearer ' + signAuthToken({ sub: id, ver: 0, sid });

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(users.findUserById).mockResolvedValue({ id, session_version: 0 } as never);
});

describe('device sessions in authenticateSession', () => {
  it('accepts an active session and reports its id', async () => {
    vi.mocked(sessions.findSessionById).mockResolvedValue(session() as never);
    await expect(authenticateSession(header())).resolves.toMatchObject({ user: { id }, sid });
    expect(sessions.touchSessionIfStale).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['revoked', { revoked_at: new Date().toISOString() }],
    ['expired', { expires_at: new Date(Date.now() - 1000).toISOString() }],
    ['owned by someone else', { user_id: '00000000-0000-4000-8000-000000000002' }],
  ])('rejects a %s session', async (_label, patch) => {
    vi.mocked(sessions.findSessionById).mockResolvedValue(session(patch) as never);
    await expect(authenticateSession(header())).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('rejects a token whose session row is gone', async () => {
    vi.mocked(sessions.findSessionById).mockResolvedValue(null);
    await expect(authenticateSession(header())).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('keeps tokens issued before device sessions valid without a session lookup', async () => {
    await expect(authenticateSession('Bearer ' + signAuthToken({ sub: id, ver: 0 }))).resolves.toMatchObject({ user: { id }, sid: undefined });
    expect(sessions.findSessionById).not.toHaveBeenCalled();
  });

  it('refuses tokens whose sid claim is not a uuid', () => {
    const token = signAuthToken({ sub: id, sid: 'not-a-uuid' });
    expect(verifyAuthToken(token)).toBeNull();
  });
});
