import type { ProjectStatus } from './api'

export class CaptionApplicationError extends Error {
  readonly reason: 'failed' | 'session' | 'timeout'
  constructor(reason: 'failed' | 'session' | 'timeout') { super(reason); this.reason = reason }
}

/** A terminal failure or an expired deadline must never look like a successful edit. */
export async function waitForCaptionApplication(
  refresh: () => Promise<ProjectStatus | null>,
  assetId: string,
  timeoutMs = 360_000,
  intervalMs = 1500,
): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const status = await refresh()
    if (Date.now() >= deadline) throw new CaptionApplicationError('timeout')
    if (!status) throw new CaptionApplicationError('session')
    if (status.status === 'failed') throw new CaptionApplicationError('failed')
    // 문구 없는 이미지는 첫 처리에서 이미 asset이 failed로 끝나 있다. 워커가 문구 추가 작업을 집어
    // asset을 다시 처리 상태로 돌리기 전까지는 그 옛 failed가 그대로 보이므로, 대상 asset의 실패는
    // 프로젝트 처리가 끝난 뒤에만 판정한다(처리 중에 판정하면 정상 적용도 즉시 "적용 실패"가 된다).
    if (status.status === 'completed') {
      if (status.assets.some(asset => asset.assetId === assetId && asset.status === 'failed')) throw new CaptionApplicationError('failed')
      return
    }
    if (!['processing', 'queued'].includes(status.status)) throw new CaptionApplicationError('session')
    await new Promise(resolve => setTimeout(resolve, Math.min(intervalMs, Math.max(0, deadline - Date.now()))))
  }
  throw new CaptionApplicationError('timeout')
}
