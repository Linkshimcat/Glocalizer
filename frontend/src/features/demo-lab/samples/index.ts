import type { QaFinding, QaReport } from '../../../types/qa'
import manifest from './service/manifest.json'
import type { DemoLanguage, DemoSample } from './types'

const images = import.meta.glob('./service/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const image = (name: string) => images[`./service/${name}.png`]

// Each measured result comes from the exact downloaded candidate PNG.
function fileReport(sampleId: string, option: (typeof manifest)[number]['candidates']['en'][number]): QaReport {
  const shared = { imageId: sampleId, source: 'rule' } as const
  const findings: QaFinding[] = [
    { ...shared, code: 'SPEC_FORMAT', severity: 'pass', message: 'PNG 형식입니다.', measuredValue: 'png', criterion: 'PNG' },
    { ...shared, code: 'SPEC_FILE_SIZE', severity: 'pass', message: '파일 크기가 1 MB 이하입니다.', measuredValue: option.bytes, criterion: '≤ 1 MB' },
    { ...shared, code: 'SPEC_DIMENSIONS', severity: 'pass', message: '스티커 이미지 크기입니다.', measuredValue: '740×640', criterion: '740×640' },
    { ...shared, code: 'SPEC_TRANSPARENCY', severity: 'pass', message: '투명 배경이 있습니다.', measuredValue: '투명 픽셀 있음', criterion: '투명 배경' },
    { ...shared, code: 'SPEC_MARGIN', severity: 'review', message: '가장자리 여백을 확인해 주세요.', measuredValue: option.margin, criterion: '짧은 변의 4% 이상' },
  ]
  return {
    id: option.sha256,
    projectId: sampleId,
    imageRevision: option.sha256,
    inspectedAt: '2026-11-07',
    rulesetVersion: '2026-10-29.1',
    findings,
  }
}

export const publishedSamples: DemoSample[] = manifest.map(sample => {
  const capture = (language: DemoLanguage) => sample.candidates[language].map((option, index) => ({
    text: option.text,
    meaning: option.meaning,
    tone: option.tone,
    png: image(`${sample.id}-${language}-${index + 1}`),
  }))
  const reports = (language: DemoLanguage) => sample.candidates[language].map(option => fileReport(sample.id, option))
  return {
    id: sample.id,
    title: sample.title,
    description: sample.description,
    original: image(`${sample.id}-original`),
    cleaned: image(`${sample.id}-cleaned`),
    width: 740,
    height: 640,
    sourceText: sample.sourceText,
    regions: [sample.region],
    candidates: { en: capture('en'), ja: capture('ja'), zh: capture('zh') },
    reports: { en: reports('en'), ja: reports('ja'), zh: reports('zh') },
    rights: {
      source: 'Glocalizer 생성 기능으로 만든 팀 샘플',
      evidence: 'docs/licenses/demo-lab.md',
      font: `${sample.font} / Noto Sans JP / Noto Sans SC · SIL OFL 1.1`,
      aiGenerated: true,
      approved: true,
    },
    provenance: { kind: 'service', processedAt: sample.id === 'thanks' ? '2026-11-04' : '2026-11-07', record: 'docs/licenses/demo-lab.md' },
    // The QA Board capture provides the inspection time. Other per-stage events are unavailable.
    stages: [{ name: 'qa', occurredAt: sample.qaCapturedAt }],
  }
})
