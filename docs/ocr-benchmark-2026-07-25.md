# 이모티콘 처리 benchmark — 2026-07-25

## 환경

- 표본: 사용자 제공 JPG 12장 (`docs/이모티콘모음/`의 원본 바이너리는 Git에 포함하지 않음)
- OCR: PaddleOCR Korean 다중 variant + Vision fallback
- 번역: Groq Llama 3.3 70B, 영어 1개 언어
- 안정화 설정: `AI_CONCURRENCY=2`, `AI_MAX_RETRIES=3`

## 1차 결과

| 지표 | 결과 |
| --- | ---: |
| 총 이미지 | 12 |
| 완료 | 9 |
| OCR 텍스트 반환 | 11 |
| OCR 수동 검토 필요 | 5 |
| 자동 cleanup 완료 | 2 |
| 수동 cleanup 필요 | 7 |
| 번역 provider 실패 | 2 |
| OCR provider 실패 | 1 |
| 처리 시간 | 136.7초 |

실패 원인은 번역 요청의 일시 오류·응답 형식 오류를 한 번만 시도하던 설정과, 단일 샘플의 OCR provider 오류였다. 복잡한 사진·밈 배경은 잘못 지우지 않도록 대부분 `manual-required`로 분류됐다.

## 재시도 설정 후 확인

이전에 실패한 `IMG_2800.JPG`, `IMG_2802.JPG`, `IMG_2794 2.JPG`를 다시 처리했다.

| 이미지 | 상태 | OCR | 번역 후보 | cleanup |
| --- | --- | --- | ---: | --- |
| IMG_2800.JPG | completed | 영원히 사랑해 | 3 | manual-required |
| IMG_2802.JPG | completed | 다이어트 중입니다.. | 3 | manual-required |
| IMG_2794 2.JPG | completed | 자책 | 3 | manual-required |

3장은 38.5초 안에 모두 완료됐다. 이 결과를 기준으로 번역 provider의 일시 오류는 이미지 실패로 바로 확정하지 않고, 3회 재시도와 2개 병렬 처리로 복구한다.

## 다음 품질 목표

1. 대표 OCR 문구의 완전 일치율을 정답 라벨 기준으로 측정한다.
2. 사진·그라데이션 배경의 자동 cleanup은 별도 visual acceptance set에서 검증한 경우에만 범위를 넓힌다.
3. 자동 제거가 불안정한 결과는 계속 수동 cleanup과 텍스트 배경 패널로 안전하게 보정한다.
