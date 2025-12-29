import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { items } from '@/db/schema';
import { inArray } from 'drizzle-orm';

export async function POST(req: NextRequest) {
    const db = getDb();
    const body = await req.json();
    const { ids, action, patch } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return Response.json({ error: 'invalid_ids' }, { status: 400 });
    }

    // Batch Delete
    if (action === 'delete') {
        await db.delete(items).where(inArray(items.id, ids));
        return Response.json({ ok: true });
    }

    // Batch Update logic
    if (patch) {
        const updateData: any = {};
        if (patch.status) updateData.status = patch.status;
        if (patch.title !== undefined) updateData.title = patch.title;
        if (patch.artist !== undefined) updateData.artist = patch.artist;

        if (Object.keys(updateData).length > 0) {
            await db.update(items)
                .set(updateData)
                .where(inArray(items.id, ids));
            return Response.json({ ok: true });
        }
    }

    return Response.json({ error: 'invalid_action' }, { status: 400 });
}
