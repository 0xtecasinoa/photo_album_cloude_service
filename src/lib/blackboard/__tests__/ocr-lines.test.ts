import { test } from 'node:test';
import assert from 'node:assert/strict';
import { removeRuledLines } from '../ocr';

const W = 40;
const H = 20;

function blank(): Uint8Array {
  return new Uint8Array(W * H).fill(255);
}

const at = (px: Uint8Array, x: number, y: number) => px[y * W + x]!;

test('全幅にわたる暗い行は罫線として消される', () => {
  const px = blank();
  for (let x = 0; x < W; x += 1) px[10 * W + x] = 0;

  removeRuledLines(px, W, H);
  assert.equal(at(px, 5, 10), 255, '罫線は白くなる');
});

test('全高にわたる暗い列も消される', () => {
  const px = blank();
  for (let y = 0; y < H; y += 1) px[y * W + 7] = 0;

  removeRuledLines(px, W, H);
  assert.equal(at(px, 7, 5), 255);
});

test('文字くらいの短い暗部は残る', () => {
  // ここを消すと、記入内容そのものが落ちる。
  const px = blank();
  for (let x = 12; x < 20; x += 1) {
    for (let y = 6; y < 12; y += 1) px[y * W + x] = 0;
  }

  removeRuledLines(px, W, H);
  assert.equal(at(px, 15, 9), 0, '文字は残る');
});

test('罫線のすぐ隣（アンチエイリアス）も白くする', () => {
  const px = blank();
  for (let x = 0; x < W; x += 1) {
    px[10 * W + x] = 0;
    px[11 * W + x] = 80; // 縁のにじみ。単体では罫線判定に届かない濃さ
  }

  removeRuledLines(px, W, H);
  assert.equal(at(px, 5, 11), 255, 'にじみも一緒に消える');
});

test('罫線が隣接していても、判定は塗る前の状態で行う', () => {
  // 塗りながら数えると、2本目が「もう白い」と見えて残ってしまう。
  const px = blank();
  for (let x = 0; x < W; x += 1) {
    px[4 * W + x] = 0;
    px[5 * W + x] = 0;
  }

  removeRuledLines(px, W, H);
  assert.equal(at(px, 20, 4), 255);
  assert.equal(at(px, 20, 5), 255);
});
