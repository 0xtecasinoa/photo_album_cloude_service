import { mkdir, readFile, writeFile, unlink, access } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { assertSafeKey, type StorageDriver } from './types';

/**
 * ローカルディスクへの保存。
 *
 * 開発時の既定です。追加のサービスを立てずに動かせます。
 * 本番では S3 などを使ってください（サーバーを複数台にすると共有できないため）。
 */
export function createLocalDriver(rootDir: string): StorageDriver {
  const root = resolve(rootDir);

  /** キーを検証したうえで、必ず root 配下に収まることを確認する。 */
  const pathFor = (key: string): string => {
    assertSafeKey(key);
    const full = resolve(join(root, key));
    // 検証をすり抜けた場合の最後の砦。
    if (full !== root && !full.startsWith(root + sep)) {
      throw new Error('resolved path escapes storage root');
    }
    return full;
  };

  return {
    name: 'local',

    async put(key, body) {
      const full = pathFor(key);
      await mkdir(dirname(full), { recursive: true });
      await writeFile(full, body);
    },

    async get(key) {
      return readFile(pathFor(key));
    },

    async delete(key) {
      await unlink(pathFor(key)).catch(() => {});
    },

    async exists(key) {
      try {
        await access(pathFor(key));
        return true;
      } catch {
        return false;
      }
    },

    async readUrl(key) {
      assertSafeKey(key);
      // 自前の配信エンドポイント。権限確認はそのルートで行う。
      return `/api/files/${key}`;
    },

    async uploadUrl() {
      // ローカル保存では直接アップロード用の URL を発行できない。
      return null;
    },
  };
}
