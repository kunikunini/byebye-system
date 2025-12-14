import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  const dbUrl = process.env.DATABASE_URL || '';
  let dbHost = '';
  try {
    const u = new URL(dbUrl);
    dbHost = u.hostname || '';
  } catch {}
  const payload = {
    vercelEnv: process.env.VERCEL_ENV || null, // 'production' | 'preview' | 'development'
    dbHost, // ホスト名のみ（秘密は含まない）
    hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),
    hasAnonKey: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    hasServiceRole: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    node: process.version,
  } as const;
  return Response.json(payload);
}

