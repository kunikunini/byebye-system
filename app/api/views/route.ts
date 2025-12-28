import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { saved_views } from '@/db/schema';
import { desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
    const db = getDb();
    const views = await db.select().from(saved_views).orderBy(desc(saved_views.updatedAt));
    return Response.json(views);
}

export async function POST(req: NextRequest) {
    const db = getDb();
    const body = await req.json();
    const { name, filters, sort } = body ?? {};

    if (!name || typeof name !== 'string' || !name.trim()) {
        return Response.json({ error: 'invalid_name' }, { status: 400 });
    }
    if (!filters || typeof filters !== 'object') {
        return Response.json({ error: 'invalid_filters' }, { status: 400 });
    }

    const [inserted] = await db
        .insert(saved_views)
        .values({
            name: name.trim(),
            filters,
            sort: sort ?? null,
        })
        .returning();

    return Response.json(inserted);
}
