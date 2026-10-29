import { AppError } from '../errors/app-error.js';

/** 본선용 스캐폴드(PR-0) 자리표시자. 실제 구현이 들어오는 엔드포인트부터 이 핸들러를 걸어 둔 줄을 교체한다. */
export function notImplementedHandler(): never {
  throw new AppError('NOT_IMPLEMENTED');
}
