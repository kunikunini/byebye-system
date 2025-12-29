import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { items } from '@/db/schema';
import { inArray } from 'drizzle-orm';

export async function POST(req: NextRequest) {
    const db = getDb();
    const { ids } = await req.json();

    if (!ids || !Array.isArray(ids)) {
        return Response.json({ error: 'invalid_ids' }, { status: 400 });
    }

    const rows = await db
        .select({
            id: items.id,
            sku: items.sku,
            catalogNo: items.catalogNo,
            title: items.title,
            artist: items.artist,
        })
        .from(items)
        .where(inArray(items.id, ids));

    return Response.json(rows);
}
