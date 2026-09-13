import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { extractExif, parseExifDateTime } from '../exif';

/** Build a JPEG carrying a known EXIF DateTimeOriginal. */
async function jpegTakenAt(exifDateTime: string, extraIfd2: Record<string, string> = {}) {
  return sharp({
    create: { width: 64, height: 48, channels: 3, background: { r: 30, g: 90, b: 40 } },
  })
    .withExif({
      IFD0: { Make: 'TestCam', Model: 'Site-1' },
      IFD2: { DateTimeOriginal: exifDateTime, ...extraIfd2 },
    })
    .jpeg()
    .toBuffer();
}

test('EXIF wall-clock time is read as JST regardless of the server timezone', async () => {
  // This machine runs at UTC+02:00. If the parser were using local time the result
  // would be 12:30Z; JST (+09:00) gives 05:30Z. That difference is the whole test.
  const { takenAt, takenAtSource, takenAtOffsetKnown } = await extractExif(
    await jpegTakenAt('2026:09:13 14:30:00'),
  );

  assert.ok(takenAt);
  assert.equal(takenAt.toISOString(), '2026-09-13T05:30:00.000Z');
  assert.equal(takenAtSource, 'exif');
  assert.equal(takenAtOffsetKnown, false);
});

test('a photo taken after midnight stays on the correct JST day', async () => {
  // 00:30 JST on the 13th is 15:30 UTC on the 12th. Getting this wrong files the
  // photo under the previous day in the 工事写真台帳.
  const { takenAt } = await extractExif(await jpegTakenAt('2026:09:13 00:30:00'));

  assert.ok(takenAt);
  assert.equal(takenAt.toISOString(), '2026-09-12T15:30:00.000Z');

  const jstDate = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(takenAt);
  assert.match(jstDate, /2026\/09\/13/, 'must render as the 13th in JST');
});

test('an explicit camera UTC offset wins over the assumed timezone', () => {
  const result = parseExifDateTime('2026:09:13 14:30:00', '+02:00');
  assert.ok(result);
  assert.equal(result.date.toISOString(), '2026-09-13T12:30:00.000Z');
  assert.equal(result.offsetKnown, true);
});

test('an unset camera clock is rejected rather than stored as year zero', () => {
  assert.equal(parseExifDateTime('0000:00:00 00:00:00'), null);
  assert.equal(parseExifDateTime(''), null);
  assert.equal(parseExifDateTime(undefined), null);
  assert.equal(parseExifDateTime('not a date'), null);
});

test('a photo with no EXIF is still accepted, flagged as unsourced', async () => {
  const bare = await sharp({
    create: { width: 32, height: 32, channels: 3, background: { r: 0, g: 0, b: 0 } },
  }).jpeg().toBuffer();

  const result = await extractExif(bare);
  assert.equal(result.takenAt, null);
  assert.equal(result.takenAtSource, 'upload');
});

test('absent GPS reads as null, never as 0,0', async () => {
  const result = await extractExif(await jpegTakenAt('2026:09:13 09:00:00'));
  // 0,0 is a real place in the Gulf of Guinea; a falsy-to-zero bug would put every
  // photo there on a map view.
  assert.equal(result.latitude, null);
  assert.equal(result.longitude, null);
});

test('camera make and model survive extraction', async () => {
  const result = await extractExif(await jpegTakenAt('2026:09:13 09:00:00'));
  assert.equal(result.make, 'TestCam');
  assert.equal(result.model, 'Site-1');
});
