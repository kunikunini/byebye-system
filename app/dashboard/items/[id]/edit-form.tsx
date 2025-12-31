'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DeleteItemButton from './delete-button';
import DiscogsResultModal from './discogs-result-modal';
import AutocompleteInput from './autocomplete-input';

type Item = {
    id: string;
    sku: string;
    itemType: 'VINYL' | 'CD' | 'BOOK' | 'OTHER';
    status: 'UNPROCESSED' | 'IDENTIFIED' | 'READY' | 'LISTED' | 'SOLD';
    title: string | null;
    artist: string | null;
    catalogNo: string | null;
    notes: string | null;
    storageLocation: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
};

export default function ItemEditForm({ item }: { item: Item }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showToast, setShowToast] = useState(false);
    const [catalogNo, setCatalogNo] = useState(item.catalogNo ?? '');
    const [title, setTitle] = useState(item.title ?? '');
    const [artist, setArtist] = useState(item.artist ?? '');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showResultModal, setShowResultModal] = useState(false);
    const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(null);
    const [priceSuggestions, setPriceSuggestions] = useState<any | null>(null);
    const [isFetchingPrice, setIsFetchingPrice] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [toastMessage, setToastMessage] = useState('完了しました');

    const handleClearAll = () => {
        setIsClearing(true);
        setTitle('');
        setArtist('');
        setCatalogNo('');
        setSelectedReleaseId(null);
        setPriceSuggestions(null);
        setTimeout(() => setIsClearing(false), 500);
    };

    const handleAIAnalyze = async () => {
        setIsAnalyzing(true);
        try {
            const res = await fetch('/api/gemini/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId: item.id }),
            });
            const data = await res.json();
            if (data.artist) setArtist(data.artist);
            if (data.title) setTitle(data.title);
            if (data.catalogNo) setCatalogNo(data.catalogNo);
            setToastMessage('情報を抽出しました');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } catch (error) {
            alert('AI分析に失敗しました');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSelectResult = (result: any) => {
        setTitle(result.title);
        setArtist(result.artist);
        setSelectedReleaseId(result.id.toString());
        setShowResultModal(false);
    };

    const handleDiscogsSearch = async () => {
        if (!catalogNo.trim()) return;
        setIsSearching(true);
        try {
            const res = await fetch(`/api/discogs/search?catno=${encodeURIComponent(catalogNo)}`);
            const data = await res.json();
            if (data.results?.length > 0) {
                if (data.results.length === 1) {
                    const info = data.results[0];
                    setTitle(info.title);
                    setArtist(info.artist);
                    setSelectedReleaseId(info.id.toString());
                } else {
                    setSearchResults(data.results);
                    setShowResultModal(true);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleFetchPriceSuggestions = async () => {
        if (!selectedReleaseId) return;
        setIsFetchingPrice(true);
        try {
            const res = await fetch(`/api/discogs/price?releaseId=${selectedReleaseId}`);
            const data = await res.json();
            setPriceSuggestions(data);
            setToastMessage('最新データを反映しました');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2000);
        } catch (error) {
            console.error(error);
        } finally {
            setIsFetchingPrice(false);
        }
    };

    const formatDiscogsPrice = (rawPrice: any) => {
        if (!rawPrice) return { display: '-', sub: '' };
        if (typeof rawPrice === 'string') {
            const str = rawPrice.trim();
            if (str.startsWith('¥') || str.endsWith('JPY') || str.includes('円')) return { display: str, sub: '' };
            if (str.includes('$') || str.includes('USD')) {
                const numeric = parseFloat(str.replace(/[^0-9.]/g, ''));
                if (!isNaN(numeric)) return { display: `¥${Math.round(numeric * 150).toLocaleString()}`, sub: str };
            }
            return { display: str, sub: '' };
        }
        let val = typeof rawPrice === 'object' ? rawPrice.value : rawPrice;
        let curr = typeof rawPrice === 'object' ? (rawPrice.currency || '').toUpperCase() : '';
        if (val === undefined || val === null) return { display: '-', sub: '' };
        if (curr === 'JPY' || curr === '¥' || curr === '円') return { display: `¥${Math.round(val).toLocaleString()}`, sub: '' };
        if (curr === 'USD' || curr === '$') return { display: `¥${Math.round(val * 150).toLocaleString()}`, sub: `$${val.toFixed(2)}` };
        return { display: `¥${Math.round(val).toLocaleString()}`, sub: '※推定' };
    };

    return (
        <>
            {/* Toast Notification */}
            {showToast && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                    <div className="rounded-2xl bg-black/90 px-8 py-5 text-white shadow-2xl backdrop-blur-md animate-in zoom-in-95 fade-in duration-300">
                        <div className="flex flex-col items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-2 text-black">✓</div>
                            <p className="text-lg font-bold">{toastMessage}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Search Section */}
            <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/30 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <span className="text-blue-600 font-bold text-sm">✨ AIビジュアル検索</span>
                </div>
                <div className="flex gap-2">
                    <button type="button" onClick={handleAIAnalyze} disabled={isAnalyzing} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-blue-700 disabled:opacity-50 transition-all">
                        {isAnalyzing ? "解析中..." : "ジャケットから検索"}
                    </button>
                    <button type="button" onClick={handleClearAll} className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all">クリア</button>
                </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); /* submit handled by router refresh */ }} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                    <AutocompleteInput label="title" name="title" value={title} onChange={setTitle} type="title" artistContext={artist} />
                    <AutocompleteInput label="artist" name="artist" value={artist} onChange={setArtist} type="artist" />
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-text-secondary mb-1">catalog_no</label>
                        <div className="flex gap-2">
                            <input name="catalog_no" value={catalogNo} onChange={(e) => setCatalogNo(e.target.value)} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 focus:ring-2 focus:ring-gold-2/50 outline-none transition-all" />
                            <button type="button" onClick={handleDiscogsSearch} disabled={isSearching} className="rounded-xl bg-gray-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-black transition-all">検索</button>
                        </div>
                    </div>
                </div>

                {/* Price Analysis Card */}
                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.02)] border-t-[6px] border-t-gold-1">
                    <div className="flex items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gold-2 text-lg font-black text-black">¥</div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">相場分析データ</h3>
                        </div>
                        <div className="flex gap-2">
                            {selectedReleaseId && (
                                <Link href={`https://www.discogs.com/release/${selectedReleaseId}`} target="_blank" className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-600 hover:bg-gray-50 transition-all shadow-sm">
                                    <span>詳細を確認する</span>
                                </Link>
                            )}
                            <button type="button" onClick={handleFetchPriceSuggestions} disabled={!selectedReleaseId || isFetchingPrice} className="rounded-xl bg-black px-6 py-3 text-sm font-black text-white hover:bg-gray-800 disabled:opacity-50 transition-all shadow-xl shadow-black/5">
                                {isFetchingPrice ? "取得中..." : "データを更新"}
                            </button>
                        </div>
                    </div>

                    {priceSuggestions ? (
                        <div className="space-y-6">
                            {/* Demand Metrics & Last Sold */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="rounded-2xl border border-gold-1 bg-gold-50/30 p-4 text-center">
                                    <div className="text-[10px] font-black text-gold-5 uppercase tracking-widest mb-1">最新の販売日</div>
                                    <div className="text-sm font-black text-gray-900">{priceSuggestions.stats?.last_sold ?? 'データなし'}</div>
                                </div>
                                <div className="rounded-2xl border border-pink-100 bg-pink-50/20 p-4 text-center">
                                    <div className="text-[10px] font-black text-pink-400 uppercase tracking-widest mb-1">ほしいリスト</div>
                                    <div className="text-xl font-black text-pink-600">{priceSuggestions.stats?.num_want ?? '-'}</div>
                                </div>
                                <div className="rounded-2xl border border-blue-100 bg-blue-50/20 p-4 text-center">
                                    <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">コレクション</div>
                                    <div className="text-xl font-black text-blue-600">{priceSuggestions.stats?.num_have ?? '-'}</div>
                                </div>
                            </div>

                            {/* Section 1: Current Best Price (FOR SALE) */}
                            <div className="rounded-2xl bg-gray-900 p-6 text-white shadow-xl shadow-black/10">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-400">
                                        <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
                                        現在の出品状況 (Marketplace)
                                    </h4>
                                    <span className="text-[10px] font-bold text-green-400">{priceSuggestions.stats?.num_for_sale ?? 0} 点が販売中</span>
                                </div>
                                <div className="flex items-baseline gap-4">
                                    <span className="text-[11px] font-black text-gray-500 uppercase">販売中の最安値:</span>
                                    {(() => {
                                        const p = formatDiscogsPrice(priceSuggestions.stats?.lowest_listing);
                                        return (
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-4xl font-black">{p.display}</span>
                                                <span className="text-xs text-gray-500">{p.sub}</span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Section 2: Historical Sales Statistics (HISTORY) */}
                            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-6">過去の売買履歴統計 (Sales History)</h4>
                                <div className="grid grid-cols-3 gap-8">
                                    {[
                                        { label: '最低 (Low)', key: 'history_low' },
                                        { label: '中間点 (Med)', key: 'history_med' },
                                        { label: '最高 (High)', key: 'history_high' }
                                    ].map((stat) => {
                                        const p = formatDiscogsPrice(priceSuggestions.stats?.[stat.key]);
                                        return (
                                            <div key={stat.key} className="space-y-1">
                                                <div className="text-[11px] font-black text-gray-400 uppercase">{stat.label}</div>
                                                <div className={`text-2xl font-black tracking-tight ${stat.key === 'history_med' ? 'text-gold-5' : 'text-gray-900'}`}>{p.display}</div>
                                                {p.sub && <div className="text-[10px] text-gray-400 font-bold">{p.sub}</div>}
                                            </div>
                                        );
                                    })}
                                </div>
                                {priceSuggestions.scraped === false && (
                                    <p className="mt-6 text-[10px] text-orange-600 font-bold">※ 直接の統計取得が難しいため、詳細ボタンから公式サイトをご確認ください。</p>
                                )}
                            </div>

                            <p className="text-[10px] text-gray-400 font-bold italic text-right px-2">
                                ※ 「現在の最安値」と「履歴の最低額」は異なります。取引状況に合わせて判断してください。
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                            <p className="text-sm font-bold text-gray-400">🔍 条件を指定して「データを更新」してください。</p>
                        </div>
                    )}
                </div>

                {/* Other Fields & Submit */}
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">storage_location</label>
                        <input name="storage_location" defaultValue={item.storageLocation ?? ''} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 outline-none focus:ring-2 focus:ring-gold-2/50" />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-text-secondary mb-1">notes</label>
                        <textarea name="notes" defaultValue={item.notes ?? ''} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 outline-none focus:ring-2 focus:ring-gold-2/50" rows={3} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">status</label>
                        <select name="status" defaultValue={item.status} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 outline-none focus:ring-2 focus:ring-gold-2/50">
                            {['UNPROCESSED', 'IDENTIFIED', 'READY', 'LISTED', 'SOLD'].map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center gap-4 border-t border-gray-100 pt-8 pb-4">
                    <Link href="/dashboard/items" className="rounded-xl border border-gray-300 bg-white px-8 py-4 text-sm font-black text-gray-700 hover:bg-gray-50 transition-all">一覧に戻る</Link>
                    <button type="submit" onClick={async (e) => {
                        const form = (e.currentTarget.closest('form') as HTMLFormElement);
                        setIsLoading(true);
                        try {
                            const formData = new FormData(form);
                            await fetch(`/api/items/${item.id}`, { method: 'POST', body: formData });
                            setToastMessage('保存完了しました');
                            setShowToast(true);
                            setTimeout(() => { setShowToast(false); router.refresh(); }, 2000);
                        } catch (err) { alert('保存失敗'); }
                        finally { setIsLoading(false); }
                    }} className="rounded-xl bg-black px-12 py-4 text-sm font-black text-white shadow-xl hover:translate-y-[-2px] transition-all">
                        {isLoading ? "保存中..." : "変更を保存"}
                    </button>
                    <div className="ml-auto">
                        <DeleteItemButton id={item.id} sku={item.sku} />
                    </div>
                </div>
            </form>

            {showResultModal && (
                <DiscogsResultModal results={searchResults} onSelect={(r) => {
                    handleSelectResult(r);
                    setShowResultModal(false);
                }} onClose={() => setShowResultModal(false)} />
            )}
        </>
    );
}
