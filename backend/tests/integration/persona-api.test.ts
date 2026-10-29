import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/repositories/project.repository.js', () => ({
  insertProject: vi.fn(), findProjectById: vi.fn(), updateProjectStage: vi.fn(), deleteProjectRow: vi.fn(), findExpiredProjects: vi.fn(),
  updateProjectPersona: vi.fn(),
}));

const { createApp } = await import('../../src/app.js');
const projectRepo = await import('../../src/repositories/project.repository.js');
const { hashProjectToken } = await import('../../src/utils/hash.js');

const app = createApp();
const PROJECT_ID = 'd4e5f6a7-b8c9-4d0e-8f1a-2b3c4d5e6f7a';
const TOKEN = 'persona-test-token';
const url = `/api/v1/projects/${PROJECT_ID}/persona`;

const project = (status = 'created') => ({
  id: PROJECT_ID, access_token_hash: hashProjectToken(TOKEN), status, stage: null, progress: 0, target_languages: ['en'],
  localization_options: {}, error_code: null, error_message: null, created_at: '', updated_at: '',
  expires_at: new Date(Date.now() + 86_400_000).toISOString(), persona: null,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(projectRepo.findProjectById).mockResolvedValue(project() as never);
  vi.mocked(projectRepo.updateProjectPersona).mockResolvedValue(undefined);
});

describe('PUT /api/v1/projects/:projectId/persona', () => {
  it('공백을 다듬어 저장하고 저장된 값을 돌려준다', async () => {
    const res = await request(app).put(url).set('X-Project-Token', TOKEN)
      .send({ persona: { personality: '  수줍은 고양이 ', speechStyle: '반말', age: '', avoidExpressions: [' 욕설 '] } });
    expect(res.status).toBe(200);
    const saved = { personality: '수줍은 고양이', speechStyle: '반말', avoidExpressions: ['욕설'] };
    expect(res.body).toEqual({ persona: saved });
    expect(projectRepo.updateProjectPersona).toHaveBeenCalledWith(PROJECT_ID, saved);
  });

  it('모든 칸이 비었거나 null이면 페르소나를 지운다(null 저장)', async () => {
    for (const persona of [null, { personality: ' ', speechStyle: '', avoidExpressions: [] }]) {
      const res = await request(app).put(url).set('X-Project-Token', TOKEN).send({ persona });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ persona: null });
    }
    expect(vi.mocked(projectRepo.updateProjectPersona).mock.calls).toEqual([[PROJECT_ID, null], [PROJECT_ID, null]]);
  });

  it.each([
    ['너무 긴 성격', { personality: 'a'.repeat(81) }],
    ['금지 표현 11개', { avoidExpressions: Array.from({ length: 11 }, (_, i) => `x${i}`) }],
    ['모르는 필드', { nickname: '냥이' }],
  ])('%s은 400이다', async (_label, persona) => {
    const res = await request(app).put(url).set('X-Project-Token', TOKEN).send({ persona });
    expect(res.status).toBe(400);
    expect(projectRepo.updateProjectPersona).not.toHaveBeenCalled();
  });

  it('처리 중에는 바꿀 수 없다 (세트 중간에 말투가 바뀌지 않게)', async () => {
    vi.mocked(projectRepo.findProjectById).mockResolvedValue(project('processing') as never);
    const res = await request(app).put(url).set('X-Project-Token', TOKEN).send({ persona: { speechStyle: '반말' } });
    expect(res.status).toBe(409);
    expect(projectRepo.updateProjectPersona).not.toHaveBeenCalled();
  });

  it('토큰이 없으면 401이다', async () => {
    expect((await request(app).put(url).send({ persona: null })).status).toBe(401);
  });
});
