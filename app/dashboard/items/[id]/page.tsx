import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/db/client';
import { items, captures } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

import DeleteItemButton from './delete-button';
import DeleteCaptureButton from './delete-capture-button';
import UploadForm from './upload-form';

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
        <div className="flex items-center justify-start gap-4 border-t pt-4">
          <Link
            href="/dashboard/items"
            className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:scale-105 hover:bg-gray-50 hover:shadow-lg active:scale-95"
          >
            一覧へ戻る
          </Link>
          <button className="rounded bg-black px-6 py-2 font-medium text-white shadow-sm transition-all duration-200 hover:scale-105 hover:bg-gray-800 hover:shadow-lg active:scale-95" type="submit">
            保存
          </button>
          <DeleteItemButton id={id} />
        </div>
      </form>

      {/* 旧配置削除 */}



      <section className="space-y-4">
        <h2 className="text-lg font-semibold">画像アップロード</h2>
        <UploadForm itemId={id} />

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {caps.map((c) => (
            <li key={c.id} className="relative rounded border p-2 text-sm">
              <DeleteCaptureButton id={c.id} />
              <div className="aspect-square w-full overflow-hidden rounded bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/captures/${c.storagePath}`}
                  alt={c.kind}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="mt-2 text-xs font-mono text-gray-500">{c.storagePath}</div>
              <div className="text-xs text-gray-400">{c.kind}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

