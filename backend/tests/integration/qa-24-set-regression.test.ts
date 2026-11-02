import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { stickerPng } from '../helpers/qa-fixtures.js';

// QA-01: 24장 세트 회귀 — 정상 / 일부 이미지 실패 / 재시도 / 재검사.
// 저장소만 가짜로 바꾸고 라우트·컨트롤러·서비스·엔진은 실제 코드를 그대로 지난다.
vi.mock('../../src/repositories/project.repository.js', () => ({
  insertProject: vi.fn(), findProjectById: vi.fn(), updateProjectStage: vi.fn(), deleteProjectRow: vi.fn(), findExpiredProjects: vi.fn(),
}));
vi.mock('../../src/repositories/asset.repository.js', async (importOriginal) => ({ ...(await importOriginal<object>()), findAssetsByProjectId: vi.fn() }));
vi.mock('../../src/repositories/ocr.repository.js', async (importOriginal) => ({ ...(await importOriginal<object>()), findRegionsByAssetIds: vi.fn() }));
vi.mock('../../src/repositories/translation.repository.js', async (importOriginal) => ({ ...(await importOriginal<object>()), findTranslationsByOcrRegionIds: vi.fn() }));
vi.mock('../../src/repositories/editor-state.repository.js', async (importOriginal) => ({ ...(await importOriginal<object>()), findEditorStatesByAssetIds: vi.fn() }));
vi.mock('../../src/repositories/qa.repository.js', () => ({ insertQaReport: vi.fn(), findLatestQaReport: vi.fn(), listQaHistory: vi.fn() }));

const { createApp } = await import('../../src/app.js');
const projects = await import('../../src/repositories/project.repository.js');
const assetsRepo = await import('../../src/repositories/asset.repository.js');
const ocr = await import('../../src/repositories/ocr.repository.js');
const translations = await import('../../src/repositories/translation.repository.js');
const editorStates = await import('../../src/repositories/editor-state.repository.js');
const qaRepo = await import('../../src/repositories/qa.repository.js');
const { hashProjectToken } = await import('../../src/utils/hash.js');

const app = createApp();
const PROJECT_ID = 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b';
const TOKEN = 'qa-24-regression-token';
const SET_SIZE = 24;
const inspectUrl = `/api/v1/projects/${PROJECT_ID}/qa/inspect`;
const ids = Array.from({ length: SET_SIZE }, (_, i) => `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`);

type Finding = { imageId: string; code: string; severity: string };
type AssetRow = { id: string; project_id: string; status: string; error_code: string | null; error_message: string | null; needs_manual_cleanup: boolean; cleaned_path: string; updated_at: string };

// 세트 상태. 각 시나리오가 이 값을 바꾼 뒤 같은 API를 다시 호출한다.
let rows: AssetRow[];
let reports: Array<{ id: string; projectId: string; imageRevision: string; inspectedAt: string; rulesetVersion: string; findings: Finding[]; passCount: number; reviewCount: number; failCount: number }>;

const asset = (id: string): AssetRow => ({ id, project_id: PROJECT_ID, status: 'completed', error_code: null, error_message: null, needs_manual_cleanup: false, cleaned_path: `c/${id}.png`, updated_at: '2026-11-02T00:00:00.000Z' });
const patch = (index: number, change: Partial<AssetRow>) => { rows[index] = { ...rows[index]!, ...change }; };
const regionOf = (id: string) => ({ id: `r-${id}`, asset_id: id, detected_text: '안녕', confidence: 0.95, bbox: { x: 10, y: 20, width: 100, height: 40 }, contains_korean: true, needs_manual_review: false, is_primary: true });
const translationOf = (id: string) => ({ ocr_region_id: `r-${id}`, language_code: 'en', final_candidates: [{ text: 'Hi', tone: 't', meaning: 'm', best: true }] });

/** 실패한 이미지에는 영역·번역이 없다. 파이프라인이 중간에 멈춘 상태를 그대로 흉내 낸다. */
function syncDerivedRows() {
  const usable = rows.filter((row) => row.status === 'completed').map((row) => row.id);
  vi.mocked(assetsRepo.findAssetsByProjectId).mockResolvedValue(rows as never);
  vi.mocked(ocr.findRegionsByAssetIds).mockResolvedValue(usable.map(regionOf) as never);
  vi.mocked(translations.findTranslationsByOcrRegionIds).mockResolvedValue(usable.map(translationOf) as never);
}

async function inspect(uploadIds: string[], body?: { assetId: string }) {
  syncDerivedRows();
  const png = await stickerPng();
  let call = request(app).post(inspectUrl).set('X-Project-Token', TOKEN);
  if (body) return call.send(body);
  for (const id of uploadIds) call = call.attach(id, png, `${id}.png`);
  return call;
}

const findingsOf = (res: { body: { findings: Finding[] } }, imageId: string) => res.body.findings.filter((finding) => finding.imageId === imageId);
const failedImages = (res: { body: { findings: Finding[] } }) => new Set(res.body.findings.filter((finding) => finding.severity === 'fail').map((finding) => finding.imageId));

beforeEach(() => {
  vi.clearAllMocks();
  rows = ids.map(asset);
  reports = [];
  vi.mocked(projects.findProjectById).mockResolvedValue({
    id: PROJECT_ID, access_token_hash: hashProjectToken(TOKEN), status: 'completed', stage: 'completed', progress: 100, target_languages: ['en'],
    localization_options: {}, error_code: null, error_message: null, created_at: '', updated_at: '', expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  } as never);
  vi.mocked(editorStates.findEditorStatesByAssetIds).mockResolvedValue([]);
  vi.mocked(qaRepo.insertQaReport).mockImplementation(async (row) => {
    const saved = { id: `report-${reports.length + 1}`, inspectedAt: `2026-11-02T00:0${reports.length}:00.000Z`, ...row } as (typeof reports)[number];
    reports.push(saved);
    return saved as never;
  });
  vi.mocked(qaRepo.findLatestQaReport).mockImplementation(async () => (reports.at(-1) ?? null) as never);
  vi.mocked(qaRepo.listQaHistory).mockImplementation(async () => reports.map((r) => ({ id: r.id, inspectedAt: r.inspectedAt, pass: r.passCount, review: r.reviewCount, fail: r.failCount })).reverse() as never);
});

describe('QA-01: 24장 세트 회귀', () => {
  it('정상: 24장 모두 내보낸 PNG와 함께 검사하면 전부 pass다', async () => {
    const res = await inspect(ids);

    expect(res.status).toBe(200);
    expect(res.body.counts).toEqual({ pass: SET_SIZE, review: 0, fail: 0 });
    expect(res.body.passed).toBe(true);
    expect(failedImages(res).size).toBe(0);
    for (const id of ids) expect(findingsOf(res, id).some((finding) => finding.code === 'SPEC_FORMAT' && finding.severity === 'pass')).toBe(true);
  });

  it('일부 실패: 3장이 파이프라인에서 실패해도 나머지 21장은 정상 판정되고, 실패한 3장만 fail이다', async () => {
    const failedIndexes = [2, 11, 23];
    for (const i of failedIndexes) patch(i, { status: 'failed', error_code: 'OCR_PROVIDER_FAILED', error_message: 'OCR 실패', cleaned_path: '' });

    const res = await inspect(ids.filter((_, i) => !failedIndexes.includes(i)));

    expect(res.status).toBe(200);
    expect(res.body.counts).toEqual({ pass: SET_SIZE - 3, review: 0, fail: 3 });
    expect(res.body.passed).toBe(false);
    expect(failedImages(res)).toEqual(new Set(failedIndexes.map((i) => ids[i])));
    // 실패 이미지는 실패 사유만 남기고, 성공한 이미지는 PNG까지 정상 판정된다.
    expect(findingsOf(res, ids[2]!).map((finding) => finding.code)).toEqual(['OCR_NO_TEXT']);
    expect(findingsOf(res, ids[0]!).some((finding) => finding.code === 'SPEC_DIMENSIONS' && finding.severity === 'pass')).toBe(true);
  });

  it('재시도: 실패한 3장이 복구되면 그 3장 PNG만 다시 받아도 새 리포트가 24장 전부 pass이고, 이력이 쌓인다', async () => {
    const failedIndexes = [2, 11, 23];
    for (const i of failedIndexes) patch(i, { status: 'failed', error_code: 'OCR_PROVIDER_FAILED', error_message: 'OCR 실패', cleaned_path: '' });
    const first = await inspect(ids.filter((_, i) => !failedIndexes.includes(i)));
    expect(first.body.counts.fail).toBe(3);

    for (const i of failedIndexes) patch(i, { status: 'completed', error_code: null, error_message: null, cleaned_path: `c/${ids[i]}.png`, updated_at: '2026-11-02T01:00:00.000Z' });
    const retried = await inspect(failedIndexes.map((i) => ids[i]!));

    expect(retried.status).toBe(200);
    expect(retried.body.counts).toEqual({ pass: SET_SIZE, review: 0, fail: 0 });
    expect(retried.body.passed).toBe(true);
    expect(retried.body.id).not.toBe(first.body.id);
    expect(retried.body.imageRevision).not.toBe(first.body.imageRevision); // 상태가 바뀌었으니 지문도 달라야 한다
    // 이번에 PNG를 보내지 않은 21장은 직전 리포트의 규격 판정을 이어받는다.
    expect(findingsOf(retried, ids[0]!).some((finding) => finding.code === 'SPEC_FORMAT' && finding.severity === 'pass')).toBe(true);

    const history = await request(app).get(`/api/v1/projects/${PROJECT_ID}/qa`).set('X-Project-Token', TOKEN);
    expect(history.body.history.map((entry: { fail: number }) => entry.fail)).toEqual([0, 3]); // 최신순
    expect(history.body.latest.id).toBe(retried.body.id);
  });

  it('재검사: 한 장만 편집하면 그 이미지 기준으로 passed가 정해지고, 나머지 23장 판정은 유지된다', async () => {
    const full = await inspect(ids);
    expect(full.body.passed).toBe(true);

    // 에디터에서 5번째 이미지가 수동 정리가 필요한 상태가 됐다.
    patch(4, { needs_manual_cleanup: true, updated_at: '2026-11-02T02:00:00.000Z' });
    const broken = await inspect([], { assetId: ids[4]! });
    expect(broken.body.passed).toBe(false);
    expect(broken.body.counts).toEqual({ pass: SET_SIZE - 1, review: 0, fail: 1 });
    expect(failedImages(broken)).toEqual(new Set([ids[4]!]));
    // 편집한 이미지는 PNG를 다시 받기 전까지 예전 규격 판정을 이어받지 않는다.
    expect(findingsOf(broken, ids[4]!).some((finding) => finding.code.startsWith('SPEC_'))).toBe(false);
    expect(findingsOf(broken, ids[0]!).some((finding) => finding.code === 'SPEC_FORMAT')).toBe(true);

    // 고친 뒤 그 이미지의 PNG와 함께 다시 검사하면 통과한다.
    patch(4, { needs_manual_cleanup: false, updated_at: '2026-11-02T03:00:00.000Z' });
    const fixed = await inspect([ids[4]!], undefined);
    expect(fixed.body.counts).toEqual({ pass: SET_SIZE, review: 0, fail: 0 });
    expect(reports).toHaveLength(3);
  });
});
