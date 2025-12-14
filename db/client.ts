import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

declare global {
  // eslint-disable-next-line no-var
  var __db__: ReturnType<typeof drizzle> | undefined;
}

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  if (global.__db__) return global.__db__;
  const client = postgres(process.env.DATABASE_URL, { prepare: true, max: 1 });
  global.__db__ = drizzle(client, { schema });
  return global.__db__;
}

