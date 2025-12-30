import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { items } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  const [row] = await db.select().from(items).where(eq(items.id, params.id)).limit(1);
  return Response.json(row ?? null, { status: row ? 200 : 404 });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id;
  const db = getDb();
  const form = await req.formData();

  const payload: any = {
    title: form.get('title')?.toString() || null,
    artist: form.get('artist')?.toString() || null,
    catalogNo: form.get('catalog_no')?.toString() || null,
    notes: form.get('notes')?.toString() || '',
    storageLocation: form.get('storage_location')?.toString() || null,
    status: form.get('status')?.toString() as any,
    updatedAt: sql`now()`,
  };

  await db.update(items).set(payload).where(eq(items.id, id));

  return Response.json({ success: true, id });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const db = getDb();
  await db.delete(items).where(eq(items.id, params.id));
  return new Response(null, { status: 204 });
}

