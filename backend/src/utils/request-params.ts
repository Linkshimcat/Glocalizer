import type { Request } from 'express';
import { AppError } from '../errors/app-error.js';

/**
 * validate(schema, 'params') 미들웨어가 이미 값을 검증/치환해두지만, Express의 Request 타입은
 * 그 사실을 모르기 때문에 매 컨트롤러마다 `req.params.x as string` 캐스팅이 반복됐다.
 * 캐스팅 대신 런타임 체크를 한 번 더 해서, 미들웨어 순서가 잘못 꼬였을 때도 조용히 undefined가
 * 흘러가는 대신 명확한 에러로 바로 드러나게 한다.
 */
export function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new AppError('INVALID_REQUEST', { param: name }, `${name} 파라미터가 필요합니다.`);
  }
  return value;
}
