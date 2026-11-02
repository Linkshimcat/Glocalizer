// 완성 이미지에 저장된 글꼴을 쓰려면 글꼴 선언이 필요하다. 에디터·결과 페이지를 거치지 않고 QA Board에서 바로 열어도 같은 글꼴로 그린다.
import '../../editor-fonts.css'
import { toDemoItems } from '../../data/demo'
import type { CloudWorkspace } from '../../lib/api'
import { imageStyleForItem, OUTPUT_PRESETS, renderItemToPng, textOverlaysForItem, type OutputPreset } from '../../lib/exportImage'
import { restoreFile, restoreStyles } from '../../lib/workspaceRestore'

const PRESET_STORAGE_KEY = 'glocalizer:exportPresets'

/** 업로드 스토어가 프로젝트별로 저장해 둔 출력 규격 — store/uploads.tsx의 'glocalizer:exportPresets'. 세션이 바뀌면 사라진다. */
export function loadSavedPreset(projectId: string): OutputPreset {
  try {
    const raw = sessionStorage.getItem(PRESET_STORAGE_KEY)
    const value: unknown = raw ? (JSON.parse(raw) as Record<string, unknown>)[projectId] : undefined
    return typeof value === 'string' && value in OUTPUT_PRESETS ? value as OutputPreset : 'default'
  } catch {
    return 'default'
  }
}

/** QA Board에서 고른 규격을 에디터·결과 화면과 같은 곳에 저장해, 어느 화면에서 골라도 같은 규격으로 보이게 한다. */
export function saveSavedPreset(projectId: string, preset: OutputPreset): void {
  try {
    const raw = sessionStorage.getItem(PRESET_STORAGE_KEY)
    const stored = raw ? JSON.parse(raw) as Record<string, unknown> : {}
    sessionStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify({ ...stored, [projectId]: preset }))
  } catch {
    // 저장소를 못 쓰는 환경 — 이번 화면에서만 유지한다.
  }
}

export interface RenderedPngs {
  /** assetId → 완성 PNG. 서버는 이 PNG로 규격(SPEC_*)을 판정한다 */
  pngs: Map<string, Blob>
  /** 이미지를 만들지 못해 규격을 검사하지 못하는 에셋 ID */
  failed: string[]
}

/**
 * QA 검사에 보낼 최종 PNG를 만든다. 서버는 PNG를 받은 이미지만 규격을 재므로, PNG 없이 검사하면 크기·용량·
 * 투명도를 한 번도 확인하지 않은 이미지가 PASS가 된다(PR #205 리뷰). 다운로드 버튼과 같은 엔진
 * (restoreFile → toDemoItems → renderItemToPng)과 같은 출력 규격으로 그려, 실제로 내려받을 파일을 검사한다.
 * 언어가 여러 개여도 서버는 에셋당 PNG 하나만 받으므로 첫 번째 대상 언어로 만든다.
 */
export async function renderWorkspacePngs(
  workspace: CloudWorkspace,
  onProgress?: (done: number, total: number) => void,
  assetId?: string,
  /** 규격 판정에 쓸 출력 규격. 없으면 이 프로젝트에서 마지막으로 고른 값(없으면 기본). */
  preset: OutputPreset = loadSavedPreset(workspace.projectId),
): Promise<RenderedPngs> {
  const languageCodes = workspace.results.targetLanguages
  const languageCode = languageCodes[0]
  const completed = new Set(workspace.results.assets.filter(asset => asset.status === 'completed' && (!assetId || asset.id === assetId)).map(asset => asset.id))
  const files = workspace.files
    .filter(file => completed.has(file.assetId))
    .map(file => restoreFile({ ...file, url: undefined }, workspace.results, languageCodes))
  const pngs = new Map<string, Blob>()
  // 파일이 없으면 toDemoItems가 데모 샘플을 돌려주므로 건너뛴다.
  if (!languageCode || files.length === 0) return { pngs, failed: [] }

  const styles = restoreStyles(files, workspace.results, languageCodes)
  const failed: string[] = []
  const items = toDemoItems(files, languageCode)
  for (const [index, item] of items.entries()) {
    onProgress?.(index, items.length)
    const id = item.assetId
    if (!id) continue
    try {
      pngs.set(id, await renderItemToPng(item, imageStyleForItem(item, languageCode, styles), textOverlaysForItem(item, languageCode, styles), preset))
    } catch {
      failed.push(id)
    }
  }
  onProgress?.(items.length, items.length)
  return { pngs, failed }
}
