import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '@/lib/env';

/**
 * Next dev reloads modules on every edit; without the global cache each reload
 * opens a fresh pool and Postgres runs out of connections within a few minutes.
 */
const globalForDb = globalThis as unknown as {
  __pgClient?: ReturnType<typeof postgres>;
};

const client =
  globalForDb.__pgClient ??
  postgres(env.DATABASE_URL, {
    /*
     * One connection in development.
     *
     * `npm run dev:db` serves PostgreSQL through PGlite's socket server, which
     * accepts a single connection at a time — a second one is reset. postgres.js
     * queues queries on one connection, so the app behaves correctly; it just does
     * not run them in parallel. Point DATABASE_URL at a real PostgreSQL and raise
     * DB_POOL_MAX when you need concurrency.
     */
    max: Number(process.env.DB_POOL_MAX ?? (env.NODE_ENV === 'production' ? 20 : 1)),
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (env.NODE_ENV !== 'production') globalForDb.__pgClient = client;

export const db = drizzle(client, { schema });
export type Database = typeof db;
export { schema };
