import Link from 'next/link';
import { getDb } from '@/db/client';
import { items, captures, saved_views } from '@/db/schema';
import { and, desc, ilike, or, eq, sql, getTableColumns } from 'drizzle-orm';
import { RedirectType } from 'next/navigation';
import DeleteItemButton from './delete-item-button';
import SavedViewsSelector from './saved-views-selector';
import WorkQueueStatus from './work-queue-status';
import { ItemsSelectionProvider } from './items-selection-context';
import ItemCheckbox from './item-checkbox';
import ItemsTableSelectAll from './items-table-select-all';
import BatchActionBar from './batch-action-bar';

type SearchParams = {
  q?: string;
  status?: string;
  type?: string;
  viewId?: string;
};

// ビルド時のDB接続を避けるため、動的レンダリングを強制
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

// --- Logic Helpers ---

const TARGET_CAPTURES = { VINYL: 5, CD: 4, BOOK: 5 } as const;

type ItemWithCounts = typeof items.$inferSelect & {
  capturesCount: number;
};

function getInfoFilledCount(item: typeof items.$inferSelect) {
  let count = 0;
  if (item.title) count++;
  if (item.artist) count++;
  if (item.catalogNo) count++;
  return count;
}

function getHumanStatus(item: ItemWithCounts) {
  // 1. SOLD
  if (item.status === 'SOLD') {
    return { label: 'SOLD', color: 'bg-purple-100 text-purple-700 ring-1 ring-purple-600/20' };
  }
  // 2. LISTED
  if (item.status === 'LISTED') {
    return { label: '出品済', color: 'bg-blue-100 text-blue-700 ring-1 ring-blue-600/20' };
  }

  // 3. Image Missing
  const target = TARGET_CAPTURES[item.itemType as keyof typeof TARGET_CAPTURES] || 5;
  if (item.capturesCount < target) {
    return { label: '画像不足', color: 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-600/20' };
  }

  // 4. Info Missing
  const filled = getInfoFilledCount(item);
  if (filled < 3) {
    return { label: '情報不足', color: 'bg-orange-100 text-orange-800 ring-1 ring-orange-600/20' };
  }

  // 5. Ready
  return { label: '出品可能', color: 'bg-green-100 text-green-700 ring-1 ring-green-600/20' };
}

export default async function ItemsPage({ searchParams }: { searchParams: SearchParams }) {
  const db = getDb();
  const q = (searchParams.q || '').trim();
  const status = (searchParams.status || '').trim();
  const type = (searchParams.type || '').trim();

  const conds = [] as any[];
  if (q) {
    const p = `%${q}%`;
    conds.push(
      or(ilike(items.sku, p), ilike(items.title, p), ilike(items.artist, p))
    );
  }
  if (status) conds.push(eq(items.status, status as any));
  if (type) conds.push(eq(items.itemType, type as any));

  // Select with subquery for captures count
  const rows = await db
    .select({
      ...getTableColumns(items),
      capturesCount: sql<number>`(SELECT count(*)::int FROM captures WHERE captures.item_id = items.id)`.mapWith(Number)
    })
    .from(items)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(items.createdAt))
    .limit(100);

  // Fetch view name if viewId is present
  let viewName = undefined;
  if (searchParams.viewId) {
    const [v] = await db.select().from(saved_views).where(eq(saved_views.id, searchParams.viewId)).limit(1);
    viewName = v?.name;
  }

  return (
    <ItemsSelectionProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-text-primary">Items</h1>
          <SavedViewsSelector />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/items/new"
              className="rounded bg-black px-4 py-2 text-sm font-medium text-white shadow-md transition-all duration-200 hover:scale-105 hover:bg-gold-2 hover:text-black hover:shadow-xl active:scale-95"
            >
              新規追加
            </Link>
          </div>
          <WorkQueueStatus
            nextItemId={rows.length > 0 ? rows[0].id : null}
            totalCount={rows.length}
            viewName={viewName}
          />
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
          <select
            name="type"
            defaultValue={type}
            className="rounded border border-gray-200 bg-white px-3 py-2 text-text-primary focus:border-gold-2 focus:outline-none focus:ring-1 focus:ring-gold-2 shadow-sm"
          >
            <option value="">type (all)</option>
            <option value="VINYL">VINYL</option>
            <option value="CD">CD</option>
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
            <thead>
              <tr className="border-b border-white/10 bg-surface-elevated text-left text-sm font-medium text-text-secondary">
                <th className="px-4 py-3 text-center w-10">
                  <ItemsTableSelectAll ids={rows.map(r => r.id)} />
                </th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">作業状態</th>
                <th className="px-4 py-3">進捗</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Artist</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((r) => {
                const humanStatus = getHumanStatus(r);
                const targetCaptures = TARGET_CAPTURES[r.itemType as keyof typeof TARGET_CAPTURES] || 5;
                const infoFilled = getInfoFilledCount(r);

                return (
                  <tr
                    key={r.id}
                    className="relative border-b border-white/5 bg-surface-card transition-colors hover:bg-surface-elevated group"
                  >
                    <td className="px-4 py-3 text-center w-10 relative z-20">
                      <ItemCheckbox id={r.id} />
                    </td>
                    <td className="group relative px-4 py-3 font-mono font-medium text-text-primary">
                      <Link href={`/dashboard/items/${r.id}`} className="block w-full h-full absolute inset-0 z-10"></Link>
                      <span className="relative z-20 text-blue-600 underline decoration-blue-300 underline-offset-4 hover:decoration-blue-500">{r.sku}</span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary relative z-20">{r.itemType}</td>
                    <td className="px-4 py-3 relative z-20">
                      <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap ${humanStatus.color}`}>
                        {humanStatus.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary whitespace-nowrap relative z-20">
                      <div className="flex gap-3">
                        <span title="画像枚数">📷 {r.capturesCount}/{targetCaptures}</span>
                        <span title="情報入力数">📝 {infoFilled}/3</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-primary max-w-[200px] truncate relative z-20" title={r.title || ''}>{r.title || '-'}</td>
                    <td className="px-4 py-3 text-text-primary max-w-[200px] truncate relative z-20" title={r.artist || ''}>{r.artist || '-'}</td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap relative z-20">{r.createdAt?.toISOString?.().split('T')[0] || ''}</td>
                    <td className="px-4 py-3 text-center relative z-20">
                      <DeleteItemButton id={r.id} sku={r.sku} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <BatchActionBar />
        </div>
      </div>
    </ItemsSelectionProvider>
  );
}
