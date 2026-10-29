import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/repositories/project.repository.js', () => ({
  insertProject: vi.fn(),
  findProjectById: vi.fn(),
  updateProjectStage: vi.fn(),
  deleteProjectRow: vi.fn(),
  findExpiredProjects: vi.fn(),
}));

const { createApp } = await import('../../src/app.js');
const projectRepo = await import('../../src/repositories/project.repository.js');
const { hashProjectToken } = await import('../../src/utils/hash.js');

const app = createApp();

const PROJECT_ID = 'b1c2d3e4-f5a6-4b7c-8d9e-0f1a2b3c4d5e';
const TOKEN = 'finals-scaffold-test-token';

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(projectRepo.findProjectById).mockResolvedValue({
    id: PROJECT_ID,
    access_token_hash: hashProjectToken(TOKEN),
    status: 'completed',
    stage: 'completed',
    progress: 100,
    target_languages: ['en'],
    localization_options: {},
    error_code: null,
    error_message: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  } as never);
});

// PR-0 스캐폴드에서 열어 둔 경로는 모두 구현됐다(qa-api, events-proof-api 테스트). 여기서는 QA 경로의 인증·형식 검증만 남긴다.
describe('본선 스캐폴드 라우트', () => {
  it('QA 라우트는 토큰이 없으면 401로 막는다 (스텁도 프로젝트 인증을 건너뛰지 않는다)', async () => {
    const res = await request(app).get(`/api/v1/projects/${PROJECT_ID}/qa`);
    expect(res.status).toBe(401);
  });

  it('QA 라우트는 UUID가 아닌 projectId를 400으로 거절한다', async () => {
    const res = await request(app).get('/api/v1/projects/not-a-uuid/qa').set('X-Project-Token', TOKEN);
    expect(res.status).toBe(400);
  });
});
