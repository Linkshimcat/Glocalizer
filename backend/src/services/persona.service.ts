import { AppError } from '../errors/app-error.js';
import { updateProjectPersona } from '../repositories/project.repository.js';
import type { UpdatePersonaInput } from '../schemas/persona.schema.js';
import type { ProjectPersona, ProjectRow } from '../types/project.js';

/** 빈 칸은 빼고, 남는 게 없으면 null — 페르소나가 없을 때와 같은 번역 동작으로 돌아간다. */
function normalizePersona(input: UpdatePersonaInput['persona']): ProjectPersona | null {
  if (!input) return null;
  const persona: ProjectPersona = {
    ...(input.personality ? { personality: input.personality } : {}),
    ...(input.speechStyle ? { speechStyle: input.speechStyle } : {}),
    ...(input.age ? { age: input.age } : {}),
    ...(input.avoidExpressions?.length ? { avoidExpressions: input.avoidExpressions } : {}),
  };
  return Object.keys(persona).length > 0 ? persona : null;
}

/**
 * 처리 중에는 바꿀 수 없다 — 세트 중간에 말투가 바뀌면 일관성이 깨진다.
 * 처리가 끝난 뒤 바꾸면 이후 다시 만드는 번역부터 적용된다.
 */
export async function setProjectPersona(project: ProjectRow, input: UpdatePersonaInput['persona']): Promise<ProjectPersona | null> {
  if (project.status === 'processing') throw new AppError('PROCESS_ALREADY_RUNNING', { projectId: project.id });
  const persona = normalizePersona(input);
  await updateProjectPersona(project.id, persona);
  return persona;
}
