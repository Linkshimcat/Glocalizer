import sharp, { type Sharp } from 'sharp';

export interface VisionImageInput {
  content: Buffer;
  mimeType: 'image/jpeg' | 'image/png';
  width: number;
  height: number;
}

export type OcrImageVariant = 'original' | 'enhanced' | 'grayscale' | 'threshold-dark' | 'threshold-light' | 'alpha-white';
export interface OcrImageInput extends VisionImageInput { variant: OcrImageVariant; }

interface OcrResizePlan {
  width: number;
  height: number;
  hasAlpha: boolean;
}

/** AI 요청 전용 이미지를 줄인다. 원본 Storage 파일은 변경하지 않는다. */
export async function prepareImageForVision(source: Buffer, maxDimension: number, minimumDimension = 1024): Promise<VisionImageInput> {
  const input = sharp(source, { failOn: 'none' }).rotate();
  const sourceMetadata = await input.metadata();
  const sourceWidth = sourceMetadata.width ?? 1;
  const sourceHeight = sourceMetadata.height ?? 1;
  const sourceLongestEdge = Math.max(sourceWidth, sourceHeight);
  const scale = sourceLongestEdge < minimumDimension ? minimumDimension / sourceLongestEdge : 1;
  const targetWidth = Math.min(maxDimension, Math.max(1, Math.round(sourceWidth * scale)));
  const targetHeight = Math.min(maxDimension, Math.max(1, Math.round(sourceHeight * scale)));
  const image = input.resize({ width: targetWidth, height: targetHeight, fit: 'inside' }).normalize().sharpen();
  const metadata = await image.metadata();
  const width = metadata.width ?? targetWidth;
  const height = metadata.height ?? targetHeight;

  if (metadata.hasAlpha) {
    return { content: await image.png({ compressionLevel: 6 }).toBuffer(), mimeType: 'image/png', width, height };
  }

  return {
    content: await image.jpeg({ quality: 85, progressive: true }).toBuffer(),
    mimeType: 'image/jpeg',
    width,
    height,
  };
}

async function getOcrResizePlan(source: Buffer, maxDimension: number): Promise<OcrResizePlan> {
  const base = sharp(source, { failOn: 'none' }).rotate();
  const metadata = await base.metadata();
  const sourceWidth = metadata.width ?? 1;
  const sourceHeight = metadata.height ?? 1;
  const scale = Math.max(sourceWidth, sourceHeight) < 1024 ? 1024 / Math.max(sourceWidth, sourceHeight) : 1;
  return { width: Math.min(maxDimension, Math.max(1, Math.round(sourceWidth * scale))), height: Math.min(maxDimension, Math.max(1, Math.round(sourceHeight * scale))), hasAlpha: Boolean(metadata.hasAlpha) };
}

function createOcrResizedImage(source: Buffer, plan: OcrResizePlan): Sharp {
  return sharp(source, { failOn: 'none' }).rotate().resize({ width: plan.width, height: plan.height, fit: 'inside' });
}

async function encodeOcrInput(variant: OcrImageVariant, image: Sharp, plan: OcrResizePlan): Promise<OcrImageInput> {
  return { variant, content: await image.png({ compressionLevel: 6 }).toBuffer(), mimeType: 'image/png', width: plan.width, height: plan.height };
}

export async function preparePrimaryOcrImage(source: Buffer, maxDimension: number): Promise<OcrImageInput> {
  const plan = await getOcrResizePlan(source, maxDimension);
  return encodeOcrInput('original', createOcrResizedImage(source, plan), plan);
}

export async function prepareOcrFallbackVariants(source: Buffer, maxDimension: number): Promise<OcrImageInput[]> {
  const plan = await getOcrResizePlan(source, maxDimension);
  const resized = () => createOcrResizedImage(source, plan);
  const variants = [
    await encodeOcrInput('enhanced', resized().normalize().sharpen(), plan),
    await encodeOcrInput('grayscale', resized().grayscale().normalise().sharpen(), plan),
    await encodeOcrInput('threshold-dark', resized().grayscale().normalise().threshold(120), plan),
    await encodeOcrInput('threshold-light', resized().grayscale().normalise().threshold(190), plan),
  ];
  if (plan.hasAlpha) variants.push(await encodeOcrInput('alpha-white', resized().flatten({ background: '#ffffff' }).normalize().sharpen(), plan));
  return variants;
}
