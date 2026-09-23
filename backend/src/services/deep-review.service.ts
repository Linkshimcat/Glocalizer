import sharp from 'sharp';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { AppError } from '../errors/app-error.js';
import { findProjectById } from '../repositories/project.repository.js';
import type { DeepReviewRequest, DeepReviewResponse } from '../schemas/deep-review.schema.js';
import { deepReviewResponseSchema } from '../schemas/deep-review.schema.js';
import { generationWorkspace, ownedGeneration } from './generation.service.js';
import { getProjectResults } from './result.service.js';

const MAX_IMAGES = 6;
const MAX_CONTEXT_CHARS = 14_000;

const LOCALE_NAMES: Record<DeepReviewRequest['locale'], string> = {
  ko: 'Korean',
  en: 'English',
  ja: 'Japanese',
  zh: 'Simplified Chinese',
};

interface ReviewImage {
  name: string;
  url: string;
}

interface ReviewMaterial {
  label: string;
  text: unknown;
  images: ReviewImage[];
}

async function loadLocalizationProject(id: string, ownerId: string): Promise<ReviewMaterial> {
  const project = await findProjectById(id);
  if (!project || project.owner_id !== ownerId || !project.result_ready) throw new AppError('PROJECT_NOT_FOUND', { projectId: id });
  const results = await getProjectResults(id);
  return {
    label: `localization:${id}`,
    text: results.assets.map(asset => ({
      imageName: asset.name,
      ocr: asset.ocr.regions.map(region => region.text),
      localizations: Object.fromEntries(Object.entries(asset.localizations).map(([language, localization]) => [
        language,
        localization.candidates.map(candidate => candidate.text),
      ])),
      cleanup: asset.cleanup,
    })),
    images: results.assets.flatMap(asset => {
      const url = asset.cleanedUrl ?? asset.originalUrl;
      return url ? [{ name: asset.name, url }] : [];
    }),
  };
}

async function loadGenerationProject(id: string, ownerId: string): Promise<ReviewMaterial> {
  const workspace = await generationWorkspace(await ownedGeneration(id, ownerId));
  const completed = workspace.images.filter(image => image.status === 'completed' && image.url);
  return {
    label: `generation:${id}`,
    text: {
      characterPrompt: workspace.prompt,
      images: completed.map(image => ({ slot: image.slot, prompt: image.prompt, caption: image.caption })),
    },
    images: completed.flatMap(image => image.url ? [{ name: `${workspace.prompt}-${image.slot}.png`, url: image.url }] : []),
  };
}

async function toVisionImage(image: ReviewImage) {
  const response = await fetch(image.url, { signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new AppError('AI_REVIEW_FAILED', { status: response.status }, '검토할 이미지를 불러오지 못했습니다.');
  const source = Buffer.from(await response.arrayBuffer());
  const normalized = await sharp(source, { limitInputPixels: 16_777_216 })
    .rotate()
    .resize(768, 768, { fit: 'inside', withoutEnlargement: true })
    .png({ compressionLevel: 8 })
    .toBuffer();
  return {
    type: 'image_url' as const,
    image_url: { url: `data:image/png;base64,${normalized.toString('base64')}`, detail: 'low' },
  };
}

function buildPrompt(materials: ReviewMaterial[], locale: DeepReviewRequest['locale']): string {
  const context = JSON.stringify(materials.map(material => ({ project: material.label, data: material.text }))).slice(0, MAX_CONTEXT_CHARS);
  return `You are a cautious expert reviewer for chat sticker releases on OGQ Market.
Analyze only the supplied project images and structured OCR/localization context. Give practical pre-release feedback on readability at small size, expression-text alignment, visual consistency, localization naturalness, and obvious OGQ-readiness risks. Do not claim approval, copyright infringement, plagiarism, or policy compliance. If evidence is missing, say so. Score conservatively.

Return JSON only with exactly these fields:
readinessScore (integer 0-100), summary, strengths (1-4 strings), priorityFixes (1-4 objects with title/reason/action), imageFeedback (objects with imageName/feedback), localizationFeedback (objects with language/feedback), disclaimer.
Write every user-facing string in ${LOCALE_NAMES[locale]}. The disclaimer must state that this is AI reference feedback and does not guarantee OGQ approval.

Project context:
${context}`;
}

export async function createDeepReview(input: DeepReviewRequest, ownerId: string): Promise<DeepReviewResponse> {
  if (!env.OPENAI_API_KEY) throw new AppError('AI_REVIEW_UNAVAILABLE');

  const materials = await Promise.all(input.projects.map(project => project.kind === 'localization'
    ? loadLocalizationProject(project.id, ownerId)
    : loadGenerationProject(project.id, ownerId)));
  const images = materials.flatMap(material => material.images).slice(0, MAX_IMAGES);
  if (images.length === 0) throw new AppError('INVALID_REQUEST', undefined, '검토할 완성 이미지가 없습니다.');
  const visionImages = await Promise.all(images.map(toVisionImage));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.AI_REVIEW_TIMEOUT_MS);
  try {
    const response = await fetch(`${env.OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: env.AI_REVIEW_MODEL,
        messages: [{ role: 'user', content: [{ type: 'text', text: buildPrompt(materials, input.locale) }, ...visionImages] }],
        max_completion_tokens: 4_000,
        response_format: { type: 'json_object' },
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new AppError('AI_REVIEW_FAILED', { status: response.status }, `AI 심층 피드백 요청이 실패했습니다. (${response.status})`);
    const body = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = body.choices?.[0]?.message?.content;
    if (!content) throw new AppError('AI_REVIEW_FAILED', undefined, 'AI 심층 피드백 결과가 비어 있습니다.');
    return deepReviewResponseSchema.parse(JSON.parse(content));
  } catch (error) {
    if (error instanceof AppError) throw error;
    const timedOut = error instanceof Error && error.name === 'AbortError';
    if (!timedOut) logger.warn({ err: error }, 'Deep review response could not be parsed');
    throw new AppError('AI_REVIEW_FAILED', undefined, timedOut ? 'AI 심층 피드백 요청 시간이 초과되었습니다.' : 'AI 심층 피드백을 생성하지 못했습니다.');
  } finally {
    clearTimeout(timeout);
  }
}
