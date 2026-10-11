const DEFAULT_RATE_LIMIT_COOLDOWN_MS = 15_000;
const MAX_RATE_LIMIT_COOLDOWN_MS = 5 * 60_000;
/** Groq의 `7.5s`, `1m12.3s`, `250ms` 형태 제한 초기화 시간을 밀리초로 바꾼다. */
function parseDurationMs(value: string | null): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed) * 1_000;
  const unitPattern = /(\d+(?:\.\d+)?)\s*(ms|s|m|h)/gi;
  let total = 0;
  let matched = false;
  for (const match of trimmed.matchAll(unitPattern)) {
    matched = true;
    const amount = Number(match[1]);
    const unit = match[2].toLowerCase();
    total +=
      amount * (unit === 'ms' ? 1 : unit === 's' ? 1_000 : unit === 'm' ? 60_000 : 3_600_000);
  }
  return matched ? total : null;
}

function remainingQuota(response: Response, name: string): number | null {
  const value = response.headers.get(name);
  if (value === null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function rateLimitDelayMs(response: Response, body: string): number {
  const bodyDuration =
    body.match(/try again in\s+((?:\d+(?:\.\d+)?\s*(?:ms|s|m|h)\s*)+)/i)?.[1] ?? null;
  const explicitCandidates = [
    parseDurationMs(response.headers.get('retry-after')),
    parseDurationMs(bodyDuration),
  ].filter((value): value is number => value !== null && Number.isFinite(value) && value >= 0);
  const requestReset = parseDurationMs(response.headers.get('x-ratelimit-reset-requests'));
  const tokenReset = parseDurationMs(response.headers.get('x-ratelimit-reset-tokens'));
  const remainingRequests = remainingQuota(response, 'x-ratelimit-remaining-requests');
  const remainingTokens = remainingQuota(response, 'x-ratelimit-remaining-tokens');
  const exhaustedResets = [
    remainingRequests !== null && remainingRequests <= 0 ? requestReset : null,
    remainingTokens !== null && remainingTokens <= 0 ? tokenReset : null,
  ].filter((value): value is number => value !== null && Number.isFinite(value) && value >= 0);

  // 429 응답에는 소진되지 않은 요청/토큰 한도의 reset도 함께 온다. 예를 들어 토큰만
  // 소진됐는데 requests reset(1시간)을 고르면 매번 5분 상한까지 불필요하게 멈춘다.
  // remaining=0인 자원만 선택하고, remaining 헤더가 없다면 먼저 풀리는 reset을 사용한다.
  const fallbackResets = [requestReset, tokenReset].filter(
    (value): value is number => value !== null && Number.isFinite(value) && value >= 0,
  );
  const inferredReset =
    exhaustedResets.length > 0
      ? Math.max(...exhaustedResets)
      : fallbackResets.length > 0
        ? Math.min(...fallbackResets)
        : null;
  const candidates = [...explicitCandidates, ...(inferredReset === null ? [] : [inferredReset])];
  return Math.min(
    MAX_RATE_LIMIT_COOLDOWN_MS,
    Math.max(DEFAULT_RATE_LIMIT_COOLDOWN_MS, ...candidates),
  );
}
