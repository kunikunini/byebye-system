import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { items } from '@/db/schema';
import { inArray } from 'drizzle-orm';

export async function POST(req: NextRequest) {
    const db = getDb();
    const body = await req.json();
    const { ids, patch } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return Response.json({ error: 'invalid_ids' }, { status: 400 });
    }

    // Update logic (only status supported for now based on plan)
    if (patch?.status) {
        await db.update(items)
            .set({ status: patch.status })
            .where(inArray(items.id, ids));
    }

    return Response.json({ ok: true });
}
