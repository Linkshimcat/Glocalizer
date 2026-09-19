import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';

export interface OgqSticker {
  assetId: string;
  title: string | null;
  thumbnailUrl: string;
  animated: boolean;
}

interface OgqAssetElement {
  assetId: string;
  title: string | null;
  thumbnailUrl: string;
  // asset.imageUrl은 OGQ 검색 API 응답에서 리사이즈 format 파라미터가 빠진 채로 내려와
  // CDN이 400을 반환한다(실측 확인, 2026-09-19). thumbnailUrl(?format=c240_240 포함)만 신뢰한다.
  animated: boolean;
}

interface OgqSearchResponse {
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
  elements: OgqAssetElement[];
}

// 랜딩 갤러리·샘플 선택기가 같은 인기 목록을 반복 요청하므로, 분당 60회 조회 한도를 넉넉히
// 지키기 위해 짧게 캐시한다. 캐시는 프로세스 재시작 시 비워지는 것으로 충분하다(PoC 규모).
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { expiresAt: number; data: OgqSticker[] }>();

export async function fetchOgqStickers(limit: number): Promise<OgqSticker[]> {
  if (!env.OGQ_API_KEY) throw new AppError('OGQ_NOT_CONFIGURED');

  const cacheKey = String(limit);
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const search = new URLSearchParams({
    type: 'STICKER',
    ordering: 'POPULAR',
    pageSize: String(limit),
  });

  const response = await fetch(`${env.OGQ_API_BASE_URL}/v1/assets?${search}`, {
    headers: { 'X-OGQ-API-KEY': env.OGQ_API_KEY },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new AppError('OGQ_REQUEST_FAILED', undefined, `OGQ 마켓 조회에 실패했습니다 (${response.status}).`);

  const payload = (await response.json()) as OgqSearchResponse;
  const data = payload.elements.map((element) => ({
    assetId: element.assetId,
    title: element.title,
    thumbnailUrl: element.thumbnailUrl,
    animated: element.animated,
  }));

  cache.set(cacheKey, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}
