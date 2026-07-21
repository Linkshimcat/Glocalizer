import { describe, expect, it } from 'vitest';
import { containsHanScript, containsJapaneseKana, containsKorean } from '../../src/utils/language.js';

describe('containsKorean', () => {
  it('한글이 포함되면 true', () => {
    expect(containsKorean('열공')).toBe(true);
    expect(containsKorean('Study 완전 hard')).toBe(true);
  });

  it('한글이 없으면 false', () => {
    expect(containsKorean('Study hard!')).toBe(false);
    expect(containsKorean('やばい')).toBe(false);
  });
});

describe('containsJapaneseKana', () => {
  it('히라가나/가타카나를 감지한다', () => {
    expect(containsJapaneseKana('やばい')).toBe(true);
    expect(containsJapaneseKana('ヤバい')).toBe(true);
  });

  it('한자만 있으면 false', () => {
    expect(containsJapaneseKana('神')).toBe(false);
  });
});

describe('containsHanScript', () => {
  it('한자를 감지한다 (중국어/일본어 공통)', () => {
    expect(containsHanScript('神')).toBe(true);
    expect(containsHanScript('你好')).toBe(true);
  });

  it('한자가 없으면 false', () => {
    expect(containsHanScript('OK')).toBe(false);
  });
});
