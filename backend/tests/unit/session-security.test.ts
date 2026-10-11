import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHmac, scryptSync } from 'node:crypto';
vi.mock('../../src/repositories/user.repository.js', () => ({ findUserById: vi.fn() }));
const users = await import('../../src/repositories/user.repository.js');
const { authenticateAccount } = await import('../../src/middleware/auth.middleware.js');
const { signAuthToken, verifyAuthToken } = await import('../../src/utils/jwt.js');
const { hashPassword, verifyPassword } = await import('../../src/utils/password.js');
const { env } = await import('../../src/config/env.js');
const id = '00000000-0000-4000-8000-000000000001';
const rawToken = (body: object, header: object = { alg: 'HS256', typ: 'JWT' }) => {
 const h = Buffer.from(JSON.stringify(header)).toString('base64url'), p = Buffer.from(JSON.stringify(body)).toString('base64url');
 return `${h}.${p}.${createHmac('sha256',env.JWT_SECRET).update(`${h}.${p}`).digest('base64url')}`;
};
beforeEach(() => { vi.resetAllMocks(); });
describe('session revocation', () => {
 it('accepts existing version-zero tokens and rejects them after password change', async () => {
  const now = Math.floor(Date.now()/1000), token = rawToken({sub:id,iat:now,exp:now+60});
  vi.mocked(users.findUserById).mockResolvedValue({id,session_version:0} as never);
  await expect(authenticateAccount('Bearer '+token)).resolves.toMatchObject({id});
  vi.mocked(users.findUserById).mockResolvedValue({id,session_version:1} as never);
  await expect(authenticateAccount('Bearer '+token)).rejects.toMatchObject({code:'UNAUTHORIZED'});
  await expect(authenticateAccount('Bearer '+signAuthToken({sub:id,ver:1}))).resolves.toMatchObject({id});
 });
 it('rejects deleted users and does not disguise a DB failure as invalid credentials', async () => {
  const token='Bearer '+signAuthToken({sub:id});
  vi.mocked(users.findUserById).mockResolvedValue(null);
  await expect(authenticateAccount(token)).rejects.toMatchObject({code:'UNAUTHORIZED'});
  vi.mocked(users.findUserById).mockRejectedValue(new Error('database unavailable'));
  await expect(authenticateAccount(token)).rejects.toThrow('database unavailable');
 });
 it('rejects malformed claims, expired tokens and inappropriate headers', () => {
  const now=Math.floor(Date.now()/1000), base={sub:id,iat:now,exp:now+60,ver:0};
  for(const patch of [{exp:now},{exp:'forever'},{iat:now+1},{sub:'not-a-uuid'},{ver:-1},{ver:1.5}]) expect(verifyAuthToken(rawToken({...base,...patch}))).toBeNull();
  expect(verifyAuthToken(rawToken(base,{alg:'none',typ:'JWT'}))).toBeNull();
 });
});
describe('async scrypt compatibility', () => {
 it('reads a pre-existing synchronous hash and writes the same representation', async () => {
  const salt=Buffer.alloc(16,7), oldHash=salt.toString('hex')+':'+scryptSync('original-password',salt,64).toString('hex');
  expect(await verifyPassword('original-password',oldHash)).toBe(true);
  expect(await verifyPassword('wrong',oldHash)).toBe(false);
  const next=await hashPassword('next-password');
  expect(next).toMatch(/^[a-f0-9]{32}:[a-f0-9]{128}$/);
  expect(await verifyPassword('next-password',next)).toBe(true);
  expect(await verifyPassword('next-password','broken:hash')).toBe(false);
 });
});
