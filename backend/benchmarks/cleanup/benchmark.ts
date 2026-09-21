import sharp from 'sharp';
import { decodeImagePixels } from '../../src/image/background-sampler.js';
import { cleanRegionPixels, type RegionCleanupOutcome } from '../../src/image/region-cleanup.js';
import type { PixelBox } from '../../src/utils/bbox.js';
import { HEIGHT, WIDTH, type Scenario } from './scenarios.js';

const svg = (inner: string) => Buffer.from(`<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`);

/** 재현 가능한 노이즈용 시드 난수(mulberry32). */
function prng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface RenderedScenario {
  scenario: Scenario;
  /** 글자가 있는 입력 이미지. */
  full: Buffer;
  /** 글자가 없는 정답 이미지. */
  clean: Buffer;
  /** 글자 픽셀 마스크(WIDTH*HEIGHT, 255=글자). */
  textMask: Uint8Array;
  /** OCR이 잡을 법한 글자 박스(글자 경계에 약간의 여유). */
  bbox: PixelBox;
}

export async function renderScenario(scenario: Scenario): Promise<RenderedScenario> {
  let background = await sharp(svg(scenario.background)).ensureAlpha().png().toBuffer();
  if (scenario.noise) {
    const { data, info } = await sharp(background).raw().toBuffer({ resolveWithObject: true });
    const random = prng(20260921);
    const out = Buffer.from(data);
    for (let i = 0; i < out.length; i += info.channels) {
      const delta = (random() - 0.5) * scenario.noise;
      for (let c = 0; c < 3; c += 1) out[i + c] = Math.max(0, Math.min(255, out[i + c] + delta));
    }
    background = await sharp(out, { raw: { width: info.width, height: info.height, channels: info.channels } }).png().toBuffer();
  }
  const textLayer = await sharp(svg(scenario.text)).ensureAlpha().png().toBuffer();
  const full = await sharp(background).composite([{ input: textLayer }]).png().toBuffer();

  const { data: textData, info } = await sharp(textLayer).raw().toBuffer({ resolveWithObject: true });
  const textMask = new Uint8Array(WIDTH * HEIGHT);
  let minX = WIDTH; let minY = HEIGHT; let maxX = 0; let maxY = 0;
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      if (textData[(y * info.width + x) * info.channels + 3] < 40) continue;
      textMask[y * WIDTH + x] = 255;
      minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    }
  }
  const pad = 2;
  const bbox = { x: Math.max(0, minX - pad), y: Math.max(0, minY - pad), width: Math.min(WIDTH, maxX + pad + 1) - Math.max(0, minX - pad), height: Math.min(HEIGHT, maxY + pad + 1) - Math.max(0, minY - pad) };
  return { scenario, full, clean: background, textMask, bbox };
}

/** OCR 박스는 실행마다 몇 % 흔들린다 — 그 흔들림을 흉내낸 변형들. */
export const JITTERS: Array<[number, number, number, number]> = [
  [0, 0, 0, 0], [0.04, 0, 0, 0], [-0.04, 0, 0, 0], [0, 0.06, 0, 0], [0, -0.06, 0, 0],
  [0, 0, 0.06, 0.08], [0, 0, -0.06, -0.08], [0.03, 0.03, 0.05, 0.05],
];

export function jitterBox(box: PixelBox, [dx, dy, dw, dh]: [number, number, number, number]): PixelBox {
  const x = Math.max(0, Math.round(box.x + dx * box.width));
  const y = Math.max(0, Math.round(box.y + dy * box.height));
  return { x, y, width: Math.min(WIDTH - x, Math.round(box.width * (1 + dw))), height: Math.min(HEIGHT - y, Math.round(box.height * (1 + dh))) };
}

export interface RunMetrics {
  outcome: string;
  /** 정답 글자 픽셀 중 복원되지 않은 비율(0=완벽). 수동 전환이면 1. */
  residual: number;
  /** 글자 주변 6px 밖에서 원본과 달라진 픽셀 수(캐릭터·배경 부수 피해). */
  collateralPx: number;
  pass: boolean;
}

const RESIDUAL_TOLERANCE = 48;
const RESIDUAL_PASS = 0.1;
const COLLATERAL_PASS = 30;

async function pixels(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer).ensureAlpha().raw().toBuffer();
}

function diff(a: Buffer, b: Buffer, index: number): number {
  const base = index * 4;
  // 투명한 두 픽셀은 색이 달라도 같다고 본다.
  if (a[base + 3] < 24 && b[base + 3] < 24) return 0;
  return Math.abs(a[base] - b[base]) + Math.abs(a[base + 1] - b[base + 1]) + Math.abs(a[base + 2] - b[base + 2]) + Math.abs(a[base + 3] - b[base + 3]);
}

export function outcomeLabel(outcome: RegionCleanupOutcome | { kind: 'error' }): string {
  if (outcome.kind === 'cleaned') return outcome.method;
  if (outcome.kind === 'manual') return `manual:${outcome.reason}`;
  return 'error';
}

export async function evaluateRun(rendered: RenderedScenario, box: PixelBox, cleaned: Buffer | null, outcome: string): Promise<RunMetrics> {
  const original = await pixels(rendered.full);
  const truth = await pixels(rendered.clean);
  const result = cleaned ? await pixels(cleaned) : original;
  let textPixels = 0; let unrestored = 0;
  for (let i = 0; i < WIDTH * HEIGHT; i += 1) {
    if (rendered.textMask[i] !== 255) continue;
    textPixels += 1;
    if (diff(result, truth, i) > RESIDUAL_TOLERANCE) unrestored += 1;
  }
  // 글자 마스크를 6px 팽창한 영역 밖의 변화만 부수 피해로 센다.
  const near = new Uint8Array(WIDTH * HEIGHT);
  const radius = 6;
  for (let y = 0; y < HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      if (rendered.textMask[y * WIDTH + x] !== 255) continue;
      for (let dy = -radius; dy <= radius; dy += 1) for (let dx = -radius; dx <= radius; dx += 1) {
        const nx = x + dx; const ny = y + dy;
        if (nx >= 0 && nx < WIDTH && ny >= 0 && ny < HEIGHT) near[ny * WIDTH + nx] = 1;
      }
    }
  }
  let collateralPx = 0;
  for (let i = 0; i < WIDTH * HEIGHT; i += 1) if (!near[i] && diff(result, original, i) > 24) collateralPx += 1;
  const residual = textPixels === 0 ? 0 : unrestored / textPixels;
  void box;
  return { outcome, residual, collateralPx, pass: residual <= RESIDUAL_PASS && collateralPx <= COLLATERAL_PASS };
}

export async function runScenario(rendered: RenderedScenario, jitters = JITTERS): Promise<RunMetrics[]> {
  const decoded = await decodeImagePixels(rendered.full);
  const runs: RunMetrics[] = [];
  for (const jitter of jitters) {
    const box = jitterBox(rendered.bbox, jitter);
    try {
      const outcome = await cleanRegionPixels({
        decoded, originalBuffer: rendered.full, currentBuffer: rendered.full, bbox: box, width: WIDTH, height: HEIGHT, ocrNeedsReview: false,
      });
      runs.push(await evaluateRun(rendered, box, outcome.kind === 'cleaned' ? outcome.buffer : null, outcomeLabel(outcome)));
    } catch {
      runs.push(await evaluateRun(rendered, box, null, 'error'));
    }
  }
  return runs;
}

export interface ScenarioSummary {
  name: string;
  hard: boolean;
  passRate: number;
  meanResidual: number;
  maxCollateralPx: number;
  /** 같은 판정 결과가 나온 비율(박스 흔들림에 대한 안정성). */
  stability: number;
  outcomes: Record<string, number>;
}

export function summarize(name: string, hard: boolean, runs: RunMetrics[]): ScenarioSummary {
  const outcomes: Record<string, number> = {};
  for (const run of runs) outcomes[run.outcome] = (outcomes[run.outcome] ?? 0) + 1;
  return {
    name,
    hard,
    passRate: runs.filter((run) => run.pass).length / runs.length,
    meanResidual: runs.reduce((sum, run) => sum + run.residual, 0) / runs.length,
    maxCollateralPx: Math.max(...runs.map((run) => run.collateralPx)),
    stability: Math.max(...Object.values(outcomes)) / runs.length,
    outcomes,
  };
}
