import { describe, expect, it } from 'vitest';
import { computeImageRevision, runQaInspection } from '../../src/qa/engine.js';
import { countVerdicts } from '../../src/qa/findings.js';
import type { QaAssetInput } from '../../src/qa/inputs.js';
import type { QaFinding } from '../../src/types/qa.js';
import { findingFor, jpegImage, makeAssetInput, noisyPng, opaquePng, stickerPng } from '../helpers/qa-fixtures.js';

const okLayout = { overflowPx: 0, outsideCaptionRatio: 0, fontSizePx: 24 };
const editorState = (assetId: string, layoutMetrics: unknown) => ({ ocr_region_id: `${assetId}-r1`, language_code: 'en', style: { layoutMetrics } });

async function goodAsset(id: string, overrides: Partial<QaAssetInput> = {}): Promise<QaAssetInput> {
  return makeAssetInput(id, { image: await stickerPng(), editorStates: [editorState(id, okLayout)], ...overrides });
}

describe('runQaInspection: 의도적 결함 샘플', () => {
  it('결함마다 기대한 finding이 나오고, 정상 샘플은 전부 pass다', async () => {
    const assets = [
      await goodAsset('good'),
      await goodAsset('jpg', { image: await jpegImage() }),
      await goodAsset('big', { image: await noisyPng() }),
      await goodAsset('size', { image: await stickerPng({ width: 512, height: 512, left: 60, top: 60, blockWidth: 380, blockHeight: 380 }) }),
      await goodAsset('opaque', { image: await opaquePng() }),
      await goodAsset('overflow', { editorStates: [editorState('overflow', { overflowPx: 14, outsideCaptionRatio: 0.1, fontSizePx: 24 })] }),
    ];

    const { findings, inspectedImageIds } = await runQaInspection({ targetLanguages: ['en'], assets });

    expect(inspectedImageIds).toEqual(['good', 'jpg', 'big', 'size', 'opaque', 'overflow']);
    expect(findings.filter((f) => f.imageId === 'good').every((f) => f.severity === 'pass')).toBe(true);
    expect(findingFor(findings, 'SPEC_FORMAT', 'jpg').severity).toBe('fail');
    expect(findingFor(findings, 'SPEC_FILE_SIZE', 'big').severity).toBe('fail');
    expect(findingFor(findings, 'SPEC_DIMENSIONS', 'size').severity).toBe('fail');
    expect(findingFor(findings, 'SPEC_TRANSPARENCY', 'opaque').severity).toBe('fail');
    expect(findingFor(findings, 'TEXT_OVERFLOW', 'overflow')).toMatchObject({ severity: 'fail', measuredValue: 14 });
    expect(countVerdicts(findings, inspectedImageIds)).toEqual({ pass: 1, review: 0, fail: 5 });
  });
});

describe('runQaInspection: 에셋별 격리', () => {
  it('이미지 하나를 못 읽어도 나머지는 그대로 판정한다', async () => {
    const assets = [
      await goodAsset('unreadable', { image: Buffer.from('garbage') }),
      await goodAsset('missing', { image: null }),
      await goodAsset('fine'),
    ];
    const { findings } = await runQaInspection({ targetLanguages: ['en'], assets });

    expect(findingFor(findings, 'IMAGE_LOAD_FAILED', 'unreadable').severity).toBe('fail');
    expect(findingFor(findings, 'IMAGE_LOAD_FAILED', 'missing').severity).toBe('fail');
    expect(findings.filter((f) => f.imageId === 'fine').every((f) => f.severity === 'pass')).toBe(true);
    // 읽지 못한 이미지도 파이프라인 항목(번역 등)은 그대로 판정한다.
    expect(findingFor(findings, 'TRANSLATION_MISSING', 'missing').severity).toBe('pass');
  });

  it('파이프라인에서 실패한 에셋은 이미지가 없어도 IMAGE_LOAD_FAILED를 중복으로 내지 않는다', async () => {
    const failed = makeAssetInput('failed', { asset: { status: 'failed', error_code: 'OCR_TEXT_NOT_FOUND', error_message: '글자 없음' } as never, regions: [], translations: [], image: null });
    const { findings } = await runQaInspection({ targetLanguages: ['en'], assets: [failed] });
    expect(findings.map((f) => f.code)).toEqual(['OCR_NO_TEXT']);
  });

  it('아직 처리 중인 에셋은 판정하지 않고 검사 대상에서도 뺀다', async () => {
    const processing = await goodAsset('busy', { asset: { status: 'ocr' } as never });
    const { findings, inspectedImageIds } = await runQaInspection({ targetLanguages: ['en'], assets: [processing, await goodAsset('done')] });
    expect(inspectedImageIds).toEqual(['done']);
    expect(findings.some((f) => f.imageId === 'busy')).toBe(false);
  });

  it('에디터에서 수동 정리를 적용했으면 CLEANUP_MANUAL_REQUIRED를 pass로 본다', async () => {
    const asset = await goodAsset('manual', {
      asset: { needs_manual_cleanup: true } as never,
      editorStates: [{ ocr_region_id: 'manual-r1', language_code: 'en', style: { manualCleanup: { mode: 'solid', rect: { x: 0, y: 0, width: 0.5, height: 0.5 } } } }],
    });
    const { findings } = await runQaInspection({ targetLanguages: ['en'], assets: [asset] });
    expect(findingFor(findings, 'CLEANUP_MANUAL_REQUIRED').severity).toBe('pass');
  });
});

describe('runQaInspection: 모델 의견', () => {
  it('끼어든 ai_suggestion fail은 review로 낮춰서 리포트에 싣는다', async () => {
    const ai: QaFinding = { code: 'AI_CULTURE_RISK', severity: 'fail', source: 'ai_suggestion', imageId: 'good', message: '문화권 위험 가능성' };
    const { findings } = await runQaInspection({ targetLanguages: ['en'], assets: [await goodAsset('good')], extraFindings: [ai] });
    expect(findingFor(findings, 'AI_CULTURE_RISK')).toMatchObject({ severity: 'review', source: 'ai_suggestion' });
  });
});

describe('computeImageRevision', () => {
  it('같은 상태면 에셋 순서와 상관없이 같은 값이다', async () => {
    const a = await goodAsset('a');
    const b = await goodAsset('b');
    expect(computeImageRevision([a, b], ['en'])).toBe(computeImageRevision([b, a], ['en']));
  });

  it('이미지 바이트는 상태에 포함하지 않는다 (다운로드 여부로 값이 달라지면 안 된다)', async () => {
    const withImage = await goodAsset('a');
    const withoutImage = { ...withImage, image: null };
    expect(computeImageRevision([withImage], ['en'])).toBe(computeImageRevision([withoutImage], ['en']));
  });

  it.each([
    ['에디터 스타일이 바뀜', (a: QaAssetInput) => ({ ...a, editorStates: [editorState(a.asset.id, { ...okLayout, overflowPx: 3 })] })],
    ['번역 문구가 바뀜', (a: QaAssetInput) => ({ ...a, translations: [{ ...a.translations[0]!, final_candidates: [{ text: 'Hi', tone: 't', meaning: 'm', best: true }] }] })],
    ['정리 결과 파일이 바뀜', (a: QaAssetInput) => ({ ...a, asset: { ...a.asset, cleaned_path: 'projects/p/cleaned/new.png' } })],
    ['에셋 갱신 시각이 바뀜', (a: QaAssetInput) => ({ ...a, asset: { ...a.asset, updated_at: '2026-10-30T00:00:00.000Z' } })],
  ])('%s → 다른 값이다', async (_label, mutate) => {
    const base = await goodAsset('a');
    expect(computeImageRevision([mutate(base)], ['en'])).not.toBe(computeImageRevision([base], ['en']));
  });

  it('요청 언어의 나열 순서가 달라도 같은 값이다', async () => {
    const base = await goodAsset('a');
    expect(computeImageRevision([base], ['ja', 'en'])).toBe(computeImageRevision([base], ['en', 'ja']));
  });

  it('요청 언어가 바뀌어도 다른 값이다', async () => {
    const base = await goodAsset('a');
    expect(computeImageRevision([base], ['en', 'ja'])).not.toBe(computeImageRevision([base], ['en']));
  });
});
