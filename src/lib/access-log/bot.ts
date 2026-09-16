/**
 * 名乗りから機械かどうかを見分ける。
 *
 * これだけでは足りません。素性を隠して普通のブラウザを名乗る探索が
 * 実際に来ています。主な選別は「JavaScript を動かすかどうか」で行い、
 * ここは補助として使います。
 */

/** 明らかに機械と分かる名乗り。 */
const BOT_PATTERNS = [
  'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget', 'python-requests',
  'go-http-client', 'java/', 'okhttp', 'headlesschrome', 'phantomjs',
  'internetmeasurement', 'palo alto networks', 'infrawatch', 'censys',
  'shodan', 'zgrab', 'masscan', 'nmap', 'expanse', 'netcraft',
  'scan', 'probe', 'monitoring',
];

export function looksLikeBot(userAgent: string | null): boolean {
  if (!userAgent) return true; // 名乗らないものは機械として扱う
  const ua = userAgent.toLowerCase();
  return BOT_PATTERNS.some((p) => ua.includes(p));
}
