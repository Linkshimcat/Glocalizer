export const ERROR_CODES = {
  INVALID_REQUEST: { status: 400, message: '요청 데이터가 올바르지 않습니다.' },
  INVALID_FILE_TYPE: { status: 400, message: '지원하지 않는 파일 형식입니다.' },
  FILE_TOO_LARGE: { status: 413, message: '파일 크기가 제한을 초과했습니다.' },
  IMAGE_DECODE_FAILED: { status: 422, message: '이미지를 읽을 수 없습니다.' },
  PROJECT_NOT_FOUND: { status: 404, message: '프로젝트를 찾을 수 없습니다.' },
  INVALID_PROJECT_TOKEN: { status: 401, message: '프로젝트 인증에 실패했습니다.' },
  UPLOAD_NOT_COMPLETED: { status: 409, message: '업로드가 완료되지 않았습니다.' },
  PROCESS_ALREADY_RUNNING: { status: 409, message: '이미 처리 중인 프로젝트입니다.' },
  OCR_TEXT_NOT_FOUND: { status: 422, message: '이미지에서 한국어 텍스트를 찾지 못했습니다.' },
  NEMOTRON_OCR_FAILED: { status: 502, message: 'OCR 처리 중 오류가 발생했습니다.' },
  GLM_TRANSLATION_FAILED: { status: 502, message: '번역 처리 중 오류가 발생했습니다.' },
  DEEPSEEK_REVIEW_FAILED: { status: 502, message: '번역 검수 중 오류가 발생했습니다.' },
  IMAGE_CLEANUP_FAILED: { status: 500, message: '이미지 정리 중 오류가 발생했습니다.' },
  RATE_LIMITED: { status: 429, message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
  NOT_FOUND: { status: 404, message: '요청한 리소스를 찾을 수 없습니다.' },
  INTERNAL_ERROR: { status: 500, message: '내부 서버 오류가 발생했습니다.' },
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;
