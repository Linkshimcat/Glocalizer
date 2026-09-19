import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryResult = vi.fn();

vi.mock('../../src/config/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: queryResult,
      })),
    })),
  },
}));

vi.mock('../../src/repositories/storage.repository.js', () => ({
  createSignedUrl: vi.fn(),
  downloadFromStorage: vi.fn(),
  removeFromStorage: vi.fn(),
  uploadToStorage: vi.fn(),
}));

import { deleteGenerationsByOwner } from '../../src/services/generation.service.js';

describe('account generation cleanup', () => {
  beforeEach(() => {
    queryResult.mockReset();
  });

  it.each(['42P01', 'PGRST205'])('ignores a missing optional generation table (%s)', async (code) => {
    queryResult.mockResolvedValue({ data: null, error: { code, message: 'missing table' } });

    await expect(deleteGenerationsByOwner('user-id')).resolves.toBeUndefined();
  });

  it('does not hide other database failures', async () => {
    queryResult.mockResolvedValue({ data: null, error: { code: '42501', message: 'permission denied' } });

    await expect(deleteGenerationsByOwner('user-id')).rejects.toMatchObject({
      code: 'INTERNAL_ERROR',
      message: '생성 작업 조회 실패',
    });
  });
});
