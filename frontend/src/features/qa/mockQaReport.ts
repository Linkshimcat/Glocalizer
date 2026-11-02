import type { QaFinding, QaProjectResponse } from '../../types/qa'
import type { QaImage } from './qaReport'

/**
 * 백엔드 QA API(윤재)가 나오기 전 화면 개발용 목업. 개발 서버에서 `/qa?mock=1`일 때만 쓰고,
 * 화면에는 항상 "목업 데이터" 배너를 띄운다. README 체크리스트의 결함 5종을 모두 담는다.
 */
export const MOCK_IMAGES: QaImage[] = [
  { id: 'mock-pass', name: '01_hello.png', url: null, width: 740, height: 640, inspectable: true },
  { id: 'mock-overflow', name: '02_long_caption.png', url: null, width: 740, height: 640, inspectable: true },
  { id: 'mock-spec', name: '03_photo.jpg', url: null, width: 800, height: 800, inspectable: true },
  { id: 'mock-ocr', name: '04_small_text.png', url: null, width: 740, height: 640, inspectable: true },
  { id: 'mock-cleanup', name: '05_gradient.png', url: null, width: 740, height: 640, inspectable: true },
  { id: 'mock-ai', name: '06_slang.png', url: null, width: 740, height: 640, inspectable: true },
  { id: 'mock-pending', name: '07_processing.png', url: null, width: 740, height: 640, inspectable: false },
]

const findings: QaFinding[] = [
  { code: 'TEXT_OVERFLOW', severity: 'fail', source: 'rule', imageId: 'mock-overflow', message: '번역문이 글자 상자를 넘쳐요.', region: { x: 120, y: 40, width: 500, height: 110 }, measuredValue: '38px', criterion: '0px', recommendation: '에디터에서 자동 배치를 실행하거나 문구를 줄여주세요.' },
  { code: 'TEXT_OUTSIDE_CAPTION', severity: 'review', source: 'rule', imageId: 'mock-overflow', message: '번역문이 원래 캡션 자리에서 많이 벗어났어요.', region: { x: 120, y: 40, width: 500, height: 110 }, measuredValue: 0.42, criterion: '≤ 0.25', recommendation: '원래 캡션 위치 근처로 옮겨주세요.' },
  { code: 'SPEC_FORMAT', severity: 'fail', source: 'rule', imageId: 'mock-spec', message: 'PNG 파일이 아니에요.', measuredValue: 'image/jpeg', criterion: 'image/png', recommendation: 'PNG로 다시 내보내주세요.' },
  { code: 'SPEC_DIMENSIONS', severity: 'fail', source: 'rule', imageId: 'mock-spec', message: 'OGQ 규격 크기가 아니에요.', measuredValue: '800×800', criterion: '240×240 · 740×640 · 96×74', recommendation: '에디터 출력 규격에서 스티커(740×640)를 골라주세요.' },
  { code: 'SPEC_TRANSPARENCY', severity: 'fail', source: 'rule', imageId: 'mock-spec', message: '배경이 투명하지 않아요.', measuredValue: '불투명', criterion: '투명 배경', recommendation: '투명 배경으로 내보내주세요.' },
  { code: 'OCR_LOW_CONFIDENCE', severity: 'review', source: 'rule', imageId: 'mock-ocr', message: '글자 인식 신뢰도가 낮아요.', region: { x: 300, y: 520, width: 140, height: 40 }, measuredValue: 0.41, criterion: '≥ 0.6', recommendation: '인식된 원문이 맞는지 확인해주세요.' },
  { code: 'CLEANUP_MANUAL_REQUIRED', severity: 'review', source: 'rule', imageId: 'mock-cleanup', message: '배경이 복잡해 원문을 자동으로 지우지 않았어요.', region: { x: 200, y: 60, width: 340, height: 90 }, recommendation: '에디터에서 브러시로 원문을 정리해주세요.' },
  { code: 'AI_CULTURE_RISK', severity: 'review', source: 'ai_suggestion', imageId: 'mock-ai', message: '대상 언어에서 다르게 읽힐 수 있는 표현이에요.', region: { x: 180, y: 480, width: 380, height: 100 }, recommendation: '대안 표현 3개 중 하나를 검토해주세요.' },
  { code: 'AI_READABILITY', severity: 'fail', source: 'ai_suggestion', imageId: 'mock-ai', message: '작은 화면에서 글자가 잘 안 보일 수 있어요. (목업: ai_suggestion이 fail로 와도 REVIEW로 세는지 확인용)' },
]

export const MOCK_QA_RESPONSE: QaProjectResponse = {
  latest: {
    id: 'mock-report-2',
    projectId: 'mock-project',
    imageRevision: 'mock-rev-2',
    inspectedAt: '2026-10-28T09:30:00.000Z',
    rulesetVersion: '2026-10-27.1',
    findings,
  },
  history: [
    { id: 'mock-report-2', inspectedAt: '2026-10-28T09:30:00.000Z', pass: 1, review: 3, fail: 2 },
    { id: 'mock-report-1', inspectedAt: '2026-10-28T09:10:00.000Z', pass: 0, review: 3, fail: 3 },
  ],
}
