import { supabase } from '../config/supabase.js';
import { unwrapList } from '../utils/db-result.js';

export interface GenerationExport {
  id: string;
  name: string | null;
  prompt: string;
  status: string;
  createdAt: string;
  plan: unknown;
  /** 칸(slot)마다 가장 최근에 완성된 이미지 하나 */
  images: Array<{ slot: number; caption: string; prompt: string; path: string }>;
}

/** 내 데이터 받기용. 삭제 중이 아닌 생성 프로젝트와, 칸별 최신 완성 이미지 경로를 읽는다. */
export async function listGenerationExports(ownerId: string): Promise<GenerationExport[]> {
  const projects = unwrapList<{ id: string; name: string | null; prompt: string; status: string; created_at: string; plan: unknown }>(
    await supabase.from('generation_projects').select('id, name, prompt, status, created_at, plan').eq('owner_id', ownerId).is('deleting_at', null).order('created_at'),
    '생성 프로젝트를 불러오지 못했습니다.',
  );
  if (projects.length === 0) return [];
  const images = unwrapList<{ project_id: string; slot: number; caption: string; prompt: string; path: string | null; created_at: string }>(
    await supabase.from('generation_images').select('project_id, slot, caption, prompt, path, created_at')
      .in('project_id', projects.map((project) => project.id)).eq('status', 'completed').order('created_at', { ascending: false }),
    '생성 이미지를 불러오지 못했습니다.',
  );
  return projects.map((project) => {
    const latest = new Map<number, { slot: number; caption: string; prompt: string; path: string }>();
    for (const image of images) {
      if (image.project_id === project.id && image.path && !latest.has(image.slot)) {
        latest.set(image.slot, { slot: image.slot, caption: image.caption, prompt: image.prompt, path: image.path });
      }
    }
    return {
      id: project.id, name: project.name, prompt: project.prompt, status: project.status, createdAt: project.created_at, plan: project.plan,
      images: [...latest.values()].sort((a, b) => a.slot - b.slot),
    };
  });
}
