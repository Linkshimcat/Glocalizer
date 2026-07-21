import { AppError } from '../errors/app-error.js';

interface DbError {
  message: string;
}

/** 단일 행을 기대하는 쿼리 결과를 검증한다. data가 없으면(에러거나 not-found) 에러를 던진다. */
export function unwrapRow<T>(result: { data: T | null; error: DbError | null }, errorMessage: string): T {
  if (result.error || result.data === null) {
    throw new AppError('INTERNAL_ERROR', { cause: result.error?.message }, errorMessage);
  }
  return result.data;
}

/** 있을 수도, 없을 수도 있는 단일 행(maybeSingle) 쿼리 결과를 검증한다. */
export function unwrapNullableRow<T>(result: { data: T | null; error: DbError | null }, errorMessage: string): T | null {
  if (result.error) {
    throw new AppError('INTERNAL_ERROR', { cause: result.error.message }, errorMessage);
  }
  return result.data ?? null;
}

/** 목록 쿼리 결과를 검증한다. */
export function unwrapList<T>(result: { data: T[] | null; error: DbError | null }, errorMessage: string): T[] {
  if (result.error) {
    throw new AppError('INTERNAL_ERROR', { cause: result.error.message }, errorMessage);
  }
  return result.data ?? [];
}

/** insert/update/delete처럼 결과 값이 없는 쿼리의 에러만 검증한다. */
export function unwrapVoid(result: { error: DbError | null }, errorMessage: string): void {
  if (result.error) {
    throw new AppError('INTERNAL_ERROR', { cause: result.error.message }, errorMessage);
  }
}
