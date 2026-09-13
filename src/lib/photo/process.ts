import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { extractExif, type ExtractedExif } from './exif';

/** Long-edge cap for the on-screen rendition. */
const DISPLAY_MAX_EDGE = 2048;
/** Grid thumbnail edge. */
const THUMB_MAX_EDGE = 480;

/**
 * デジタル写真管理情報基準 guidance: size the photo so the blackboard text is legible
 * and no larger — roughly 1,000,000 effective pixels. Oversized files bloat the
 * delivery media without helping anyone read the board.
 */
export const DELIVERY_TARGET_PIXELS = 1_000_000;
/** Below this the blackboard usually stops being readable. */
export const DELIVERY_MIN_PIXELS = 640_000;
/** Above this the file is wastefully large for delivery. */
export const DELIVERY_MAX_PIXELS = 3_000_000;

export type DeliverySizeVerdict = 'ok' | 'too_small' | 'too_large' | 'unknown';

export type ProcessedPhoto = {
  /** sha256 of the original bytes — dedupe key and integrity baseline. */
  contentHash: string;
  exif: ExtractedExif;
  width: number | null;
  height: number | null;
  format: string | null;
  originalSize: number;
  display: { buffer: Buffer; width: number; height: number };
  thumbnail: { buffer: Buffer; width: number; height: number };
  deliverySize: DeliverySizeVerdict;
  effectivePixels: number | null;
};

export function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/** Classify a photo against the 有効画素数 guideline. */
export function assessDeliverySize(
  width: number | null,
  height: number | null,
): { verdict: DeliverySizeVerdict; pixels: number | null } {
  if (!width || !height) return { verdict: 'unknown', pixels: null };
  const pixels = width * height;
  if (pixels < DELIVERY_MIN_PIXELS) return { verdict: 'too_small', pixels };
  if (pixels > DELIVERY_MAX_PIXELS) return { verdict: 'too_large', pixels };
  return { verdict: 'ok', pixels };
}

/**
 * Derive everything we need from an uploaded photo.
 *
 * The input buffer is never modified and never re-encoded on the delivery path:
 * 電子納品 treats the photo as evidence, and re-compressing it would both break the
 * JACIC tamper-detection payload and technically constitute editing. The display and
 * thumbnail renditions are strictly for the UI.
 */
export async function processPhoto(original: Buffer): Promise<ProcessedPhoto> {
  const contentHash = sha256(original);
  const exif = await extractExif(original);

  const image = sharp(original, { failOn: 'none' });
  const meta = await image.metadata();

  // EXIF Orientation is applied to the renditions only; the original keeps its tag.
  const base = sharp(original, { failOn: 'none' }).rotate();

  const displayBuf = await base
    .clone()
    .resize({ width: DISPLAY_MAX_EDGE, height: DISPLAY_MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  const thumbBuf = await base
    .clone()
    .resize({ width: THUMB_MAX_EDGE, height: THUMB_MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer({ resolveWithObject: true });

  // sharp reports pre-rotation dimensions; swap for a quarter-turn orientation so
  // the stored width/height match what a viewer actually sees.
  const { width, height } = orientedDimensions(meta.width, meta.height, meta.orientation);

  const { verdict, pixels } = assessDeliverySize(width, height);

  return {
    contentHash,
    exif,
    width,
    height,
    format: meta.format ?? null,
    originalSize: original.byteLength,
    display: {
      buffer: displayBuf.data,
      width: displayBuf.info.width,
      height: displayBuf.info.height,
    },
    thumbnail: {
      buffer: thumbBuf.data,
      width: thumbBuf.info.width,
      height: thumbBuf.info.height,
    },
    deliverySize: verdict,
    effectivePixels: pixels,
  };
}

/**
 * EXIF orientation values 5-8 represent a quarter turn, so the stored file's width
 * and height are transposed relative to what a viewer sees. Album sorting and the
 * 台帳 layout both key off the displayed shape, so the swap happens on ingest.
 */
export function orientedDimensions(
  width: number | null | undefined,
  height: number | null | undefined,
  orientation: number | null | undefined,
): { width: number | null; height: number | null } {
  const w = typeof width === 'number' ? width : null;
  const h = typeof height === 'number' ? height : null;
  const quarterTurn = typeof orientation === 'number' && orientation >= 5 && orientation <= 8;
  return quarterTurn ? { width: h, height: w } : { width: w, height: h };
}

/** 電子納品 filenames are fixed-format: P + 7 digits. */
export function deliveryFilename(sequence: number, ext = 'JPG'): string {
  return `P${String(sequence).padStart(7, '0')}.${ext.toUpperCase()}`;
}
