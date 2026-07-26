import { stat, readFile } from 'node:fs/promises';
import { extname, basename, resolve } from 'node:path';

const API_BASE_URL = (process.env.SMOKE_API_BASE_URL ?? 'http://localhost:3000/api/v1').replace(/\/$/, '');
const IMAGE_PATH = process.env.SMOKE_IMAGE_PATH;
const TARGET_LANGUAGES_INPUT = process.env.SMOKE_TARGET_LANGUAGES ?? process.env.SMOKE_TARGET_LANGUAGE ?? 'en';
const POLL_INTERVAL_MS = 2_500;
const MAX_POLL_ATTEMPTS = 72;
const SUPPORTED_TARGET_LANGUAGES = ['en', 'ja', 'zh'] as const;
type SmokeTargetLanguage = (typeof SUPPORTED_TARGET_LANGUAGES)[number];

interface CreatedProject {
  projectId: string;
  projectToken: string;
  assets: Array<{ assetId: string; uploadUrl: string }>;
}

interface ProjectStatus {
  status: 'created' | 'processing' | 'completed' | 'failed';
}

interface ProjectResults {
  assets: Array<{
    status: string;
    ocr: { fullText: string | null };
    localizations: Record<string, { candidates: unknown[] }>;
    cleanup: { method: string | null; needsManualCleanup: boolean };
  }>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function mimeTypeForPath(path: string): 'image/png' | 'image/jpeg' {
  const extension = extname(path).toLowerCase();
  if (extension === '.png') return 'image/png';
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg';
  throw new Error('SMOKE_IMAGE_PATH must point to a PNG, JPG, or JPEG file.');
}

function parseTargetLanguages(value: string): SmokeTargetLanguage[] {
  const languages = [...new Set(value.split(',').map((language) => language.trim()).filter(Boolean))];
  if (languages.length === 0 || languages.some((language) => !SUPPORTED_TARGET_LANGUAGES.includes(language as SmokeTargetLanguage))) {
    throw new Error('SMOKE_TARGET_LANGUAGES must be a comma-separated list of en, ja, and/or zh.');
  }
  return languages as SmokeTargetLanguage[];
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { 'X-Project-Token': token } : {}),
      ...init.headers,
    },
  });
  const body = response.status === 204 ? undefined : await response.json().catch(() => undefined);
  if (!response.ok) {
    const details = body && typeof body === 'object' && 'error' in body ? body.error : undefined;
    const code = details && typeof details === 'object' && 'code' in details ? details.code : response.status;
    throw new Error(`Smoke request failed: ${String(code)}`);
  }
  return body as T;
}

async function main(): Promise<void> {
  if (!IMAGE_PATH) throw new Error('SMOKE_IMAGE_PATH is required.');
  const targetLanguages = parseTargetLanguages(TARGET_LANGUAGES_INPUT);

  const imagePath = resolve(IMAGE_PATH);
  const [metadata, image] = await Promise.all([stat(imagePath), readFile(imagePath)]);
  const mimeType = mimeTypeForPath(imagePath);
  let project: CreatedProject | null = null;

  try {
    project = await request<CreatedProject>('/projects', {
      method: 'POST',
      body: JSON.stringify({
        targetLanguages,
        options: { tone: 'funny', audience: 'teen', translationStyle: 'trendy', highQualityReview: false },
        files: [{ clientId: 'smoke', name: basename(imagePath), mimeType, size: metadata.size }],
      }),
    });
    const asset = project.assets[0];
    if (!asset) throw new Error('Smoke project did not return an upload asset.');

    const upload = await fetch(asset.uploadUrl, { method: 'PUT', headers: { 'Content-Type': mimeType }, body: image });
    if (!upload.ok) throw new Error(`Smoke upload failed: ${upload.status}`);
    await request(`/projects/${project.projectId}/uploads/complete`, { method: 'POST', body: JSON.stringify({ assetIds: [asset.assetId] }) }, project.projectToken);
    await request(`/projects/${project.projectId}/process`, { method: 'POST' }, project.projectToken);

    let status: ProjectStatus | null = null;
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      await sleep(POLL_INTERVAL_MS);
      status = await request<ProjectStatus>(`/projects/${project.projectId}/status`, {}, project.projectToken);
      if (status.status === 'completed' || status.status === 'failed') break;
    }
    if (!status || status.status !== 'completed') throw new Error(`Smoke processing did not complete: ${status?.status ?? 'timeout'}`);

    const results = await request<ProjectResults>(`/projects/${project.projectId}/results`, {}, project.projectToken);
    const result = results.assets[0];
    const candidateCounts = Object.fromEntries(targetLanguages.map((languageCode) => [
      languageCode,
      result?.localizations[languageCode]?.candidates.length ?? 0,
    ]));
    const missingCandidates = targetLanguages.filter((languageCode) => candidateCounts[languageCode] < 1);
    if (!result?.ocr.fullText || missingCandidates.length > 0) {
      throw new Error(`Smoke result is missing OCR text or translated candidates: ${missingCandidates.join(', ')}`);
    }

    console.log(JSON.stringify({
      status: 'passed',
      ocrText: result.ocr.fullText,
      candidateCounts,
      cleanupMethod: result.cleanup.method,
      needsManualCleanup: result.cleanup.needsManualCleanup,
    }));
  } finally {
    if (project) await request(`/projects/${project.projectId}`, { method: 'DELETE' }, project.projectToken).catch(() => undefined);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Smoke test failed.');
  process.exitCode = 1;
});
