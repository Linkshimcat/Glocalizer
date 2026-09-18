import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/repositories/project.repository.js', () => ({
  findProjectById: vi.fn(), markProjectResultReady: vi.fn(), insertProject: vi.fn(), deleteProjectRow: vi.fn(), updateProjectStage: vi.fn(), findExpiredProjects: vi.fn(), findProjectsByOwner: vi.fn(), updateDraftProject: vi.fn(),
}));
vi.mock('../../src/repositories/user.repository.js', () => ({ findUserById: vi.fn() }));
vi.mock('../../src/services/workspace.service.js', () => ({ createDraft: vi.fn(), updateDraft: vi.fn(), listWorkspaces: vi.fn(), restoreWorkspace: vi.fn() }));
const { createApp } = await import('../../src/app.js');
const repo = await import('../../src/repositories/project.repository.js');
const users = await import('../../src/repositories/user.repository.js');
const workspace = await import('../../src/services/workspace.service.js');
const { signAuthToken } = await import('../../src/utils/jwt.js');
const { hashProjectToken } = await import('../../src/utils/hash.js');
const app = createApp();
const id = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
const owner = '00000000-0000-4000-8000-000000000001';
const auth = `Bearer ${signAuthToken({ sub: owner })}`;
const fakeProject = () => ({ id, owner_id: owner, access_token_hash: hashProjectToken('legacy-token'), status: 'completed' as const, target_languages: ['en' as const], selected_client_ids: ['f1'], localization_options: { tone: 'funny' as const, audience: 'teen' as const, translationStyle: 'trendy' as const, highQualityReview: false }, result_ready: false, expires_at: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), stage: 'completed', progress: 100, error_code: null, error_message: null });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(repo.findProjectById).mockResolvedValue(fakeProject());
  vi.mocked(users.findUserById).mockResolvedValue({ id: owner } as never);
  vi.mocked(workspace.listWorkspaces).mockResolvedValue([]);
  vi.mocked(workspace.restoreWorkspace).mockResolvedValue({ projectId: id, projectToken: 'account', resultReady: false, selectedClientIds: ['f1'], files: [], results: { projectId: id, status: 'completed', targetLanguages: ['en'], assets: [] }, status: { projectId: id, status: 'completed', stage: 'completed', progress: 100, message: '', assets: [] } });
});

describe('account cloud workspaces', () => {
  it('requires login to list workspaces', async () => {
    expect((await request(app).get('/api/v1/projects')).status).toBe(401);
    expect(workspace.listWorkspaces).not.toHaveBeenCalled();
  });
  it('lists only the authenticated owner', async () => {
    expect((await request(app).get('/api/v1/projects').set('Authorization', auth)).status).toBe(200);
    expect(workspace.listWorkspaces).toHaveBeenCalledWith(owner);
  });
  it('restores owned projects without an expiring project token', async () => {
    const res = await request(app).get(`/api/v1/projects/${id}/workspace`).set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body.selectedClientIds).toEqual(['f1']);
    expect(workspace.restoreWorkspace).toHaveBeenCalledWith(expect.objectContaining({ owner_id: owner, expires_at: null }));
  });
  it('denies other accounts even with the old project token', async () => {
    const res = await request(app).get(`/api/v1/projects/${id}/workspace`).set('Authorization', `Bearer ${signAuthToken({ sub: 'other-account' })}`).set('X-Project-Token', 'legacy-token');
    expect(res.status).toBe(404);
    expect(workspace.restoreWorkspace).not.toHaveBeenCalled();
  });
  it('does not authorize owned results with project tokens alone', async () => {
    const res = await request(app).get(`/api/v1/projects/${id}/results`).set('X-Project-Token', 'legacy-token');
    expect(res.status).toBe(401);
  });
  it('rejects deleted owners with a still-signed JWT', async () => {
    vi.mocked(users.findUserById).mockResolvedValue(null);
    expect((await request(app).get(`/api/v1/projects/${id}/workspace`).set('Authorization', auth)).status).toBe(401);
  });
  it('archives a terminal project', async () => {
    expect((await request(app).post(`/api/v1/projects/${id}/finish`).set('Authorization', auth)).status).toBe(204);
    expect(repo.markProjectResultReady).toHaveBeenCalledWith(id);
  });
  it('cannot archive processing projects', async () => {
    vi.mocked(repo.findProjectById).mockResolvedValue({ ...fakeProject(), status: 'processing' });
    expect((await request(app).post(`/api/v1/projects/${id}/finish`).set('Authorization', auth)).status).toBe(400);
    expect(repo.markProjectResultReady).not.toHaveBeenCalled();
  });
  it('rejects manifest selections not belonging to the draft', async () => {
    vi.mocked(repo.findProjectById).mockResolvedValue({ ...fakeProject(), status: 'created' });
    const res = await request(app).put(`/api/v1/projects/${id}/draft`).set('Authorization', auth).send({ targetLanguages: [], files: [{ clientId: 'f1', name: 'a.png', mimeType: 'image/png', size: 100 }], selectedClientIds: ['another-project-file'] });
    expect(res.status).toBe(400);
    expect(workspace.updateDraft).not.toHaveBeenCalled();
  });
  it('allows upload drafts before languages are chosen', async () => {
    vi.mocked(workspace.createDraft).mockResolvedValue({ projectId: id, projectToken: 'account', expiresAt: null, assets: [] });
    const res = await request(app).post('/api/v1/projects/drafts').set('Authorization', auth).send({ targetLanguages: [], files: [{ clientId: 'f1', name: 'a.png', mimeType: 'image/png', size: 100 }], selectedClientIds: ['f1'] });
    expect(res.status).toBe(201);
    expect(workspace.createDraft).toHaveBeenCalledWith(expect.objectContaining({ targetLanguages: [] }), owner);
  });
});
