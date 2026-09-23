import JSZip from 'jszip'

const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'
export interface GenerationImage { id: string; slot: number; prompt: string; status: 'queued' | 'running' | 'completed' | 'failed'; caption: string; url: string | null; error: string | null; cost_usd: number | null; reserve_usd: number; elapsed_ms: number | null }
export interface StickerPlanItem { slot: number; pose: string; caption: string }
export interface GenerationProject { id: string; prompt: string; name?: string | null; confirmed: boolean; day: string; created_at: string; status?: 'active' | 'completed'; completed_at?: string | null; plan?: StickerPlanItem[]; referenceUrl: string | null; images: GenerationImage[] }
export async function generationRequest<T>(token: string, path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`${BASE}/generation${path}`, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  if (!response.ok) { const payload = await response.json().catch(() => null); throw new Error(payload?.error?.message ?? `API (${response.status})`) }
  return response.status === 204 ? undefined as T : await response.json() as T
}
export async function renameGenerationProject(token: string, projectId: string, name: string) {
  await generationRequest(token, `/projects/${projectId}`, 'PATCH', { name })
}
export async function deleteGenerationProject(token: string, projectId: string) {
  await generationRequest(token, `/projects/${projectId}`, 'DELETE')
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
