import { afterEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
const logs = vi.hoisted(() => [] as string[]);
vi.mock('../../src/config/logger.js', async () => {
  const { default: pino } = await import('pino');
  const { safeLogError } = await import('../../src/utils/log-error.js');
  return { logger: pino({ level: 'info', serializers: { err: safeLogError } }, { write: (chunk: string) => logs.push(chunk) }) };
});
const { createApp } = await import('../../src/app.js');
const app = createApp();
afterEach(() => { logs.length = 0; });
describe('HTTP log privacy', () => {
  it('does not log a malformed JSON password or token', async () => {
    const res = await request(app).post('/api/v1/auth/login').set('Content-Type', 'application/json')
      .send('{"password":"synthetic-password","token":"synthetic-body-token",');
    expect(res.status).toBe(400);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.join('')).not.toContain('synthetic-password');
    expect(logs.join('')).not.toContain('synthetic-body-token');
  });
  it('redacts account, project, admin and cookie credentials from request logs', async () => {
    const res = await request(app).get('/missing')
      .set('Authorization', 'Bearer synthetic-account-token').set('X-Project-Token', 'synthetic-project-token')
      .set('X-Admin-Key', 'synthetic-admin-key').set('Cookie', 'session=synthetic-cookie');
    expect(res.status).toBe(404);
    const text = logs.join('');
    for (const secret of ['synthetic-account-token', 'synthetic-project-token', 'synthetic-admin-key', 'synthetic-cookie']) expect(text).not.toContain(secret);
    expect(text).toContain('[REDACTED]');
  });
});
