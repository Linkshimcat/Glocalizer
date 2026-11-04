import type { QaReport, QaRegion } from '../../../types/qa'
export type DemoLanguage = 'en' | 'ja' | 'zh'
export interface DemoCandidate { text: string; meaning: string; tone: string; png: string }
export interface DemoSample {
  id: string
  title: string
  description: string
  original: string
  cleaned: string
  width: number
  height: number
  sourceText: string
  regions: QaRegion[]
  candidates: Record<DemoLanguage, DemoCandidate[]>
  /** Must correspond to the selected candidate PNG; never reuse another output's report. */
  reports: Record<DemoLanguage, (QaReport | null)[]>
  rights: { source: string; evidence: string; font: string; aiGenerated: boolean; approved: boolean }
  provenance: { kind: 'service' | 'development-fixture'; processedAt: string | null; record: string | null }
  stages: { name: 'ocr' | 'translation' | 'cleanup' | 'edit' | 'qa'; occurredAt?: string; durationMs?: number }[]
}
