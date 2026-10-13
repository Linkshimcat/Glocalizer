import sharp from 'sharp';
import { afterEach, describe, expect, it, vi } from 'vitest';

const testEnv = vi.hoisted(() => ({
  GROQ_API_KEY: 'test-groq-key',
  GROQ_BASE_URL: 'https://api.example.test/v1',
  GROQ_VISION_MODEL: 'vision-test',
  VISION_TIMEOUT_MS: 100,
}));

const logger = vi.hoisted(() => ({ warn: vi.fn() }));

vi.mock('../../src/config/env.js', () => ({ env: testEnv }));
vi.mock('../../src/config/logger.js', () => ({ logger }));
vi.mock('../../src/services/ocr-review.service.js', () => ({
  requireEditableAsset: vi.fn().mockResolvedValue({ id: 'asset-1', width: 100, height: 100, original_path: 'projects/p/assets/asset-1.png' }),
}));
vi.mock('../../src/repositories/storage.repository.js', () => ({
  downloadFromStorage: vi.fn().mockImplementation(async () => sharp({ create: { width: 10, height: 10, channels: 4, background: '#ffffff' } }).png().toBuffer()),
}));

const { suggestCaptionForAsset } = await import('../../src/ocr/caption-suggestion.service.js');

const validSuggestion = {
  emotion: '기쁨',
  emotionConfidence: 0.94,
  action: '한 손을 들어 흔들어요',
  situations: ['인사', '만남', '반가움'],
  candidates: [
    { text: '안녕!', tone: '반가운', best: true },
    { text: '반가워~', tone: '친근한', best: false },
    { text: '하이하이!', tone: '경쾌한', best: false },
  ],
};

function groqResponse(content: string, ok = true) {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: ok ? 200 : 500 });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('suggestCaptionForAsset', () => {
  it('정상 응답을 파싱해 후보 3개와 best 1개를 돌려준다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(groqResponse(JSON.stringify(validSuggestion))));
    const result = await suggestCaptionForAsset('project-1', 'asset-1');
    expect(result.emotion).toBe('기쁨');
    expect(result.candidates).toHaveLength(3);
    expect(result.candidates.filter((c) => c.best)).toHaveLength(1);
    expect(result.candidates[0].text).toBe('안녕!');
  });

  it('모델이 best를 하나로 특정하지 못하면(0개 또는 여러 개) 첫 후보를 대표로 강제한다', async () => {
    const ambiguous = { ...validSuggestion, candidates: validSuggestion.candidates.map((c) => ({ ...c, best: false })) };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(groqResponse(JSON.stringify(ambiguous))));
    const result = await suggestCaptionForAsset('project-1', 'asset-1');
    expect(result.candidates.filter((c) => c.best)).toHaveLength(1);
    expect(result.candidates[0].best).toBe(true);
  });

  it('12자를 넘는 문구는 12자로 자른다', async () => {
    const long = { ...validSuggestion, candidates: [{ text: '이건 열두 글자를 훌쩍 넘기는 아주 긴 문구입니다', tone: '기본', best: true }, ...validSuggestion.candidates.slice(1)] };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(groqResponse(JSON.stringify(long))));
    const result = await suggestCaptionForAsset('project-1', 'asset-1');
    expect(Array.from(result.candidates[0].text).length).toBeLessThanOrEqual(12);
  });

  it('후보가 3개가 아니면 실패로 처리해 AppError를 던진다', async () => {
    const tooFew = { ...validSuggestion, candidates: validSuggestion.candidates.slice(0, 2) };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(groqResponse(JSON.stringify(tooFew))));
    await expect(suggestCaptionForAsset('project-1', 'asset-1')).rejects.toMatchObject({ code: 'CAPTION_SUGGESTION_FAILED' });
  });

  it('JSON이 아닌 응답은 AppError로 변환한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(groqResponse('이건 JSON이 아니에요')));
    await expect(suggestCaptionForAsset('project-1', 'asset-1')).rejects.toMatchObject({ code: 'CAPTION_SUGGESTION_FAILED' });
  });

  it('네트워크 오류도 조용히 묻지 않고 AppError로 던진다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network unavailable')));
    await expect(suggestCaptionForAsset('project-1', 'asset-1')).rejects.toMatchObject({ code: 'CAPTION_SUGGESTION_FAILED' });
    expect(logger.warn).toHaveBeenCalled();
  });
});
