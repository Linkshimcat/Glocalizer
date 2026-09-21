import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../../src/config/env.js';
import { findResidualText } from '../../src/image/cleanup-verifier.js';
import type { OcrProvider } from '../../src/ocr/ocr-provider.types.js';

const box = { x: 40, y: 40, width: 80, height: 30 };
const polygon = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];

async function image(alpha: number): Promise<Buffer> {
  return sharp({ create: { width: 200, height: 120, channels: 4, background: { r: 255, g: 255, b: 255, alpha } } }).png().toBuffer();
}

function providerReturning(regions: Array<{ text: string; confidence: number }>): OcrProvider & { recognize: ReturnType<typeof vi.fn> } {
  return { name: 'fake', recognize: vi.fn().mockResolvedValue(regions.map((region) => ({ ...region, polygon }))) };
}

describe('findResidualText', () => {
  beforeEach(() => { env.ENABLE_CLEANUP_VERIFICATION = true; });

  it('정리한 자리에서 한글이 읽히면 글자가 남은 것으로 본다', async () => {
    const provider = providerReturning([{ text: '대쓰요~', confidence: 0.9 }]);
    const result = await findResidualText(await image(1), box, 200, 120, provider);
    expect(result).toEqual({ checked: true, residual: true, texts: ['대쓰요~'] });
  });

  it('아무것도 읽히지 않으면 깨끗하다', async () => {
    const result = await findResidualText(await image(1), box, 200, 120, providerReturning([]));
    expect(result).toMatchObject({ checked: true, residual: false, texts: [] });
  });

  it('신뢰도가 낮거나 한글이 아닌 판독은 잔상으로 보지 않는다', async () => {
    const provider = providerReturning([{ text: '대쓰요', confidence: 0.3 }, { text: 'OGQ 26', confidence: 0.95 }]);
    expect((await findResidualText(await image(1), box, 200, 120, provider)).residual).toBe(false);
  });

  it('OCR 호출이 실패하면 통과로 취급한다(정리 자체를 막지 않는다)', async () => {
    const provider: OcrProvider = { name: 'fake', recognize: vi.fn().mockRejectedValue(new Error('boom')) };
    expect(await findResidualText(await image(1), box, 200, 120, provider)).toEqual({ checked: false, residual: false, texts: [] });
  });

  it('투명 스티커는 흰 배경·어두운 배경 두 번 읽는다(흰 글자 잔상 대비)', async () => {
    const provider = providerReturning([]);
    await findResidualText(await image(0), box, 200, 120, provider);
    expect(provider.recognize).toHaveBeenCalledTimes(2);
  });

  it('불투명 이미지는 한 번만 읽는다', async () => {
    const provider = providerReturning([]);
    await findResidualText(await image(1), box, 200, 120, provider);
    expect(provider.recognize).toHaveBeenCalledTimes(1);
  });

  it('검증을 끄면 OCR을 부르지 않는다', async () => {
    env.ENABLE_CLEANUP_VERIFICATION = false;
    const provider = providerReturning([{ text: '남음', confidence: 0.9 }]);
    expect(await findResidualText(await image(1), box, 200, 120, provider)).toEqual({ checked: false, residual: false, texts: [] });
    expect(provider.recognize).not.toHaveBeenCalled();
  });
});
