import exifr from 'exifr';
import { fromZonedTime } from 'date-fns-tz';

/** Construction sites are domestic; cameras usually write local time with no zone. */
export const SITE_TIMEZONE = 'Asia/Tokyo';

export type ExtractedExif = {
  /** DateTimeOriginal resolved to an absolute instant. */
  takenAt: Date | null;
  takenAtSource: 'exif' | 'upload';
  /** True when the camera wrote an explicit UTC offset, so no timezone was assumed. */
  takenAtOffsetKnown: boolean;
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  width: number | null;
  height: number | null;
  make: string | null;
  model: string | null;
  orientation: number | null;
  raw: Record<string, unknown> | null;
};

const EMPTY: ExtractedExif = {
  takenAt: null,
  takenAtSource: 'upload',
  takenAtOffsetKnown: false,
  latitude: null,
  longitude: null,
  altitude: null,
  width: null,
  height: null,
  make: null,
  model: null,
  orientation: null,
  raw: null,
};

/**
 * Turn a raw EXIF datetime string into an instant.
 *
 * EXIF stores wall-clock time with no timezone ("2026:09:13 14:30:00"). It must be
 * parsed by hand: every library that revives it into a Date does so in the *server's*
 * local timezone, which would make a photo's 撮影年月日 depend on where the app happens
 * to be deployed, and shift late-night photos onto the wrong day in the 台帳.
 *
 * When the camera also wrote OffsetTimeOriginal (most modern phones do) that offset is
 * authoritative and used instead of assuming JST — which keeps photos correct if a
 * customer ever shoots overseas.
 */
export function parseExifDateTime(
  value: unknown,
  offset?: unknown,
): { date: Date; offsetKnown: boolean } | null {
  if (typeof value !== 'string') return null;

  const m = value.trim().match(/^(\d{4})[:\-](\d{2})[:\-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;

  const [, year, month, day, hour, minute, second] = m;
  // Cameras write all-zero dates when the clock was never set.
  if (year === '0000' || month === '00' || day === '00') return null;

  const wallClock = `${year}-${month}-${day}T${hour}:${minute}:${second}`;

  if (typeof offset === 'string' && /^[+-]\d{2}:\d{2}$/.test(offset.trim())) {
    const withOffset = new Date(`${wallClock}${offset.trim()}`);
    if (!Number.isNaN(withOffset.getTime())) {
      return { date: withOffset, offsetKnown: true };
    }
  }

  const asJst = fromZonedTime(wallClock, SITE_TIMEZONE);
  return Number.isNaN(asJst.getTime()) ? null : { date: asJst, offsetKnown: false };
}

const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;
const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim() ? v.trim() : null;

export async function extractExif(buffer: Buffer): Promise<ExtractedExif> {
  let parsed: Record<string, unknown> | undefined;
  try {
    // reviveValues:false keeps dates as raw strings so parseExifDateTime owns the
    // timezone decision rather than inheriting the server's.
    parsed = await exifr.parse(buffer, {
      tiff: true,
      exif: true,
      reviveValues: false,
    });
  } catch {
    return { ...EMPTY };
  }

  if (!parsed) return { ...EMPTY };

  const taken =
    parseExifDateTime(parsed.DateTimeOriginal, parsed.OffsetTimeOriginal) ??
    parseExifDateTime(parsed.CreateDate, parsed.OffsetTimeDigitized) ??
    parseExifDateTime(parsed.ModifyDate, parsed.OffsetTime);

  // GPS goes through exifr's dedicated helper, which does the DMS→decimal and
  // N/S/E/W sign work that the raw tags leave undone.
  let latitude: number | null = null;
  let longitude: number | null = null;
  try {
    const gps = await exifr.gps(buffer);
    latitude = num(gps?.latitude);
    longitude = num(gps?.longitude);
  } catch {
    // A photo without GPS is normal — indoor work, or location services off.
  }

  return {
    takenAt: taken?.date ?? null,
    takenAtSource: taken ? 'exif' : 'upload',
    takenAtOffsetKnown: taken?.offsetKnown ?? false,
    latitude,
    longitude,
    altitude: num(parsed.GPSAltitude),
    width: num(parsed.ExifImageWidth) ?? num(parsed.ImageWidth),
    height: num(parsed.ExifImageHeight) ?? num(parsed.ImageHeight),
    make: str(parsed.Make),
    model: str(parsed.Model),
    orientation: num(parsed.Orientation),
    raw: parsed,
  };
}
