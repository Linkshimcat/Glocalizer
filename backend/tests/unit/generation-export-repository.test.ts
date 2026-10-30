import { describe, expect, it, vi } from 'vitest';

// 테이블별로 돌려줄 행. 쿼리 빌더 체인은 결과만 흉내 낸다.
const rows = vi.hoisted(() => ({
  generation_projects: [{ id: 'p1', name: '토끼', prompt: '분홍 토끼', status: 'completed', created_at: '2026-10-04T00:00:00Z', plan: [] }],
  generation_images: [
    // 최신순(created_at 내림차순)으로 온다
    { project_id: 'p1', slot: 0, caption: '새 문구', caption_style: { anchor: 'top-center', size: 46, color: '#000000', stroke: '#ffffff' }, prompt: 'p', path: 'gen/p1/0-new.png', created_at: '2026-10-05T00:00:00Z' },
    { project_id: 'p1', slot: 0, caption: '옛 문구', caption_style: null, prompt: 'p', path: 'gen/p1/0-old.png', created_at: '2026-10-04T00:00:00Z' },
    { project_id: 'p1', slot: 1, caption: '', caption_style: null, prompt: 'p', path: null, created_at: '2026-10-04T00:00:00Z' },
  ] as unknown[],
}));
const selected = vi.hoisted(() => ({} as Record<string, string>));
vi.mock('../../src/config/supabase.js', () => ({
  supabase: {
    from: (table: keyof typeof rows) => ({
      select: (columns: string) => {
        selected[table] = columns;
        const chain: Record<string, unknown> = {};
        for (const method of ['eq', 'is', 'in', 'order']) chain[method] = () => chain;
        chain.then = (resolve: (value: unknown) => void) => resolve({ data: rows[table], error: null });
        return chain;
      },
    }),
  },
}));

const { listGenerationExports } = await import('../../src/repositories/generation-export.repository.js');

describe('listGenerationExports', () => {
  it('칸마다 가장 최근 완성 이미지 하나와 저장된 문구 스타일을 돌려준다', async () => {
    const [project] = await listGenerationExports('owner');
    expect(selected.generation_images).toContain('caption_style');
    expect(project!.images).toEqual([
      { slot: 0, caption: '새 문구', captionStyle: { anchor: 'top-center', size: 46, color: '#000000', stroke: '#ffffff' }, prompt: 'p', path: 'gen/p1/0-new.png' },
    ]); // 경로가 없는 칸(slot 1)은 뺀다
  });
});
