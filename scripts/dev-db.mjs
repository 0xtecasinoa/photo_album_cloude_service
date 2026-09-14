/**
 * 開発用のデータベースサーバー。
 *
 * Docker が使えない環境向けに、PGlite（WASM 版 PostgreSQL）を
 * PostgreSQL のワイヤプロトコルで公開します。アプリ側からは通常の
 * PostgreSQL と区別がつかないため、DATABASE_URL も接続コードも
 * 本番と同じまま使えます。
 *
 *   node scripts/dev-db.mjs          # 既定: 127.0.0.1:5432、データは .pgdata/
 *
 * 本番では通常の PostgreSQL を使ってください。これは開発用です。
 */
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
import { mkdirSync } from 'node:fs';

const DATA_DIR = process.env.PGDATA_DIR ?? './.pgdata';
const PORT = Number(process.env.PGPORT ?? 5432);
const HOST = process.env.PGHOST ?? '127.0.0.1';

mkdirSync(DATA_DIR, { recursive: true });

const db = await PGlite.create({ dataDir: DATA_DIR });
const server = new PGLiteSocketServer({ db, port: PORT, host: HOST });

await server.start();
console.log(`dev database listening on ${HOST}:${PORT}  (data: ${DATA_DIR})`);
console.log('注意: 同時接続は1本までです。開発サーバーを止めないと psql 等から接続できません。');

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, async () => {
    await server.stop();
    await db.close();
    process.exit(0);
  });
}
