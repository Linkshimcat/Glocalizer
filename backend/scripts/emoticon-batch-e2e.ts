import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, extname, resolve } from 'node:path';

const API_BASE_URL = (process.env.SMOKE_API_BASE_URL ?? 'http://localhost:3000/api/v1').replace(/\/$/, '');
const SOURCE_DIR = resolve(process.env.EMOTICON_SOURCE_DIR ?? '../docs/이모티콘모음/이모티콘모음');
const OUTPUT_DIR = resolve(process.env.EMOTICON_OUTPUT_DIR ?? `../output/emoticon-e2e-${Date.now()}`);
const TARGET_LANGUAGES = ['en', 'ja', 'zh'] as const;
// 큰 묶음은 번역 단계가 하나의 60% 상태로 오래 표시되어 실제 진행 여부를 알기 어렵다.
// 기본은 운영 API 최대치(20)를 유지하되 실이미지 검증에서는 작은 묶음으로 조절할 수 있다.
const BATCH_SIZE = Math.max(1, Math.min(20, Number(process.env.EMOTICON_BATCH_SIZE ?? 20)));
const POLL_INTERVAL_MS = 2_500;
// Groq 무료/개발 티어는 토큰 제한 해제에 수 분이 걸릴 수 있다. provider가 cooldown을
// 지키는 동안 정상 job을 timeout으로 오판하지 않도록 기본 30분, 환경변수로 조정 가능.
const MAX_POLL_ATTEMPTS = Number(process.env.EMOTICON_MAX_POLL_ATTEMPTS ?? 720);

interface CreatedProject {
  projectId: string;
  projectToken: string;
  assets: Array<{ assetId: string; clientId: string; uploadUrl: string }>;
}

interface ProjectStatus {
  status: 'created' | 'processing' | 'completed' | 'failed';
  stage?: string;
  progress?: number;
}

interface Candidate { text: string }
interface Localization { status: string; candidates: Candidate[] }
interface RegionResult {
  id: string;
  text: string;
  textColor: { r: number; g: number; b: number } | null;
  needsManualCleanup: boolean;
  localizations: Record<string, Localization>;
}
interface AssetResult {
  id: string;
  name: string;
  status: string;
  cleanedUrl: string | null;
  ocr: { regions: RegionResult[] };
  cleanup: { method: string | null; quality: string | null; needsManualCleanup: boolean };
  errorCode?: string;
  errorMessage?: string;
}
interface ProjectResults { assets: AssetResult[] }

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function mimeTypeForPath(path: string): 'image/png' | 'image/jpeg' {
  return extname(path).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
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
  if (!response.ok) throw new Error(`API ${init.method ?? 'GET'} ${path} failed: ${response.status} ${JSON.stringify(body)}`);
  return body as T;
}

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

async function uploadBatch(paths: string[], batchIndex: number): Promise<{ project: CreatedProject; results: ProjectResults }> {
  const files = await Promise.all(paths.map(async (path, index) => ({
    clientId: String(index),
    name: basename(path),
    mimeType: mimeTypeForPath(path),
    size: (await readFile(path)).byteLength,
  })));
  const project = await request<CreatedProject>('/projects', {
    method: 'POST',
    body: JSON.stringify({
      targetLanguages: TARGET_LANGUAGES,
      options: { tone: 'funny', audience: 'teen', translationStyle: 'trendy', highQualityReview: false },
      files,
    }),
  });

  try {
    await Promise.all(project.assets.map(async (asset) => {
      const sourcePath = paths[Number(asset.clientId)];
      const image = await readFile(sourcePath);
      const upload = await fetch(asset.uploadUrl, { method: 'PUT', headers: { 'Content-Type': mimeTypeForPath(sourcePath) }, body: image });
      if (!upload.ok) throw new Error(`Upload failed: ${basename(sourcePath)} (${upload.status})`);
    }));
    await request(`/projects/${project.projectId}/uploads/complete`, {
      method: 'POST', body: JSON.stringify({ assetIds: project.assets.map((asset) => asset.assetId) }),
    }, project.projectToken);
    await request(`/projects/${project.projectId}/process`, { method: 'POST' }, project.projectToken);

    let terminal = false;
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt += 1) {
      await sleep(POLL_INTERVAL_MS);
      const status = await request<ProjectStatus>(`/projects/${project.projectId}/status`, {}, project.projectToken);
      process.stdout.write(`\r묶음 ${batchIndex} 처리 중: ${status.stage ?? '-'} ${status.progress ?? 0}%   `);
      if (status.status === 'completed' || status.status === 'failed') { terminal = true; break; }
    }
    process.stdout.write('\n');
    if (!terminal) throw new Error(`Batch ${batchIndex} timed out`);
    return { project, results: await request<ProjectResults>(`/projects/${project.projectId}/results`, {}, project.projectToken) };
  } catch (error) {
    await request(`/projects/${project.projectId}`, { method: 'DELETE' }, project.projectToken).catch(() => undefined);
    throw error;
  }
}

async function main(): Promise<void> {
  const names = (await readdir(SOURCE_DIR)).filter((name) => /\.(png|jpe?g)$/i.test(name)).sort();
  const paths = names.map((name) => resolve(SOURCE_DIR, name));
  const batches = chunks(paths, BATCH_SIZE);
  await mkdir(resolve(OUTPUT_DIR, 'cleaned'), { recursive: true });
  const report: Array<Record<string, unknown>> = [];
  let completed = 0;

  console.log(`실이미지 E2E 시작: ${paths.length}장 / ${batches.length}묶음 / 언어 ${TARGET_LANGUAGES.join(',')}`);
  console.log(`결과 폴더: ${OUTPUT_DIR}`);
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex];
    console.log(`\n=== 묶음 ${batchIndex + 1}/${batches.length}: ${batch.length}장 업로드 ===`);
    const { project, results } = await uploadBatch(batch, batchIndex + 1);
    try {
      for (const sourcePath of batch) {
        completed += 1;
        const asset = results.assets.find((candidate) => candidate.name === basename(sourcePath));
        if (!asset) throw new Error(`Missing result: ${basename(sourcePath)}`);
        const translatedRegionCounts = Object.fromEntries(TARGET_LANGUAGES.map((language) => [
          language,
          asset.ocr.regions.filter((region) => (region.localizations[language]?.candidates.length ?? 0) > 0).length,
        ]));
        const allRegionsTranslated = asset.ocr.regions.length > 0
          && TARGET_LANGUAGES.every((language) => translatedRegionCounts[language] === asset.ocr.regions.length);
        const textColors = asset.ocr.regions.map((region) => region.textColor).filter(Boolean);
        const row = {
          file: basename(sourcePath),
          status: asset.status,
          ocrRegionCount: asset.ocr.regions.length,
          translatedRegionCounts,
          allRegionsTranslated,
          cleanupMethod: asset.cleanup.method,
          cleanupQuality: asset.cleanup.quality,
          needsManualCleanup: asset.cleanup.needsManualCleanup,
          textColors,
          errorCode: asset.errorCode ?? null,
          errorMessage: asset.errorMessage ?? null,
        };
        report.push(row);
        const verdict = asset.status === 'completed' && allRegionsTranslated ? 'PASS' : 'FAIL';
        console.log(`[${completed}/${paths.length}] ${verdict} ${basename(sourcePath)} | OCR ${asset.ocr.regions.length} | 번역 en:${translatedRegionCounts.en} ja:${translatedRegionCounts.ja} zh:${translatedRegionCounts.zh} | cleanup ${asset.cleanup.method}${asset.cleanup.needsManualCleanup ? ' (manual)' : ''} | colors ${textColors.length}`);
        if (asset.cleanedUrl) {
          const cleaned = await fetch(asset.cleanedUrl);
          if (cleaned.ok) await writeFile(resolve(OUTPUT_DIR, 'cleaned', `${basename(sourcePath).replace(/\.[^.]+$/, '')}.png`), Buffer.from(await cleaned.arrayBuffer()));
        }
      }
    } finally {
      await request(`/projects/${project.projectId}`, { method: 'DELETE' }, project.projectToken).catch(() => undefined);
    }
    await writeFile(resolve(OUTPUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  }

  const passed = report.filter((row) => row.status === 'completed' && row.allRegionsTranslated === true).length;
  const manual = report.filter((row) => row.needsManualCleanup === true).length;
  console.log(`\n=== 완료: PASS ${passed}/${report.length}, FAIL ${report.length - passed}, manual cleanup ${manual} ===`);
  console.log(resolve(OUTPUT_DIR, 'report.json'));
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exitCode = 1;
});
