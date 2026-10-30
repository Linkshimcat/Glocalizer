import { describe, expect, it, vi } from 'vitest';

// 테이블별로 돌려줄 행. 쿼리 빌더 체인은 결과만 흉내 낸다.
const rows = vi.hoisted(() => ({
  generation_projects: [{ id: 'p1', name: '토끼', prompt: '분홍 토끼', status: 'completed', created_at: '2026-10-04T00:00:00Z', plan: [], reference_path: 'gen/p1/reference.png' }],
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
        let page: [number, number] | null = null;
        for (const method of ['eq', 'is', 'in', 'order']) chain[method] = () => chain;
        chain.range = (from: number, to: number) => { page = [from, to]; return chain; };
        // PostgREST처럼 한 번에 최대 1,000행만 돌려준다.
        chain.then = (resolve: (value: unknown) => void) => {
          const [from, to] = page ?? [0, 999];
          resolve({ data: rows[table].slice(from, Math.min(to, from + 999) + 1), error: null });
        };
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
    expect(selected.generation_projects).toContain('reference_path');
    expect(project!.referencePath).toBe('gen/p1/reference.png');
    expect(project!.images).toEqual([
      { slot: 0, caption: '새 문구', captionStyle: { anchor: 'top-center', size: 46, color: '#000000', stroke: '#ffffff' }, prompt: 'p', path: 'gen/p1/0-new.png' },
    ]); // 경로가 없는 칸(slot 1)은 뺀다
  });
});

describe('listGenerationExports 페이지 나눠 읽기', () => {
  it('완성 이미지가 1,000개를 넘어도 끝까지 읽어 마지막 페이지의 칸도 빠뜨리지 않는다', async () => {
    const history = Array.from({ length: 1000 }, (_, i) => ({
      project_id: 'p1', slot: 0, caption: `이력 ${i}`, caption_style: null, prompt: 'p', path: `gen/p1/0-${i}.png`, created_at: '2026-10-05T00:00:00Z',
    }));
    rows.generation_images = [...history, { project_id: 'p1', slot: 7, caption: '맨 끝', caption_style: null, prompt: 'p', path: 'gen/p1/7.png', created_at: '2026-10-01T00:00:00Z' }];
    const [project] = await listGenerationExports('owner');
    expect(project!.images.map((image) => image.slot)).toEqual([0, 7]);
  });
});
