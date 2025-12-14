import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/db/client';
import { items, captures } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

import DeleteCaptureButton from './delete-capture-button';
import UploadForm from './upload-form';
import ItemEditForm from './edit-form';

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

      <ItemEditForm item={item} />

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

