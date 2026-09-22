import type { PixelBox } from '../utils/bbox.js';
import type { DecodedImage } from './background-sampler.js';

export interface BackgroundModel {
  /** (x, y) 위치에서 글자가 없을 때의 배경색 추정값. */
  at(x: number, y: number): [number, number, number];
  /** 평면을 뺀 뒤 남는 픽셀 노이즈의 표준편차(RGB 3채널을 합친 유클리드 거리 기준). */
  noiseSigma: number;
  /** 채널별 노이즈 표준편차. */
  channelSigma: [number, number, number];
  /** 채널 간 노이즈 상관(0=채널마다 독립, 1=밝기 노이즈처럼 세 채널이 함께 움직임). */
  correlation: number;
  /** 박스 안에서 배경이 변하는 폭(모서리 예측값의 최대 색 거리). */
  span: number;
}

const RING_INNER = 2;
const RING_OUTER = 7;
/** 그라데이션·노이즈 모델은 평면이 상수보다 눈에 띄게 잘 맞을 때만 쓴다. */
const MIN_SPAN = 24;
const MIN_NOISE_SIGMA = 14;
const MIN_SAMPLES = 60;

interface Sample { x: number; y: number; rgb: [number, number, number] }

function collectRing(decoded: DecodedImage, box: PixelBox): Sample[] {
  const { data, width, height, channels } = decoded;
  const left = Math.floor(box.x); const top = Math.floor(box.y);
  const right = Math.ceil(box.x + box.width); const bottom = Math.ceil(box.y + box.height);
  const samples: Sample[] = [];
  for (let y = Math.max(0, top - RING_OUTER); y < Math.min(height, bottom + RING_OUTER); y += 1) {
    for (let x = Math.max(0, left - RING_OUTER); x < Math.min(width, right + RING_OUTER); x += 1) {
      const inner = x >= left - RING_INNER && x < right + RING_INNER && y >= top - RING_INNER && y < bottom + RING_INNER;
      if (inner) continue;
      const base = (y * width + x) * channels;
      if (channels >= 4 && data[base + 3] < 200) continue;
      samples.push({ x, y, rgb: [data[base], data[base + 1], data[base + 2]] });
    }
  }
  return samples;
}

/** 3x3 정규방정식(Cramer)으로 z = a + b*x + c*y 를 푼다. */
function solvePlane(points: Array<{ x: number; y: number; z: number }>): [number, number, number] | null {
  let n = 0; let sx = 0; let sy = 0; let sxx = 0; let sxy = 0; let syy = 0; let sz = 0; let sxz = 0; let syz = 0;
  for (const p of points) {
    n += 1; sx += p.x; sy += p.y; sxx += p.x * p.x; sxy += p.x * p.y; syy += p.y * p.y; sz += p.z; sxz += p.x * p.z; syz += p.y * p.z;
  }
  const det = (a: number[]) => a[0] * (a[4] * a[8] - a[5] * a[7]) - a[1] * (a[3] * a[8] - a[5] * a[6]) + a[2] * (a[3] * a[7] - a[4] * a[6]);
  const m = [n, sx, sy, sx, sxx, sxy, sy, sxy, syy];
  const d = det(m);
  if (Math.abs(d) < 1e-6) return null;
  const solveWith = (col: number) => {
    const t = [...m];
    t[col] = sz; t[3 + col] = sxz; t[6 + col] = syz;
    return det(t) / d;
  };
  return [solveWith(0), solveWith(1), solveWith(2)];
}

/**
 * OCR 박스 둘레의 링(박스 밖 2~7px)에서 배경의 평면 모델과 노이즈 크기를 추정한다. 글자 획이 링에 걸려도
 * 잔차가 큰 표본을 두 번 걷어내는 방식으로 무시한다. 배경이 사실상 상수이고 노이즈도 없으면 null을 돌려줘
 * 기존 단색 경로가 그대로 쓰이게 한다.
 */
export function fitBackgroundModel(decoded: DecodedImage, box: PixelBox): BackgroundModel | null {
  return analyzeBackground(decoded, box).model;
}

/**
 * 링에 평면 모델을 맞추고, 모델에서 크게 벗어난 표본(=배경이 아닌 것)의 비율도 함께 돌려준다.
 * 캐릭터·글자 획이 링에 일부만 걸리면 이 비율이 작고, 물방울무늬처럼 배경 곳곳에 무늬가 있으면 크다.
 */
export function analyzeBackground(decoded: DecodedImage, box: PixelBox): { model: BackgroundModel | null; outlierRatio: number } {
  let samples = collectRing(decoded, box);
  const total = samples.length;
  const none = { model: null, outlierRatio: 0 };
  if (samples.length < MIN_SAMPLES) return none;
  const cx = box.x + box.width / 2; const cy = box.y + box.height / 2;
  const scale = Math.max(box.width, box.height, 1);
  const norm = (s: Sample) => ({ x: (s.x - cx) / scale, y: (s.y - cy) / scale });

  let planes: Array<[number, number, number]> = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let round = 0; round < 3; round += 1) {
    const fitted: Array<[number, number, number]> = [];
    for (let c = 0; c < 3; c += 1) {
      const plane = solvePlane(samples.map((s) => ({ ...norm(s), z: s.rgb[c] })));
      if (!plane) return none;
      fitted.push(plane);
    }
    planes = fitted;
    const residuals = samples.map((s) => {
      const { x, y } = norm(s);
      return Math.hypot(...[0, 1, 2].map((c) => s.rgb[c] - (planes[c][0] + planes[c][1] * x + planes[c][2] * y)));
    });
    if (round === 2) break;
    const mean = residuals.reduce((a, b) => a + b, 0) / residuals.length;
    const sigma = Math.sqrt(residuals.reduce((a, b) => a + (b - mean) ** 2, 0) / residuals.length);
    const limit = mean + 2.5 * sigma;
    const kept = samples.filter((_, index) => residuals[index] <= limit);
    if (kept.length < MIN_SAMPLES || kept.length === samples.length) break;
    samples = kept;
  }

  const channelVar = [0, 0, 0];
  const cross = [0, 0, 0]; // RG, RB, GB 공분산
  for (const s of samples) {
    const { x, y } = norm(s);
    const r = [0, 1, 2].map((c) => s.rgb[c] - (planes[c][0] + planes[c][1] * x + planes[c][2] * y));
    for (let c = 0; c < 3; c += 1) channelVar[c] += r[c] ** 2;
    cross[0] += r[0] * r[1]; cross[1] += r[0] * r[2]; cross[2] += r[1] * r[2];
  }
  const pairs: Array<[number, number]> = [[0, 1], [0, 2], [1, 2]];
  const correlation = Math.max(0, Math.min(1, pairs.reduce((sum, [a, b], i) => sum + cross[i] / Math.max(1e-6, Math.sqrt(channelVar[a] * channelVar[b])), 0) / 3));
  const channelSigma = channelVar.map((v) => Math.sqrt(v / samples.length)) as [number, number, number];
  const noiseSigma = Math.hypot(...channelSigma);

  const at = (x: number, y: number): [number, number, number] => {
    const nx = (x - cx) / scale; const ny = (y - cy) / scale;
    return [0, 1, 2].map((c) => Math.max(0, Math.min(255, planes[c][0] + planes[c][1] * nx + planes[c][2] * ny))) as [number, number, number];
  };
  const corners = [[box.x, box.y], [box.x + box.width, box.y], [box.x, box.y + box.height], [box.x + box.width, box.y + box.height]].map(([x, y]) => at(x, y));
  let span = 0;
  for (const a of corners) for (const b of corners) span = Math.max(span, Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]));

  const outlierRatio = 1 - samples.length / total;
  if (span < MIN_SPAN && noiseSigma < MIN_NOISE_SIGMA) return { model: null, outlierRatio };
  return { model: { at, noiseSigma, channelSigma, correlation, span }, outlierRatio };
}

/** 위치 해시 기반의 결정적 가우시안 난수(같은 입력이면 항상 같은 노이즈). */
export function positionNoise(x: number, y: number, channel: number): number {
  let h = (Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263) ^ Math.imul(channel + 1, 2246822519)) >>> 0;
  const next = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0;
    h = (h ^ (h >>> 16)) >>> 0;
    return (h + 1) / 4294967297;
  };
  return Math.sqrt(-2 * Math.log(next())) * Math.cos(2 * Math.PI * next());
}
