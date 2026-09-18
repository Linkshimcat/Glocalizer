import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssetRow } from '../../src/types/asset.js';
import type { ProjectRow } from '../../src/types/project.js';
const signedUpload = vi.hoisted(() => vi.fn());
vi.mock('../../src/config/supabase.js', () => ({ supabase: { storage: { from: () => ({ createSignedUploadUrl: signedUpload }) } } }));
vi.mock('../../src/repositories/asset.repository.js', () => ({ findAssetsByProjectId: vi.fn(), insertAssets: vi.fn(), deleteDraftAssets: vi.fn() }));
vi.mock('../../src/repositories/project.repository.js', () => ({ findProjectsByOwner: vi.fn(), updateDraftProject: vi.fn() }));
vi.mock('../../src/repositories/storage.repository.js', () => ({ createSignedUrl: vi.fn(), removeFromStorage: vi.fn() }));
vi.mock('../../src/services/project.service.js', () => ({ createProject: vi.fn() }));
vi.mock('../../src/services/result.service.js', () => ({ getProjectResults: vi.fn() }));
vi.mock('../../src/services/processing.service.js', () => ({ getProjectStatus: vi.fn() }));
const service = await import('../../src/services/workspace.service.js');
const assets = await import('../../src/repositories/asset.repository.js');
const projects = await import('../../src/repositories/project.repository.js');
const storage = await import('../../src/repositories/storage.repository.js');
const result = await import('../../src/services/result.service.js');
const processing = await import('../../src/services/processing.service.js');
const projectService = await import('../../src/services/project.service.js');
const project = { id: 'project-1', owner_id: 'owner', status: 'created', target_languages: ['en'], selected_client_ids: ['f1'], result_ready: false, created_at: '2026-09-19', updated_at: '2026-09-19', expires_at: null } as ProjectRow;
const asset = (id: string, status = 'uploaded') => ({ id, project_id: project.id, client_id: id === 'asset-1' ? 'f1' : 'f2', original_name: `${id}.png`, mime_type: 'image/png', byte_size: 100, original_path: `projects/${project.id}/${id}.png`, status }) as AssetRow;
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(assets.findAssetsByProjectId).mockResolvedValue([asset('asset-1'), asset('asset-2', 'pending_upload')]);
  vi.mocked(projects.findProjectsByOwner).mockResolvedValue([project]);
  vi.mocked(storage.createSignedUrl).mockResolvedValue('https://private.example/fresh-signed-url');
  signedUpload.mockResolvedValue({ data: { signedUrl: 'https://private.example/upload' }, error: null });
});
describe('workspace service', () => {
  it('delegates draft creation with account owner and selection', async () => {
    const input = { targetLanguages: [], files: [{ clientId: 'f1', name: 'a.png', mimeType: 'image/png', size: 100 }], selectedClientIds: ['f1'], options: {} } as never;
    await service.createDraft(input, 'owner');
    expect(projectService.createProject).toHaveBeenCalledWith(input, 'owner', ['f1']);
  });
  it('returns original-image signed URLs and only selected counts for processed projects', async () => {
    vi.mocked(projects.findProjectsByOwner).mockResolvedValue([{ ...project, status: 'completed', result_ready: true }]);
    const list = await service.listWorkspaces('owner');
    expect(projects.findProjectsByOwner).toHaveBeenCalledWith('owner');
    expect(list[0]).toMatchObject({ imageCount: 1, resultReady: true, thumbnailUrl: 'https://private.example/fresh-signed-url' });
  });
  it('keeps uploaded images and reissues URLs for pending uploads', async () => {
    const input = { targetLanguages: ['en'], files: [{ clientId: 'f1', name: 'asset-1.png', mimeType: 'image/png', size: 100 }, { clientId: 'f2', name: 'asset-2.png', mimeType: 'image/png', size: 100 }], selectedClientIds: ['f1'], options: {} } as never;
    const saved = await service.updateDraft(project, input);
    expect(projects.updateDraftProject).toHaveBeenCalledWith(project.id, ['en'], ['f1']);
    expect(saved.assets[0].uploadUrl).toBeNull();
    expect(saved.assets[1].uploadUrl).toBe('https://private.example/upload');
    expect(signedUpload).toHaveBeenCalledWith('projects/project-1/asset-2.png', { upsert: true });
    expect(assets.insertAssets).not.toHaveBeenCalled();
  });
  it('removes only images removed from this draft', async () => {
    vi.mocked(assets.findAssetsByProjectId).mockResolvedValueOnce([asset('asset-1'), asset('asset-2')]).mockResolvedValueOnce([asset('asset-1')]);
    await service.updateDraft(project, { targetLanguages: [], files: [{ clientId: 'f1', name: 'asset-1.png', mimeType: 'image/png', size: 100 }], selectedClientIds: ['f1'], options: {} } as never);
    expect(assets.deleteDraftAssets).toHaveBeenCalledWith(project.id, ['asset-2']);
    expect(storage.removeFromStorage).toHaveBeenCalledWith(['projects/project-1/asset-2.png']);
  });
  it('rejects modifying a processing project', async () => {
    await expect(service.updateDraft({ ...project, status: 'processing' }, {} as never)).rejects.toMatchObject({ code: 'INVALID_REQUEST' });
    expect(projects.updateDraftProject).not.toHaveBeenCalled();
  });
  it('restores original IDs, selection, archive flag and saved editor states', async () => {
    const savedResults = { projectId: project.id, status: 'completed', targetLanguages: ['en'], assets: [{ id: 'asset-1', regionEditorStates: { region: { en: { customText: 'saved caption' } } } }] } as never;
    vi.mocked(result.getProjectResults).mockResolvedValue(savedResults);
    vi.mocked(processing.getProjectStatus).mockResolvedValue({ projectId: project.id, status: 'completed' } as never);
    const restored = await service.restoreWorkspace({ ...project, status: 'completed', result_ready: true });
    expect(restored).toMatchObject({ projectToken: 'account', resultReady: true, selectedClientIds: ['f1'], files: [{ id: 'f1', assetId: 'asset-1', size: 100 }, { id: 'f2', assetId: 'asset-2' }], results: savedResults });
  });
});
