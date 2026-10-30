import { supabase } from '../config/supabase.js';
import type { CaptionStyle } from '../services/generation.service.js';
import { unwrapList } from '../utils/db-result.js';

const PAGE_SIZE = 1000;

export interface GenerationExport {
  id: string;
  name: string | null;
  prompt: string;
  status: string;
  createdAt: string;
  plan: unknown;
  /** 사용자가 올린 참고 이미지의 저장소 경로 */
  referencePath: string | null;
  /** 칸(slot)마다 가장 최근에 완성된 이미지 하나 */
  images: Array<{ slot: number; caption: string; captionStyle: CaptionStyle | null; prompt: string; path: string }>;
}

/** 내 데이터 받기용. 삭제 중이 아닌 생성 프로젝트와, 칸별 최신 완성 이미지 경로를 읽는다. */
export async function listGenerationExports(ownerId: string): Promise<GenerationExport[]> {
  const projects = unwrapList<{ id: string; name: string | null; prompt: string; status: string; created_at: string; plan: unknown; reference_path: string | null }>(
    await supabase.from('generation_projects').select('id, name, prompt, status, created_at, plan, reference_path').eq('owner_id', ownerId).is('deleting_at', null).order('created_at'),
    '생성 프로젝트를 불러오지 못했습니다.',
  );
  if (projects.length === 0) return [];
  // 다시 생성한 이력까지 모두 읽으므로 1,000행(PostgREST 한도)을 넘을 수 있다. 끝까지 나눠 읽는다.
  const images: Array<{ project_id: string; slot: number; caption: string; caption_style: CaptionStyle | null; prompt: string; path: string | null; created_at: string }> = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const page = unwrapList<(typeof images)[number]>(
      await supabase.from('generation_images').select('id, project_id, slot, caption, caption_style, prompt, path, created_at')
        .in('project_id', projects.map((project) => project.id)).eq('status', 'completed')
        .order('created_at', { ascending: false }).order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1),
      '생성 이미지를 불러오지 못했습니다.',
    );
    images.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return projects.map((project) => {
    const latest = new Map<number, GenerationExport['images'][number]>();
    for (const image of images) {
      if (image.project_id === project.id && image.path && !latest.has(image.slot)) {
        latest.set(image.slot, { slot: image.slot, caption: image.caption, captionStyle: image.caption_style ?? null, prompt: image.prompt, path: image.path });
      }
    }
    return {
      id: project.id, name: project.name, prompt: project.prompt, status: project.status, createdAt: project.created_at, plan: project.plan,
      referencePath: project.reference_path ?? null,
      images: [...latest.values()].sort((a, b) => a.slot - b.slot),
    };
  });
}
