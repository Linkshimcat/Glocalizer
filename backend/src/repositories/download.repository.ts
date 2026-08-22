import { supabase } from '../config/supabase.js';
import { unwrapList, unwrapVoid } from '../utils/db-result.js';

export type DownloadKind = 'single' | 'zip';

export interface DownloadStats {
  total: number;
  byKind: Record<string, number>;
}

export async function insertDownloadEvent(projectId: string, kind: DownloadKind, languageCode: string | null): Promise<void> {
  const result = await supabase.from('download_events').insert({ project_id: projectId, kind, language_code: languageCode });
  unwrapVoid(result, '다운로드 완료 기록에 실패했습니다.');
}

export async function countDownloadEvents(): Promise<DownloadStats> {
  const result = await supabase.from('download_events').select('kind');
  const rows = unwrapList<{ kind: string }>(result, '다운로드 완주 횟수 조회에 실패했습니다.');

  const byKind: Record<string, number> = {};
  for (const row of rows) byKind[row.kind] = (byKind[row.kind] ?? 0) + 1;

  return { total: rows.length, byKind };
}
