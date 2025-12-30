import { NextRequest } from 'next/server';
import { getDb } from '@/db/client';
import { items } from '@/db/schema';
import { desc, ilike, sql } from 'drizzle-orm';
import { buildSkuSerial, makeSku, todayStamp } from '@/src/lib/sku';

export async function POST(req: NextRequest) {
  const db = getDb();
  const form = await req.formData();
  const itemType = String(form.get('itemType') || 'VINYL') as any;

  const prefix = 'BB';
  const yyyymmdd = todayStamp();

  const likeExpr = `${prefix}-${yyyymmdd}-%`;
  const last = await db
    .select({ sku: items.sku })
    .from(items)
    .where(ilike(items.sku, likeExpr))
    .orderBy(desc(items.sku))
    .limit(1);

  let nextSerial = 1;
  if (last[0]?.sku) {
    const m = /^(?:BB)-(\d{8})-(\d{4})$/.exec(last[0].sku);
    if (m) nextSerial = Number(m[2]) + 1;
  }
  const sku = makeSku(prefix, yyyymmdd, buildSkuSerial(nextSerial));

  const [created] = await db
    .insert(items)
    .values({ sku, itemType, status: 'UNPROCESSED' as any })
    .returning({ id: items.id });

  return Response.json({ success: true, id: created.id, location: `/dashboard/items/${created.id}` });
}

