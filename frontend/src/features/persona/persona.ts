import type { ProjectPersona } from '../../lib/api'

export interface PersonaDraft {
  personality: string
  speechStyle: string
  age: string
  avoidExpressions: string
}

export const EMPTY_PERSONA: PersonaDraft = { personality: '', speechStyle: '', age: '', avoidExpressions: '' }

/** 입력값을 API 모양으로 바꾼다. 빈 칸은 빼고, 다 비면 null(페르소나 없음). 길이 제한은 서버 schemas/persona.schema.ts와 같다. */
export function personaPayload(draft: PersonaDraft): ProjectPersona | null {
  const avoidExpressions = draft.avoidExpressions.split(',').map(item => item.trim().slice(0, 30)).filter(Boolean).slice(0, 10)
  const persona: ProjectPersona = {
    ...(draft.personality.trim() ? { personality: draft.personality.trim() } : {}),
    ...(draft.speechStyle.trim() ? { speechStyle: draft.speechStyle.trim() } : {}),
    ...(draft.age.trim() ? { age: draft.age.trim() } : {}),
    ...(avoidExpressions.length ? { avoidExpressions } : {}),
  }
  return Object.keys(persona).length ? persona : null
}
