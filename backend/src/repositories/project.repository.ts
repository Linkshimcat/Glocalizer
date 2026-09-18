import { AppError } from '../errors/app-error.js';
import { supabase } from '../config/supabase.js';
import { unwrapList, unwrapNullableRow, unwrapRow, unwrapVoid } from '../utils/db-result.js';
import type { LocalizationOptions, ProjectRow, ProjectStatus, TargetLanguage } from '../types/project.js';

interface CreateProjectInput {
  accessTokenHash: string;
  targetLanguages: TargetLanguage[];
  localizationOptions: LocalizationOptions;
  expiresAt: string | null;
  ownerId?: string;
  selectedClientIds?: string[];
}

export async function insertProject(input: CreateProjectInput): Promise<ProjectRow> {
  const result = await supabase
    .from('projects')
    .insert({
      access_token_hash: input.accessTokenHash,
      target_languages: input.targetLanguages,
      localization_options: input.localizationOptions,
      expires_at: input.expiresAt,
      ...(input.ownerId ? { owner_id: input.ownerId, selected_client_ids: input.selectedClientIds } : {}),
    })
    .select()
    .single();

  return unwrapRow<ProjectRow>(result, '프로젝트를 생성하지 못했습니다.');
}

export async function findProjectById(projectId: string): Promise<ProjectRow | null> {
  const result = await supabase.from('projects').select().eq('id', projectId).maybeSingle();
  return unwrapNullableRow<ProjectRow>(result, '프로젝트 조회에 실패했습니다.');
}

interface ProjectStageUpdate {
  status?: ProjectStatus;
  stage?: string | null;
  progress?: number;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export async function updateProjectStage(projectId: string, patch: ProjectStageUpdate): Promise<void> {
  const result = await supabase
    .from('projects')
    .update({
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.status === 'processing' ? { result_ready: false } : {}),
      ...(patch.stage !== undefined ? { stage: patch.stage } : {}),
      ...(patch.progress !== undefined ? { progress: patch.progress } : {}),
      ...(patch.errorCode !== undefined ? { error_code: patch.errorCode } : {}),
      ...(patch.errorMessage !== undefined ? { error_message: patch.errorMessage } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq('id', projectId);

  unwrapVoid(result, '프로젝트 상태를 갱신하지 못했습니다.');
}

export async function deleteProjectRow(projectId: string): Promise<void> {
  const result = await supabase.from('projects').delete().eq('id', projectId);
  unwrapVoid(result, '프로젝트 삭제에 실패했습니다.');
}

export async function findExpiredProjects(): Promise<ProjectRow[]> {
  const result = await supabase.from('projects').select().is('owner_id', null).lt('expires_at', new Date().toISOString());
  return unwrapList<ProjectRow>(result, '만료된 프로젝트 조회에 실패했습니다.');
}

export async function findProjectsByOwner(ownerId: string): Promise<ProjectRow[]> {
  const result = await supabase.from('projects').select().eq('owner_id', ownerId).order('updated_at', { ascending: false });
  return unwrapList<ProjectRow>(result, '작업 목록을 불러오지 못했습니다.');
}

export async function updateDraftProject(projectId: string, targetLanguages: TargetLanguage[], selectedClientIds: string[]): Promise<void> {
  const result = await supabase.from('projects').update({ target_languages: targetLanguages, selected_client_ids: selectedClientIds, stage: 'uploading', updated_at: new Date().toISOString() }).eq('id', projectId).eq('status', 'created').select('id');
  const rows = unwrapList<{ id: string }>(result, '초안을 저장하지 못했습니다.');
  if (rows.length === 0) throw new AppError('INVALID_REQUEST', undefined, '처리가 시작된 프로젝트의 초안은 변경할 수 없습니다.');
}

export async function markProjectResultReady(projectId: string): Promise<void> {
  const result = await supabase.from('projects').update({ result_ready: true, updated_at: new Date().toISOString() }).eq('id', projectId).in('status', ['completed', 'failed']);
  unwrapVoid(result, '완료 작업을 저장하지 못했습니다.');
}
