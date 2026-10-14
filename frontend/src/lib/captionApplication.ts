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
    if (status.status === 'failed' || status.assets.some(asset => asset.assetId === assetId && asset.status === 'failed')) {
      throw new CaptionApplicationError('failed')
    }
    if (status.status === 'completed') return
    if (!['processing', 'queued'].includes(status.status)) throw new CaptionApplicationError('session')
    await new Promise(resolve => setTimeout(resolve, Math.min(intervalMs, Math.max(0, deadline - Date.now()))))
  }
  throw new CaptionApplicationError('timeout')
}
