import { z } from 'zod';

/**
 * Fail at boot with a readable message rather than at 2am with `undefined is not
 * a function` inside the S3 client.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),

  AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
  AUTH_URL: z.string().url().optional(),

  /**
   * Object storage.
   *
   * Leave the S3 settings empty and files are written to STORAGE_DIR on local disk —
   * no extra service to run in development. Set all four S3 values and the same code
   * writes to S3 (or any S3-compatible store) instead.
   */
  STORAGE_DIR: z.string().default('./.storage'),
  S3_ENDPOINT: z.string().url().optional(),
  S3_REGION: z.string().default('ap-northeast-1'),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  /** Some S3-compatible stores need path-style addressing; real S3 does not. */
  S3_FORCE_PATH_STYLE: z
    .string()
    .optional()
    .transform((v) => v === 'true'),

  /** Upload ceiling per file, bytes. Construction photos are large. */
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(52428800), // 50MB

  /** Optional: Google OAuth. The button is hidden unless both are set. */
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  /** Optional: vision model for handwritten 看板 OCR. */
  ANTHROPIC_API_KEY: z.string().optional(),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  return parsed.data;
}

export const env = loadEnv();
export type Env = z.infer<typeof envSchema>;
