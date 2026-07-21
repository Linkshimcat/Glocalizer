import { supabase } from '../config/supabase.js';
import { unwrapList, unwrapNullableRow, unwrapRow, unwrapVoid } from '../utils/db-result.js';
import type { LocalizationOptions, ProjectRow, ProjectStatus, TargetLanguage } from '../types/project.js';

interface CreateProjectInput {
  accessTokenHash: string;
  targetLanguages: TargetLanguage[];
  localizationOptions: LocalizationOptions;
  expiresAt: string;
}

export async function insertProject(input: CreateProjectInput): Promise<ProjectRow> {
  const result = await supabase
    .from('projects')
    .insert({
      access_token_hash: input.accessTokenHash,
      target_languages: input.targetLanguages,
      localization_options: input.localizationOptions,
      expires_at: input.expiresAt,
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
  const result = await supabase.from('projects').select().lt('expires_at', new Date().toISOString());
  return unwrapList<ProjectRow>(result, '만료된 프로젝트 조회에 실패했습니다.');
}
