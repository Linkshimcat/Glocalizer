/** 업로드 단계를 지나 서버 처리를 시작한 작업인지. 이런 작업에는 이미지를 더 넣거나 다시 시작할 수 없다. */
export function isProcessedProject(status: string | null | undefined): boolean {
  return Boolean(status) && status !== 'created'
}

/** 열려 있는 작업을 이어서 할 화면. */
export function workspaceResumePath(status: string | null | undefined, resultReady: boolean): string {
  if (!isProcessedProject(status)) return '/localize'
  return resultReady && (status === 'completed' || status === 'failed') ? '/result' : '/editor'
}
