import type { Config } from 'drizzle-kit';
import { config as loadEnv } from 'dotenv';

// .env.local を優先的に読み込む（存在しなければ何もしない）
loadEnv({ path: '.env.local' });
loadEnv();

export default {
  schema: './db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || ''
  }
} satisfies Config;
