/**
 * ログイン試行の回数制限。
 *
 * 公開したサーバーには、数時間のうちに自動の探索が来ます。実際に
 * このサーバーにも複数のスキャナーが来ています。総当たりを試されたときに
 * 何回でも打てる状態だと、弱いパスワードのアカウントが破られます。
 *
 * 記録はアプリの中（メモリ）に持ちます。データベースに書くと、
 * 攻撃のたびに書き込みが走り、攻撃自体が負荷になります。
 * サーバーを再起動すると消えますが、それで困るのは攻撃側だけです。
 *
 * ※ 複数台で動かす場合はこの方式では足りません。その時は Redis など
 *    共有の置き場に移してください。
 */

/** この回数を超えたら受け付けない。 */
const MAX_ATTEMPTS = 8;
/** 数え直すまでの時間。 */
const WINDOW_MS = 10 * 60 * 1000;
/** 超えたときに待たせる時間。 */
const BLOCK_MS = 15 * 60 * 1000;

type Entry = { count: number; firstAt: number; blockedUntil: number };

const attempts = new Map<string, Entry>();

/** 古い記録を捨てる。放っておくと際限なく増える。 */
function sweep(now: number): void {
  if (attempts.size < 5000) return;
  for (const [key, entry] of attempts) {
    if (now > entry.blockedUntil && now - entry.firstAt > WINDOW_MS) attempts.delete(key);
  }
}

export type RateLimitResult = { allowed: boolean; retryAfterSeconds: number };

/**
 * 試行してよいかを尋ねる。数えるのは失敗したときだけ（recordFailure）。
 */
export function checkLoginAllowed(key: string): RateLimitResult {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry) return { allowed: true, retryAfterSeconds: 0 };

  if (now < entry.blockedUntil) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.blockedUntil - now) / 1000) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

/** 失敗を1回数える。上限に達したら待ち時間を設定する。 */
export function recordLoginFailure(key: string): void {
  const now = Date.now();
  sweep(now);

  const entry = attempts.get(key);
  if (!entry || now - entry.firstAt > WINDOW_MS) {
    attempts.set(key, { count: 1, firstAt: now, blockedUntil: 0 });
    return;
  }

  entry.count += 1;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.blockedUntil = now + BLOCK_MS;
    entry.count = 0;
    entry.firstAt = now;
  }
}

/** 成功したら記録を消す。正しく入れた人を待たせない。 */
export function clearLoginFailures(key: string): void {
  attempts.delete(key);
}

/** 試行の主体。メールアドレスと接続元の両方で数える。 */
export function loginKeys(email: string, ip: string | null): string[] {
  const keys = [`email:${email.trim().toLowerCase()}`];
  // 接続元でも数える。アドレスを変えながら試されると、メールだけでは止まらない。
  if (ip) keys.push(`ip:${ip}`);
  return keys;
}
