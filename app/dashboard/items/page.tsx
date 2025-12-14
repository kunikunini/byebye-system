import Link from 'next/link';
import { getDb } from '@/db/client';
import { items } from '@/db/schema';
import { and, desc, ilike, like, or, sql, eq } from 'drizzle-orm';

type SearchParams = {
  q?: string;
  status?: string;
};

// ビルド時のDB接続を避けるため、動的レンダリングを強制
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

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
        <h1 className="text-xl font-semibold text-text-primary">Items</h1>
        <Link
          href="/dashboard/items/new"
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white shadow-md transition-all duration-200 hover:scale-105 hover:bg-gold-2 hover:text-black hover:shadow-xl active:scale-95"
        >
          新規追加
        </Link>
      </div>

      <form className="flex flex-wrap gap-2">
        <input
          type="text"
          name="q"
          placeholder="sku / title / artist"
          defaultValue={q}
          className="w-64 rounded border border-gray-200 bg-white px-3 py-2 text-text-primary placeholder-text-muted focus:border-gold-2 focus:outline-none focus:ring-1 focus:ring-gold-2 shadow-sm"
        />
        <select
          name="status"
          defaultValue={status}
          className="rounded border border-gray-200 bg-white px-3 py-2 text-text-primary focus:border-gold-2 focus:outline-none focus:ring-1 focus:ring-gold-2 shadow-sm"
        >
          <option value="">status (all)</option>
          <option value="UNPROCESSED">UNPROCESSED</option>
          <option value="IDENTIFIED">IDENTIFIED</option>
          <option value="READY">READY</option>
          <option value="LISTED">LISTED</option>
          <option value="SOLD">SOLD</option>
        </select>
        <button
          className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-md transition-all duration-200 hover:border-gold-2 hover:text-gold-3 hover:shadow-lg active:scale-95"
          type="submit"
        >
          検索
        </button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-text-secondary">
            <tr>
              <th className="p-3 font-medium">SKU</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Title</th>
              <th className="p-3 font-medium">Artist</th>
              <th className="p-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {rows.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-gray-50/50">
                <td className="p-3 font-medium text-blue-600 underline decoration-blue-300 underline-offset-4 hover:decoration-blue-500">
                  <Link href={`/dashboard/items/${r.id}`}>{r.sku}</Link>
                </td>
                <td className="p-3 text-text-secondary">{r.itemType}</td>
                <td className="p-3">
                  <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${r.status === 'SOLD' ? 'bg-gray-100 text-gray-600' :
                    r.status === 'LISTED' ? 'bg-blue-50 text-blue-700' :
                      r.status === 'READY' ? 'bg-green-50 text-green-700' :
                        'bg-yellow-50 text-yellow-700'
                    }`}>
                    {r.status}
                  </span>
                </td>
                <td className="p-3 text-text-primary">{r.title || '-'}</td>
                <td className="p-3 text-text-primary">{r.artist || '-'}</td>
                <td className="p-3 text-text-muted">{r.createdAt?.toISOString?.().split('T')[0] || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
