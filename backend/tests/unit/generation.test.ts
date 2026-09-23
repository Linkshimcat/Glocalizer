import { afterEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { captionSticker, imageUsageCost, normalizeSticker, suggestStickerCaptions, suggestStickerPlan } from '../../src/services/generation.service.js';
afterEach(() => vi.unstubAllGlobals());
describe('generation output', () => {
  it('produces a transparent OGQ canvas with density and white outline', async () => {
    const input = await sharp({ create: { width: 128, height: 128, channels: 4, background: '#00000000' } }).composite([{ input: Buffer.from('<svg width="128" height="128"><circle cx="64" cy="64" r="30" fill="red"/></svg>') }]).png().toBuffer();
    const png = await normalizeSticker(input);
    const metadata = await sharp(png).metadata();
    expect(metadata).toMatchObject({ width: 740, height: 640, format: 'png', hasAlpha: true, density: 72 });
    expect(png.length).toBeLessThanOrEqual(1_000_000);
    const captioned = await captionSticker(png, '<safe & caption>');
    expect((await sharp(captioned).metadata()).width).toBe(740);
  });
  it('rejects opaque output instead of manufacturing transparent margins', async () => {
    const input = await sharp({ create: { width: 128, height: 128, channels: 4, background: 'white' } }).png().toBuffer();
    await expect(normalizeSticker(input)).rejects.toMatchObject({ code: 'GENERATION_FAILED' });
  });
  it('retains an unknown usage reservation and computes reported usage', () => {
    expect(imageUsageCost(undefined)).toBeNull();
    expect(imageUsageCost({ input_tokens_details: { text_tokens: 100, image_tokens: 200 }, output_tokens: 1000 })).toBeCloseTo(0.0321);
  });
  it('creates short Korean captions that match the requested pose order', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ captions: [' 반가워! ', '너무너무속상하고슬퍼요'] }) } }] }), { status: 200 })));
    await expect(suggestStickerCaptions('분홍 돼지 캐릭터', ['인사', '눈물을 흘림'])).resolves.toEqual(['반가워!', '너무너무속상하고슬퍼']);
  });
  it('uses safe pose-based captions when caption generation fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })));
    await expect(suggestStickerCaptions('캐릭터', ['환하게 웃으며 인사', '하트를 안고 사랑을 표현'])).resolves.toEqual(['안녕!', '사랑해!']);
  });
  it('creates a complete ordered 23-image plan and trims long captions', async () => {
    const items = Array.from({ length: 23 }, (_, index) => ({ pose: `표정 ${index + 1}`, caption: index === 0 ? '아주아주긴문구입니다정말로' : `문구${index + 1}` }));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ items }) } }] }), { status: 200 })));
    const plan = await suggestStickerPlan('분홍 돼지 캐릭터');
    expect(plan).toHaveLength(23);
    expect(plan.map(item => item.slot)).toEqual(Array.from({ length: 23 }, (_, index) => index + 1));
    expect(Array.from(plan[0].caption)).toHaveLength(10);
  });
  it('falls back to a safe 23-image plan when planning fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })));
    const plan = await suggestStickerPlan('캐릭터');
    expect(plan).toHaveLength(23);
    expect(plan[0]).toMatchObject({ slot: 1, caption: '안녕!' });
    expect(plan[22]).toMatchObject({ slot: 23, caption: '맛있다!' });
  });
});
