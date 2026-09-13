import { S3Client, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@/lib/env';

const globalForS3 = globalThis as unknown as { __s3Client?: S3Client };

export const s3 =
  globalForS3.__s3Client ??
  new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });

if (env.NODE_ENV !== 'production') globalForS3.__s3Client = s3;

export const BUCKET = env.S3_BUCKET;

/**
 * Storage key layout.
 *
 * Tenant id comes first so a bucket policy, a lifecycle rule, or a "delete this
 * customer's data" request can all operate on a single prefix.
 */
export const storageKeys = {
  photoOriginal: (orgId: string, projectId: string, photoId: string, ext: string) =>
    `org/${orgId}/project/${projectId}/photos/${photoId}/original.${ext}`,
  photoDisplay: (orgId: string, projectId: string, photoId: string) =>
    `org/${orgId}/project/${projectId}/photos/${photoId}/display.jpg`,
  photoThumbnail: (orgId: string, projectId: string, photoId: string) =>
    `org/${orgId}/project/${projectId}/photos/${photoId}/thumb.jpg`,
  drawing: (orgId: string, projectId: string, drawingId: string, ext: string) =>
    `org/${orgId}/project/${projectId}/drawings/${drawingId}.${ext}`,
  blackboardPreview: (orgId: string, templateId: string) =>
    `org/${orgId}/blackboards/${templateId}/preview.png`,
  blackboardImportSource: (orgId: string, importId: string, ext: string) =>
    `org/${orgId}/blackboard-imports/${importId}/source.${ext}`,
  orgLogo: (orgId: string, ext: string) => `org/${orgId}/logo.${ext}`,
  export: (orgId: string, exportId: string, filename: string) =>
    `org/${orgId}/exports/${exportId}/${filename}`,
};

export async function putObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function getObjectBuffer(key: string): Promise<Buffer> {
  const res = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  if (!res.Body) throw new Error(`Object not found: ${key}`);
  return Buffer.from(await res.Body.transformToByteArray());
}

export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export async function objectExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Short-lived read URL. Photos are never served from a public bucket — every read
 * goes through a capability check and then a presigned URL, so revoking a partner's
 * access actually stops them reading the file.
 */
export async function signedReadUrl(key: string, expiresInSeconds = 300): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), {
    expiresIn: expiresInSeconds,
  });
}

/** Presigned PUT so large photos go browser → storage without passing through Node. */
export async function signedUploadUrl(
  key: string,
  contentType: string,
  expiresInSeconds = 900,
): Promise<string> {
  return getSignedUrl(s3, new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType }), {
    expiresIn: expiresInSeconds,
  });
}
