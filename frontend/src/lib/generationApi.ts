import JSZip from 'jszip'

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'
export interface CaptionStyle { anchor: string; size: number; color: string; stroke: string }
export interface GenerationImage { id: string; slot: number; prompt: string; status: 'queued' | 'running' | 'completed' | 'failed'; caption: string; caption_style?: CaptionStyle | null; url: string | null; error: string | null; cost_usd: number | null; reserve_usd: number; elapsed_ms: number | null }
// 740x640 캔버스 기준 앵커 좌표. 백엔드 captionSticker와 같은 값이라야 미리보기가 결과와 맞는다.
export const CAPTION_ANCHOR_X: Record<string, number> = { left: 48, center: 370, right: 692 }
export const CAPTION_ANCHOR_Y: Record<string, number> = { top: 56, middle: 340, bottom: 612 }
export const CAPTION_VERTICALS = ['top', 'middle', 'bottom'] as const
export const CAPTION_HORIZONTALS = ['left', 'center', 'right'] as const
export const CAPTION_SIZES = [30, 38, 46, 56]
export const DEFAULT_CAPTION_STYLE: CaptionStyle = { anchor: 'top-center', size: 46, color: '#202630', stroke: '#ffffff' }
export interface StickerPlanItem { slot: number; pose: string; caption: string }
export interface GenerationProject { id: string; prompt: string; name?: string | null; confirmed: boolean; day: string; created_at: string; status?: 'active' | 'completed'; completed_at?: string | null; plan?: StickerPlanItem[]; referenceUrl: string | null; images: GenerationImage[] }
export async function generationRequest<T>(token: string, path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`${BASE}/generation${path}`, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  if (!response.ok) { const payload = await response.json().catch(() => null); throw new Error(payload?.error?.message ?? `API (${response.status})`) }
  const text = await response.text()
  return text ? JSON.parse(text) as T : undefined as T
}
export async function renameGenerationProject(token: string, projectId: string, name: string) {
  await generationRequest(token, `/projects/${projectId}`, 'PATCH', { name })
}
export async function deleteGenerationProject(token: string, projectId: string) {
  await generationRequest(token, `/projects/${projectId}`, 'DELETE')
}
/** Reconcile a lost queue response using job identities; never retry a potentially paid POST. */
export async function enqueueRemainingGeneration(token: string, projectId: string, plan: StickerPlanItem[]) {
  const before = await generationRequest<GenerationProject>(token, `/projects/${projectId}`)
  if (before.status === 'completed') throw new Error('완료한 프로젝트는 수정할 수 없습니다.')
  const completed = new Set(latestCompletedImages(before).map(image => image.slot))
  const pending = new Set(before.images.filter(image => image.status === 'queued' || image.status === 'running').map(image => image.slot))
  const slots = plan.filter(item => !completed.has(item.slot) && !pending.has(item.slot)).map(item => item.slot)
  if (!slots.length) return { slots, recovered: false }
  await generationRequest(token, `/projects/${projectId}/plan`, 'PATCH', { plan })
  const knownIds = new Set(before.images.map(image => image.id))
  try {
    await generationRequest(token, `/projects/${projectId}/batch`, 'POST', { slots })
    return { slots, recovered: false }
  } catch (error) {
    try {
      const after = await generationRequest<GenerationProject>(token, `/projects/${projectId}`)
      if (slots.every(slot => after.images.some(image => image.slot === slot && !knownIds.has(image.id)))) return { slots, recovered: true }
    } catch { /* Unknown registration state: retain the original error and require reconciliation on next attempt. */ }
    throw error
  }
}
export async function downloadGeneration(token: string, projectId: string, imageId: string) {
  const file = await fetchGenerationFile(token, projectId, imageId)
  const url = URL.createObjectURL(file); const a = document.createElement('a'); a.href = url; a.download = file.name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export async function fetchGenerationFile(token: string, projectId: string, imageId: string, slot?: number) {
  const response = await fetch(`${BASE}/generation/projects/${projectId}/images/${imageId}/download`, { headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) { const payload = await response.json().catch(() => null); throw new Error(payload?.error?.message ?? 'PNG download failed') }
  const suffix = slot === undefined ? imageId.slice(0, 8) : String(slot + 1)
  return new File([await response.blob()], `glocalizer-${projectId.slice(0, 8)}-${suffix}.png`, { type: 'image/png' })
}
export function latestCompletedImages(project: GenerationProject) {
  const images = new Map<number, GenerationImage>()
  for (const image of [...project.images].reverse()) if (image.status === 'completed' && !images.has(image.slot)) images.set(image.slot, image)
  return [...images.values()].sort((a, b) => a.slot - b.slot)
}
export function thumbnailImage(project: GenerationProject) {
  const images = latestCompletedImages(project)
  return images.find(image => image.caption) ?? images[0]
}
export async function downloadGenerationSet(token: string, project: GenerationProject) {
  const images = latestCompletedImages(project)
  if (images.length !== 24) throw new Error('24장 생성을 모두 완료해주세요.')
  const zip = new JSZip()
  for (let start = 0; start < images.length; start += 4) {
    const files = await Promise.all(images.slice(start, start + 4).map(image => fetchGenerationFile(token, project.id, image.id, image.slot)))
    for (const file of files) zip.file(file.name, file)
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `glocalizer-${project.id.slice(0, 8)}-24.zip`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
/** 파일 시스템에 안전한 폴더명으로 줄인다 — 프롬프트 원문에 경로 구분자가 섞여 있어도 중첩 폴더가 생기지 않는다. */
function safeFolderName(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 40) || 'character'
}
/** 일괄 생성으로 완료한 캐릭터 여러 개를 캐릭터별 폴더로 나눠 하나의 ZIP에 담는다. */
export async function downloadGenerationSets(token: string, projects: GenerationProject[]): Promise<void> {
  const zip = new JSZip()
  const usedNames = new Set<string>()
  for (const project of projects) {
    const images = latestCompletedImages(project)
    const baseName = safeFolderName(project.name?.trim() || project.prompt || project.id.slice(0, 8))
    let folderName = baseName
    for (let suffix = 2; usedNames.has(folderName); suffix += 1) folderName = `${baseName} (${suffix})`
    usedNames.add(folderName)
    const folder = zip.folder(folderName) ?? zip
    for (let start = 0; start < images.length; start += 4) {
      const files = await Promise.all(images.slice(start, start + 4).map(image => fetchGenerationFile(token, project.id, image.id, image.slot)))
      for (const file of files) folder.file(file.name, file)
    }
  }
  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } })
  const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `glocalizer-batch-${projects.length}.zip`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export async function prepareReference(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('PNG / JPEG / WebP')
  if (file.size > 10_000_000) throw new Error('10MB')
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 800 / Math.max(bitmap.width, bitmap.height)); const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close()
  const data = canvas.toDataURL('image/webp', 0.85)
  if (data.length > 800_000) throw new Error('600KB')
  return data
}
