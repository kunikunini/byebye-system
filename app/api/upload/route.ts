import { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/src/lib/supabase';
import { getDb } from '@/db/client';
import { captures, items } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
  const db = getDb();
  const form = await req.formData();
  const itemId = String(form.get('itemId') || '');
  const kind = String(form.get('kind') || 'other') as any;
  const files = form.getAll('file') as unknown as File[];

  if (!itemId || files.length === 0) return Response.json({ error: 'invalid' }, { status: 400 });

  const [item] = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
  if (!item) return Response.json({ error: 'not_found' }, { status: 404 });

  const supa = getSupabaseAdmin();
  const uploaded: string[] = [];

  for (const f of files) {
    const filename = `${item.sku}_${kind}.jpg`;
    const array = new Uint8Array(await f.arrayBuffer());
    const { error } = await supa.storage.from('captures').upload(filename, array, {
      contentType: 'image/jpeg',
      upsert: true,
    });
    if (error) return Response.json({ error: error.message }, { status: 500 });

    await db.insert(captures).values({ itemId, kind, storagePath: filename });
    uploaded.push(filename);
  }

  return Response.json({ ok: true, uploaded });
}

