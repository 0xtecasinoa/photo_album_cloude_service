import {
  S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { assertSafeKey, type StorageDriver } from './types';

export type S3Config = {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
};

/** S3 および S3 互換ストレージ。本番向け。 */
export function createS3Driver(config: S3Config): StorageDriver {
  const client = new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
  const Bucket = config.bucket;

  return {
    name: 's3',

    async put(key, body, contentType) {
      assertSafeKey(key);
      await client.send(new PutObjectCommand({ Bucket, Key: key, Body: body, ContentType: contentType }));
    },

    async get(key) {
      assertSafeKey(key);
      const res = await client.send(new GetObjectCommand({ Bucket, Key: key }));
      if (!res.Body) throw new Error(`object not found: ${key}`);
      return Buffer.from(await res.Body.transformToByteArray());
    },

    async delete(key) {
      assertSafeKey(key);
      await client.send(new DeleteObjectCommand({ Bucket, Key: key }));
    },

    async exists(key) {
      assertSafeKey(key);
      try {
        await client.send(new HeadObjectCommand({ Bucket, Key: key }));
        return true;
      } catch {
        return false;
      }
    },

    /**
     * 期限付きの閲覧 URL。
     * バケットは公開しません。権限を確認したうえで都度発行することで、
     * 協力会社のアクセスを止めたときに実ファイルも読めなくなります。
     */
    async readUrl(key, expiresInSeconds = 300) {
      assertSafeKey(key);
      return getSignedUrl(client, new GetObjectCommand({ Bucket, Key: key }), {
        expiresIn: expiresInSeconds,
      });
    },

    /** ブラウザから直接 PUT させる URL。大きな写真が Node を経由しない。 */
    async uploadUrl(key, contentType, expiresInSeconds = 900) {
      assertSafeKey(key);
      return getSignedUrl(client, new PutObjectCommand({ Bucket, Key: key, ContentType: contentType }), {
        expiresIn: expiresInSeconds,
      });
    },
  };
}
