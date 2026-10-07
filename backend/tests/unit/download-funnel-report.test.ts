import { describe, expect, it } from 'vitest';
import { summarizeDownloadFunnel } from '../../scripts/report-download-funnel.mjs';

describe('project download conversion', () => {
  it('deduplicates repeated downloads and excludes unfinished projects and old cohorts', () => {
    const now = Date.parse('2026-10-07T00:00:00Z');
    const recent = '2026-10-01T00:00:00Z';
    const report = summarizeDownloadFunnel({ projects: [
      { id: 'a', status: 'completed', created_at: recent }, { id: 'b', status: 'completed', created_at: recent },
      { id: 'c', status: 'processing', created_at: recent }, { id: 'old', status: 'completed', created_at: '2026-01-01' },
    ], downloadEvents: [
      ...['single', 'single', 'zip'].map(kind => ({ project_id: 'a', kind, created_at: recent })),
      { project_id: 'c', kind: 'zip', created_at: recent }, { project_id: 'old', kind: 'zip', created_at: recent },
      { project_id: 'b', kind: 'zip', created_at: '2026-10-08' }, { project_id: 'b', kind: 'single', created_at: '2026-09-01' },
    ] }, { now });
    expect(report).toMatchObject({ processedProjects: 2, downloadedProjects: 1, downloadConversion: .5, downloadEvents: 3, repeatEvents: 2, projectsByKind: { single: 1, zip: 1 } });
  });
  it('does not invent a rate when no completed projects exist', () => {
    expect(summarizeDownloadFunnel({ projects: [], downloadEvents: [] }).downloadConversion).toBeNull();
  });
});
