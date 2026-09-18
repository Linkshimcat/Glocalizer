const BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api/v1'
export interface GenerationImage { id: string; slot: number; prompt: string; status: 'queued' | 'running' | 'completed' | 'failed'; caption: string; url: string | null; error: string | null; cost_usd: number | null; reserve_usd: number; elapsed_ms: number | null }
export interface GenerationProject { id: string; prompt: string; confirmed: boolean; day: string; created_at: string; referenceUrl: string | null; images: GenerationImage[] }
export async function generationRequest<T>(token: string, path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`${BASE}/generation${path}`, { method, headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined })
  if (!response.ok) { const payload = await response.json().catch(() => null); throw new Error(payload?.error?.message ?? `API (${response.status})`) }
  return response.status === 204 ? undefined as T : await response.json() as T
}
export async function downloadGeneration(token: string, projectId: string, imageId: string) {
  const response = await fetch(`${BASE}/generation/projects/${projectId}/images/${imageId}/download`, { headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) { const payload = await response.json().catch(() => null); throw new Error(payload?.error?.message ?? 'PNG download failed') }
  const url = URL.createObjectURL(await response.blob()); const a = document.createElement('a'); a.href = url; a.download = `sample-${imageId}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
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
