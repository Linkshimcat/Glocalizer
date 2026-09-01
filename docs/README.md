# 문서

## Git으로 공유하는 문서

| 문서 | 내용 |
| --- | --- |
| [api.md](api.md) | Backend REST API endpoint 목록과 인증 규칙 |
| [ocr-benchmark-2026-07-25.md](ocr-benchmark-2026-07-25.md) | 이모티콘 12장 처리 benchmark와 재시도 설정 근거 |

## 로컬 보관 (Git 미포함)

용량이 크거나 특정 시점의 산출물이라 저장소에 넣지 않는다. `.gitignore` 참고.

| 파일 | 설명 |
| --- | --- |
| `*.pdf`, `*.docx` | 작업보고서·로드맵·backend 재설계 보고서 |
| `secret-audit-*.md` | 로컬 감사 기록 |
| `이모티콘모음/이모티콘모음/` | `npm run test:emoticons`(`backend/scripts/emoticon-batch-e2e.ts`)의 입력 이미지. `EMOTICON_SOURCE_DIR`로 경로 변경 가능 |
| `../output/` | 리포트 생성 결과물 |

2026-07-24까지의 보고서는 커밋 이력에 남아 있어 필요하면 꺼낼 수 있다.

```bash
git log --all --diff-filter=D --name-only -- 'docs/*.pdf'
git checkout <commit> -- docs/<파일명>
```

## 배경

`glocalizer-backend-redesign-report`가 제안한 구조 — Vision 단일 의존에서 분리형 OCR bridge + 교체 가능한 text translation provider로의 전환 — 는 현재 backend에 반영되어 있다. `backend/src/ocr/`, `backend/src/translation/` 참고.
