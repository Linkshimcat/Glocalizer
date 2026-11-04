import JSZip from 'jszip'
import type { DemoSample, DemoLanguage } from './samples/types'
async function png(url: string): Promise<Blob> {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Download failed')
  const blob = await response.blob()
  const magic = new Uint8Array(await blob.slice(0, 8).arrayBuffer())
  if (magic.join(',') !== '137,80,78,71,13,10,26,10') throw new Error('Invalid PNG')
  return blob
}
export async function downloadSample(sample: DemoSample, language: DemoLanguage, candidate: number, zipped: boolean) {
  const name = `${sample.id}-${language}-${candidate + 1}`
  const blob = await png(sample.candidates[language][candidate].png)
  let result = blob
  if (zipped) {
    const zip = new JSZip()
    zip.file(`${name}.png`, blob)
    zip.file('sample-info.json', JSON.stringify({ sample: sample.id, sampleData: true, rights: sample.rights, provenance: sample.provenance, report: sample.reports[language][candidate] ?? null }, null, 2))
    result = await zip.generateAsync({ type: 'blob' })
  }
  const url = URL.createObjectURL(result)
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = `${name}.${zipped ? 'zip' : 'png'}`
  document.body.append(anchor); anchor.click(); anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}
