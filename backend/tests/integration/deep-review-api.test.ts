import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/services/deep-review.service.js', () => ({ createDeepReview: vi.fn() }));

const { createApp } = await import('../../src/app.js');
const service = await import('../../src/services/deep-review.service.js');
const { signAuthToken } = await import('../../src/utils/jwt.js');
const app = createApp();
const owner = '00000000-0000-4000-8000-000000000001';
const auth = `Bearer ${signAuthToken({ sub: owner })}`;
const project = { kind: 'localization', id: '550e8400-e29b-41d4-a716-446655440000' };
const feedback = {
  readinessScore: 82,
  summary: '출시 전 가독성을 조금 더 다듬어 보세요.',
  strengths: ['표정과 문구가 잘 어울립니다.'],
  priorityFixes: [{ title: '글자 크기', reason: '작은 화면에서 흐립니다.', action: '글자를 키워주세요.' }],
  imageFeedback: [],
  localizationFeedback: [],
  disclaimer: 'AI 참고 의견이며 OGQ 승인을 보장하지 않습니다.',
};

describe('POST /api/v1/review/deep-feedback', () => {
  it('로그인하지 않은 요청을 거부한다', async () => {
    const response = await request(app).post('/api/v1/review/deep-feedback').send({ projects: [project], locale: 'ko' });
    expect(response.status).toBe(401);
  });

  it('로그인 사용자의 선택 프로젝트와 언어를 서비스에 전달한다', async () => {
    vi.mocked(service.createDeepReview).mockResolvedValue(feedback);

    const response = await request(app)
      .post('/api/v1/review/deep-feedback')
      .set('Authorization', auth)
      .send({ projects: [project], locale: 'ko' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(feedback);
    expect(service.createDeepReview).toHaveBeenCalledWith({ projects: [project], locale: 'ko' }, owner);
  });

  it('프로젝트 4개 요청을 검증 단계에서 거부한다', async () => {
    const response = await request(app)
      .post('/api/v1/review/deep-feedback')
      .set('Authorization', auth)
      .send({ projects: [project, project, project, project], locale: 'ko' });

    expect(response.status).toBe(400);
  });
});
