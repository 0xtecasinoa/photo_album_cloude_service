/**
 * 保存先の共通インターフェース。
 *
 * ローカルディスクと S3 のどちらでも同じ呼び出しで済むようにしています。
 * 呼び出し側が保存先を意識しなくてよいのは、将来 S3 へ移すときに
 * アプリ側のコードを書き換えずに済ませるためです。
 */
export type StorageDriver = {
  readonly name: 'local' | 's3';
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  /** 閲覧用 URL。S3 では期限付き URL、ローカルでは自前の配信エンドポイント。 */
  readUrl(key: string, expiresInSeconds?: number): Promise<string>;
  /**
   * ブラウザから直接アップロードさせるための URL。
   * ローカル保存では発行できないため null を返します（API 経由で受け取る）。
   */
  uploadUrl(key: string, contentType: string, expiresInSeconds?: number): Promise<string | null>;
};

/**
 * 保存キーの検証。
 *
 * キーはすべてアプリ側で組み立てますが、配信エンドポイントは URL から
 * キーを受け取るため、ここで必ず通します。`..` を弾かないと
 * STORAGE_DIR の外のファイルを読み出せてしまいます。
 */
const SAFE_KEY = /^[A-Za-z0-9][A-Za-z0-9/._-]*$/;

export function assertSafeKey(key: string): void {
  if (!key || key.length > 512) throw new Error('invalid storage key');
  if (!SAFE_KEY.test(key)) throw new Error('invalid storage key');
  if (key.includes('..') || key.includes('//')) throw new Error('invalid storage key');
}
