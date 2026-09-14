import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createLocalDriver } from '../local';
import { assertSafeKey } from '../types';
import { storageKeys, organizationIdFromKey } from '../keys';

const ORG = '11111111-1111-4111-8111-111111111111';

async function withRoot(fn: (root: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'storage-test-'));
  try {
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test('保存キーの検証は経路をさかのぼる指定を拒否する', () => {
  // 許可されるもの
  assert.doesNotThrow(() => assertSafeKey('org/abc/project/x/photos/1/display.jpg'));
  assert.doesNotThrow(() => assertSafeKey('a'));

  // 拒否されるべきもの。ここが緩いと STORAGE_DIR の外を読める。
  for (const bad of [
    '../etc/passwd',
    'org/../../etc/passwd',
    'org/a/../../../secret',
    '/etc/passwd',
    './hidden',
    'org//double',
    '',
    'org/a\0b',
    'org/a b',
  ]) {
    assert.throws(() => assertSafeKey(bad), new RegExp('invalid storage key'), `should reject: ${JSON.stringify(bad)}`);
  }
});

test('保存と読み出しが往復する', async () => {
  await withRoot(async (root) => {
    const s = createLocalDriver(root);
    const key = storageKeys.photoDisplay(ORG, 'p1', 'ph1');
    const bytes = Buffer.from('construction-photo-bytes');

    assert.equal(await s.exists(key), false);
    await s.put(key, bytes, 'image/jpeg');
    assert.equal(await s.exists(key), true);
    assert.deepEqual(await s.get(key), bytes);

    await s.delete(key);
    assert.equal(await s.exists(key), false);
  });
});

test('存在しないキーの削除は失敗しない', async () => {
  await withRoot(async (root) => {
    const s = createLocalDriver(root);
    await s.delete(storageKeys.photoDisplay(ORG, 'p', 'missing'));
  });
});

test('保存ディレクトリの外には書けない・読めない', async () => {
  await withRoot(async (root) => {
    // root の隣に、盗み読みの対象となるファイルを置く
    const outside = join(root, '..', `outside-${Date.now()}.txt`);
    await writeFile(outside, 'secret');

    const inner = join(root, 'inner');
    await mkdir(inner, { recursive: true });
    const s = createLocalDriver(inner);

    for (const bad of ['../outside.txt', '../../etc/passwd']) {
      await assert.rejects(() => s.get(bad), /invalid storage key/);
      await assert.rejects(() => s.put(bad, Buffer.from('x'), 'text/plain'), /invalid storage key/);
    }
    await rm(outside, { force: true });
  });
});

test('閲覧 URL は自前の配信エンドポイントを指す', async () => {
  await withRoot(async (root) => {
    const s = createLocalDriver(root);
    const key = storageKeys.photoThumbnail(ORG, 'p1', 'ph1');
    assert.equal(await s.readUrl(key), `/api/files/${key}`);
  });
});

test('ローカル保存では直接アップロード用の URL を発行しない', async () => {
  await withRoot(async (root) => {
    const s = createLocalDriver(root);
    // null を返すことで、呼び出し側が API 経由に切り替えられる。
    assert.equal(await s.uploadUrl('org/a/x.jpg', 'image/jpeg'), null);
  });
});

test('保存キーは組織IDで始まる', () => {
  const key = storageKeys.photoOriginal(ORG, 'proj', 'photo', 'JPG');
  assert.ok(key.startsWith(`org/${ORG}/`), key);
  // 組織単位の削除やライフサイクル設定が前方一致で済むことの担保。
  assert.equal(organizationIdFromKey(key), ORG);
  assert.equal(organizationIdFromKey('not/a/key'), null);
});
