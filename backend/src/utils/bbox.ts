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
  const x1 = Math.max(0, box.x - paddingPx);
  const y1 = Math.max(0, box.y - paddingPx);
  const x2 = Math.min(imageWidth, box.x + box.width + paddingPx);
  const y2 = Math.min(imageHeight, box.y + box.height + paddingPx);

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
