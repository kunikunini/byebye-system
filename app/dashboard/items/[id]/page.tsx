import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/db/client';
import { items, captures } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export default async function ItemDetail({ params }: { params: { id: string } }) {
  const db = getDb();
  const id = params.id;

  const [item] = await db.select().from(items).where(eq(items.id, id)).limit(1);
  if (!item) return notFound();

  const caps = await db
    .select()
    .from(captures)
    .where(eq(captures.itemId, id))
    .orderBy(desc(captures.createdAt));

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{item.sku}</h1>
        <Link href="/dashboard/items" className="text-blue-600 underline">
          ← 一覧へ
        </Link>
      </div>

      <form action={`/api/items/${id}`} method="post" className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">title</label>
            <input name="title" defaultValue={item.title ?? ''} className="mt-1 w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">artist</label>
            <input name="artist" defaultValue={item.artist ?? ''} className="mt-1 w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">catalog_no</label>
            <input name="catalog_no" defaultValue={item.catalogNo ?? ''} className="mt-1 w-full rounded border px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium">storage_location</label>
            <input name="storage_location" defaultValue={item.storageLocation ?? ''} className="mt-1 w-full rounded border px-3 py-2" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">notes</label>
            <textarea name="notes" defaultValue={item.notes ?? ''} className="mt-1 w-full rounded border px-3 py-2" rows={3} />
          </div>
          <div>
            <label className="block text-sm font-medium">status</label>
            <select name="status" defaultValue={item.status} className="mt-1 rounded border px-3 py-2">
              {['UNPROCESSED', 'IDENTIFIED', 'READY', 'LISTED', 'SOLD'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button className="rounded bg-black px-3 py-2 text-white" type="submit">
          保存
        </button>
      </form>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">画像アップロード</h2>
        <form action="/api/upload" method="post" encType="multipart/form-data" className="space-y-2">
          <input type="hidden" name="itemId" value={id} />
          <div className="flex items-center gap-3">
            <label className="text-sm">kind</label>
            <select name="kind" className="rounded border px-3 py-2">
              {['front', 'back', 'spine', 'label', 'other'].map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
            <input type="file" name="file" multiple accept="image/*" className="text-sm" />
            <button className="rounded border px-3 py-2" type="submit">
              アップロード
            </button>
          </div>
        </form>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {caps.map((c) => (
            <li key={c.id} className="rounded border p-2 text-sm">
              <div className="font-mono">{c.storagePath}</div>
              <div className="text-gray-600">{c.kind}</div>
              <div className="text-gray-500">{c.createdAt?.toISOString?.() || ''}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

