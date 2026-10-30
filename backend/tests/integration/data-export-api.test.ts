import JSZip from 'jszip';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

// 이 파일은 같은 사용자로 여러 번 받으므로 시간당 제한을 넉넉히 둔다(제한 자체는 아래에서 따로 확인).
process.env.DATA_EXPORT_MAX_PER_HOUR = '100';
process.env.DATA_EXPORT_EMAIL_MAX_PER_HOUR = '100';

vi.mock('../../src/repositories/user.repository.js', async (importOriginal) => ({ ...(await importOriginal<object>()), findUserById: vi.fn() }));
vi.mock('../../src/repositories/session.repository.js', async (importOriginal) => ({ ...(await importOriginal<object>()), findSessionById: vi.fn(), touchSessionIfStale: vi.fn(), listLoginHistory: vi.fn() }));
vi.mock('../../src/repositories/payment.repository.js', async (importOriginal) => ({ ...(await importOriginal<object>()), listPaymentsByUser: vi.fn() }));
vi.mock('../../src/repositories/project.repository.js', async (importOriginal) => ({ ...(await importOriginal<object>()), findProjectsByOwner: vi.fn(), findProjectById: vi.fn() }));
vi.mock('../../src/repositories/asset.repository.js', async (importOriginal) => ({ ...(await importOriginal<object>()), findAssetsByProjectId: vi.fn() }));
vi.mock('../../src/repositories/ocr.repository.js', async (importOriginal) => ({ ...(await importOriginal<object>()), findRegionsByAssetIds: vi.fn() }));
vi.mock('../../src/repositories/translation.repository.js', async (importOriginal) => ({ ...(await importOriginal<object>()), findTranslationsByOcrRegionIds: vi.fn() }));
vi.mock('../../src/repositories/editor-state.repository.js', async (importOriginal) => ({ ...(await importOriginal<object>()), findEditorStatesByAssetIds: vi.fn() }));
vi.mock('../../src/repositories/storage.repository.js', async (importOriginal) => ({ ...(await importOriginal<object>()), createSignedUrl: vi.fn(), downloadFromStorage: vi.fn() }));
vi.mock('../../src/repositories/generation-export.repository.js', () => ({ listGenerationExports: vi.fn() }));
vi.mock('../../src/services/email.service.js', async (importOriginal) => ({ ...(await importOriginal<object>()), sendEmail: vi.fn() }));

const { createApp } = await import('../../src/app.js');
const users = await import('../../src/repositories/user.repository.js');
const sessions = await import('../../src/repositories/session.repository.js');
const payments = await import('../../src/repositories/payment.repository.js');
const projects = await import('../../src/repositories/project.repository.js');
const assets = await import('../../src/repositories/asset.repository.js');
const ocr = await import('../../src/repositories/ocr.repository.js');
const translations = await import('../../src/repositories/translation.repository.js');
const editorStates = await import('../../src/repositories/editor-state.repository.js');
const storage = await import('../../src/repositories/storage.repository.js');
const generation = await import('../../src/repositories/generation-export.repository.js');
const email = await import('../../src/services/email.service.js');
const { signAuthToken } = await import('../../src/utils/jwt.js');
const { signExportToken } = await import('../../src/utils/export-token.js');

const app = createApp();
const OWNER = '00000000-0000-4000-8000-000000000001';
const PROJECT = 'aaaaaaaa-0000-4000-8000-000000000001';
const ASSET = 'bbbbbbbb-0000-4000-8000-000000000001';
const REGION = 'cccccccc-0000-4000-8000-000000000001';
const bearer = `Bearer ${signAuthToken({ sub: OWNER, ver: 0 })}`;

const userRow = (patch: object = {}) => ({
  id: OWNER, email: 'me@example.com', password_hash: 'hash', naver_id: null, kakao_id: null, supabase_auth_id: null, signup_method: 'email',
  name: '윤재', avatar_url: `data:image/webp;base64,${Buffer.from('avatar-bytes').toString('base64')}`, name_customized: false, avatar_customized: true,
  session_version: 0, deleting_at: null, security_email_notifications: true, created_at: '2026-10-01T00:00:00Z', updated_at: '', ...patch,
});

async function unzip(body: Buffer) {
  const zip = await JSZip.loadAsync(body);
  return { zip, names: Object.keys(zip.files).filter((name) => !zip.files[name]!.dir).sort() };
}

function binary(res: request.Response, callback: (err: Error | null, body: Buffer) => void) {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
}

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(users.findUserById).mockResolvedValue(userRow() as never);
  vi.mocked(sessions.listLoginHistory).mockResolvedValue([]);
  vi.mocked(payments.listPaymentsByUser).mockResolvedValue([]);
  vi.mocked(projects.findProjectsByOwner).mockResolvedValue([{
    id: PROJECT, name: '고양이/세트:1', status: 'completed', result_ready: true, target_languages: ['en'],
    created_at: '2026-10-02T00:00:00Z', updated_at: '2026-10-03T00:00:00Z', owner_id: OWNER,
  }] as never);
  vi.mocked(projects.findProjectById).mockResolvedValue({ id: PROJECT, status: 'completed', target_languages: ['en'] } as never);
  vi.mocked(assets.findAssetsByProjectId).mockResolvedValue([{
    id: ASSET, project_id: PROJECT, original_name: '안녕.png', mime_type: 'image/png', width: 740, height: 640, status: 'completed',
    original_path: `projects/${PROJECT}/original/${ASSET}.png`, cleaned_path: `projects/${PROJECT}/cleaned/${ASSET}.png`,
    cleanup_method: null, cleanup_quality: null, needs_manual_cleanup: false, text_color: null, error_code: null, error_message: null,
  }] as never);
  vi.mocked(ocr.findRegionsByAssetIds).mockResolvedValue([{
    id: REGION, asset_id: ASSET, detected_text: '안녕', confidence: 0.95, bbox: { x: 1, y: 2, width: 3, height: 4 }, normalized_bbox: null,
    contains_korean: true, is_primary: true, source: 'paddle-consensus', agreement_score: 1, needs_manual_review: false, font_style: null,
  }] as never);
  vi.mocked(translations.findTranslationsByOcrRegionIds).mockResolvedValue([{
    ocr_region_id: REGION, language_code: 'en', final_candidates: [{ text: 'Hi', tone: 'cute', meaning: '인사', best: true }], recommended_style: null,
  }] as never);
  vi.mocked(editorStates.findEditorStatesByAssetIds).mockResolvedValue([{ asset_id: ASSET, ocr_region_id: REGION, language_code: 'en', style: { size: 30 } }]);
  vi.mocked(storage.createSignedUrl).mockResolvedValue('https://signed.example/x');
  vi.mocked(storage.downloadFromStorage).mockImplementation(async (path: string) => Buffer.from(`bytes:${path}`));
  vi.mocked(generation.listGenerationExports).mockResolvedValue([{
    id: 'dddddddd-0000-4000-8000-000000000001', name: '토끼', prompt: '분홍 토끼', status: 'completed', createdAt: '2026-10-04T00:00:00Z',
    plan: [], images: [{ slot: 0, caption: '안녕', prompt: '토끼', path: 'generation/a/0.png' }],
  }]);
});

describe('GET /api/v1/auth/me/export.zip', () => {
  it('프로필·프로젝트 원본·글자 지운 이미지·번역·생성 이미지를 ZIP 하나로 내려준다', async () => {
    const res = await request(app).get('/api/v1/auth/me/export.zip').set('Authorization', bearer).buffer(true).parse(binary);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/zip');
    const { zip, names } = await unzip(res.body as Buffer);
    const folder = 'localization/고양이_세트_1_aaaaaaaa';
    expect(names).toEqual([
      'README.txt',
      `${folder}/originals/01_안녕.png`,
      `${folder}/project.json`,
      `${folder}/text-removed/01_안녕.png`,
      'generation/토끼_dddddddd/images/slot-00.png',
      'generation/토끼_dddddddd/project.json',
      'my-data.json',
      'profile/avatar.webp',
    ].sort());
    expect(await zip.file(`${folder}/originals/01_안녕.png`)!.async('string')).toBe(`bytes:projects/${PROJECT}/original/${ASSET}.png`);
    const project = JSON.parse(await zip.file(`${folder}/project.json`)!.async('string'));
    expect(project.images[0]).toMatchObject({ file: '01_안녕.png', ocrText: '안녕' });
    expect(project.images[0].regions[0].translations.en.candidates[0].text).toBe('Hi');
    expect(project.images[0].regions[0].editorStyles.en).toEqual({ size: 30 });
    expect(JSON.stringify(project)).not.toContain('signed.example'); // 만료되는 서명 URL은 넣지 않는다
    expect(storage.createSignedUrl).not.toHaveBeenCalled(); // 파일을 직접 담으므로 쓰지 않을 서명 URL을 만들지 않는다
    expect(await zip.file('profile/avatar.webp')!.async('string')).toBe('avatar-bytes');
    const myData = JSON.parse(await zip.file('my-data.json')!.async('string'));
    expect(myData.profile.email).toBe('me@example.com');
  });

  it('저장소에서 못 받은 파일은 빼고 계속 만들며, README에 빠진 파일을 적는다', async () => {
    vi.mocked(storage.downloadFromStorage).mockImplementation(async (path: string) => (path.includes('/cleaned/') ? null : Buffer.from('ok')));
    const res = await request(app).get('/api/v1/auth/me/export.zip').set('Authorization', bearer).buffer(true).parse(binary);
    const { zip, names } = await unzip(res.body as Buffer);
    expect(names.some((name) => name.includes('text-removed/'))).toBe(false);
    expect(names.some((name) => name.includes('originals/'))).toBe(true);
    expect(await zip.file('README.txt')!.async('string')).toContain('text-removed/01_안녕.png');
  });

  it('이메일 링크 토큰(?token=)으로도 받을 수 있다', async () => {
    const res = await request(app).get(`/api/v1/auth/me/export.zip?token=${signExportToken({ sub: OWNER, ver: 0 })}`).buffer(true).parse(binary);
    expect(res.status).toBe(200);
  });

  it.each([
    ['로그인 토큰을 링크 토큰 자리에', () => signAuthToken({ sub: OWNER, ver: 0 })],
    ['만료된 링크', () => signExportToken({ sub: OWNER, ver: 0 }, -1)],
    ['비밀번호 변경 등으로 세션 버전이 바뀐 뒤의 링크', () => signExportToken({ sub: OWNER, ver: 0 }, undefined)],
  ])('%s은 401이다', async (label, token) => {
    if (label.includes('세션 버전')) vi.mocked(users.findUserById).mockResolvedValue(userRow({ session_version: 1 }) as never);
    const res = await request(app).get(`/api/v1/auth/me/export.zip?token=${token()}`);
    expect(res.status).toBe(401);
  });

  it('탈퇴(삭제)된 계정의 링크는 401이다', async () => {
    vi.mocked(users.findUserById).mockResolvedValue(null);
    expect((await request(app).get(`/api/v1/auth/me/export.zip?token=${signExportToken({ sub: OWNER, ver: 0 })}`)).status).toBe(401);
  });

  it('링크 토큰은 다른 API의 로그인 토큰으로 쓸 수 없다', async () => {
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${signExportToken({ sub: OWNER, ver: 0 })}`);
    expect(res.status).toBe(401);
  });

  it('인증 없이는 401이다', async () => {
    expect((await request(app).get('/api/v1/auth/me/export.zip')).status).toBe(401);
  });
});

describe('POST /api/v1/auth/me/export/email', () => {
  it('계정 이메일로 24시간짜리 다운로드 링크를 보내고, 가린 주소를 돌려준다', async () => {
    vi.mocked(email.sendEmail).mockResolvedValue(true);
    const res = await request(app).post('/api/v1/auth/me/export/email').set('Authorization', bearer);
    expect(res.status).toBe(202);
    expect(res.body).toEqual({ sentTo: 'm*@example.com' });
    const message = vi.mocked(email.sendEmail).mock.calls[0]![0];
    expect(message.to).toBe('me@example.com');
    const link = /https?:\/\/[^"\s]+\/api\/v1\/auth\/me\/export\.zip\?token=([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/.exec(message.html)?.[1];
    expect(link).toBeTruthy();
    expect(message.text).toContain(link!);
    // 메일 속 링크로 실제로 받을 수 있다.
    expect((await request(app).get(`/api/v1/auth/me/export.zip?token=${link}`).buffer(true).parse(binary)).status).toBe(200);
  });

  it('이메일이 없는 계정은 400이다', async () => {
    vi.mocked(users.findUserById).mockResolvedValue(userRow({ email: null }) as never);
    const res = await request(app).post('/api/v1/auth/me/export/email').set('Authorization', bearer);
    expect(res.status).toBe(400);
    expect(email.sendEmail).not.toHaveBeenCalled();
  });

  it('메일 발송 설정이 없으면 503이다', async () => {
    vi.mocked(email.sendEmail).mockResolvedValue(false);
    const res = await request(app).post('/api/v1/auth/me/export/email').set('Authorization', bearer);
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('EMAIL_NOT_CONFIGURED');
  });
});
