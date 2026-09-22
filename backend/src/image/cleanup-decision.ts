import type { PixelBox } from '../utils/bbox.js';
import { sampleBorderPixelsFromDecoded, type BorderStats, type DecodedImage } from './background-sampler.js';
import { decideCleanupMethod } from './cleanup-quality.js';
import type { CleanupMethod } from '../types/cleanup.js';
import { detectsPeriodicPattern } from './pattern-detector.js';

const PERIODIC_VOTE_RATIO = 0.7;
const UNANIMOUS_VOTE_RATIO = 0.9;

const SHIFT_X = 0.03;
const SHIFT_Y = 0.04;
const GROW_X = 0.05;
const GROW_Y = 0.07;
const MIN_SIDE = 4;

function clampBox(box: PixelBox, width: number, height: number): PixelBox | null {
  const x = Math.max(0, Math.round(box.x));
  const y = Math.max(0, Math.round(box.y));
  const right = Math.min(width, Math.round(box.x + box.width));
  const bottom = Math.min(height, Math.round(box.y + box.height));
  return right - x >= MIN_SIDE && bottom - y >= MIN_SIDE ? { x, y, width: right - x, height: bottom - y } : null;
}

/** OCR 박스를 조금씩 흔든 후보들(원본 포함). 같은 이미지에서 OCR 박스는 실행마다 몇 % 흔들린다. */
export function perturbedBoxes(box: PixelBox, imageWidth: number, imageHeight: number): PixelBox[] {
  const dx = box.width * SHIFT_X;
  const dy = box.height * SHIFT_Y;
  const gx = box.width * GROW_X;
  const gy = box.height * GROW_Y;
  const candidates: PixelBox[] = [
    { ...box, x: box.x + dx }, { ...box, x: box.x - dx },
    { ...box, y: box.y + dy }, { ...box, y: box.y - dy },
    { x: box.x - gx, y: box.y - gy, width: box.width + 2 * gx, height: box.height + 2 * gy },
    { x: box.x + gx, y: box.y + gy, width: box.width - 2 * gx, height: box.height - 2 * gy },
    { x: box.x - gx, y: box.y + gy, width: box.width + 2 * gx, height: box.height - 2 * gy },
    { x: box.x + gx, y: box.y - gy, width: box.width - 2 * gx, height: box.height + 2 * gy },
  ];
  // 원래 박스는 항상 첫 후보로 그대로 둔다(너무 작아 흔든 후보가 모두 걸러져도 판정은 할 수 있게).
  return [box, ...candidates.map((candidate) => clampBox(candidate, imageWidth, imageHeight)).filter((candidate): candidate is PixelBox => candidate !== null)];
}

/**
 * 배경 판정을 박스 하나가 아니라 살짝 흔든 박스 여러 개의 다수결로 한다. 임계값 근처의 경계 이미지는 박스가
 * 1~2px만 달라도 판정이 뒤집혀 같은 이미지가 어떨 땐 되고 어떨 땐 안 됐다. 다수결은 그 뒤집힘을 흡수한다.
 * 동률이면 원래 박스의 판정을 따른다. 반환하는 통계는 다수 판정에 동의한 박스 중 원래 박스에 가까운 것의 것이다.
 */
export function decideStableCleanup(decoded: DecodedImage, box: PixelBox): { method: CleanupMethod; stats: BorderStats; periodic: boolean } {
  const votes = perturbedBoxes(box, decoded.width, decoded.height).map((candidate) => {
    const stats = sampleBorderPixelsFromDecoded(decoded, candidate);
    return { stats, method: decideCleanupMethod(stats) };
  });
  const tally = new Map<CleanupMethod, number>();
  for (const vote of votes) tally.set(vote.method, (tally.get(vote.method) ?? 0) + 1);
  const top = Math.max(...tally.values());
  const leaders = [...tally.entries()].filter(([, count]) => count === top).map(([method]) => method);
  const method = leaders.includes(votes[0].method) ? votes[0].method : leaders[0];
  const chosen = votes.find((vote) => vote.method === method) ?? votes[0];

  // 주기 무늬 판정도 다수결로 한다. 박스가 조금만 달라져도 글자 아랫부분이 무늬 검사 패치에 섞여 오탐이 나기 때문이다.
  // 무늬가 문제 되는 경우(복잡한 배경 인페인팅, 깨끗한 변이 없는 단색 채우기)에만 검사한다. 점이 드문 물방울무늬는
  // 링 색 편차가 작아(≤14) 색 편차로는 단색과 구분되지 않는다(2026-09-22 벤치마크: dots-sparse가 박스마다 판정이 갈림).
  // 단, 깨끗한 단색 변이 3개 이상 일치하면(무늬가 있다면 위아래·좌우가 같은 색일 수 없다) 무늬가 아니다 —
  // 이때 검사 패치(글자 아래 영역)에 든 캐릭터를 무늬로 오탐하는 것을 막는다(강아지 스티커, 2026-09-21 실측).
  const sides = chosen.stats.sidesBackground;
  const mostSidesClean = sides?.kind === 'solid' && sides.cleanSides >= 3;
  const patternRelevant = method === 'directional-inpaint' || method === 'solid-color-fill';
  let periodic = false;
  if (patternRelevant) {
    const boxes = perturbedBoxes(box, decoded.width, decoded.height);
    const periodicVotes = boxes.filter((candidate) => detectsPeriodicPattern(decoded, candidate)).length;
    // 진짜 반복 무늬는 흔든 박스 거의 전부에서 잡힌다(줄무늬 8/9, 물방울 9/9). 캐릭터가 검사 패치에 섞인 오탐은 과반 근처라
    // 70%를 요구하고, 깨끗한 변이 3개 이상이면 만장일치(90%)가 아닌 한 무늬로 보지 않는다. 점이 드문 물방울무늬는 일부 박스에서
    // 변이 우연히 깨끗해 보이는데, 이때도 무늬 검사는 만장일치로 통과한다(2026-09-22 dots-sparse).
    const ratio = mostSidesClean ? UNANIMOUS_VOTE_RATIO : PERIODIC_VOTE_RATIO;
    periodic = periodicVotes >= Math.ceil(boxes.length * ratio);
  }
  return { method, stats: chosen.stats, periodic };
}
