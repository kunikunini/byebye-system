import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
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

  // Use Promise.all for concurrent uploads to significantly speed up processing and prevent timeouts
  try {
    const results = await Promise.all(files.map(async (f, index) => {
      // Append index to timestamp for absolute uniqueness in parallel processing
      const filename = `${item.sku}_${kind}_${Date.now()}_${index}.jpg`;
      const arrayBuffer = await f.arrayBuffer();
      const array = new Uint8Array(arrayBuffer);

      const { error } = await supa.storage.from('captures').upload(filename, array, {
        contentType: 'image/jpeg',
        upsert: false,
      });

      if (error) throw new Error(`Supabase upload failed: ${error.message}`);

      await db.insert(captures).values({ itemId, kind, storagePath: filename });
      return filename;
    }));

    try {
      revalidatePath('/dashboard/items');
      revalidatePath(`/dashboard/items/${itemId}`);
    } catch (e) {
      console.error('Revalidation error:', e);
    }

    return Response.json({ success: true, itemId, files: results });
  } catch (err: any) {
    console.error('Parallel upload error:', err);
    return Response.json({ success: false, error: err.message }, { status: 500 });
  }
}
