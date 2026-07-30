export interface PixelBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function polygonToBox(points: Array<{ x: number; y: number }>): PixelBox {
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

export function normalizedToPixel(box: PixelBox, imageWidth: number, imageHeight: number): PixelBox {
  return {
    x: box.x * imageWidth,
    y: box.y * imageHeight,
    width: box.width * imageWidth,
    height: box.height * imageHeight,
  };
}

export function padAndClampBox(box: PixelBox, paddingPx: number, imageWidth: number, imageHeight: number): PixelBox {
  return padAndClampBoxXY(box, paddingPx, paddingPx, imageWidth, imageHeight);
}

/**
 * 가로/세로 패딩을 독립적으로 줄 때 쓴다. 가로로 긴 박스(한 줄짜리 캡션)에 균일한 패딩을
 * 적용하면 가로 기준으로 계산된 큰 값이 세로 축까지 밀고 들어가 관계없는 영역까지 덮는
 * 문제가 있어, 축마다 다른 여백이 필요한 경우(예: blur-cleanup)에 사용한다.
 */
export function padAndClampBoxXY(box: PixelBox, paddingX: number, paddingY: number, imageWidth: number, imageHeight: number): PixelBox {
  const x1 = Math.max(0, box.x - paddingX);
  const y1 = Math.max(0, box.y - paddingY);
  const x2 = Math.min(imageWidth, box.x + box.width + paddingX);
  const y2 = Math.min(imageHeight, box.y + box.height + paddingY);

  return { x: x1, y: y1, width: Math.max(0, x2 - x1), height: Math.max(0, y2 - y1) };
}

export function boxArea(box: PixelBox): number {
  return Math.max(0, box.width) * Math.max(0, box.height);
}

export function boxCenter(box: PixelBox): { x: number; y: number } {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

export function intersectionOverUnion(a: PixelBox, b: PixelBox): number {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);

  const intersectionWidth = Math.max(0, x2 - x1);
  const intersectionHeight = Math.max(0, y2 - y1);
  const intersectionArea = intersectionWidth * intersectionHeight;

  const unionArea = boxArea(a) + boxArea(b) - intersectionArea;
  if (unionArea <= 0) return 0;

  return intersectionArea / unionArea;
}
