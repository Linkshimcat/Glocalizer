import sharp from 'sharp';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { padAndClampBox, type PixelBox } from '../utils/bbox.js';
import type { FontStyle } from '../types/ocr.js';

const CROP_PADDING_RATIO = 0.3;
const CROP_MAX_DIMENSION = 320;

const WEIGHTS = ['thin', 'regular', 'bold', 'black'] as const;
const ROUNDNESS = ['sharp', 'neutral', 'round'] as const;
const FORMALITY = ['playful', 'neutral', 'formal'] as const;

const PROMPT = `이 이미지는 이모티콘에 쓰인 한국어 글자를 크게 자른 것입니다. 글자가 무슨 뜻인지가 아니라
"생김새"(폰트 특징)만 분석하세요. JSON만 반환하세요, 다른 설명은 넣지 마세요:
{"weight":"thin|regular|bold|black","roundness":"sharp|neutral|round","handwritten":true|false,"formality":"playful|neutral|formal"}
- weight: 획 굵기 (thin=아주 가는 획 ~ black=아주 두꺼운 획)
- roundness: 글자 모서리가 각진 정도(sharp)부터 둥근 정도(round)까지
- handwritten: 손글씨처럼 획이 불규칙하고 개성 있으면 true, 정형화된 인쇄체 폰트면 false
- formality: 장난스럽고 캐주얼한 느낌이면 playful, 진지하고 격식있는 느낌이면 formal, 그 중간이면 neutral`;

interface FontStylePayload {
  weight?: unknown;
  roundness?: unknown;
  handwritten?: unknown;
  formality?: unknown;
}

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === 'string' && (options as readonly string[]).includes(value);
}

function parseFontStyle(text: string): FontStyle | null {
  try {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    const parsed: unknown = JSON.parse(jsonStart >= 0 && jsonEnd > jsonStart ? text.slice(jsonStart, jsonEnd + 1) : text);
    if (!parsed || typeof parsed !== 'object') return null;
    const value = parsed as FontStylePayload;
    if (
      !isOneOf(value.weight, WEIGHTS)
      || !isOneOf(value.roundness, ROUNDNESS)
      || !isOneOf(value.formality, FORMALITY)
      || typeof value.handwritten !== 'boolean'
    ) {
      return null;
    }
    return { weight: value.weight, roundness: value.roundness, handwritten: value.handwritten, formality: value.formality };
  } catch {
    return null;
  }
}

async function cropRegionToDataUrl(buffer: Buffer, box: PixelBox, imageWidth: number, imageHeight: number): Promise<string> {
  const padding = Math.max(12, Math.round(Math.max(box.width, box.height) * CROP_PADDING_RATIO));
  const padded = padAndClampBox(box, padding, imageWidth, imageHeight);
  const cropped = await sharp(buffer)
    .extract({
      left: Math.round(padded.x),
      top: Math.round(padded.y),
      width: Math.max(1, Math.round(padded.width)),
      height: Math.max(1, Math.round(padded.height)),
    })
    .resize({ width: CROP_MAX_DIMENSION, height: CROP_MAX_DIMENSION, fit: 'inside' })
    .png()
    .toBuffer();
  return `data:image/png;base64,${cropped.toString('base64')}`;
}

async function requestGroqFontStyle(dataUrl: string): Promise<FontStyle | null> {
  if (!env.GROQ_API_KEY) return null;
  const response = await fetch(`${env.GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.GROQ_API_KEY}` },
    signal: AbortSignal.timeout(env.VISION_TIMEOUT_MS),
    body: JSON.stringify({
      model: env.GROQ_VISION_MODEL,
      messages: [{ role: 'user', content: [
        { type: 'text', text: PROMPT },
        { type: 'image_url', image_url: { url: dataUrl } },
      ] }],
      temperature: 0.1,
      reasoning_effort: 'none',
      max_completion_tokens: 256,
    }),
  });
  if (!response.ok) {
    logger.warn({ provider: 'groq', statusCode: response.status }, '폰트 스타일 분석 요청 실패');
    return null;
  }
  const payload: unknown = await response.json();
  const text = typeof payload === 'object' && payload !== null
    ? (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]?.message?.content
    : undefined;
  return typeof text === 'string' ? parseFontStyle(text) : null;
}

async function requestGeminiFontStyle(dataUrl: string): Promise<FontStyle | null> {
  if (!env.GEMINI_API_KEY) return null;
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_VISION_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    signal: AbortSignal.timeout(env.VISION_TIMEOUT_MS),
    body: JSON.stringify({
      contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: 'image/png', data: base64 } }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0 },
    }),
  });
  if (!response.ok) {
    logger.warn({ provider: 'gemini', statusCode: response.status }, '폰트 스타일 분석 요청 실패');
    return null;
  }
  const payload: unknown = await response.json();
  const text = typeof payload === 'object' && payload !== null
    ? (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates?.[0]?.content?.parts?.[0]?.text
    : undefined;
  return typeof text === 'string' ? parseFontStyle(text) : null;
}

/**
 * 원본 텍스트 영역을 크롭해 Vision 모델에게 "내용이 아니라 생김새"만 분석시킨다.
 * OCR·번역과는 독립적인 보조 신호라, 실패해도 파이프라인을 막지 않고 null을 반환한다
 * (호출부는 null이면 기존 카테고리 기반 폰트 추천으로 그대로 폴백한다).
 */
export async function analyzeFontStyle(buffer: Buffer, box: PixelBox, imageWidth: number, imageHeight: number): Promise<FontStyle | null> {
  if (!env.ENABLE_FONT_STYLE_ANALYSIS) return null;
  try {
    const dataUrl = await cropRegionToDataUrl(buffer, box, imageWidth, imageHeight);
    return env.VISION_PROVIDER === 'gemini' ? await requestGeminiFontStyle(dataUrl) : await requestGroqFontStyle(dataUrl);
  } catch (err) {
    logger.warn({ err }, '원본 글자 스타일 분석 중 오류 — 건너뜀');
    return null;
  }
}
