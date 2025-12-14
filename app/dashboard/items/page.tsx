import Link from 'next/link';
import { getDb } from '@/db/client';
import { items } from '@/db/schema';
import { and, desc, ilike, like, or, sql, eq } from 'drizzle-orm';

type SearchParams = {
  q?: string;
  status?: string;
};

export default async function ItemsPage({ searchParams }: { searchParams: SearchParams }) {
  const db = getDb();
  const q = (searchParams.q || '').trim();
  const status = (searchParams.status || '').trim();

  const conds = [] as any[];
  if (q) {
    const p = `%${q}%`;
    conds.push(
      or(ilike(items.sku, p), ilike(items.title, p), ilike(items.artist, p))
    );
  }
  if (status) conds.push(eq(items.status, status as any));

  const rows = await db
    .select()
    .from(items)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(items.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Items</h1>
        <Link href="/dashboard/items/new" className="rounded bg-black px-3 py-2 text-white">
          新規追加
        </Link>
      </div>

      <form className="flex flex-wrap gap-2">
        <input
          type="text"
          name="q"
          placeholder="sku / title / artist"
          defaultValue={q}
          className="w-64 rounded border px-3 py-2"
        />
        <select name="status" defaultValue={status} className="rounded border px-3 py-2">
          <option value="">status (all)</option>
          <option value="UNPROCESSED">UNPROCESSED</option>
          <option value="IDENTIFIED">IDENTIFIED</option>
          <option value="READY">READY</option>
          <option value="LISTED">LISTED</option>
          <option value="SOLD">SOLD</option>
        </select>
        <button className="rounded border px-3 py-2" type="submit">検索</button>
      </form>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b bg-gray-50 text-left">
            <tr>
              <th className="p-2">SKU</th>
              <th className="p-2">Type</th>
              <th className="p-2">Status</th>
              <th className="p-2">Title</th>
              <th className="p-2">Artist</th>
              <th className="p-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="p-2 text-blue-600 underline">
                  <Link href={`/dashboard/items/${r.id}`}>{r.sku}</Link>
                </td>
                <td className="p-2">{r.itemType}</td>
                <td className="p-2">{r.status}</td>
                <td className="p-2">{r.title || '-'}</td>
                <td className="p-2">{r.artist || '-'}</td>
                <td className="p-2">{r.createdAt?.toISOString?.() || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

