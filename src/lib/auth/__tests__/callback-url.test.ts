import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeCallbackUrl, DEFAULT_CALLBACK_URL } from '../callback-url';

test('同一サイトのパスはそのまま通る', () => {
  assert.equal(safeCallbackUrl('/projects'), '/projects');
  assert.equal(safeCallbackUrl('/admin'), '/admin');
  assert.equal(
    safeCallbackUrl('/projects/6f1c0b6e-0000-4000-8000-000000000001/ledger'),
    '/projects/6f1c0b6e-0000-4000-8000-000000000001/ledger',
  );
});

test('絞り込みの日本語クエリは残す', () => {
  // 工種での絞り込みは日本語を含む。ここを弾くと、絞り込んだ状態に戻れない。
  const url = '/projects/abc?workType=%E9%89%84%E7%AD%8B%E5%B7%A5';
  assert.equal(safeCallbackUrl(url), url);
});

test('外部サイトへは飛ばさない', () => {
  assert.equal(safeCallbackUrl('https://example.com/steal'), DEFAULT_CALLBACK_URL);
  assert.equal(safeCallbackUrl('//example.com'), DEFAULT_CALLBACK_URL);
  assert.equal(safeCallbackUrl('/\\example.com'), DEFAULT_CALLBACK_URL);
  assert.equal(safeCallbackUrl('http://example.com'), DEFAULT_CALLBACK_URL);
});

test('全角文字が混ざった URL は既定の遷移先に戻す', () => {
  // 案内文から URL をコピーすると、末尾の全角括弧まで入ってしまうことがある。
  // そのまま通すと、ログインは成功しているのに 404 に着地する。
  assert.equal(safeCallbackUrl('/admin）'), DEFAULT_CALLBACK_URL);
  assert.equal(safeCallbackUrl('/admin%EF%BC%89'), DEFAULT_CALLBACK_URL);
  assert.equal(safeCallbackUrl('/設定'), DEFAULT_CALLBACK_URL);
});

test('壊れた符号化は既定の遷移先に戻す', () => {
  assert.equal(safeCallbackUrl('/admin%'), DEFAULT_CALLBACK_URL);
  assert.equal(safeCallbackUrl('/admin%ZZ'), DEFAULT_CALLBACK_URL);
});

test('未指定・空文字は既定の遷移先', () => {
  assert.equal(safeCallbackUrl(undefined), DEFAULT_CALLBACK_URL);
  assert.equal(safeCallbackUrl(null), DEFAULT_CALLBACK_URL);
  assert.equal(safeCallbackUrl(''), DEFAULT_CALLBACK_URL);
  assert.equal(safeCallbackUrl('   '), DEFAULT_CALLBACK_URL);
});

test('パスで始まらないものは受け付けない', () => {
  assert.equal(safeCallbackUrl('dashboard'), DEFAULT_CALLBACK_URL);
  assert.equal(safeCallbackUrl('javascript:alert(1)'), DEFAULT_CALLBACK_URL);
});
