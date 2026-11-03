import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// 운영 DB에 닿지 않도록 SQL을 실행하지 않고, 마이그레이션을 적용 순서(파일 이름순)대로 읽어
// 마지막으로 정의된 finish_localization_job 본문을 검사한다.
const migrationsDir = fileURLToPath(new URL('../../../supabase/migrations/', import.meta.url));

function latestDefinition(name: string): string {
  const files = readdirSync(migrationsDir).filter((file) => file.endsWith('.sql')).sort();
  let latest: string | null = null;
  for (const file of files) {
    const sql = readFileSync(`${migrationsDir}${file}`, 'utf8');
    const pattern = new RegExp(`create (?:or replace )?function public\\.${name}\\([\\s\\S]*?\\nend \\$\\$;`, 'gi');
    for (const match of sql.matchAll(pattern)) latest = match[0];
  }
  if (!latest) throw new Error(`${name} 정의를 찾지 못했습니다.`);
  return latest.replace(/\s+/g, ' ');
}

describe('finish_localization_job (최신 마이그레이션 정의)', () => {
  const body = latestDefinition('finish_localization_job');
  const finalFailure = body.slice(body.lastIndexOf(' else '));

  it('재시도 횟수를 다 쓴 최종 실패에서 이 작업의 미완료 이미지를 failed로 바꾼다 (처리 중 상태로 방치하지 않음)', () => {
    expect(finalFailure).toMatch(/update assets set status='failed',error_code=p_error_code,error_message=p_error_message where project_id=j\.project_id and id=any\(j\.asset_ids\) and status<>'completed'/);
  });

  it('작업·프로젝트 실패 기록과 재시도 분기는 그대로 둔다', () => {
    expect(finalFailure).toContain("update jobs set status='failed'");
    expect(finalFailure).toContain("update projects set status='failed'");
    expect(body).toMatch(/elsif p_retry and j\.attempts<j\.max_attempts then perform reset_localization_assets\(p_job\);/);
    expect(body).toContain("where id=p_job and lease_token=p_lease and status='running' for update");
  });
});
