import { supabase } from '../config/supabase.js';
import { AppError } from '../errors/app-error.js';
import type { LocalizationOptions, ProjectRow, ProjectStatus, TargetLanguage } from '../types/project.js';

interface CreateProjectInput {
  accessTokenHash: string;
  targetLanguages: TargetLanguage[];
  localizationOptions: LocalizationOptions;
  expiresAt: string;
}

export async function insertProject(input: CreateProjectInput): Promise<ProjectRow> {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      access_token_hash: input.accessTokenHash,
      target_languages: input.targetLanguages,
      localization_options: input.localizationOptions,
      expires_at: input.expiresAt,
    })
    .select()
    .single();

  if (error || !data) {
    throw new AppError('INTERNAL_ERROR', { cause: error?.message }, '프로젝트를 생성하지 못했습니다.');
  }

  return data as ProjectRow;
}

export async function findProjectById(projectId: string): Promise<ProjectRow | null> {
  const { data, error } = await supabase.from('projects').select().eq('id', projectId).maybeSingle();

  if (error) {
    throw new AppError('INTERNAL_ERROR', { cause: error.message }, '프로젝트 조회에 실패했습니다.');
  }

  return (data as ProjectRow) ?? null;
}

interface ProjectStageUpdate {
  status?: ProjectStatus;
  stage?: string | null;
  progress?: number;
  errorCode?: string | null;
  errorMessage?: string | null;
}

export async function updateProjectStage(projectId: string, patch: ProjectStageUpdate): Promise<void> {
  const { error } = await supabase
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

  if (error) {
    throw new AppError('INTERNAL_ERROR', { cause: error.message }, '프로젝트 상태를 갱신하지 못했습니다.');
  }
}
