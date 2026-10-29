import { supabase } from '../config/supabase.js';
import { AppError } from '../errors/app-error.js';
import type { QaFinding, QaHistoryEntry, QaReport } from '../types/qa.js';

interface QaReportRow {
  id: string;
  project_id: string;
  image_revision: string;
  ruleset_version: string;
  findings: QaFinding[];
  pass_count: number;
  review_count: number;
  fail_count: number;
  inspected_at: string;
}

export interface NewQaReport {
  projectId: string;
  imageRevision: string;
  rulesetVersion: string;
  findings: QaFinding[];
  passCount: number;
  reviewCount: number;
  failCount: number;
}

/** 검사할 때마다 새 행을 쌓는다(이력). 저장된 id와 검사 시각을 돌려준다. */
export async function insertQaReport(report: NewQaReport): Promise<{ id: string; inspectedAt: string }> {
  const { data, error } = await supabase.from('qa_reports').insert({
    project_id: report.projectId,
    image_revision: report.imageRevision,
    ruleset_version: report.rulesetVersion,
    findings: report.findings,
    pass_count: report.passCount,
    review_count: report.reviewCount,
    fail_count: report.failCount,
  }).select('id, inspected_at').single();
  if (error || !data) throw new AppError('INTERNAL_ERROR', { cause: error?.message }, 'QA 리포트를 저장하지 못했습니다.');
  return { id: data.id, inspectedAt: data.inspected_at };
}

export async function findLatestQaReport(projectId: string): Promise<QaReport | null> {
  const { data, error } = await supabase.from('qa_reports')
    .select('id, project_id, image_revision, ruleset_version, findings, inspected_at')
    .eq('project_id', projectId)
    .order('inspected_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new AppError('INTERNAL_ERROR', { cause: error.message }, 'QA 리포트를 불러오지 못했습니다.');
  if (!data) return null;
  const row = data as Omit<QaReportRow, 'pass_count' | 'review_count' | 'fail_count'>;
  return {
    id: row.id, projectId: row.project_id, imageRevision: row.image_revision,
    inspectedAt: row.inspected_at, rulesetVersion: row.ruleset_version, findings: row.findings,
  };
}

/** 이력 요약은 카운트 컬럼만 읽는다 — findings(jsonb)는 무거워서 최신 리포트에서만 읽는다. */
export async function listQaHistory(projectId: string, limit = 20): Promise<QaHistoryEntry[]> {
  const { data, error } = await supabase.from('qa_reports')
    .select('id, inspected_at, pass_count, review_count, fail_count')
    .eq('project_id', projectId)
    .order('inspected_at', { ascending: false })
    .limit(limit);
  if (error) throw new AppError('INTERNAL_ERROR', { cause: error.message }, 'QA 이력을 불러오지 못했습니다.');
  return ((data ?? []) as Array<Pick<QaReportRow, 'id' | 'inspected_at' | 'pass_count' | 'review_count' | 'fail_count'>>).map((row) => ({
    id: row.id, inspectedAt: row.inspected_at, pass: row.pass_count, review: row.review_count, fail: row.fail_count,
  }));
}
