import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/db/client';
import { items, captures } from '@/db/schema';
import { inArray, sql, eq } from 'drizzle-orm';

export async function POST(req: NextRequest) {
    const db = getDb();
    const body = await req.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: 'invalid_ids' }, { status: 400 });
    }

    // Fetch items with captures count
    const rows = await db
        .select({
            sku: items.sku,
            itemType: items.itemType,
            status: items.status,
            title: items.title,
            artist: items.artist,
            catalogNo: items.catalogNo,
            createdAt: items.createdAt,
            capturesCount: sql<number>`(SELECT count(*)::int FROM captures WHERE captures.item_id = items.id)`
        })
        .from(items)
        .where(inArray(items.id, ids));

    // Generate CSV string
    const header = ['SKU', 'Type', 'Status', 'Title', 'Artist', 'CatalogNo', 'Captures', 'CreatedAt'].join(',');
    const lines = rows.map(r => {
        return [
            JSON.stringify(r.sku), // Wrap in quotes to handle commas
            r.itemType,
            r.status,
            JSON.stringify(r.title || ''),
            JSON.stringify(r.artist || ''),
            JSON.stringify(r.catalogNo || ''),
            r.capturesCount,
            r.createdAt ? new Date(r.createdAt).toISOString() : ''
        ].join(',');
    });

    const csv = [header, ...lines].join('\n'); // Standard LF connection

    // Return as CSV file
    return new NextResponse(csv, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': 'attachment; filename="items_export.csv"',
        },
    });
}
