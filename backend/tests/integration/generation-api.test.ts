import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
vi.mock('../../src/repositories/user.repository.js', () => ({ findUserById: vi.fn() }));
vi.mock('../../src/services/generation.service.js', () => ({ ownedGeneration: vi.fn(), generationWorkspace: vi.fn(), enqueueGeneration: vi.fn(), captionSticker: vi.fn(), suggestStickerCaptions: vi.fn(), saveGeneratedCaption: vi.fn(), saveSampleCaptions: vi.fn() }));
const { createApp } = await import('../../src/app.js');
const { signAuthToken } = await import('../../src/utils/jwt.js');
const users = await import('../../src/repositories/user.repository.js');
const service = await import('../../src/services/generation.service.js');
const app = createApp();
const owner = '00000000-0000-4000-8000-000000000001';
const id = '00000000-0000-4000-8000-000000000002';
const auth = `Bearer ${signAuthToken({ sub: owner })}`;
beforeEach(() => { vi.clearAllMocks(); vi.mocked(users.findUserById).mockResolvedValue({ id: owner, email: 'yunjae14278@naver.com' } as never); vi.mocked(service.suggestStickerCaptions).mockResolvedValue(['안녕!']); });
describe('private generation API', () => {
  it('requires JWT authentication', async () => { expect((await request(app).get('/api/v1/generation/config')).status).toBe(401); });
  it('allows any existing logged-in account', async () => {
    vi.mocked(users.findUserById).mockResolvedValue({ id: owner, email: 'other@example.com' } as never);
    vi.mocked(service.ownedGeneration).mockResolvedValue({ id } as never);
    vi.mocked(service.generationWorkspace).mockResolvedValue({ id } as never);
    expect((await request(app).get(`/api/v1/generation/projects/${id}`).set('Authorization', auth)).status).toBe(200);
    expect(service.ownedGeneration).toHaveBeenCalledWith(id, owner);
  });
  it('rejects deleted accounts with still-valid tokens', async () => {
    vi.mocked(users.findUserById).mockResolvedValue(null);
    expect((await request(app).get('/api/v1/generation/config').set('Authorization', auth)).status).toBe(401);
  });
  it('returns configuration for a logged-in account', async () => { expect((await request(app).get('/api/v1/generation/config').set('Authorization', auth)).body.model).toBe('gpt-image-2.5-sunburst'); });
  it('validates requests before any paid call', async () => {
    expect((await request(app).post(`/api/v1/generation/projects/${id}/images`).set('Authorization', auth).send({ slot: 24, prompt: 'invalid' })).status).toBe(400);
    expect(service.enqueueGeneration).not.toHaveBeenCalled();
  });
  it('checks ownership and queues a validated slot', async () => {
    vi.mocked(service.enqueueGeneration).mockResolvedValue(id);
    expect((await request(app).post(`/api/v1/generation/projects/${id}/images`).set('Authorization', auth).send({ slot: 1, prompt: 'smile' })).status).toBe(202);
    expect(service.ownedGeneration).toHaveBeenCalledWith(id, owner);
    expect(service.enqueueGeneration).toHaveBeenCalledWith(owner, id, 1, 'smile');
    expect(service.saveGeneratedCaption).toHaveBeenCalledWith(id, '안녕!');
  });
});
