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
import SaveViewModal from './save-view-modal';

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

const TARGET_CAPTURES = { VINYL: 2, CD: 2, BOOK: 2 } as const;

type ItemWithCounts = typeof items.$inferSelect & {
  capturesCount: number;
  frontThumb: string | null;
  backThumb: string | null;
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

  // 3. Image Missing (Must have Front AND Back)
  if (!item.frontThumb || !item.backThumb) {
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
      or(
        ilike(items.sku, p),
        ilike(items.title, p),
        ilike(items.artist, p),
        ilike(items.catalogNo, p)
      )
    );
  }
  if (status) conds.push(eq(items.status, status as any));
  if (type) conds.push(eq(items.itemType, type as any));

  // Select with subquery for counts and thumbs
  const rows = await db
    .select({
      ...getTableColumns(items),
      capturesCount: sql<number>`(SELECT count(*)::int FROM captures WHERE captures.item_id = items.id)`.mapWith(Number),
      frontThumb: sql<string | null>`(SELECT storage_path FROM captures WHERE captures.item_id = items.id AND captures.kind = 'front' LIMIT 1)`,
      backThumb: sql<string | null>`(SELECT storage_path FROM captures WHERE captures.item_id = items.id AND captures.kind = 'back' LIMIT 1)`
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
          <h1 className="text-xl font-bold text-gray-900">商品一覧</h1>
          <SavedViewsSelector />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/items/new"
              className="flex items-center gap-2 rounded-xl bg-black px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-black/10 transition-all duration-200 hover:scale-105 hover:bg-gold-2 hover:text-black hover:shadow-gold-2/20 active:scale-95"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span>新規追加</span>
            </Link>
          </div>
          <WorkQueueStatus
            nextItemId={rows.length > 0 ? rows[0].id : null}
            totalCount={rows.length}
            viewName={viewName}
          />
        </div>

        <form className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <input
              type="text"
              name="q"
              placeholder="SKU / タイトル / アーティスト"
              defaultValue={q}
              className="w-72 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:border-black focus:outline-none focus:ring-1 focus:ring-black shadow-sm transition-all"
            />
          </div>
          <select
            name="status"
            defaultValue={status}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-text-primary focus:border-black focus:outline-none focus:ring-1 focus:ring-black shadow-sm cursor-pointer"
          >
            <option value="">ステータス (すべて)</option>
            <option value="UNPROCESSED">未処理</option>
            <option value="IDENTIFIED">特定済み</option>
            <option value="READY">準備完了</option>
            <option value="LISTED">出品済み</option>
            <option value="SOLD">売却済み</option>
          </select>
          <select
            name="type"
            defaultValue={type}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-text-primary focus:border-black focus:outline-none focus:ring-1 focus:ring-black shadow-sm cursor-pointer"
          >
            <option value="">商品タイプ (すべて)</option>
            <option value="VINYL">レコード</option>
            <option value="CD">CD</option>
          </select>
          <button
            className="group flex items-center gap-2 rounded-xl bg-black px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-black/10 transition-all duration-200 hover:scale-105 hover:bg-gold-2 hover:text-black active:scale-95"
            type="submit"
          >
            <svg className="h-4 w-4 transition-transform group-hover:rotate-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>検索</span>
          </button>
          <div className="h-8 w-px bg-gray-200 mx-1 hidden sm:block"></div>
          <SaveViewModal />
        </form>

        <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-md">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-surface-elevated text-left text-sm font-medium text-text-secondary">
                <th className="px-4 py-3 text-center w-10">
                  <ItemsTableSelectAll ids={rows.map(r => r.id)} />
                </th>
                <th className="px-4 py-3">画像</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">型番</th>
                <th className="px-4 py-3">商品タイプ</th>
                <th className="px-4 py-3">状態</th>
                <th className="px-4 py-3">進捗</th>
                <th className="px-4 py-3">タイトル</th>
                <th className="px-4 py-3">アーティスト</th>
                <th className="px-4 py-3">登録日</th>
                <th className="px-4 py-3">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((r) => {
                const humanStatus = getHumanStatus(r);
                const targetCaptures = TARGET_CAPTURES[r.itemType as keyof typeof TARGET_CAPTURES] || 2;
                const infoFilled = getInfoFilledCount(r);

                return (
                  <tr
                    key={r.id}
                    className="relative border-b border-white/5 bg-surface-card transition-colors hover:bg-gray-50 group"
                  >
                    <td className="px-4 py-3 text-center w-10 relative z-20">
                      <ItemCheckbox id={r.id} />
                    </td>
                    <td className="px-4 py-3 relative z-20">
                      <Link href={`/dashboard/items/${r.id}`} className="block group-hover:opacity-80 transition-opacity">
                        <div className="h-12 w-12 flex-shrink-0 overflow-hidden rounded bg-gray-100 border border-gray-200 relative shadow-sm group-hover:shadow-md transition-shadow">
                          {r.frontThumb ? (
                            <img
                              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/captures/${r.frontThumb}`}
                              className="h-full w-full object-cover"
                              alt=""
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-gray-300 bg-gray-50">
                              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                          )}
                          {/* Hover overlay hint */}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          </div>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono font-medium relative z-20">
                      <div className="flex flex-col gap-1 items-start">
                        {r.rank && r.rank !== 'N' && (
                          <span className={`
                                inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-black border uppercase tracking-tighter
                                ${r.rank === 'R' ? 'bg-blue-50 text-blue-600 border-blue-200' : ''}
                                ${r.rank === 'SR' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : ''}
                                ${r.rank === 'SSR' ? 'bg-amber-50 text-amber-600 border-amber-200 shadow-sm' : ''}
                                ${r.rank === 'UR' ? 'bg-purple-50 text-purple-600 border-purple-200 shadow-sm animate-pulse' : ''}
                            `}>
                            {r.rank}
                          </span>
                        )}
                        <Link
                          href={`/dashboard/items/${r.id}`}
                          className="inline-block px-2.5 py-1 -mx-2 -my-1 rounded-md text-blue-600 hover:bg-blue-600 hover:text-white transition-all duration-200 font-bold tracking-tight shadow-sm hover:shadow-md"
                        >
                          {r.sku}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-primary whitespace-nowrap relative z-20 font-bold">{r.catalogNo || '-'}</td>
                    <td className="px-4 py-3 text-text-secondary relative z-20">
                      {r.itemType === 'VINYL' ? 'レコード' : r.itemType === 'CD' ? 'CD' : r.itemType}
                    </td>
                    <td className="px-4 py-3 relative z-20">
                      <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap ${humanStatus.color}`}>
                        {humanStatus.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-primary whitespace-nowrap relative z-20">
                      <div className="flex gap-3">
                        <span title="画像枚数" className={r.capturesCount >= targetCaptures ? 'text-green-600 font-bold' : 'text-gray-400'}>
                          📷 {r.capturesCount}/{targetCaptures}
                        </span>
                        <span title="情報入力数" className={infoFilled >= 3 ? 'text-green-600 font-bold' : 'text-gray-400'}>
                          📝 {infoFilled}/3
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-primary max-w-[200px] truncate relative z-20 font-medium" title={r.title || ''}>
                      <Link href={`/dashboard/items/${r.id}`} className="hover:underline decoration-gray-400 underline-offset-4">
                        {r.title || '-'}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-text-primary max-w-[200px] truncate relative z-20" title={r.artist || ''}>{r.artist || '-'}</td>
                    <td className="px-4 py-3 text-text-muted whitespace-nowrap relative z-20 text-xs">{r.createdAt?.toISOString?.().split('T')[0] || ''}</td>
                    <td className="px-4 py-3 text-center relative z-20">
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/items/${r.id}`} className="p-2 text-gray-400 hover:text-gray-900 rounded-full hover:bg-gray-100 transition-colors" title="詳細">
                          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                        <DeleteItemButton id={r.id} sku={r.sku} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <BatchActionBar />
        </div>
      </div>
    </ItemsSelectionProvider >
  );
}
