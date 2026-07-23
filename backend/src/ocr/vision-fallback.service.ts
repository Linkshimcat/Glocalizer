import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import type { RecognizedRegion } from './ocr-provider.types.js';

export interface VisionFallbackResult extends RecognizedRegion { confidence: number; }

interface VisionOcrOptions {
  confirmedText?: string;
}

interface VisionResponsePayload {
  text?: unknown;
  confidence?: unknown;
  polygon?: unknown;
}

function parseVisionResult(text: string): VisionFallbackResult | null {
  try {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    const parsed: unknown = JSON.parse(jsonStart >= 0 && jsonEnd > jsonStart ? text.slice(jsonStart, jsonEnd + 1) : text);
    if (!parsed || typeof parsed !== 'object') return null;
    const value = parsed as VisionResponsePayload;
    if (typeof value.text !== 'string' || typeof value.confidence !== 'number' || !Array.isArray(value.polygon)) return null;
    const polygon = value.polygon.filter((point): point is { x: number; y: number } => typeof point === 'object' && point !== null && typeof (point as { x?: unknown }).x === 'number' && typeof (point as { y?: unknown }).y === 'number');
    return polygon.length >= 4 ? { text: value.text.trim(), confidence: value.confidence, polygon } : null;
  } catch {
    return null;
  }
}

function buildPrompt(candidate?: RecognizedRegion, options: VisionOcrOptions = {}): string {
  if (options.confirmedText) {
    return `사용자가 이미지의 한국어 문구를 "${options.confirmedText}"로 확정했습니다. 이 문구가 이미지에서 차지하는 정확한 위치만 찾으세요. 문구는 절대 바꾸지 말고 JSON만 반환: {"text":"${options.confirmedText}","confidence":0~1,"polygon":[{"x":number,"y":number}]} . polygon은 이미지 실제 픽셀 좌표 4개입니다.`;
  }
  const candidateHint = candidate ? `PaddleOCR 후보 문구: ${candidate.text}.` : 'PaddleOCR가 유효한 문구를 찾지 못했습니다.';
  return `이미지의 대표 한국어 이모티콘 문구를 정확히 OCR로 판독하세요. ${candidateHint} 손글씨·말풍선·줄바꿈을 고려해 누락된 글자를 복원하되, 추측하지 마세요. JSON만 반환: {"text":"...","confidence":0~1,"polygon":[{"x":number,"y":number}]} . polygon은 이미지 실제 픽셀 좌표 4개입니다.`;
}

async function requestGroqVisionOcr(image: Buffer, candidate?: RecognizedRegion, options?: VisionOcrOptions): Promise<VisionFallbackResult | null> {
  if (!env.GROQ_API_KEY) return null;
  const response = await fetch(`${env.GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.GROQ_API_KEY}` },
    signal: AbortSignal.timeout(env.VISION_TIMEOUT_MS),
    body: JSON.stringify({
      model: env.GROQ_VISION_MODEL,
      messages: [{ role: 'user', content: [
        { type: 'text', text: buildPrompt(candidate, options) },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${image.toString('base64')}` } },
      ] }],
      temperature: 0.1,
      reasoning_effort: 'none',
      max_completion_tokens: 512,
    }),
  });
  if (!response.ok) {
    logger.warn({ provider: 'groq', statusCode: response.status }, 'Vision OCR fallback 요청 실패');
    return null;
  }
  const payload: unknown = await response.json();
  const text = typeof payload === 'object' && payload !== null
    ? (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]?.message?.content
    : undefined;
  return typeof text === 'string' ? parseVisionResult(text) : null;
}

async function requestGeminiVisionOcr(image: Buffer, candidate?: RecognizedRegion, options?: VisionOcrOptions): Promise<VisionFallbackResult | null> {
  if (!env.GEMINI_API_KEY) return null;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_VISION_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(env.VISION_TIMEOUT_MS),
    body: JSON.stringify({ contents: [{ parts: [{ text: buildPrompt(candidate, options) }, { inline_data: { mime_type: 'image/png', data: image.toString('base64') } }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0 } }),
  });
  if (!response.ok) {
    logger.warn({ provider: 'gemini', statusCode: response.status }, 'Vision OCR fallback 요청 실패');
    return null;
  }
  const payload: unknown = await response.json();
  const text = typeof payload === 'object' && payload !== null ? (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates?.[0]?.content?.parts?.[0]?.text : undefined;
  return typeof text === 'string' ? parseVisionResult(text) : null;
}

export async function requestVisionOcr(image: Buffer, candidate?: RecognizedRegion, options?: VisionOcrOptions): Promise<VisionFallbackResult | null> {
  return env.VISION_PROVIDER === 'gemini'
    ? requestGeminiVisionOcr(image, candidate, options)
    : requestGroqVisionOcr(image, candidate, options);
}
