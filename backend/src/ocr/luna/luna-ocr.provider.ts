import sharp from 'sharp';
import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import { withRetry } from '../../utils/retry.js';
import type { OcrProvider, RecognizedRegion } from '../ocr-provider.types.js';

const PROMPT = [
  'Detect EVERY distinct Korean text caption in this image (there may be more than one, in different locations).',
  'Return ONLY JSON: {"regions": [{"text": "<exact Korean text>", "confidence": 0-1, "box": {"x": 0-1, "y": 0-1, "width": 0-1, "height": 0-1}}, ...]}',
  'confidence reflects how certain you are that both the text and the box are correct. box coordinates are normalized 0-1 fractions of image width/height (x,y = top-left corner), tightly bounding just the text glyphs of each distinct caption — not the whole image, not extra padding, not any background shape like a speech bubble. Do not merge separate captions into one region.',
  'If no Korean text is visible, return {"regions": []}.',
].join(' ');

interface LunaBoxPayload { x?: unknown; y?: unknown; width?: unknown; height?: unknown }
interface LunaRegionPayload { text?: unknown; confidence?: unknown; box?: LunaBoxPayload }
interface LunaResponsePayload { regions?: unknown }

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function toPolygon(box: { x: number; y: number; width: number; height: number }, width: number, height: number): Array<{ x: number; y: number }> {
  const left = box.x * width;
  const top = box.y * height;
  const right = (box.x + box.width) * width;
  const bottom = (box.y + box.height) * height;
  return [{ x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: left, y: bottom }];
}

function parseRegions(text: string, width: number, height: number): RecognizedRegion[] {
  try {
    const parsed = JSON.parse(text) as LunaResponsePayload;
    if (!Array.isArray(parsed.regions)) return [];
    const regions: RecognizedRegion[] = [];
    for (const entry of parsed.regions) {
      const region = entry as LunaRegionPayload;
      const box = region.box;
      if (typeof region.text !== 'string' || !box) continue;
      const trimmed = region.text.trim();
      if (!trimmed) continue;
      const { x, y, width: boxWidth, height: boxHeight } = box;
      if (typeof x !== 'number' || typeof y !== 'number' || typeof boxWidth !== 'number' || typeof boxHeight !== 'number') continue;
      const confidence = typeof region.confidence === 'number' ? clamp01(region.confidence) : 0.9;
      regions.push({ text: trimmed, confidence, polygon: toPolygon({ x, y, width: boxWidth, height: boxHeight }, width, height) });
    }
    return regions;
  } catch {
    return [];
  }
}

function isRetryable(error: unknown): boolean {
  if (!(error instanceof AppError)) return true;
  const status = error.details?.status;
  return typeof status === 'number' && (status === 429 || status >= 500);
}

export const lunaOcrProvider: OcrProvider = {
  name: 'luna',
  async recognize(image) {
    if (!env.OPENAI_API_KEY) {
      throw new AppError('OCR_PROVIDER_UNAVAILABLE', { provider: 'luna' }, 'OPENAI_API_KEY가 설정되어 있지 않습니다.');
    }
    const metadata = await sharp(image).metadata();
    const width = metadata.width ?? 1;
    const height = metadata.height ?? 1;
    const mimeType = metadata.format === 'jpeg' ? 'image/jpeg' : 'image/png';
    return withRetry(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), env.OCR_TIMEOUT_MS);
      try {
        const response = await fetch(`${env.OPENAI_BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: env.OPENAI_OCR_MODEL,
            messages: [{
              role: 'user',
              content: [
                { type: 'text', text: PROMPT },
                { type: 'image_url', image_url: { url: `data:${mimeType};base64,${image.toString('base64')}` } },
              ],
            }],
            response_format: { type: 'json_object' },
          }),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new AppError('OCR_PROVIDER_FAILED', { provider: 'luna', status: response.status }, `Luna OCR 요청이 실패했습니다. (${response.status})`);
        }
        const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
        const content = body.choices?.[0]?.message?.content;
        if (!content) throw new AppError('OCR_PROVIDER_FAILED', { provider: 'luna' }, 'Luna 응답에 OCR 결과가 없습니다.');
        return parseRegions(content, width, height);
      } catch (error) {
        if (error instanceof AppError) throw error;
        const isTimeout = error instanceof Error && error.name === 'AbortError';
        throw new AppError(
          'OCR_PROVIDER_FAILED',
          { provider: 'luna' },
          isTimeout ? 'Luna OCR 요청 시간이 초과되었습니다.' : 'Luna OCR 요청에 실패했습니다.',
        );
      } finally {
        clearTimeout(timeout);
      }
    }, { attempts: env.AI_MAX_RETRIES, delayMs: 500, shouldRetry: isRetryable });
  },
};
