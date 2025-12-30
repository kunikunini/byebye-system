import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDb } from '@/db/client';
import { items, captures } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

import DeleteCaptureButton from './delete-capture-button';
import UploadForm from './upload-form';
import ItemEditForm from './edit-form';
import WorkNavigation from './work-navigation';

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

      <WorkNavigation item={item} captures={caps} />

      <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-[10px] text-white">1</span>
          <h2 className="text-lg font-bold text-gray-900 font-outfit">画像アップロード</h2>
        </div>
        <UploadForm itemId={id} />

        {caps.length > 0 && (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 pt-2">
            {caps.map((c) => (
              <li key={c.id} className="group relative rounded-2xl border border-gray-100 bg-gray-50/30 p-2 transition-all hover:border-gold-2/30 hover:shadow-lg hover:shadow-gold-2/5">
                <DeleteCaptureButton id={c.id} />
                <div className="aspect-square w-full overflow-hidden rounded-xl bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/captures/${c.storagePath}`}
                    alt={c.kind}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                </div>
                <div className="mt-2 flex flex-col gap-0.5 px-1">
                  <div className="text-[10px] font-mono font-medium text-gray-400 truncate">{c.storagePath}</div>
                  <div className="text-[10px] font-bold text-gold-5 uppercase tracking-wider">{c.kind}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2 px-1">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-[10px] text-white">2</span>
          <h2 className="text-lg font-bold text-gray-900 font-outfit">アイテム情報・相場分析</h2>
        </div>
        <ItemEditForm item={item} />
      </section>
    </div >
  );
}

