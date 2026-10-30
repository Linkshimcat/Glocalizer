import { Writable } from 'node:stream';
import express from 'express';
import { pino } from 'pino';
import { pinoHttp } from 'pino-http';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { httpLoggerOptions } from '../../src/config/http-logger.js';

async function loggedLines(url: string, headers: Record<string, string> = {}) {
  const lines: string[] = [];
  const stream = new Writable({ write(chunk, _encoding, callback) { lines.push(chunk.toString()); callback(); } });
  const app = express();
  app.use(pinoHttp(httpLoggerOptions(pino({ level: 'info' }, stream))));
  app.get('/api/v1/auth/me/export.zip', (_req, res) => { res.send('ok'); });
  let call = request(app).get(url);
  for (const [name, value] of Object.entries(headers)) call = call.set(name, value);
  await call;
  return lines.join('');
}

describe('요청 로그', () => {
  it('메일 링크 토큰(?token=)은 주소와 쿼리 어디에도 남기지 않는다', async () => {
    const log = await loggedLines('/api/v1/auth/me/export.zip?token=SECRETBODY.SECRETSIG&keep=1');
    expect(log).not.toContain('SECRETBODY');
    expect(log).not.toContain('SECRETSIG');
    expect(log).toContain('token=[REDACTED]');
    expect(log).toContain('keep=1'); // 다른 쿼리는 그대로 남긴다
  });

  it('로그인 헤더도 계속 가린다', async () => {
    const log = await loggedLines('/api/v1/auth/me/export.zip', { Authorization: 'Bearer LOGINTOKEN' });
    expect(log).not.toContain('LOGINTOKEN');
  });
});
