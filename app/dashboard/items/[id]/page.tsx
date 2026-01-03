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
        <div>
          <h1 className="text-xl font-black text-gray-900 leading-tight">{item.title || item.sku}</h1>
          {item.title && <p className="text-sm text-gray-400 font-mono mt-0.5">{item.sku}</p>}
        </div>
      </div>

      <WorkNavigation item={item} captures={caps} />

      <section className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-[10px] text-white">1</span>
          <h2 className="text-lg font-bold text-gray-900 font-outfit">画像アップロード</h2>
        </div>
        <UploadForm itemId={id} captures={caps} />
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

