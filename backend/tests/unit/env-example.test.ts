import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { envSchema } from '../../src/config/env.js';

function readTemplateKeys(): string[] {
  return readFileSync(resolve(process.cwd(), '.env.example'), 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map((line) => line.slice(0, line.indexOf('=')))
    .filter((key) => key.length > 0);
}

describe('backend .env.example', () => {
  it('모든 example 변수는 runtime env schema에서 실제로 사용된다', () => {
    for (const key of readTemplateKeys()) {
      expect(key in envSchema.shape, `${key} is not defined in backend env schema`).toBe(true);
    }
  });

  it('결제 기능에는 서로 짝이 맞는 test_gck_/test_gsk_ 키만 허용한다', () => {
    const base = { ...process.env, TOSS_CLIENT_KEY: '', TOSS_SECRET_KEY: '' };
    expect(envSchema.safeParse({ ...base, TOSS_CLIENT_KEY: 'test_gck_demo', TOSS_SECRET_KEY: 'test_gsk_demo' }).success).toBe(true);
    expect(envSchema.safeParse({ ...base, TOSS_CLIENT_KEY: 'live_gck_demo', TOSS_SECRET_KEY: 'live_gsk_demo' }).success).toBe(false);
    expect(envSchema.safeParse({ ...base, TOSS_CLIENT_KEY: 'test_gck_demo' }).success).toBe(false);
  });
});
