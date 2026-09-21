import { describe, expect, it } from 'vitest';
import { sampleBorderPixelsFromDecoded, type DecodedImage } from '../../src/image/background-sampler.js';
import { decideCleanupMethod } from '../../src/image/cleanup-quality.js';

const W = 120;
const H = 80;
const box = { x: 30, y: 30, width: 60, height: 20 };

function image(fill: (x: number, y: number) => [number, number, number, number]): DecodedImage {
  const data = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y += 1) for (let x = 0; x < W; x += 1) data.set(fill(x, y), (y * W + x) * 4);
  return { data, width: W, height: H, channels: 4 };
}

// 글자 자리(박스 안쪽)에 검은 획을 둔다.
const inText = (x: number, y: number) => x >= 40 && x < 80 && y >= 34 && y < 46;

describe('테두리 변 단위 배경 판정', () => {
  it('한 변에만 캐릭터가 붙어 링 알파 평균이 높아도 투명 배경으로 본다', () => {
    const decoded = image((x, y) => {
      if (inText(x, y)) return [0, 0, 0, 255];
      if (y >= 22 && y < 30 && x >= 20 && x < 100) return [0, 0, 0, 255]; // 윗변 링 전체를 덮는 캐릭터 몸통
      return [0, 0, 0, 0];
    });
    const stats = sampleBorderPixelsFromDecoded(decoded, box);
    expect(stats.meanAlpha).toBeGreaterThan(25); // 예전 기준(평균 알파 < 25)이면 투명 배경을 놓친다
    expect(stats.sidesBackground).toEqual({ kind: 'transparent' });
    expect(decideCleanupMethod(stats)).toBe('transparent-mask');
  });

  it('한 변에만 윤곽선이 붙어도 나머지 변이 같은 단색이면 그 색을 배경으로 쓴다', () => {
    const decoded = image((x, y) => {
      if (inText(x, y)) return [0, 0, 0, 255];
      if (y >= 22 && y < 30 && x >= 20 && x < 100) return [30, 30, 30, 255]; // 윗변에 붙은 검은 몸통
      return [255, 224, 102, 255];
    });
    const stats = sampleBorderPixelsFromDecoded(decoded, box);
    expect(stats.sidesBackground).toMatchObject({ kind: 'solid', color: { r: 255, g: 224, b: 102 } });
    expect(stats.medianColor).toEqual({ r: 255, g: 224, b: 102 });
    expect(decideCleanupMethod(stats)).toBe('solid-color-fill');
  });

  it('촘촘한 무늬 배경은 단색으로 보지 않는다', () => {
    const decoded = image((x, y) => {
      if (inText(x, y)) return [0, 0, 0, 255];
      return (Math.floor(x / 3) + Math.floor(y / 3)) % 2 === 0 ? [255, 255, 255, 255] : [40, 40, 200, 255];
    });
    const stats = sampleBorderPixelsFromDecoded(decoded, box);
    expect(stats.sidesBackground).toBeNull();
    expect(decideCleanupMethod(stats)).toBe('directional-inpaint');
  });

  it('배경이 서로 다른 두 변은 일치하지 않으므로 단색으로 보지 않는다', () => {
    const decoded = image((x, y) => {
      if (inText(x, y)) return [0, 0, 0, 255];
      return x < 60 ? [255, 255, 255, 255] : [0, 0, 160, 255]; // 좌우 변 색이 다름 + 위아래 변은 반반
    });
    const stats = sampleBorderPixelsFromDecoded(decoded, box);
    expect(stats.sidesBackground).toBeNull();
  });
});
