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

export type LandingShowcaseItem = NonNullable<Awaited<ReturnType<typeof buildShowcase>>>;

/**
 * 랜딩은 로그인 없이 누구나 부르고 내용이 거의 바뀌지 않는다. 호출마다 DB와 Storage를 오가면 지역 왕복(약 0.3초씩)이 그대로 응답 시간이 된다.
 * 서명 URL이 1시간(SIGNED_URL_EXPIRY_SECONDS) 유효하므로 캐시는 그보다 훨씬 짧게 둔다 — 5분이면 받는 사람에게 남는 유효 시간이 55분 이상이다.
 * 대신 게시를 내리거나 권리 확인을 취소한 사례가 최대 5분 더 보일 수 있다.
 */
const CACHE_TTL_MS = 5 * 60_000;

let cache: { at: number; value: LandingShowcaseItem[] } | null = null;
let inflight: Promise<LandingShowcaseItem[]> | null = null;

/** 테스트에서 캐시를 비운다. */
export function resetShowcaseCache(): void {
  cache = null;
  inflight = null;
}

export async function listLandingShowcases(): Promise<LandingShowcaseItem[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.value;
  // 캐시가 비었을 때 동시에 들어온 요청은 한 번의 조회를 같이 쓴다.
  inflight ??= loadShowcases().finally(() => { inflight = null; });
  return inflight;
}

async function buildShowcase(row: ShowcaseRow) {
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
}

async function loadShowcases(): Promise<LandingShowcaseItem[]> {
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
  const built = await Promise.all(rows.map(buildShowcase));
  const cases = built.filter((item): item is NonNullable<typeof item> => item !== null);

  // 서명에 실패해서 빠진 사례가 있으면 캐시하지 않는다. 일시적인 Storage 오류가 5분 동안 갤러리를 비워 두면 안 된다.
  // (경로가 규칙에 맞지 않아 빠진 사례는 고정된 결과라 캐시해도 된다.)
  const signable = rows.filter((row) => row.original_path.startsWith('landing-showcase/') && row.result_path.startsWith('landing-showcase/')).length;
  if (cases.length === signable) cache = { at: Date.now(), value: cases };
  return cases;
}
