# 워크플로 개선 기록 — 2026-10-07

분석 기준 main: `c9e30b3`. React 19/TypeScript/Vite 프런트엔드, Express/TypeScript/Sharp 백엔드, Supabase 계정·프로젝트·편집 상태 저장 구조다. 기존 작업물은 git stash에 보존한 상태에서 구현했다.

## 구현 위치와 동작

| 영역 | 주요 파일 | 동작 |
| --- | --- | --- |
| 네이버 로그인 | AuthContext, Login, NaverCallback, loginReturn | 저장된 세션 확인과 자동 복귀, 쿼리·해시 보존, OAuth state 확인, 401만 세션 삭제, 일시 오류 재시도 |
| 원문 제거 | mask-generator, Editor | 연결된 가로 획까지 제한적으로 제거, 두꺼운 캐릭터 면 보호, 해당 이미지 보정 도구로 이동 |
| 결과·완료 안내 | PngPreview, usePngPreview, Result, exportImage | 실제 PNG 미리보기와 원본 비교, 키보드 탐색, 파일 준비·다운로드 시작 구분, PNG/ZIP 재다운로드 |
| 프레임 문구 | frameText, Editor, uploads | 현재 언어 대표 영역만 변경, 다른 영역·언어·스타일 보존, 전용 되돌리기와 클라우드 재시도 |
| 일본어 발음 | JapaneseSpeech | 기기 Web Speech 일본어 음성, 지연 로딩, 미지원 안내, 정지·문구/항목/언어 변경·언마운트 취소 |
| 번역 폴백 | translation-provider, localization.service | 논리 호출 ID와 실제 공급자/모델·시간·안전한 오류 코드 기록, 실제 모델 저장 |
| 생성 자동화 | generationApi, Generate, generation.routes | 기존 24장 흐름의 실패 복구·중복 등록 방지·미저장 계획 보호 |

미리보기의 Blob URL은 입력 변경·언마운트 시 해제한다. 렌더 동시 실행은 3개로 제한한다. 출력 규격은 현재 프로젝트·탭에서 유지한다. 브라우저 다운로드 이벤트는 파일 전달 시작이며 사용자의 실제 디스크 저장을 보장하는 신호가 아니다.

문구 일괄 적용은 선택된 PNG/JPEG 이미지의 현재 언어 대표 영역에 적용한다. 적용 전 직접 입력값을 저장하며, 되돌리기는 문구만 복원하고 이후 바꾼 다른 스타일은 유지한다. 인식 영역이 없는 프레임은 먼저 글자 영역을 추가하도록 안내하고 일괄 저장에서 제외한다. 다중 프레임 GIF 자체를 분해하는 기능은 포함하지 않는다.

## 운영 관찰

번역 로그에는 원문·번역 문구·에러 메시지를 넣지 않는다. 배포 후 Pino JSONL 로그를 확보해 실행한다:

```sh
cd backend
node scripts/report-translation-fallback.mjs --input /path/to/server.jsonl --days 14
```

논리 호출별로 중복 제거한 폴백 비율·성공/실패·미완료 추적·지연 p50/p95를 출력한다. 관찰 기간이 로그 내보내기 범위를 넘거나 `incompleteTraces`가 있으면 비율 해석에 주의한다. 로그 레벨은 info 이벤트를 포함해야 한다. 실제 운영 발생 빈도는 배포 후 로그로 측정해야 한다.

다운로드 전환율은 기존 download_events와 완료된 현지화 프로젝트를 이용해 중복 제거한다. 프로젝트 생성일 기준 코호트이며 재다운로드는 분자에 한 번만 포함한다:

```sh
node scripts/report-download-funnel.mjs --database --days 14
# 또는 {projects: [...], downloadEvents: [...]} 스냅샷
node scripts/report-download-funnel.mjs --input /path/to/snapshot.json --days 14
```

DB 모드는 서버용 Supabase 환경변수로 읽기 조회만 한다. 보고서는 개인 정보나 프로젝트 ID를 출력하지 않는다. 분모는 코호트의 처리 완료 프로젝트, 분자는 그 중 다운로드를 시작한 고유 프로젝트다. W5/W6의 27.3%와 비교하려면 동일한 기간·분모 정의를 사용해야 한다. 새 구현으로 전환율이 상승했다고 아직 주장할 수 없다.

번역 평가 데이터는 105개 고유 문구, 영어·일본어·중국어와 12개 유형이다. 드라이런은 유료 호출 없이 구성을 확인한다:

```sh
npm run benchmark:translation -- --dry-run --variants v1,v1-gpt56
```

실측에는 API 키와 최근 확인한 단가 snapshot(`--prices`) 및 총 10달러 예산 장부가 필요하다. 현재 운영 비교는 `current-groq,current-openai`를 사용한다. 실행 순서와 채택 기준은 [번역 fallback 운영·평가 안내](backend/translation-fallback.md)를 따른다. 실제 호출 비용이 발생한다. 캐시는 공급자·모델·옵션·프롬프트·입력을 반영한 해시로 구분한다. 이번 작업에서는 새 품질 점수를 산출하거나 기존 25개 평가를 105개 평가로 간주하지 않았다.

## 재현 검증

백엔드 `npm test`, `npm run build`, `npm run benchmark:cleanup`을 실행한다. 합성 cleanup 벤치마크는 실제 OCR/AI 호출 없이 글자 없는 정답 이미지와 비교한다. Docker와 같은 Noto CJK 폰트가 필요하다. 폰트가 없으면 한글이 대체 글리프로 렌더되어 결과가 달라진다.

프런트엔드 `npm run build`, `npm run lint` 후 Vite 서버를 켜고 아래를 실행한다:

```sh
cd frontend
npx playwright install chromium
npm run check:workflows
npm run check:public-pages
```

검증은 로컬 합성 PNG, 모의 OAuth/API·음성으로 진행한다. 스크린샷은 /tmp/glocalizer-workflows에 생성한다. 실제 네이버 인증 서비스·OS 음성 품질·사용자 원본 이미지와 운영 로그 평가는 별도다. 배포·유료 호출·DB 스키마 변경은 이번 작업에서 실행하지 않았다.

## 검증 결과

- 백엔드 65개 테스트 파일, 341개 테스트 통과. 프런트엔드와 백엔드 빌드 통과.
- 프런트엔드 lint 오류 없음. 기존 Fast Refresh·Localize·capture 경고 7개 유지.
- 브라우저 360·390·768·1280px의 에디터·결과·생성·로그인 복귀와 확대 모달 통과. 8/24 프레임 적용/되돌리기, 실제 PNG 픽셀 일치, 음성·저장 실패 복구·OAuth state·생성 응답 유실 검증 통과.
- 공개 화면 48개 언어·경로·화면 폭 조합 통과.
- Noto CJK 기준 합성 cleanup: 일반 13유형 × 8변형에서 통과율 99.0%, 판정 안정성 100%, 최대 주변 손상 0픽셀. 캐릭터 위 외곽선 글자 사례는 개선 전 0/8에서 7/8로 개선. 상세 수치는 [합성 측정 결과](cleanup-workflow-2026-10-07.json)에 보관했다. 어려운 7유형의 최대 주변 손상은 29픽셀로 기존 기준 30픽셀 이내 유지.
- 번역 105개 문구의 ID·원문 중복 없음. 새 실제 번역 점수와 운영 폴백 발생률은 미측정.
