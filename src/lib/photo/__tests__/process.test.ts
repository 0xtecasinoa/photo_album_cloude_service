import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {
  processPhoto, sha256, assessDeliverySize, deliveryFilename, orientedDimensions,
  DELIVERY_MIN_PIXELS, DELIVERY_MAX_PIXELS,
} from '../process';

async function jpeg(width: number, height: number, orientation?: number) {
  let img = sharp({
    create: { width, height, channels: 3, background: { r: 120, g: 120, b: 120 } },
  });
  // withExif() silently discards Orientation; withMetadata() is the supported path.
  if (orientation) img = img.withMetadata({ orientation });
  return img.jpeg().toBuffer();
}

test('sha256 is stable and distinguishes different bytes', async () => {
  const a = await jpeg(64, 64);
  const b = await jpeg(64, 65);
  assert.equal(sha256(a), sha256(a));
  assert.notEqual(sha256(a), sha256(b));
  assert.match(sha256(a), /^[0-9a-f]{64}$/);
});

test('renditions are generated and never larger than the caps', async () => {
  const result = await processPhoto(await jpeg(4000, 3000));
  assert.ok(result.display.width <= 2048 && result.display.height <= 2048);
  assert.ok(result.thumbnail.width <= 480 && result.thumbnail.height <= 480);
  // Aspect ratio must survive.
  assert.ok(Math.abs(result.display.width / result.display.height - 4 / 3) < 0.01);
});

test('a small photo is not upscaled', async () => {
  const result = await processPhoto(await jpeg(200, 150));
  assert.equal(result.display.width, 200);
  assert.equal(result.display.height, 150);
});

test('有効画素数 assessment brackets the 電子納品 guideline', () => {
  assert.equal(assessDeliverySize(1200, 900).verdict, 'ok');          // 1.08M
  assert.equal(assessDeliverySize(640, 480).verdict, 'too_small');    // 0.31M
  assert.equal(assessDeliverySize(6000, 4000).verdict, 'too_large');  // 24M
  assert.equal(assessDeliverySize(null, null).verdict, 'unknown');

  // Boundaries land on the correct side.
  assert.equal(assessDeliverySize(DELIVERY_MIN_PIXELS, 1).verdict, 'ok');
  assert.equal(assessDeliverySize(DELIVERY_MAX_PIXELS + 1, 1).verdict, 'too_large');
});

test('orientedDimensions transposes only for quarter turns', () => {
  // 1-4 are upright or mirrored: shape unchanged. 5-8 are quarter turns: transposed.
  for (const o of [1, 2, 3, 4]) {
    assert.deepEqual(orientedDimensions(400, 300, o), { width: 400, height: 300 }, `orientation ${o}`);
  }
  for (const o of [5, 6, 7, 8]) {
    assert.deepEqual(orientedDimensions(400, 300, o), { width: 300, height: 400 }, `orientation ${o}`);
  }
  // Missing or out-of-range values must not transpose.
  assert.deepEqual(orientedDimensions(400, 300, undefined), { width: 400, height: 300 });
  assert.deepEqual(orientedDimensions(400, 300, 9), { width: 400, height: 300 });
  assert.deepEqual(orientedDimensions(null, null, 6), { width: null, height: null });
});

test('a rotated photo is stored with the dimensions a viewer actually sees', async () => {
  // Orientation 6 means the viewer sees the image turned 90°, so a 400x300 file
  // displays as 300x400. Storing the raw values would sort albums by the wrong edge.
  const result = await processPhoto(await jpeg(400, 300, 6));
  assert.equal(result.width, 300);
  assert.equal(result.height, 400);
  // The rendition is physically rotated, so it agrees with the stored shape.
  assert.ok(result.display.height > result.display.width);
});

test('delivery filenames follow the P0000001.JPG convention', () => {
  assert.equal(deliveryFilename(1), 'P0000001.JPG');
  assert.equal(deliveryFilename(42), 'P0000042.JPG');
  assert.equal(deliveryFilename(1234567), 'P1234567.JPG');
});

test('the original buffer is never mutated', async () => {
  const original = await jpeg(300, 200);
  const before = sha256(original);
  await processPhoto(original);
  assert.equal(sha256(original), before, 'processing must not touch the evidence');
});
