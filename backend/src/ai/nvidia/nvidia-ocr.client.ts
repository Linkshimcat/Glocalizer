import { env } from '../../config/env.js';
import { AppError } from '../../errors/app-error.js';
import { withRetry } from '../../utils/retry.js';
import type { NemotronOcrResponse } from './nvidia.types.js';

export interface OcrImageInput {
  /** data:image/png;base64,... 형태의 data URI */
  dataUrl: string;
}

/**
 * NVIDIA가 제공한 실제 예제 기준 제약: 이미지를 data URI로 바로 임베드하는 경우
 * base64 문자열 길이가 180,000자 미만이어야 한다 (대략 원본 파일 130KB 안팎).
 * NVCF Assets API(POST /v2/nvcf/assets → presigned URL 업로드)로 큰 원본을 올리고
 * asset을 참조하는 방식도 실제로 시도해봤지만, 이 엔드포인트(/v1/cv/nvidia/nemotron-ocr-v2)는
 * url 필드가 "data:<type>;base64,<data>" 형식이 아니면 422로 거부해 asset 참조를 받아주지 않았다
 * (2026-07-21 실측). 그래서 호출 전에 image/ocr-image-preprocessor.ts에서 이미지를 미리
 * 이 한도 밑으로 줄여서 넘긴다 — 아래 검사는 그 전처리가 실패했을 때를 잡는 안전망이다.
 */
const MAX_INLINE_BASE64_LENGTH = 180_000;

export async function callNemotronOcr(images: OcrImageInput[]): Promise<NemotronOcrResponse> {
  const apiKey = env.NVIDIA_OCR_API_KEY ?? env.NVIDIA_API_KEY;
  if (!env.NVIDIA_OCR_BASE_URL || !apiKey) {
    throw new AppError(
      'NEMOTRON_OCR_FAILED',
      undefined,
      'NVIDIA_OCR_BASE_URL 또는 NVIDIA_OCR_API_KEY가 설정되어 있지 않습니다.',
    );
  }

  const oversized = images.find((image) => image.dataUrl.length >= MAX_INLINE_BASE64_LENGTH);
  if (oversized) {
    throw new AppError(
      'NEMOTRON_OCR_FAILED',
      { limit: MAX_INLINE_BASE64_LENGTH },
      '이미지가 너무 커서 인라인 base64로 보낼 수 없습니다 (NVCF Assets API 연동 필요).',
    );
  }

  return withRetry(
    async () => {
      const response = await fetch(env.NVIDIA_OCR_BASE_URL!, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          input: images.map((image) => ({ type: 'image_url' as const, url: image.dataUrl })),
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new AppError(
          'NEMOTRON_OCR_FAILED',
          { status: response.status, body: body.slice(0, 500) },
          `Nemotron OCR 요청이 실패했습니다 (status ${response.status}).`,
        );
      }

      return (await response.json()) as NemotronOcrResponse;
    },
    {
      attempts: 3,
      delayMs: 500,
      shouldRetry: (err) => !(err instanceof AppError) || (typeof err.details?.status === 'number' && err.details.status >= 500),
    },
  );
}
