# Demo Lab 서비스 샘플 등록

공개 세트는 `index.ts`의 captured에 DemoSample 타입으로 등록한다. 개발 예시는 production에서 사용하지 않는다.

## 선정할 세트

- simple: 단색 배경 / 고마워! / OCR와 번역 선택 흐름 확인.
- complex: 복잡한 배경 / 오늘도 힘내! / 정리 전후 및 수동 확인 필요 사례.
- long: 긴 문구 / 오늘 하루도 정말 정말 수고 많았어! / 실제 TEXT_OVERFLOW FAIL과 수정 후 재검사 기록.

## 저장할 자료

- 원본 PNG, 정리 PNG, EN/JA/ZH 각 번역 후보 3개와 각 후보를 렌더링한 PNG.
- 원본 px 좌표의 OCR regions, 정확한 sourceText.
- 후보별 실제 QaReport. 검사하지 않은 후보는 null. 다른 후보의 PASS를 재사용하지 않는다.
- 보고서 finding.imageId는 sample.id와 일치해야 한다. 서버 asset ID를 sample.id로 사용한다.
- rights에는 docs/licenses의 실제 근거, font, aiGenerated, approved를 입력한다.
- provenance.kind='service', 실제 processedAt, 개인정보 없는 처리 기록 경로.
- stages는 실제 단계 이벤트만 입력한다. 없는 시각·소요 시간은 생략한다. 워커 전체 소요 시간을 단계별로 임의 배분하지 않는다.

## 실제 처리 절차

등록된 팀 계정으로 로그인 → 생성 기능의 원본 또는 허락받은 원본 현지화 → EN/JA/ZH 후보 저장 → 편집기에서 후보별 최종 PNG 내보내기 → QA Board에서 최종 PNG 규격 검사 → 원자료에서 승인된 필드만 정적 JSON으로 정리. 결과에 프로젝트 토큰·Bearer 토큰·서명 URL·이메일을 포함하지 않는다.

운영 DB 마이그레이션 불필요. QA와 이벤트 모듈은 가져다 쓰기만 한다. 다운로드 파일은 선택한 후보의 PNG와 정확히 일치해야 한다.
