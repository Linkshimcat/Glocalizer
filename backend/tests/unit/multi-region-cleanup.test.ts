import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/env.js', () => ({ env: { AI_CONCURRENCY: 2, LOG_LEVEL: 'silent' } }));
vi.mock('../../src/repositories/asset.repository.js', () => ({
  findAssetsByProjectAndStatus: vi.fn(),
  updateAsset: vi.fn(),
}));
vi.mock('../../src/repositories/ocr.repository.js', () => ({
  findRegionsByAssetId: vi.fn(),
  updateRegionCleanupMetadata: vi.fn(),
}));
vi.mock('../../src/repositories/project.repository.js', () => ({ updateProjectStage: vi.fn() }));
vi.mock('../../src/repositories/storage.repository.js', () => ({
  downloadFromStorage: vi.fn(),
  uploadToStorage: vi.fn(),
}));
vi.mock('../../src/image/background-sampler.js', () => ({
  decodeImagePixels: vi.fn().mockResolvedValue({ data: Buffer.alloc(400), width: 10, height: 10, channels: 4 }),
  sampleBorderPixelsFromDecoded: vi.fn().mockReturnValue({ medianColor: { r: 255, g: 255, b: 255 } }),
  sampleTextColorFromDecoded: vi.fn().mockReturnValue({ r: 20, g: 20, b: 20 }),
}));
vi.mock('../../src/image/cleanup-quality.js', () => ({
  decideCleanupMethod: vi.fn().mockReturnValue('solid-color-fill'),
  assessCleanupQuality: vi.fn().mockReturnValue('good'),
}));
vi.mock('../../src/image/mask-generator.js', () => ({
  generateTextEraseMask: vi.fn().mockResolvedValue({ data: new Uint8Array(100), width: 10, height: 10, roi: { x: 0, y: 0, width: 10, height: 10 } }),
}));
vi.mock('../../src/image/mask-coverage.js', () => ({
  measureMaskCoverage: vi.fn().mockReturnValue({ ratio: 0.2 }),
  isMaskCoverageSafe: vi.fn().mockReturnValue(true),
}));
vi.mock('../../src/image/adaptive-text-mask.js', () => ({ generateAdaptiveTextMask: vi.fn() }));
vi.mock('../../src/image/solid-color-cleanup.js', () => ({ applySolidColorCleanup: vi.fn() }));
vi.mock('../../src/image/transparent-cleanup.js', () => ({ applyTransparentCleanup: vi.fn() }));
vi.mock('../../src/image/directional-inpaint.js', () => ({ applyDirectionalInpaint: vi.fn() }));
vi.mock('../../src/image/blur-cleanup.js', () => ({ applyBlurCleanup: vi.fn() }));

const assetRepo = await import('../../src/repositories/asset.repository.js');
const ocrRepo = await import('../../src/repositories/ocr.repository.js');
const storageRepo = await import('../../src/repositories/storage.repository.js');
const solidCleanup = await import('../../src/image/solid-color-cleanup.js');
const { runCleanupForAsset } = await import('../../src/image/cleanup.service.js');

const regions = [
  { id: 'region-review', contains_korean: true, needs_manual_review: true, is_primary: true, bbox: { x: 1, y: 1, width: 3, height: 2 } },
  { id: 'region-success', contains_korean: true, needs_manual_review: false, is_primary: false, bbox: { x: 1, y: 4, width: 3, height: 2 } },
  { id: 'region-failure', contains_korean: true, needs_manual_review: false, is_primary: false, bbox: { x: 5, y: 4, width: 3, height: 2 } },
];

describe('runCleanupForAsset multi-region behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ocrRepo.findRegionsByAssetId).mockResolvedValue(regions as never);
    vi.mocked(storageRepo.downloadFromStorage).mockResolvedValue(Buffer.from('source'));
    vi.mocked(solidCleanup.applySolidColorCleanup)
      .mockResolvedValueOnce(Buffer.from('cleaned-once'))
      .mockRejectedValueOnce(new Error('one region failed'));
  });

  it('continues after region failures and uploads the composed image once', async () => {
    const result = await runCleanupForAsset({
      id: 'asset-1',
      project_id: 'project-1',
      original_path: 'projects/project-1/original.png',
      width: 10,
      height: 10,
    } as never);

    expect(solidCleanup.applySolidColorCleanup).toHaveBeenCalledTimes(2);
    expect(storageRepo.uploadToStorage).toHaveBeenCalledTimes(1);
    expect(ocrRepo.updateRegionCleanupMetadata).toHaveBeenCalledWith('region-review', { textColor: null, needsManualCleanup: true });
    expect(ocrRepo.updateRegionCleanupMetadata).toHaveBeenCalledWith('region-success', { textColor: { r: 20, g: 20, b: 20 }, needsManualCleanup: false });
    expect(ocrRepo.updateRegionCleanupMetadata).toHaveBeenCalledWith('region-failure', { textColor: null, needsManualCleanup: true });
    expect(assetRepo.updateAsset).toHaveBeenLastCalledWith('asset-1', expect.objectContaining({
      cleanupMethod: 'manual-required',
      cleanupQuality: 'low',
      needsManualCleanup: true,
      cleanedPath: 'projects/project-1/cleaned/asset-1.png',
    }));
    expect(result).toMatchObject({ method: 'manual-required', quality: 'low', needsManualCleanup: true });
  });
});
