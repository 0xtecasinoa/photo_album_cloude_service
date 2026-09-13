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
    max: env.NODE_ENV === 'production' ? 20 : 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (env.NODE_ENV !== 'production') globalForDb.__pgClient = client;

export const db = drizzle(client, { schema });
export type Database = typeof db;
export { schema };
