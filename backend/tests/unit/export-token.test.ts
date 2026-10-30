import { describe, expect, it } from 'vitest';
import { signExportToken, verifyExportToken } from '../../src/utils/export-token.js';
import { signAuthToken, verifyAuthToken } from '../../src/utils/jwt.js';

const USER = '00000000-0000-4000-8000-000000000001';

describe('데이터 내보내기 링크 토큰', () => {
  it('서명한 사용자와 세션 버전을 돌려준다', () => {
    expect(verifyExportToken(signExportToken({ sub: USER, ver: 3 }))).toMatchObject({ sub: USER, ver: 3 });
  });

  it('내보내기 토큰은 로그인 토큰으로 쓸 수 없다', () => {
    expect(verifyAuthToken(signExportToken({ sub: USER, ver: 0 }))).toBeNull();
  });

  it('로그인 토큰은 내보내기 토큰으로 쓸 수 없다', () => {
    expect(verifyExportToken(signAuthToken({ sub: USER, ver: 0 }))).toBeNull();
  });

  it('만료된 토큰은 거절한다', () => {
    expect(verifyExportToken(signExportToken({ sub: USER, ver: 0 }, -1))).toBeNull();
  });

  it('내용을 바꾸면 서명이 맞지 않아 거절한다', () => {
    const [body, signature] = signExportToken({ sub: USER, ver: 0 }).split('.');
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body!, 'base64url').toString()), ver: 9 })).toString('base64url');
    expect(verifyExportToken(`${forged}.${signature}`)).toBeNull();
  });

  it.each(['', 'abc', 'a.b.c', 'a.b'])('형식이 틀린 값(%s)은 거절한다', (token) => {
    expect(verifyExportToken(token)).toBeNull();
  });
});
