import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { jpegImage, stickerPng } from '../helpers/qa-fixtures.js';

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
const assets = await import('../../src/repositories/asset.repository.js');
const ocr = await import('../../src/repositories/ocr.repository.js');
const translations = await import('../../src/repositories/translation.repository.js');
const editorStates = await import('../../src/repositories/editor-state.repository.js');
const qaRepo = await import('../../src/repositories/qa.repository.js');
const { hashProjectToken } = await import('../../src/utils/hash.js');

const app = createApp();
const PROJECT_ID = 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b';
const TOKEN = 'qa-api-test-token';
const ASSET_A = 'a0000000-0000-4000-8000-00000000000a';
const ASSET_B = 'b0000000-0000-4000-8000-00000000000b';
const inspectUrl = `/api/v1/projects/${PROJECT_ID}/qa/inspect`;

const asset = (id: string) => ({ id, project_id: PROJECT_ID, status: 'completed', error_code: null, error_message: null, needs_manual_cleanup: false, cleaned_path: `c/${id}.png`, updated_at: '2026-10-29T00:00:00.000Z' });
const region = (assetId: string) => ({ id: `${assetId.slice(0, 8)}-r`, asset_id: assetId, detected_text: '안녕', confidence: 0.95, bbox: { x: 1, y: 2, width: 30, height: 10 }, contains_korean: true, needs_manual_review: false, is_primary: true });
const translation = (assetId: string) => ({ ocr_region_id: `${assetId.slice(0, 8)}-r`, language_code: 'en', final_candidates: [{ text: 'Hi', tone: 't', meaning: 'm', best: true }] });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(projects.findProjectById).mockResolvedValue({
    id: PROJECT_ID, access_token_hash: hashProjectToken(TOKEN), status: 'completed', stage: 'completed', progress: 100, target_languages: ['en'],
    localization_options: {}, error_code: null, error_message: null, created_at: '', updated_at: '', expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  } as never);
  vi.mocked(assets.findAssetsByProjectId).mockResolvedValue([asset(ASSET_A), asset(ASSET_B)] as never);
  vi.mocked(ocr.findRegionsByAssetIds).mockResolvedValue([region(ASSET_A), region(ASSET_B)] as never);
  vi.mocked(translations.findTranslationsByOcrRegionIds).mockResolvedValue([translation(ASSET_A), translation(ASSET_B)] as never);
  vi.mocked(editorStates.findEditorStatesByAssetIds).mockResolvedValue([]);
  vi.mocked(qaRepo.findLatestQaReport).mockResolvedValue(null);
  vi.mocked(qaRepo.insertQaReport).mockImplementation(async (row) => ({ id: 'report-1', inspectedAt: '2026-10-30T00:00:00.000Z', ...row }) as never);
});

describe('POST /projects/:projectId/qa/inspect', () => {
  it('브라우저가 보낸 PNG를 서버가 직접 읽어 판정하고, 리포트를 저장해 돌려준다', async () => {
    const res = await request(app).post(inspectUrl).set('X-Project-Token', TOKEN)
      .attach(ASSET_A, await stickerPng(), 'a.png')
      .attach(ASSET_B, await jpegImage(), 'b.png');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'report-1', projectId: PROJECT_ID, counts: { pass: 1, review: 0, fail: 1 }, passed: false });
    const codeOf = (imageId: string, code: string) => res.body.findings.find((x: { imageId: string; code: string }) => x.imageId === imageId && x.code === code);
    expect(codeOf(ASSET_A, 'SPEC_FORMAT').severity).toBe('pass');
    expect(codeOf(ASSET_B, 'SPEC_FORMAT').severity).toBe('fail'); // 파일 이름이 .png여도 실제 바이트는 JPEG
    expect(qaRepo.insertQaReport).toHaveBeenCalledWith(expect.objectContaining({ projectId: PROJECT_ID, passCount: 1, reviewCount: 0, failCount: 1 }));
  });

  it('PNG 없이 assetId만 보내면(에디터 재검사) 다른 이미지의 규격 판정은 직전 리포트에서 이어받고, passed는 그 이미지 기준이다', async () => {
    vi.mocked(qaRepo.findLatestQaReport).mockResolvedValue({
      id: 'old', projectId: PROJECT_ID, imageRevision: 'x', inspectedAt: '', rulesetVersion: 'v',
      findings: [
        { code: 'SPEC_DIMENSIONS', severity: 'fail', source: 'rule', imageId: ASSET_B, message: '크기 틀림' },
        { code: 'SPEC_FILE_SIZE', severity: 'pass', source: 'rule', imageId: ASSET_A, message: '편집 전 판정' },
      ],
    });
    const res = await request(app).post(inspectUrl).set('X-Project-Token', TOKEN).send({ assetId: ASSET_A });

    expect(res.status).toBe(200);
    expect(res.body.passed).toBe(true); // A는 문제 없음
    expect(res.body.counts).toEqual({ pass: 1, review: 0, fail: 1 }); // B는 이어받은 규격 fail
    expect(res.body.findings.some((x: { imageId: string; code: string }) => x.imageId === ASSET_B && x.code === 'SPEC_DIMENSIONS')).toBe(true);
    // 방금 편집한 이미지(A)는 예전 규격 판정을 이어받지 않는다 — PNG를 다시 받기 전까지 측정 안 됨.
    expect(res.body.findings.some((x: { imageId: string; code: string }) => x.imageId === ASSET_A && x.code.startsWith('SPEC_'))).toBe(false);
  });

  it.each([
    ['UUID가 아닌 필드 이름', 'not-a-uuid'],
    ['이 프로젝트에 없는 에셋', 'c0000000-0000-4000-8000-00000000000c'],
  ])('%s으로 보낸 파일은 400이고 저장하지 않는다', async (_label, field) => {
    const res = await request(app).post(inspectUrl).set('X-Project-Token', TOKEN).attach(field, await stickerPng(), 'x.png');
    expect(res.status).toBe(400);
    expect(qaRepo.insertQaReport).not.toHaveBeenCalled();
  });

  it('assetId가 이 프로젝트 에셋이 아니면 400이다', async () => {
    const res = await request(app).post(inspectUrl).set('X-Project-Token', TOKEN).send({ assetId: 'c0000000-0000-4000-8000-00000000000c' });
    expect(res.status).toBe(400);
  });

  it('토큰이 없으면 파일을 읽기 전에 401로 막는다', async () => {
    const res = await request(app).post(inspectUrl).attach(ASSET_A, await stickerPng(), 'a.png');
    expect(res.status).toBe(401);
  });
});

describe('GET /projects/:projectId/qa', () => {
  it('최신 리포트와 이력 요약을 돌려준다', async () => {
    const latest = { id: 'r2', projectId: PROJECT_ID, imageRevision: 'x', inspectedAt: '2026-10-30T01:00:00.000Z', rulesetVersion: 'v', findings: [] };
    vi.mocked(qaRepo.findLatestQaReport).mockResolvedValue(latest);
    vi.mocked(qaRepo.listQaHistory).mockResolvedValue([{ id: 'r2', inspectedAt: '2026-10-30T01:00:00.000Z', pass: 2, review: 0, fail: 0 }]);
    const res = await request(app).get(`/api/v1/projects/${PROJECT_ID}/qa`).set('X-Project-Token', TOKEN);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ latest, history: [{ id: 'r2', inspectedAt: '2026-10-30T01:00:00.000Z', pass: 2, review: 0, fail: 0 }] });
  });

  it('검사한 적이 없으면 latest는 null이다', async () => {
    vi.mocked(qaRepo.listQaHistory).mockResolvedValue([]);
    const res = await request(app).get(`/api/v1/projects/${PROJECT_ID}/qa`).set('X-Project-Token', TOKEN);
    expect(res.body).toEqual({ latest: null, history: [] });
  });
});
