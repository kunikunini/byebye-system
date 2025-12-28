import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { saved_views } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const db = getDb();
    const id = params.id;

    await db.delete(saved_views).where(eq(saved_views.id, id));

    return Response.json({ ok: true });
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const db = getDb();
    const id = params.id;
    const body = await req.json();
    const { name, filters, sort } = body ?? {};

    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
        return Response.json({ error: 'invalid_name' }, { status: 400 });
    }
    if (filters !== undefined && typeof filters !== 'object') {
        return Response.json({ error: 'invalid_filters' }, { status: 400 });
    }

    const patch: any = { updatedAt: sql`now()` };
    if (name !== undefined) patch.name = name.trim();
    if (filters !== undefined) patch.filters = filters;
    if (sort !== undefined) patch.sort = sort;

    const [updated] = await db
        .update(saved_views)
        .set(patch)
        .where(eq(saved_views.id, id))
        .returning();

    return Response.json(updated ?? null, { status: updated ? 200 : 404 });
}
