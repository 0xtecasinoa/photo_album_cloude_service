import { env } from '@/lib/env';
import { createLocalDriver } from './local';
import { createS3Driver } from './s3';
import type { StorageDriver } from './types';

export { assertSafeKey } from './types';
export { storageKeys, organizationIdFromKey } from './keys';
export type { StorageDriver } from './types';

/**
 * 保存先の選択。
 *
 * S3 の設定が揃っていれば S3、そうでなければローカルディスク。
 * 既定をローカルにしているのは、開発時に追加のサービスを立てずに
 * 動かせるようにするためです。
 */
function selectDriver(): StorageDriver {
  const { S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = env;

  if (S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY) {
    return createS3Driver({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      bucket: S3_BUCKET,
      accessKeyId: S3_ACCESS_KEY_ID,
      secretAccessKey: S3_SECRET_ACCESS_KEY,
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    });
  }

  return createLocalDriver(env.STORAGE_DIR);
}

const globalForStorage = globalThis as unknown as { __storage?: StorageDriver };

export const storage: StorageDriver = globalForStorage.__storage ?? selectDriver();
if (env.NODE_ENV !== 'production') globalForStorage.__storage = storage;


// 既存の呼び出し箇所向けの薄いラッパー。
export const putObject = (key: string, body: Buffer, contentType: string) =>
  storage.put(key, body, contentType);
export const getObjectBuffer = (key: string) => storage.get(key);
export const deleteObject = (key: string) => storage.delete(key);
export const objectExists = (key: string) => storage.exists(key);
export const signedReadUrl = (key: string, expiresInSeconds?: number) =>
  storage.readUrl(key, expiresInSeconds);
export const signedUploadUrl = (key: string, contentType: string, expiresInSeconds?: number) =>
  storage.uploadUrl(key, contentType, expiresInSeconds);
