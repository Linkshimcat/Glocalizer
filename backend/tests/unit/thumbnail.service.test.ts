import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/config/env.js', () => ({ env: { MAX_IMAGE_WIDTH: 100, MAX_IMAGE_HEIGHT: 100, LOG_LEVEL: 'silent' } }));
vi.mock('../../src/repositories/storage.repository.js', () => ({ uploadThumbnailForOriginal: vi.fn().mockResolvedValue(true) }));
vi.mock('../../src/services/ocr-review.service.js', () => ({ requireEditableAsset: vi.fn().mockResolvedValue({ original_path: 'projects/p/original/a.png' }) }));

const storage = await import('../../src/repositories/storage.repository.js');
const { saveEditedThumbnail } = await import('../../src/services/thumbnail.service.js');
const image = (format: 'png' | 'jpeg', size = 10) => sharp({ create: { width: size, height: size, channels: 3, background: '#fff' } })[format]().toBuffer();

describe('saveEditedThumbnail', () => {
  beforeEach(() => vi.clearAllMocks());
  it('overwrites the card thumbnail with the rendered PNG', async () => {
    const png = await image('png');
    await saveEditedThumbnail('p', 'a', png);
    expect(storage.uploadThumbnailForOriginal).toHaveBeenCalledWith('projects/p/original/a.png', png);
  });
  it.each([['missing body', {}], ['empty body', Buffer.alloc(0)], ['corrupt bytes', Buffer.from('nope')]])('rejects %s', async (_name, body) => {
    await expect(saveEditedThumbnail('p', 'a', body)).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    expect(storage.uploadThumbnailForOriginal).not.toHaveBeenCalled();
  });
  it('rejects non-PNG and oversized images', async () => {
    await expect(saveEditedThumbnail('p', 'a', await image('jpeg'))).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    await expect(saveEditedThumbnail('p', 'a', await image('png', 101))).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    expect(storage.uploadThumbnailForOriginal).not.toHaveBeenCalled();
  });
  it('reports a storage failure', async () => {
    vi.mocked(storage.uploadThumbnailForOriginal).mockResolvedValueOnce(false);
    await expect(saveEditedThumbnail('p', 'a', await image('png'))).rejects.toMatchObject({ code: 'INTERNAL_ERROR' });
  });
});
