import { describe, expect, it } from 'vitest';
import { eventsToCsv, percentile, resolveExperimentGroup, summarizeEvents } from '../../src/analytics/proof.js';
import type { AnalyticsEventRow } from '../../src/analytics/types.js';

const row = (overrides: Partial<AnalyticsEventRow>): AnalyticsEventRow => ({
  event_name: 'localization_started',
  client_event_id: '00000000-0000-4000-8000-000000000000',
  occurred_at: '2026-10-29T10:00:00.000Z',
  anonymous_session_id: 'session-aaaa',
  project_id: null,
  experiment_group: 'external',
  duration_ms: null,
  image_count: null,
  ...overrides,
});

describe('percentile (nearest-rank)', () => {
  it.each([
    [50, 500],
    [95, 1000],
    [10, 100],
  ])('1~10번째 값(100~1000)의 p%i는 %i', (p, expected) => {
    expect(percentile([1000, 100, 300, 200, 500, 400, 700, 600, 900, 800], p)).toBe(expected);
  });

  it('값이 하나면 p50·p95 모두 그 값이다', () => {
    expect(percentile([42], 50)).toBe(42);
    expect(percentile([42], 95)).toBe(42);
  });
});

describe('summarizeEvents', () => {
  it('표본이 없으면 수치를 지어내지 않고 null로 둔다', () => {
    const summary = summarizeEvents([], 'external');
    expect(summary).toMatchObject({ experimentGroup: 'external', period: null, sampleSize: 0, completion: { startedProjects: 0, exportedProjects: 0, rate: null } });
    expect(summary.durations.localization_completed).toBeNull();
    expect(summary.eventCounts.export_succeeded).toBe(0);
  });

  it('완주율은 시작한 프로젝트 중 내보내기에 성공한 프로젝트 비율이다 (내보내기 횟수가 아니라 프로젝트 수)', () => {
    const summary = summarizeEvents([
      row({ event_name: 'localization_started', project_id: 'p1' }),
      row({ event_name: 'localization_started', project_id: 'p2' }),
      row({ event_name: 'localization_started', project_id: 'p3' }),
      row({ event_name: 'localization_started', project_id: 'p4' }),
      row({ event_name: 'export_succeeded', project_id: 'p1' }),
      row({ event_name: 'export_succeeded', project_id: 'p1' }),
      row({ event_name: 'export_succeeded', project_id: 'p3' }),
      row({ event_name: 'export_succeeded', project_id: 'never-started' }),
    ], 'external');
    expect(summary.completion).toEqual({ startedProjects: 4, exportedProjects: 2, rate: 0.5 });
    expect(summary.eventCounts.export_succeeded).toBe(4);
  });

  it('소요 시간은 이벤트별로 p50/p95와 표본 수를 낸다', () => {
    const durations = [1000, 2000, 3000, 4000];
    const summary = summarizeEvents(durations.map((d) => row({ event_name: 'localization_completed', duration_ms: d })), 'external');
    expect(summary.durations.localization_completed).toEqual({ n: 4, p50Ms: 2000, p95Ms: 4000 });
    expect(summary.durations.export_succeeded).toBeNull();
  });

  it('표본 수 N은 서로 다른 익명 세션 수이고, 측정 기간은 첫·마지막 이벤트 시각이다', () => {
    const summary = summarizeEvents([
      row({ anonymous_session_id: 'session-aaaa', occurred_at: '2026-10-29T12:00:00.000Z' }),
      row({ anonymous_session_id: 'session-bbbb', occurred_at: '2026-10-28T09:00:00.000Z' }),
      row({ anonymous_session_id: 'session-aaaa', occurred_at: '2026-10-30T01:00:00.000Z' }),
    ], 'external');
    expect(summary.sampleSize).toBe(2);
    expect(summary.period).toEqual({ from: '2026-10-28T09:00:00.000Z', to: '2026-10-30T01:00:00.000Z' });
  });
});

describe('resolveExperimentGroup', () => {
  const team = ['team@glocalizer.dev'];
  it.each([
    ['external', 'TEAM@glocalizer.dev', 'internal'], // 팀원 계정은 클라이언트가 뭐라고 보내든 internal
    ['demo', 'team@glocalizer.dev', 'internal'],
    ['internal', null, 'external'], // 클라이언트가 스스로 internal이라고 할 수는 없다
    ['internal', 'user@example.com', 'external'],
    ['demo', null, 'demo'],
    ['external', 'user@example.com', 'external'],
  ] as const)('보낸 값 %s, 계정 %s → %s', (claimed, email, expected) => {
    expect(resolveExperimentGroup(claimed, email, team)).toBe(expected);
  });
});

describe('eventsToCsv', () => {
  it('개인정보 없는 필드만 헤더 순서대로 내보내고 빈 값은 비운다', () => {
    const csv = eventsToCsv([row({ event_name: 'export_succeeded', project_id: 'p1', duration_ms: 1200, image_count: 24 })]);
    expect(csv).toBe([
      'event_name,client_event_id,occurred_at,anonymous_session_id,project_id,experiment_group,duration_ms,image_count',
      'export_succeeded,00000000-0000-4000-8000-000000000000,2026-10-29T10:00:00.000Z,session-aaaa,p1,external,1200,24',
      '',
    ].join('\n'));
    expect(eventsToCsv([row({})]).split('\n')[1]).toBe('localization_started,00000000-0000-4000-8000-000000000000,2026-10-29T10:00:00.000Z,session-aaaa,,external,,');
  });
});
