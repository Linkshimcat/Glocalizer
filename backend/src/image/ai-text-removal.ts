import sharp from 'sharp';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import type { PixelBox } from '../utils/bbox.js';

const CANVAS = 1024;
const EDIT_MARGIN_RATIO = 0.2;
const EDIT_MARGIN_MIN = 6;
const EDIT_MARGIN_MAX = 24;
const HOUR_MS = 60 * 60 * 1000;
const PROMPT = [
  'Remove all text, letters and lettering inside the transparent masked area.',
  'Restore the background naturally so it matches the surrounding colors, patterns, gradients and lines.',
  'Do not add any new object, character or text. Keep everything outside the masked area exactly the same.',
].join(' ');

/** 시간당 호출 수를 제한하는 슬라이딩 윈도우(프로세스 로컬). 유료 API가 폭주하지 않게 한다. */
const callTimestamps: number[] = [];

export function aiFallbackAvailable(now = Date.now()): boolean {
  if (!env.ENABLE_CLEANUP_AI_FALLBACK || !env.OPENAI_API_KEY || env.CLEANUP_AI_MAX_PER_HOUR <= 0) return false;
  while (callTimestamps.length > 0 && now - callTimestamps[0] > HOUR_MS) callTimestamps.shift();
  return callTimestamps.length < env.CLEANUP_AI_MAX_PER_HOUR;
}

export function resetAiFallbackLimiterForTest(): void {
  callTimestamps.length = 0;
}

interface EditResponse {
  data?: Array<{ b64_json?: string }>;
}

/**
 * 편집 API로 OCR 박스 안의 글자만 지우고, 그 결과를 **박스 영역 안에만** 합성해서 돌려준다. 박스 밖 픽셀은
 * 절대 바뀌지 않는다(생성형 편집이 캐릭터·배경을 미세하게 바꾸는 위험을 차단). 실패하면 null.
 *
 * `source`는 반드시 부분 정리로 훼손되기 전의 원본 영역을 담은 이미지여야 하고, 반환값은 `target` 위에
 * 박스 영역을 덮어쓴 이미지다.
 */
export async function removeTextWithAi(source: Buffer, target: Buffer, box: PixelBox, imageWidth: number, imageHeight: number): Promise<Buffer | null> {
  if (!aiFallbackAvailable()) return null;
  callTimestamps.push(Date.now());
  try {
    // OCR 박스는 글자 끝을 잘라내는 일이 많다(실측: Luna 박스가 네온 글자 윗부분 10px, 박스 높이의 16%를
    // 놓침). 편집 영역을 박스 높이의 20%(6~24px)만큼 넓히되, 그 밖의 픽셀은 여전히 바꾸지 않는다.
    const editPad = Math.min(EDIT_MARGIN_MAX, Math.max(EDIT_MARGIN_MIN, Math.round(box.height * EDIT_MARGIN_RATIO)));
    const pad = Math.max(16, editPad + 10, Math.round(Math.min(box.width, box.height) * 0.25));
    const left = Math.max(0, Math.floor(box.x) - pad);
    const top = Math.max(0, Math.floor(box.y) - pad);
    const width = Math.min(imageWidth, Math.ceil(box.x + box.width) + pad) - left;
    const height = Math.min(imageHeight, Math.ceil(box.y + box.height) + pad) - top;
    const scale = Math.min(CANVAS / width, CANVAS / height);
    const scaledWidth = Math.max(1, Math.round(width * scale));
    const scaledHeight = Math.max(1, Math.round(height * scale));
    const offsetX = Math.floor((CANVAS - scaledWidth) / 2);
    const offsetY = Math.floor((CANVAS - scaledHeight) / 2);

    const crop = await sharp(source).ensureAlpha().extract({ left, top, width, height }).resize(scaledWidth, scaledHeight, { kernel: 'lanczos3' }).png().toBuffer();
    const { data: cropData } = await sharp(crop).raw().toBuffer({ resolveWithObject: true });
    let transparent = 0;
    for (let i = 3; i < cropData.length; i += 4) if (cropData[i] < 250) transparent += 1;
    const hasTransparency = transparent / (cropData.length / 4) >= 0.05;

    const image = await sharp({ create: { width: CANVAS, height: CANVAS, channels: 4, background: hasTransparency ? { r: 0, g: 0, b: 0, alpha: 0 } : { r: 255, g: 255, b: 255, alpha: 1 } } })
      .composite([{ input: crop, left: offsetX, top: offsetY }]).png().toBuffer();

    // 편집할 곳(박스 + 여유)은 투명(alpha 0), 나머지는 불투명.
    const editLeft = Math.max(0, Math.round((box.x - left - editPad) * scale) + offsetX);
    const editTop = Math.max(0, Math.round((box.y - top - editPad) * scale) + offsetY);
    const editWidth = Math.min(CANVAS - editLeft, Math.round((box.width + editPad * 2) * scale));
    const editHeight = Math.min(CANVAS - editTop, Math.round((box.height + editPad * 2) * scale));
    const hole = await sharp({ create: { width: editWidth, height: editHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    const mask = await sharp({ create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } } })
      .composite([{ input: hole, left: editLeft, top: editTop, blend: 'dest-out' }]).png().toBuffer();

    const form = new FormData();
    const options: Record<string, string> = { model: env.CLEANUP_AI_MODEL, prompt: PROMPT, n: '1', size: `${CANVAS}x${CANVAS}`, quality: 'medium', output_format: 'png' };
    if (hasTransparency) options.background = 'transparent';
    for (const [key, value] of Object.entries(options)) form.set(key, value);
    form.set('image[]', new Blob([new Uint8Array(image)], { type: 'image/png' }), 'source.png');
    form.set('mask', new Blob([new Uint8Array(mask)], { type: 'image/png' }), 'mask.png');

    const response = await fetch(`${env.OPENAI_BASE_URL}/images/edits`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: form,
      signal: AbortSignal.timeout(env.CLEANUP_AI_TIMEOUT_MS),
    });
    if (!response.ok) {
      logger.warn({ status: response.status }, '이미지 편집 API 폴백 요청이 실패했습니다.');
      return null;
    }
    const payload = (await response.json()) as EditResponse;
    const encoded = payload.data?.[0]?.b64_json;
    if (!encoded) return null;

    // 결과에서 콘텐츠 영역만 잘라 원래 크기로 되돌리고, 박스(+여유) 영역만 교체한다. 투명 스티커도
    // 잔상이 남지 않게 그 영역을 먼저 비운 뒤 결과를 덮는다.
    // sharp는 한 파이프라인에서 resize를 두 번 쓰면 뒤의 것이 앞의 것을 덮어쓰므로 단계별로 나눈다.
    const resized = await sharp(Buffer.from(encoded, 'base64')).resize(CANVAS, CANVAS, { fit: 'fill' }).ensureAlpha().png().toBuffer();
    const content = await sharp(resized).extract({ left: offsetX, top: offsetY, width: scaledWidth, height: scaledHeight }).png().toBuffer();
    const edited = await sharp(content).resize(width, height, { kernel: 'lanczos3', fit: 'fill' }).png().toBuffer();
    const regionLeft = Math.max(0, Math.floor(box.x) - editPad - left);
    const regionTop = Math.max(0, Math.floor(box.y) - editPad - top);
    const regionWidth = Math.min(width - regionLeft, Math.ceil(box.width) + editPad * 2);
    const regionHeight = Math.min(height - regionTop, Math.ceil(box.height) + editPad * 2);
    const patch = await sharp(edited).extract({ left: regionLeft, top: regionTop, width: regionWidth, height: regionHeight }).png().toBuffer();
    // 박스 영역만 먼저 비우고(dest-out) 그 위에 결과를 덮는다. 'source' 블렌드는 나머지 영역까지 지운다.
    const eraser = await sharp({ create: { width: regionWidth, height: regionHeight, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } }).png().toBuffer();
    const cleared = await sharp(target).ensureAlpha().composite([{ input: eraser, left: left + regionLeft, top: top + regionTop, blend: 'dest-out' }]).png().toBuffer();
    return await sharp(cleared).composite([{ input: patch, left: left + regionLeft, top: top + regionTop, blend: 'over' }]).png().toBuffer();
  } catch (error) {
    logger.warn({ err: error }, '이미지 편집 API 폴백에 실패했습니다.');
    return null;
  }
}
