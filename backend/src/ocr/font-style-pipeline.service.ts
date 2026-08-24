import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { findAssetsByProjectAndStatus } from '../repositories/asset.repository.js';
import { findRegionsByAssetId, updateRegionFontStyle } from '../repositories/ocr.repository.js';
import { downloadFromStorage } from '../repositories/storage.repository.js';
import type { AssetRow } from '../types/asset.js';
import { mapWithConcurrency } from '../utils/concurrency.js';
import { analyzeFontStyle } from './font-style-vision.service.js';

async function analyzeAssetFontStyle(asset: AssetRow): Promise<void> {
  try {
    if (!asset.original_path || !asset.width || !asset.height) return;
    const regions = (await findRegionsByAssetId(asset.id)).filter((region) => region.contains_korean);
    if (regions.length === 0) return;
    const buffer = await downloadFromStorage(asset.original_path);
    if (!buffer) return;
    await mapWithConcurrency(regions, env.AI_CONCURRENCY, async (region) => {
      try {
        const fontStyle = await analyzeFontStyle(buffer, region.bbox, asset.width as number, asset.height as number);
        if (fontStyle) await updateRegionFontStyle(region.id, fontStyle);
      } catch (err) {
        logger.warn({ err, assetId: asset.id, regionId: region.id }, 'OCR 영역 폰트 스타일 분석 실패 — 다른 영역은 계속 처리합니다.');
      }
    });
  } catch (err) {
    logger.warn({ err, assetId: asset.id }, '원본 글자 스타일 분석 실패 — 건너뜀');
  }
}

/**
 * OCR이 끝난 자산의 원본 글자 이미지를 분석해 폰트 유사도 매칭에 쓸 시각적 특성을 저장한다.
 * 번역과는 서로 다른 데이터(translations 테이블 vs ocr_regions.font_style)를 쓰고 서로
 * 의존하지 않아서, 파이프라인 전체 지연시간을 늘리지 않도록 번역과 병렬로 실행한다
 * (localization.pipeline.ts 참고). 실패해도 결과 저장/번역 자체는 막지 않는 보조 단계다.
 */
export async function runProjectFontStyleAnalysis(projectId: string): Promise<void> {
  const assets = await findAssetsByProjectAndStatus(projectId, ['ocr']);
  await mapWithConcurrency(assets, env.AI_CONCURRENCY, analyzeAssetFontStyle);
}
