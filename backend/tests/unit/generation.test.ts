import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { captionSticker, imageUsageCost, normalizeSticker } from '../../src/services/generation.service.js';
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
});
