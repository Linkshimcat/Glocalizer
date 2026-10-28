const KEY = 'glocalizer:defaultTargetLangs'

/** 새 작업을 시작할 때 미리 선택해 둘 번역 언어 코드. 저장소를 못 쓰는 환경에서는 빈 목록이다. */
export function loadDefaultTargetLangCodes(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((code): code is string => typeof code === 'string') : []
  } catch {
    return []
  }
}

export function saveDefaultTargetLangCodes(codes: string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(codes))
  } catch {
    // 저장소가 막힌 환경에서는 이번 방문에서만 적용되지 않는다.
  }
}
