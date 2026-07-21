/**
 * 실제 이미지 한 장으로 OCR → 대표 영역 선정 → 원본 글자 제거까지 전체를 확인하는 스크립트.
 * DB/Storage 없이 동작하며, 결과 PNG를 파일로 저장해 눈으로 직접 확인할 수 있다.
 *
 * 사용법: npx tsx scripts/test-cleanup.ts <이미지 경로> [출력 경로]
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { prepareImageForOcr } from '../src/image/ocr-image-preprocessor.js';
import { nemotronOcrProvider } from '../src/ai/ocr/nemotron-ocr.provider.js';
import { normalizeOcrRegions } from '../src/ai/ocr/ocr-normalizer.js';
import { mergeCloseRegions } from '../src/ai/ocr/region-merger.js';
import { selectPrimaryRegion } from '../src/ai/ocr/primary-region-selector.js';
import { sampleBorderPixels } from '../src/image/background-sampler.js';
import { assessCleanupQuality, decideCleanupMethod } from '../src/image/cleanup-quality.js';
import { applyTransparentCleanup } from '../src/image/transparent-cleanup.js';
import { applySolidColorCleanup } from '../src/image/solid-color-cleanup.js';

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('사용법: npx tsx scripts/test-cleanup.ts <이미지 경로> [출력 경로]');
    process.exit(1);
  }
  const outputPath = process.argv[3] ?? filePath.replace(/(\.\w+)$/, '.cleaned.png');

  const buffer = await readFile(filePath);
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height) throw new Error('이미지 크기를 확인할 수 없습니다.');
  const { width, height } = metadata;

  console.log(`[1/4] ${path.basename(filePath)} (${width}x${height}) OCR 호출 중...`);
  const { dataUrl } = await prepareImageForOcr(buffer);
  const [result] = await nemotronOcrProvider.recognize([{ assetId: 'local-test', dataUrl }]);
  const regions = selectPrimaryRegion(mergeCloseRegions(normalizeOcrRegions(result.detections, { imageWidth: width, imageHeight: height })), width, height);
  const primary = regions.find((region) => region.isPrimary);

  if (!primary) {
    console.log('텍스트를 찾지 못해 정리할 영역이 없습니다.');
    return;
  }
  console.log(`[2/4] 대표 영역: "${primary.text}"`, primary.box);

  const stats = await sampleBorderPixels(buffer, primary.box, width, height);
  const method = decideCleanupMethod(stats);
  const quality = assessCleanupQuality(method, stats);
  console.log('[3/4] 배경 통계 및 판정:', { stats, method, quality });

  if (method === 'manual-required') {
    console.log('배경이 복잡해 자동 정리를 건너뜁니다 (manual-required).');
    return;
  }

  const cleaned =
    method === 'transparent-mask'
      ? await applyTransparentCleanup(buffer, primary.box, width, height)
      : await applySolidColorCleanup(buffer, primary.box, stats.medianColor, width, height);

  await writeFile(outputPath, cleaned);
  console.log(`[4/4] 저장됨: ${outputPath}`);
}

main().catch((err) => {
  console.error('cleanup 테스트 실패:', err);
  process.exit(1);
});
