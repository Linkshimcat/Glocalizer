/** 규칙을 바꾸면 올린다. 저장된 리포트가 어떤 기준으로 판정됐는지 구분하는 값이다. */
export const QA_RULESET_VERSION = '2026-10-29.1';

// OGQ 크리에이터 스튜디오 제작 가이드. 프런트 lib/ogqSpecCheck.ts와 같은 값을 쓴다.
export const OGQ_MAX_FILE_BYTES = 1024 * 1024;
export const OGQ_DIMENSIONS = [
  { width: 240, height: 240 },
  { width: 740, height: 640 },
  { width: 96, height: 74 },
] as const;

/** 캐릭터가 가장자리에서 짧은 변의 이 비율만큼은 떨어져 있어야 여백이 있다고 본다. */
export const MARGIN_MIN_RATIO = 0.04;
/** PNG 압축 과정에서 알파가 250~255로 미세하게 섞일 수 있어 255 대신 이 값을 불투명 기준으로 쓴다. */
export const OPAQUE_ALPHA_THRESHOLD = 250;
export const TRANSPARENT_ALPHA_THRESHOLD = 10;

/** 에디터가 잰 글자 넘침 중 캡션 영역에서 이 비율 이상 벗어나면 fail. 임시값이며 소연과 확정이 필요하다. */
export const OUTSIDE_CAPTION_FAIL_RATIO = 0.3;
