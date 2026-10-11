import { createHash } from 'node:crypto';
import { CAPTIONS, type Caption } from './dataset.js';

export const DATASET_HASH = createHash('sha256').update(JSON.stringify(CAPTIONS)).digest('hex');
const rank = (caption: Caption) =>
  createHash('sha256').update(`glocalizer-split-42:${caption.id}`).digest('hex');
/** Largest-remainder allocation gives exactly 35 holdout rows, stratified by category. */
export function splitCaptions(captions: Caption[] = CAPTIONS) {
  const groups = [...new Set(captions.map((row) => row.category))].sort().map((category) => {
    const rows = captions
      .filter((row) => row.category === category)
      .sort((a, b) => rank(a).localeCompare(rank(b)));
    return { category, rows, count: Math.floor(rows.length / 3), remainder: rows.length % 3 };
  });
  let remaining =
    Math.round(captions.length / 3) - groups.reduce((sum, group) => sum + group.count, 0);
  for (const group of [...groups].sort(
    (a, b) => b.remainder - a.remainder || a.category.localeCompare(b.category),
  )) {
    if (remaining-- > 0) group.count++;
  }
  const holdout = groups.flatMap((group) => group.rows.slice(0, group.count));
  const dev = groups.flatMap((group) => group.rows.slice(group.count));
  return { dev, holdout };
}
