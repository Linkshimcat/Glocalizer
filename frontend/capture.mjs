import { chromium } from 'playwright';
import fs from 'node:fs';

const SCRATCH = process.env.SCRATCH;
const BASE = 'http://localhost:5173';

function toDataUrl(path) {
  const b = fs.readFileSync(path);
  return 'data:image/png;base64,' + b.toString('base64');
}

const memes = [
  { file: 'meme_c1.png', clean: 'meme_c1clean.png', name: 'wang-pigon.png', korean: '왕 피곤', box: { x: 0.05, y: 0.04, width: 0.9, height: 0.24 }, en: "I'm wiped", ja: 'クタクタ', zh: '累爆了' },
  { file: 'meme_c2.png', clean: 'meme_c2clean.png', name: 'daebak.png', korean: '대박', box: { x: 0.1, y: 0.04, width: 0.8, height: 0.24 }, en: 'No way!', ja: 'マジで', zh: '太牛了' },
  { file: 'meme_c3.png', clean: 'meme_c3clean.png', name: 'yeolgong.png', korean: '열공중', box: { x: 0.05, y: 0.72, width: 0.9, height: 0.24 }, en: 'Grinding', ja: 'ガチ勉強中', zh: '在拼命学习' },
  { file: 'meme_c4.png', clean: 'meme_c4clean.png', name: 'anmulangung.png', korean: '안물안궁', box: { x: 0.05, y: 0.04, width: 0.9, height: 0.24 }, en: "Didn't ask", ja: '興味なし', zh: '没人问' },
];

const targetLangs = [
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
  { code: 'zh', flag: '🇨🇳', label: '中文 (简体)' },
];

function buildFiles(withResults) {
  return memes.map((m, i) => {
    const id = `mock-${i}`;
    const url = toDataUrl(`${SCRATCH}/${m.file}`);
    const cleanUrl = toDataUrl(`${SCRATCH}/${m.clean}`);
    const fileUrl = withResults ? cleanUrl : url;
    const regionId = `region-${i}`;
    const localizations = Object.fromEntries(targetLangs.map(l => [l.code, {
      status: 'translated',
      suggestions: [
        { text: m[l.code], tone: 'casual', best: true },
        { text: m[l.code], tone: 'literal' },
      ],
      recommendedFont: l.code === 'ja' ? 'Noto Sans JP' : l.code === 'zh' ? 'Noto Sans SC' : 'Baloo 2',
    }]));
    return {
      id,
      name: m.name,
      url: fileUrl,
      type: 'image/png',
      assetId: `asset-${i}`,
      analysis: {
        korean: m.korean,
        localizations,
        originalUrl: url,
        cleanedUrl: cleanUrl,
        width: 600,
        height: 600,
        regionId,
        normalizedBox: m.box,
        cleanupMethod: 'inpaint',
        cleanupQuality: 'high',
        needsManualCleanup: false,
        needsManualOcrReview: false,
        textColor: { r: 255, g: 255, b: 255 },
        regions: [{
          id: regionId,
          korean: m.korean,
          normalizedBox: m.box,
          localizations,
          needsManualCleanup: false,
          needsManualOcrReview: false,
          textColor: { r: 255, g: 255, b: 255 },
        }],
      },
    };
  });
}

async function seedSession(page, { withResults }) {
  const files = buildFiles(withResults);
  const selectedFileIds = files.map(f => f.id);
  const projectStatus = {
    projectId: 'mock-project',
    status: 'completed',
    stage: 'done',
    progress: 100,
    message: '완료',
    assets: files.map(f => ({ assetId: f.assetId, status: 'completed', progress: 100 })),
  };
  const projectResults = withResults ? {
    projectId: 'mock-project',
    status: 'completed',
    targetLanguages: targetLangs.map(l => l.code),
    assets: files.map((f, i) => ({
      id: f.assetId,
      name: f.name,
      type: 'image/png',
      width: 600,
      height: 600,
      status: 'completed',
      originalUrl: f.analysis.originalUrl,
      cleanedUrl: f.analysis.cleanedUrl,
      ocr: { fullText: f.analysis.korean, primaryRegionId: f.analysis.regionId, fontStyle: null, regions: [] },
      localizations: f.analysis.localizations,
      cleanup: { method: 'inpaint', quality: 'high', needsManualCleanup: false, textColor: { r: 255, g: 255, b: 255 } },
      needsManualOcrReview: false,
      editorStates: {},
      regionEditorStates: {},
    })),
  } : null;

  await page.addInitScript(({ files, selectedFileIds, targetLangs, projectStatus, projectResults, resultReady }) => {
    const P = 'glocalizer:';
    sessionStorage.setItem(P + 'files', JSON.stringify(files));
    sessionStorage.setItem(P + 'selectedFileIds', JSON.stringify(selectedFileIds));
    sessionStorage.setItem(P + 'targetLangs', JSON.stringify(targetLangs));
    sessionStorage.setItem(P + 'projectId', JSON.stringify('mock-project'));
    sessionStorage.setItem(P + 'projectToken', JSON.stringify('mock-token'));
    sessionStorage.setItem(P + 'projectStatus', JSON.stringify(projectStatus));
    sessionStorage.setItem(P + 'projectResults', JSON.stringify(projectResults));
    sessionStorage.setItem(P + 'resultReady', JSON.stringify(resultReady));
    sessionStorage.setItem(P + 'styles', JSON.stringify({}));
  }, { files, selectedFileIds, targetLangs, projectStatus, projectResults, resultReady: withResults });
}

const browser = await chromium.launch();

// 1) Dashboard — empty dropzone
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await page.goto(`${BASE}/dashboard`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${SCRATCH}/shot_dashboard_empty.png` });
  await page.close();
}

// 2) Dashboard — 4 files uploaded + languages selected
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await seedSession(page, { withResults: false });
  await page.goto(`${BASE}/dashboard`);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCRATCH}/shot_dashboard_uploaded.png`, fullPage: true });
  await page.close();
}

// 3) Editor — with 왕 피곤 selected
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await seedSession(page, { withResults: true });
  await page.goto(`${BASE}/editor`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SCRATCH}/shot_editor.png`, fullPage: true });
  await page.close();
}

// 4) Result page — completed cards
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await seedSession(page, { withResults: true });
  await page.goto(`${BASE}/result`);
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${SCRATCH}/shot_result.png`, fullPage: true });
  await page.close();
}

await browser.close();
console.log('done');
