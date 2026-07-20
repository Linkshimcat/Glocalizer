/**
 * Nemotron OCR v2 실제 API를 로컬 이미지 파일 하나로 직접 호출해보는 수동 검증 스크립트.
 * DB/Storage 없이 순수하게 요청/응답 형태만 확인하는 용도이며, 실제 응답 필드명이
 * nvidia.types.ts의 가정과 다르면 여기서 바로 드러난다.
 *
 * 사용법: npx tsx scripts/test-ocr.ts <이미지 경로>
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { prepareImageForOcr } from '../src/image/ocr-image-preprocessor.js';
import { nemotronOcrProvider } from '../src/ai/ocr/nemotron-ocr.provider.js';
import { normalizeOcrRegions } from '../src/ai/ocr/ocr-normalizer.js';
import { mergeCloseRegions } from '../src/ai/ocr/region-merger.js';
import { selectPrimaryRegion } from '../src/ai/ocr/primary-region-selector.js';

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('사용법: npx tsx scripts/test-ocr.ts <이미지 경로>');
    process.exit(1);
  }

  const buffer = await readFile(filePath);
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height || !metadata.format) {
    throw new Error('이미지 크기/형식을 확인할 수 없습니다.');
  }

  const { dataUrl, mimeType, width: sentWidth, height: sentHeight } = await prepareImageForOcr(buffer);

  console.log(
    `[1/4] ${path.basename(filePath)} 원본 ${metadata.width}x${metadata.height} → OCR 전송용 ${mimeType} ${sentWidth}x${sentHeight} (base64 ${dataUrl.length}자) → Nemotron OCR 호출 중...`,
  );
  const [result] = await nemotronOcrProvider.recognize([{ assetId: 'local-test', dataUrl }]);

  console.log('[2/4] 원본 응답(text_detections):');
  console.dir(result.detections, { depth: null });

  const normalized = normalizeOcrRegions(result.detections, { imageWidth: metadata.width, imageHeight: metadata.height });
  console.log('\n[3/4] 정규화된 OcrRegion:');
  console.dir(normalized, { depth: null });

  const merged = selectPrimaryRegion(mergeCloseRegions(normalized), metadata.width, metadata.height);
  console.log('\n[4/4] 병합 + primaryRegion 선정 결과:');
  console.dir(merged, { depth: null });
}

main().catch((err) => {
  console.error('OCR 테스트 실패:', err);
  process.exit(1);
});
