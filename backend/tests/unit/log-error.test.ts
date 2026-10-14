import { describe, expect, it, vi } from 'vitest';
import pino from 'pino';
import { AppError } from '../../src/errors/app-error.js';
import { errorMiddleware } from '../../src/middleware/error.middleware.js';
import { safeLogError } from '../../src/utils/log-error.js';

describe('safe error logging', () => {
  it('omits arbitrary error messages, bodies, stacks, causes and credentials from serialized logs', () => {
    const chunks: string[] = [];
    const log = pino({ serializers: { err: safeLogError } }, { write: (chunk: string) => chunks.push(chunk) });
    const err = Object.assign(new SyntaxError('synthetic-password'), {
      body: '{"password":"synthetic-password","token":"synthetic-token"}',
      status: 400, authorization: 'Bearer synthetic-token', cause: new Error('synthetic-token'),
    });
    log.error({ err }, 'Request failed');
    const text = chunks.join('');
    expect(text).not.toContain('synthetic-password');
    expect(text).not.toContain('synthetic-token');
    expect(JSON.parse(text).err).toEqual({ type: 'SyntaxError', status: 400 });
  });
});

it('does not expose upstream messages or details in server-error responses or log messages', () => {
  const chunks: string[] = [];
  const log = pino({ serializers: { err: safeLogError } }, { write: (chunk: string) => chunks.push(chunk) });
  const req = { id: 'test', log };
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  const error = new AppError('INTERNAL_ERROR', { cause: 'synthetic-upstream-token' }, 'synthetic-upstream-password');
  errorMiddleware(error, req as never, res as never, () => {});
  expect(res.status).toHaveBeenCalledWith(500);
  const response = JSON.stringify(res.json.mock.calls[0]);
  const logged = chunks.join('');
  for (const secret of ['synthetic-upstream-token', 'synthetic-upstream-password']) {
    expect(response).not.toContain(secret); expect(logged).not.toContain(secret);
  }
});
