/** Error objects may contain request bodies, credentials and upstream URLs. */
export function safeLogError(error: unknown): { type: string; code?: string | number; status?: number } {
  if (!error || typeof error !== 'object') return { type: 'UnknownError' };
  const value = error as { name?: unknown; code?: unknown; status?: unknown };
  const type = typeof value.name === 'string' && /^[A-Za-z]+Error$/.test(value.name) ? value.name : 'Error';
  const code = typeof value.code === 'string' && /^[A-Z][A-Z0-9_]{0,63}$/.test(value.code) ? value.code : undefined;
  const status = typeof value.status === 'number' && Number.isInteger(value.status) ? value.status : undefined;
  return { type, ...(code ? { code } : {}), ...(status ? { status } : {}) };
}
