/**
 * 開発・検証用のセッショントークンを標準出力に出します。
 * 実データベースがない状態で保護された画面や API を確認するために使います。
 *
 *   TOKEN=$(node scripts/dev-session-token.mjs)
 *   curl -b "authjs.session-token=$TOKEN" http://localhost:3000/api/...
 */
import 'dotenv/config';
import { encode } from 'next-auth/jwt';

if (process.env.NODE_ENV === 'production') {
  console.error('本番環境では実行できません。');
  process.exit(1);
}

const token = await encode({
  token: {
    userId: process.env.DEV_USER_ID ?? 'user-1',
    organizationId: process.env.DEV_ORG_ID ?? 'org-demo',
    sub: process.env.DEV_USER_ID ?? 'user-1',
    name: '山田 太郎',
    email: 'taro.yamada@example.com',
  },
  secret: process.env.AUTH_SECRET,
  salt: 'authjs.session-token',
  maxAge: 60 * 60,
});
process.stdout.write(token);
