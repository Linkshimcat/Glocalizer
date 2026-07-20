import { randomUUID } from 'node:crypto';
import { boxArea, intersectionOverUnion, type PixelBox } from '../../utils/bbox.js';
import { containsKorean } from '../../utils/language.js';
import { classifyConfidence, type OcrRegion } from '../../types/ocr.js';

const DUPLICATE_IOU_THRESHOLD = 0.7;
const MERGE_IOU_THRESHOLD = 0.3;

function unionBox(a: PixelBox, b: PixelBox): PixelBox {
  const x1 = Math.min(a.x, b.x);
  const y1 = Math.min(a.y, b.y);
  const x2 = Math.max(a.x + a.width, b.x + b.width);
  const y2 = Math.max(a.y + a.height, b.y + b.height);
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

function mergeTwo(a: OcrRegion, b: OcrRegion): OcrRegion {
  const [first, second] = a.readingOrder <= b.readingOrder ? [a, b] : [b, a];
  const box = unionBox(a.box, b.box);
  const weightA = Math.max(boxArea(a.box), 1);
  const weightB = Math.max(boxArea(b.box), 1);
  const confidence = (a.confidence * weightA + b.confidence * weightB) / (weightA + weightB);
  const text = `${first.text} ${second.text}`.trim();

  return {
    id: randomUUID(),
    text,
    confidence,
    confidenceTier: classifyConfidence(confidence),
    box,
    normalizedBox: a.normalizedBox,
    polygon: [...a.polygon, ...b.polygon],
    containsKorean: containsKorean(text),
    readingOrder: Math.min(a.readingOrder, b.readingOrder),
    isPrimary: false,
  };
}

/** 거의 동일한 영역(중복 감지 결과)을 confidence가 높은 쪽으로 제거하고, 인접한 영역은 하나로 합친다. */
export function mergeCloseRegions(regions: OcrRegion[]): OcrRegion[] {
  let working = [...regions];
  let changed = true;

  while (changed) {
    changed = false;

    outer: for (let i = 0; i < working.length; i += 1) {
      for (let j = i + 1; j < working.length; j += 1) {
        const iou = intersectionOverUnion(working[i].box, working[j].box);

        if (iou >= DUPLICATE_IOU_THRESHOLD) {
          const keep = working[i].confidence >= working[j].confidence ? working[i] : working[j];
          working = working.filter((_, index) => index !== i && index !== j);
          working.push(keep);
          changed = true;
          break outer;
        }

        if (iou >= MERGE_IOU_THRESHOLD) {
          const merged = mergeTwo(working[i], working[j]);
          working = working.filter((_, index) => index !== i && index !== j);
          working.push(merged);
          changed = true;
          break outer;
        }
      }
    }
  }

  return working.sort((a, b) => a.readingOrder - b.readingOrder);
}
