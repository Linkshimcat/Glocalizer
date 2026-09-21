import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/env.js', () => ({ env: { AI_CONCURRENCY: 2, LOG_LEVEL: 'silent' } }));
vi.mock('../../src/repositories/asset.repository.js', () => ({ findAssetsByProjectAndStatus: vi.fn(), updateAsset: vi.fn() }));
vi.mock('../../src/repositories/ocr.repository.js', () => ({ findRegionsByAssetId: vi.fn(), updateRegionCleanupMetadata: vi.fn() }));
vi.mock('../../src/repositories/project.repository.js', () => ({ findProjectById: vi.fn(), updateProjectStage: vi.fn() }));
vi.mock('../../src/repositories/translation.repository.js', () => ({ findTranslationsByOcrRegionIds: vi.fn() }));
vi.mock('../../src/repositories/storage.repository.js', () => ({ downloadFromStorage: vi.fn(), uploadToStorage: vi.fn() }));
vi.mock('../../src/image/background-sampler.js', () => ({
  decodeImagePixels: vi.fn().mockResolvedValue({ data: Buffer.alloc(400), width: 10, height: 10, channels: 4 }),
}));
vi.mock('../../src/image/region-cleanup.js', () => ({ cleanRegionPixels: vi.fn() }));
vi.mock('../../src/image/region-repair.js', () => ({ verifyAndRepair: vi.fn() }));

const assetRepo = await import('../../src/repositories/asset.repository.js');
const ocrRepo = await import('../../src/repositories/ocr.repository.js');
const projectRepo = await import('../../src/repositories/project.repository.js');
const translationRepo = await import('../../src/repositories/translation.repository.js');
const storageRepo = await import('../../src/repositories/storage.repository.js');
const regionCleanup = await import('../../src/image/region-cleanup.js');
const regionRepair = await import('../../src/image/region-repair.js');
const { runCleanupForAsset } = await import('../../src/image/cleanup.service.js');

const region = { id: 'r1', contains_korean: true, needs_manual_review: false, agreement_score: 0.95, is_primary: true, bbox: { x: 1, y: 1, width: 4, height: 3 } };
const asset = { id: 'a1', project_id: 'p1', original_path: 'o.png', width: 10, height: 10 } as never;
const cleaned = { kind: 'cleaned' as const, method: 'solid-color-fill' as const, quality: 'good' as const, buffer: Buffer.from('cleaned'), textColor: { r: 1, g: 2, b: 3 } };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(ocrRepo.findRegionsByAssetId).mockResolvedValue([region] as never);
  vi.mocked(projectRepo.findProjectById).mockResolvedValue({ target_languages: ['en'] } as never);
  vi.mocked(translationRepo.findTranslationsByOcrRegionIds).mockResolvedValue([{ ocr_region_id: 'r1', language_code: 'en' }] as never);
  vi.mocked(storageRepo.downloadFromStorage).mockResolvedValue(Buffer.from('source'));
  vi.mocked(regionCleanup.cleanRegionPixels).mockResolvedValue(cleaned);
});

describe('runCleanupForAsset — 정리 후 재검증', () => {
  it('재검증을 통과하면 성공으로 기록한다', async () => {
    vi.mocked(regionRepair.verifyAndRepair).mockResolvedValue({ ...cleaned, residualText: false });
    const result = await runCleanupForAsset(asset);
    expect(result).toMatchObject({ method: 'solid-color-fill', quality: 'good', needsManualCleanup: false });
    expect(ocrRepo.updateRegionCleanupMetadata).toHaveBeenCalledWith('r1', { textColor: cleaned.textColor, needsManualCleanup: false });
  });

  it('글자가 남았는데 폴백도 못 했으면 성공으로 기록하지 않고 수동 정리를 안내한다', async () => {
    vi.mocked(regionRepair.verifyAndRepair).mockResolvedValue({ ...cleaned, quality: 'low', residualText: true });
    const result = await runCleanupForAsset(asset);
    expect(result).toMatchObject({ method: 'solid-color-fill', quality: 'low', needsManualCleanup: true });
    expect(ocrRepo.updateRegionCleanupMetadata).toHaveBeenCalledWith('r1', { textColor: cleaned.textColor, needsManualCleanup: true });
    expect(storageRepo.uploadToStorage).toHaveBeenCalledTimes(1); // 부분 정리 결과도 저장해 에디터에서 이어서 다듬을 수 있다
  });

  it('AI 폴백으로 복구되면 ai-inpaint로 기록한다', async () => {
    vi.mocked(regionRepair.verifyAndRepair).mockResolvedValue({ kind: 'cleaned', method: 'ai-inpaint', quality: 'acceptable', buffer: Buffer.from('ai'), textColor: null, residualText: false });
    const result = await runCleanupForAsset(asset);
    expect(result).toMatchObject({ method: 'ai-inpaint', quality: 'acceptable', needsManualCleanup: false });
    expect(vi.mocked(storageRepo.uploadToStorage).mock.calls[0][1]).toEqual(Buffer.from('ai'));
  });

  it('복구까지 실패한 수동 전환은 원본을 보존한다', async () => {
    vi.mocked(regionCleanup.cleanRegionPixels).mockResolvedValue({ kind: 'manual', reason: 'periodic-pattern', textColor: null });
    vi.mocked(regionRepair.verifyAndRepair).mockResolvedValue({ kind: 'manual', reason: 'periodic-pattern', textColor: null });
    const result = await runCleanupForAsset(asset);
    expect(result).toMatchObject({ method: 'manual-required', needsManualCleanup: true });
    expect(storageRepo.uploadToStorage).not.toHaveBeenCalled();
    expect(assetRepo.updateAsset).toHaveBeenLastCalledWith('a1', expect.objectContaining({ cleanedPath: null }));
  });
});
