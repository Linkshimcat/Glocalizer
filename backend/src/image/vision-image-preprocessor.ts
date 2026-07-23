import sharp, { type Sharp } from 'sharp';

export interface VisionImageInput {
  content: Buffer;
  mimeType: 'image/jpeg' | 'image/png';
  width: number;
  height: number;
}

export type OcrImageVariant = 'original' | 'enhanced' | 'threshold' | 'alpha-white';
export interface OcrImageInput extends VisionImageInput { variant: OcrImageVariant; }

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

export async function prepareOcrVariants(source: Buffer, maxDimension: number): Promise<OcrImageInput[]> {
  const base = sharp(source, { failOn: 'none' }).rotate();
  const metadata = await base.metadata();
  const sourceWidth = metadata.width ?? 1;
  const sourceHeight = metadata.height ?? 1;
  const scale = Math.max(sourceWidth, sourceHeight) < 1024 ? 1024 / Math.max(sourceWidth, sourceHeight) : 1;
  const width = Math.min(maxDimension, Math.max(1, Math.round(sourceWidth * scale)));
  const height = Math.min(maxDimension, Math.max(1, Math.round(sourceHeight * scale)));
  const resized = () => sharp(source, { failOn: 'none' }).rotate().resize({ width, height, fit: 'inside' });
  const encode = async (variant: OcrImageVariant, image: Sharp): Promise<OcrImageInput> => ({ variant, content: await image.png({ compressionLevel: 6 }).toBuffer(), mimeType: 'image/png', width, height });
  const variants: OcrImageInput[] = [
    await encode('original', resized()),
    await encode('enhanced', resized().normalize().sharpen()),
    await encode('threshold', resized().grayscale().normalise().threshold(155)),
  ];
  if (metadata.hasAlpha) variants.push(await encode('alpha-white', resized().flatten({ background: '#ffffff' }).normalize().sharpen()));
  return variants;
}
