import { env } from '../config/env.js';
import type { RecognizedRegion } from './ocr-provider.types.js';

export interface VisionFallbackResult extends RecognizedRegion { confidence: number; }

export async function requestVisionOcr(image: Buffer, candidate: RecognizedRegion): Promise<VisionFallbackResult | null> {
  if (!env.GEMINI_API_KEY) return null;
  const prompt = `이미지의 대표 한국어 이모티콘 문구를 OCR로 재확인하세요. 후보 문구: ${candidate.text}. JSON만 반환: {"text":"...","confidence":0~1,"polygon":[{"x":number,"y":number}]} . polygon은 이미지 실제 픽셀 좌표 4개입니다.`;
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_VISION_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(env.VISION_TIMEOUT_MS),
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: 'image/png', data: image.toString('base64') } }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0 } }),
  });
  if (!response.ok) return null;
  const payload: unknown = await response.json();
  const text = typeof payload === 'object' && payload !== null ? (payload as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates?.[0]?.content?.parts?.[0]?.text : undefined;
  if (!text) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== 'object') return null;
    const value = parsed as { text?: unknown; confidence?: unknown; polygon?: unknown };
    if (typeof value.text !== 'string' || typeof value.confidence !== 'number' || !Array.isArray(value.polygon)) return null;
    const polygon = value.polygon.filter((point): point is { x: number; y: number } => typeof point === 'object' && point !== null && typeof (point as { x?: unknown }).x === 'number' && typeof (point as { y?: unknown }).y === 'number');
    return polygon.length >= 4 ? { text: value.text.trim(), confidence: value.confidence, polygon } : null;
  } catch { return null; }
}
