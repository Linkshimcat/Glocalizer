import { describe, expect, it } from 'vitest';
import { generateProjectToken, hashProjectToken, verifyProjectToken } from '../../src/utils/hash.js';

describe('project token hash', () => {
  it('생성한 token은 저장된 hash와 검증된다', () => {
    const token = generateProjectToken();

    expect(verifyProjectToken(token, hashProjectToken(token))).toBe(true);
  });

  it('다른 token 또는 잘못된 hash는 검증되지 않는다', () => {
    const token = generateProjectToken();

    expect(verifyProjectToken(`${token}x`, hashProjectToken(token))).toBe(false);
    expect(verifyProjectToken(token, 'malformed-hash')).toBe(false);
  });
});
