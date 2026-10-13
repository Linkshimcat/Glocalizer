import sharp from 'sharp';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { AppError } from '../errors/app-error.js';
import { downloadFromStorage } from '../repositories/storage.repository.js';
import { taskFetch } from '../utils/task-context.js';
import { requireEditableAsset } from '../services/ocr-review.service.js';

const IMAGE_MAX_DIMENSION = 512;
const CAPTION_MAX_LENGTH = 12;

export interface CaptionCandidate {
  text: string;
  tone: string;
  best: boolean;
}

export interface CaptionSuggestion {
  emotion: string;
  emotionConfidence: number;
  action: string;
  situations: string[];
  candidates: CaptionCandidate[];
}

// 한글 글자 "생김새"만 보는 font-style-vision.service.ts와 달리, 여기는 글자가 전혀 없는
// 이모티콘 원본 전체를 보고 감정·동작·상황을 읽어 어울리는 한국어 문구를 짓는다.
const PROMPT = `이 이미지는 글자가 없는 한국어 이모티콘(채팅 스티커) 캐릭터입니다. 표정·동작·전체 분위기를 분석해서
채팅에서 바로 쓸 수 있는 짧은 한국어 문구를 추천하세요. JSON만 반환하세요, 다른 설명은 넣지 마세요:
{"emotion":"string","emotionConfidence":0.0,"action":"string","situations":["string","string","string"],"candidates":[{"text":"string","tone":"string","best":true},{"text":"string","tone":"string","best":false},{"text":"string","tone":"string","best":false}]}
- emotion: 캐릭터의 감정을 한 단어로(예: "기쁨","슬픔","분노","놀람")
- emotionConfidence: 그 감정 판단에 대한 확신도, 0과 1 사이 숫자
- action: 캐릭터가 하고 있는 동작을 한 문장으로(예: "한 손을 들어 흔들어요")
- situations: 이 이모티콘이 쓰일 법한 상황 태그 2~3개(예: ["인사","만남","반가움"])
- candidates: 반드시 정확히 3개, 서로 다른 한국어 문구. 채팅에서 자연스럽게 쓰는 짧은 말투로, 공백 포함
  최대 ${CAPTION_MAX_LENGTH}자. 이모지·해시태그·따옴표는 넣지 마세요. tone은 말투를 짧게(예: "반가운","공손한").
  정확히 하나만 best:true로 표시 — 캐릭터의 표정·동작과 가장 잘 맞는 것.`;

interface CaptionSuggestionPayload {
  emotion?: unknown;
  emotionConfidence?: unknown;
  action?: unknown;
  situations?: unknown;
  candidates?: unknown;
}

function parseCandidates(value: unknown): CaptionCandidate[] | null {
  if (!Array.isArray(value) || value.length !== 3) return null;
  const candidates: CaptionCandidate[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const { text, tone, best } = item as { text?: unknown; tone?: unknown; best?: unknown };
    if (typeof text !== 'string' || typeof tone !== 'string' || typeof best !== 'boolean') return null;
    const trimmed = Array.from(text.trim()).slice(0, CAPTION_MAX_LENGTH).join('');
    if (!trimmed) return null;
    candidates.push({ text: trimmed, tone: tone.trim() || '기본', best });
  }
  if (candidates.filter((candidate) => candidate.best).length !== 1) {
    // 모델이 best를 0개나 2개 이상 표시하면, 첫 후보를 대표로 강제해 화면이 항상 하나를 고르고 있게 한다.
    candidates.forEach((candidate, index) => { candidate.best = index === 0; });
  }
  return candidates;
}

function parseCaptionSuggestion(text: string): CaptionSuggestion | null {
  try {
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    const parsed: unknown = JSON.parse(jsonStart >= 0 && jsonEnd > jsonStart ? text.slice(jsonStart, jsonEnd + 1) : text);
    if (!parsed || typeof parsed !== 'object') return null;
    const value = parsed as CaptionSuggestionPayload;
    if (typeof value.emotion !== 'string' || !value.emotion.trim()) return null;
    if (typeof value.action !== 'string' || !value.action.trim()) return null;
    if (!Array.isArray(value.situations) || !value.situations.every((item) => typeof item === 'string')) return null;
    const candidates = parseCandidates(value.candidates);
    if (!candidates) return null;
    const confidence = typeof value.emotionConfidence === 'number' && Number.isFinite(value.emotionConfidence)
      ? Math.max(0, Math.min(1, value.emotionConfidence))
      : 0.5;
    return {
      emotion: value.emotion.trim(),
      emotionConfidence: confidence,
      action: value.action.trim(),
      situations: value.situations.map((item) => item.trim()).filter(Boolean).slice(0, 3),
      candidates,
    };
  } catch {
    return null;
  }
}

async function imageToDataUrl(buffer: Buffer): Promise<string> {
  const resized = await sharp(buffer)
    .resize({ width: IMAGE_MAX_DIMENSION, height: IMAGE_MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
    .png()
    .toBuffer();
  return `data:image/png;base64,${resized.toString('base64')}`;
}

async function requestGroqCaptionSuggestion(dataUrl: string): Promise<CaptionSuggestion | null> {
  if (!env.GROQ_API_KEY) return null;
  const response = await taskFetch(`${env.GROQ_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.GROQ_API_KEY}` },
    signal: AbortSignal.timeout(env.VISION_TIMEOUT_MS),
    body: JSON.stringify({
      model: env.GROQ_VISION_MODEL,
      messages: [{ role: 'user', content: [
        { type: 'text', text: PROMPT },
        { type: 'image_url', image_url: { url: dataUrl } },
      ] }],
      temperature: 0.6,
      reasoning_effort: 'none',
      max_completion_tokens: 512,
    }),
  });
  if (!response.ok) {
    logger.warn({ provider: 'groq', statusCode: response.status }, '문구 추천 요청 실패');
    return null;
  }
  const payload: unknown = await response.json();
  const text = typeof payload === 'object' && payload !== null
    ? (payload as { choices?: Array<{ message?: { content?: unknown } }> }).choices?.[0]?.message?.content
    : undefined;
  return typeof text === 'string' ? parseCaptionSuggestion(text) : null;
}

/**
 * 글자가 없는 이모티콘 원본 전체를 보고 감정·동작·상황을 분석해 한국어 문구 3안을 추천한다.
 * 사용자가 화면에서 직접 기다리는 상호작용이라, font-style-vision.service.ts와 달리 실패를
 * 조용히 null로 묻지 않고 던진다 — 호출부(컨트롤러)가 에러를 그대로 사용자에게 보여줘야 한다.
 */
export async function suggestCaptionForAsset(projectId: string, assetId: string): Promise<CaptionSuggestion> {
  const asset = await requireEditableAsset(projectId, assetId);
  const source = await downloadFromStorage(asset.original_path);
  if (!source) throw new AppError('CAPTION_SUGGESTION_FAILED', { assetId }, '원본 이미지를 불러오지 못했습니다.');
  const dataUrl = await imageToDataUrl(source);
  let suggestion: CaptionSuggestion | null;
  try {
    suggestion = await requestGroqCaptionSuggestion(dataUrl);
  } catch (err) {
    logger.warn({ err, assetId }, '문구 추천 중 오류');
    suggestion = null;
  }
  if (!suggestion) throw new AppError('CAPTION_SUGGESTION_FAILED', { assetId });
  return suggestion;
}
