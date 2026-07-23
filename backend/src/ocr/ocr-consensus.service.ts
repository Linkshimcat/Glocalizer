import type { RecognizedRegion } from './ocr-provider.types.js';

export const OCR_AUTO_APPROVE_SCORE = 0.82;
const MIN_AGREEING_VARIANTS = 2;

export interface ConsensusRegion extends RecognizedRegion {
  agreementScore: number;
  source: 'paddle-consensus';
  needsManualReview: boolean;
}

function normalizedText(text: string): string {
  return text.replace(/\s+/g, '').trim();
}

function editSimilarity(left: string, right: string): number {
  const a = normalizedText(left);
  const b = normalizedText(right);
  if (!a || !b) return 0;
  const matrix = Array.from({ length: a.length + 1 }, (_, row) => Array.from({ length: b.length + 1 }, (_, column) => row === 0 ? column : column === 0 ? row : 0));
  for (let row = 1; row <= a.length; row += 1) for (let column = 1; column <= b.length; column += 1) matrix[row][column] = a[row - 1] === b[column - 1] ? matrix[row - 1][column - 1] : 1 + Math.min(matrix[row - 1][column], matrix[row][column - 1], matrix[row - 1][column - 1]);
  return 1 - matrix[a.length][b.length] / Math.max(a.length, b.length);
}

function bounds(region: RecognizedRegion) {
  const xs = region.polygon.map((point) => point.x);
  const ys = region.polygon.map((point) => point.y);
  return { left: Math.min(...xs), top: Math.min(...ys), right: Math.max(...xs), bottom: Math.max(...ys) };
}

function iou(left: RecognizedRegion, right: RecognizedRegion): number {
  const a = bounds(left); const b = bounds(right);
  const overlap = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  const areaA = Math.max(1, (a.right - a.left) * (a.bottom - a.top)); const areaB = Math.max(1, (b.right - b.left) * (b.bottom - b.top));
  return overlap / (areaA + areaB - overlap);
}

function koreanValidity(text: string): number {
  const compact = normalizedText(text);
  if (!compact) return 0;
  const valid = [...compact].filter((character) => /[\uAC00-\uD7A3\p{P}\dA-Za-z]/u.test(character)).length;
  return valid / compact.length;
}

function containsKorean(text: string): boolean {
  return /[\uAC00-\uD7A3]/.test(text);
}

interface Candidate { variant: number; region: RecognizedRegion; }

interface RankedCandidateGroup {
  representative: Candidate;
  distinctVariants: number;
  textAgreement: number;
  score: number;
}

interface ConsensusOptions {
  allowSingleVariantAutoApprove?: boolean;
}

function rankCandidateGroups(variantResults: RecognizedRegion[][], options: ConsensusOptions): RankedCandidateGroup[] {
  const candidates = variantResults.flatMap((regions, variant) => regions.map((region) => ({ variant, region: { ...region, text: region.text.trim() } }))).filter((candidate) => candidate.region.text);
  if (!candidates.length) return [];
  const groups: Candidate[][] = [];
  for (const candidate of candidates) {
    const group = groups.find((entries) => entries.some((entry) => iou(entry.region, candidate.region) >= 0.35 && editSimilarity(entry.region.text, candidate.region.text) >= 0.5));
    if (group) group.push(candidate); else groups.push([candidate]);
  }
  return groups.map((entries) => {
    const representative = [...entries].sort((a, b) => b.region.confidence - a.region.confidence)[0];
    const distinctVariants = new Set(entries.map((entry) => entry.variant)).size;
    const agreement = distinctVariants / variantResults.length;
    const textAgreement = entries.length > 1
      ? entries.reduce((total, entry) => total + editSimilarity(representative.region.text, entry.region.text), 0) / entries.length
      : options.allowSingleVariantAutoApprove && variantResults.length === 1 ? 1 : 0;
    const koreanBonus = containsKorean(representative.region.text) ? 0.12 : 0;
    const score = representative.region.confidence * 0.50 + (agreement * textAgreement) * 0.25 + koreanValidity(representative.region.text) * 0.13 + koreanBonus;
    return { representative, distinctVariants, textAgreement, score };
  }).sort((left, right) => right.score - left.score);
}

function toConsensusRegion(group: RankedCandidateGroup, variantCount: number, options: ConsensusOptions): ConsensusRegion {
  const trustedSingleVariant = options.allowSingleVariantAutoApprove && variantCount === 1 && group.representative.region.confidence >= OCR_AUTO_APPROVE_SCORE;
  return {
    ...group.representative.region,
    confidence: Math.min(1, Math.max(0, group.representative.region.confidence)),
    agreementScore: Math.min(1, Math.max(0, group.score)),
    source: 'paddle-consensus',
    needsManualReview: !(group.score >= OCR_AUTO_APPROVE_SCORE && ((group.distinctVariants >= MIN_AGREEING_VARIANTS && group.textAgreement >= 0.85) || trustedSingleVariant)),
  };
}

/** 중복 variant 후보를 합쳐, 이미지에서 찾은 모든 유효 OCR 문구를 반환한다. */
export function selectConsensusRegions(variantResults: RecognizedRegion[][], options: ConsensusOptions = {}): ConsensusRegion[] {
  return rankCandidateGroups(variantResults, options)
    .filter((group) => containsKorean(group.representative.region.text))
    .map((group) => toConsensusRegion(group, variantResults.length, options));
}

export function selectConsensusRegion(variantResults: RecognizedRegion[][], options: ConsensusOptions = {}): ConsensusRegion | null {
  return selectConsensusRegions(variantResults, options)[0] ?? null;
}
