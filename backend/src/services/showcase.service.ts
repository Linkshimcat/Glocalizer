import { supabase } from '../config/supabase.js';
import { createSignedUrl } from '../repositories/storage.repository.js';
import { unwrapList } from '../utils/db-result.js';

interface ShowcaseRow {
  id: string;
  source_kind: 'localization' | 'generation';
  language_code: string | null;
  original_path: string;
  result_path: string;
  sort_order: number;
}

export async function listLandingShowcases() {
  const result = await supabase
    .from('landing_showcases')
    .select('id, source_kind, language_code, original_path, result_path, sort_order')
    .eq('published', true)
    .not('rights_confirmed_at', 'is', null)
    .in('rights_basis', ['team_owned', 'licensed'])
    .not('approved_at', 'is', null)
    .order('sort_order', { ascending: true })
    .limit(12);

  const rows = unwrapList<ShowcaseRow>(result, '랜딩 사례를 불러오지 못했습니다.');
  const cases = await Promise.all(rows.map(async (row) => {
    if (!row.original_path.startsWith('landing-showcase/') || !row.result_path.startsWith('landing-showcase/')) return null;

    const [originalUrl, resultUrl] = await Promise.all([
      createSignedUrl(row.original_path),
      createSignedUrl(row.result_path),
    ]);
    if (!originalUrl || !resultUrl) return null;

    return {
      id: row.id,
      kind: row.source_kind,
      languageCode: row.language_code,
      originalUrl,
      resultUrl,
      sortOrder: row.sort_order,
    };
  }));

  return cases.filter((item): item is NonNullable<typeof item> => item !== null);
}
