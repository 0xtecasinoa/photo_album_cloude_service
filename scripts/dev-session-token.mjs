/**
 * 開発・検証用のセッショントークンを標準出力に出します。
 * API を curl で確認するときに使います。
 *
 *   TOKEN=$(DEV_USER_ID=<実在するユーザーID> node scripts/dev-session-token.mjs)
 *   curl -b "authjs.session-token=$TOKEN" http://localhost:3000/api/...
 *
 * 注意: アプリはトークンのユーザーIDでデータベースを引くため、実在しない ID を
 * 指定しても画面には入れません（ログイン画面へ戻されます）。
 * ユーザーIDは `npm run db:seed` 実行後のログか、users テーブルで確認してください。
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
