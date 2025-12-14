import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { captures } from '@/db/schema';
import { getSupabaseAdmin } from '@/src/lib/supabase';
import { eq } from 'drizzle-orm';

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const db = getDb();
    const id = params.id;

    // 1. Get info to deduce storage path
    const [cap] = await db.select().from(captures).where(eq(captures.id, id)).limit(1);
    if (!cap) return new Response(null, { status: 404 });

    // 2. Delete from Storage
    const supa = getSupabaseAdmin();
    const { error } = await supa.storage.from('captures').remove([cap.storagePath]);

    // Note: Even if storage delete fails (e.g. already gone), we proceed to cleanup DB
    if (error) console.error('Storage delete failed:', error);

    // 3. Delete from DB
    await db.delete(captures).where(eq(captures.id, id));

    return new Response(null, { status: 204 });
}
