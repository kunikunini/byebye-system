'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DeleteItemButton from './delete-button';
import DiscogsResultModal from './discogs-result-modal';
import AutocompleteInput from './autocomplete-input';

// Type definition matching the DB schema (simplified for UI)
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

            if (data.error) {
                if (data.error === 'missing_api_key') {
                    alert('Gemini APIキーが設定されていません。');
                } else {
                    alert(data.message || 'AI分析中にエラーが発生しました');
                }
                return;
            }

            if (data.artist) setArtist(data.artist);
            if (data.title) setTitle(data.title);
            if (data.catalogNo) setCatalogNo(data.catalogNo);

            setToastMessage('情報を抽出しました');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } catch (error) {
            alert('AI分析との通信に失敗しました');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleDiscogsSearch = async () => {
        if (!catalogNo.trim()) {
            alert('品番を入力してください');
            return;
        }

        setIsSearching(true);
        try {
            const res = await fetch(`/api/discogs/search?catno=${encodeURIComponent(catalogNo)}`);
            const data = await res.json();

            if (data.results && data.results.length > 0) {
                if (data.results.length === 1) {
                    const info = data.results[0];
                    setTitle(info.title);
                    setArtist(info.artist);
                    setSelectedReleaseId(info.id.toString());
                } else {
                    setSearchResults(data.results);
                    setShowResultModal(true);
                }
            } else {
                alert('商品が見つかりませんでした');
            }
        } catch (error) {
            alert('検索中にエラーが発生しました');
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectResult = (result: any) => {
        setTitle(result.title);
        setArtist(result.artist);
        setSelectedReleaseId(result.id.toString());
        setShowResultModal(false);
    };

    const handleFetchPriceSuggestions = async () => {
        if (!selectedReleaseId) {
            alert('まず検索してリリースを特定してください');
            return;
        }

        setIsFetchingPrice(true);
        try {
            const res = await fetch(`/api/discogs/price?releaseId=${selectedReleaseId}`);
            const data = await res.json();

            if (data.error) {
                alert('相場情報の取得に失敗しました');
                return;
            }

            setPriceSuggestions(data);
            setToastMessage('最新の市場データを反映しました');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2000);
        } catch (error) {
            alert('通信エラーが発生しました');
        } finally {
            setIsFetchingPrice(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        try {
            const res = await fetch(`/api/items/${item.id}`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Failed to save');

            setToastMessage('保存しました');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
            router.refresh();
        } catch (error) {
            alert('保存に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    const formatDiscogsPrice = (rawPrice: any) => {
        if (!rawPrice) return { display: '-', sub: '' };

        if (typeof rawPrice === 'string') {
            const str = rawPrice.trim();
            if (str.startsWith('¥') || str.endsWith('JPY') || str.includes('円')) {
                return { display: str, sub: '' };
            }
            if (str.includes('$') || str.includes('USD')) {
                const numeric = parseFloat(str.replace(/[^0-9.]/g, ''));
                if (!isNaN(numeric)) {
                    return { display: `¥${Math.round(numeric * 150).toLocaleString()}`, sub: str };
                }
            }
            return { display: str, sub: '' };
        }

        let val = typeof rawPrice === 'object' ? rawPrice.value : rawPrice;
        let curr = typeof rawPrice === 'object' ? (rawPrice.currency || '').toUpperCase() : '';

        if (val === undefined || val === null) return { display: '-', sub: '' };

        if (curr === 'JPY' || curr === '¥' || curr === '円') return { display: `¥${Math.round(val).toLocaleString()}`, sub: '' };
        if (curr === 'USD' || curr === '$') return { display: `¥${Math.round(val * 150).toLocaleString()}`, sub: `$${val.toFixed(2)}` };

        if (val > 500) return { display: `¥${Math.round(val).toLocaleString()}`, sub: '※円と推定' };
        return { display: `¥${Math.round(val * 150).toLocaleString()}`, sub: `$${val.toFixed(2)} ※ドルと推定` };
    };

    return (
        <>
            {/* Toast Notification */}
            {showToast && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                    <div className="rounded-2xl bg-black/90 px-8 py-5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-md animate-in zoom-in-95 fade-in duration-300">
                        <div className="flex flex-col items-center gap-3 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-2">
                                <svg className="h-7 w-7 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-xl font-bold tracking-tight">{toastMessage}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Analyze Box */}
            <div className="mb-6 flex flex-col items-start gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm">
                <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">✨</span>
                    <span className="text-sm font-bold text-blue-900">AIビジュアル検索</span>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={handleAIAnalyze}
                        disabled={isAnalyzing}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                    >
                        {isAnalyzing ? "解析中..." : "ジャケットから情報を抽出"}
                    </button>
                    <button type="button" onClick={handleClearAll} className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 active:scale-95">クリア</button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <AutocompleteInput label="title" name="title" value={title} onChange={setTitle} type="title" artistContext={artist} />
                    <AutocompleteInput label="artist" name="artist" value={artist} onChange={setArtist} type="artist" />
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">catalog_no</label>
                        <div className="mt-1 flex gap-2">
                            <input name="catalog_no" value={catalogNo} onChange={(e) => setCatalogNo(e.target.value)} className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-gold-2" />
                            <button type="button" onClick={handleDiscogsSearch} disabled={isSearching} className="rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700">検索</button>
                        </div>
                    </div>
                </div>

                {/* Price Analysis Section */}
                <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-[0_10px_40px_rgba(0,0,0,0.03)] transition-all">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gold-2 text-[16px] font-black text-black shadow-inner">¥</div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tighter">マーケットプレイス相場</h3>
                        </div>
                        <div className="flex gap-2">
                            {/* --- RESTORED DETAIL BUTTON --- */}
                            {selectedReleaseId && (
                                <Link
                                    href={`https://www.discogs.com/release/${selectedReleaseId}`}
                                    target="_blank"
                                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-300 active:scale-95"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    <span>詳細を確認する</span>
                                </Link>
                            )}
                            <button
                                type="button"
                                onClick={handleFetchPriceSuggestions}
                                disabled={!selectedReleaseId || isFetchingPrice}
                                className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-black transition-all active:scale-95 disabled:opacity-50 ${selectedReleaseId ? 'bg-black text-white hover:bg-gray-800 shadow-xl shadow-black/10' : 'bg-gray-50 text-gray-400'}`}
                            >
                                {isFetchingPrice ? "取得中..." : "相場を更新"}
                            </button>
                        </div>
                    </div>

                    {priceSuggestions ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {/* Want/Have Counts */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="rounded-2xl border border-pink-100 bg-pink-50/30 p-4 text-center">
                                    <div className="text-[11px] font-black text-pink-400 uppercase tracking-widest mb-1">Want list</div>
                                    <div className="text-2xl font-black text-pink-600">{priceSuggestions.stats?.num_want ?? '-'}</div>
                                    <div className="text-[10px] font-bold text-pink-300">ほしい</div>
                                </div>
                                <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-4 text-center">
                                    <div className="text-[11px] font-black text-blue-400 uppercase tracking-widest mb-1">Collection</div>
                                    <div className="text-2xl font-black text-blue-600">{priceSuggestions.stats?.num_have ?? '-'}</div>
                                    <div className="text-[10px] font-bold text-blue-300">持ってる</div>
                                </div>
                            </div>

                            {/* Section 1: Current Best Price */}
                            <div className="rounded-2xl bg-gray-50/50 p-6 border border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest">
                                        <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                        現在の出品状況
                                    </h4>
                                    {priceSuggestions.stats?.num_for_sale !== undefined && (
                                        <span className="text-[10px] font-black text-green-600 bg-green-50 px-2.5 py-1 rounded-full border border-green-100">
                                            {priceSuggestions.stats.num_for_sale} 点が販売中
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-baseline gap-3">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">販売中の最安値:</span>
                                    {(() => {
                                        const p = formatDiscogsPrice(priceSuggestions.stats?.lowest_price);
                                        return (
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-3xl font-black text-gray-900 tracking-tighter">{p.display}</span>
                                                {p.sub && <span className="text-[11px] text-gray-400 font-bold">{p.sub}</span>}
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Section 2: Sales History Statistics */}
                            <div className="rounded-2xl bg-white p-6 border border-gray-100 shadow-sm relative overflow-hidden">
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">過去の売買統計 (Sales History)</h4>
                                    <div className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">最終販売: <span className="text-gray-900 font-black">{priceSuggestions.stats?.last_sold ?? 'なし'}</span></div>
                                </div>

                                <div className="grid grid-cols-3 gap-6">
                                    {[
                                        { label: '最低 (Low)', key: 'lowest_price' },
                                        { label: '中間点 (Med)', key: 'median' },
                                        { label: '最高 (High)', key: 'highest_price' }
                                    ].map((stat) => {
                                        const p = formatDiscogsPrice(priceSuggestions.stats?.[stat.key]);
                                        return (
                                            <div key={stat.key} className="space-y-1">
                                                <div className="text-[11px] font-black text-gray-400 uppercase">{stat.label}</div>
                                                <div className={`text-2xl font-black tracking-tight ${stat.key === 'median' ? 'text-gold-5' : 'text-gray-900'}`}>{p.display}</div>
                                                {p.sub && <div className="text-[9px] text-gray-400 font-bold leading-none">{p.sub}</div>}
                                            </div>
                                        );
                                    })}
                                </div>

                                {priceSuggestions.scraped === false && (
                                    <div className="mt-5 rounded-xl bg-orange-50/50 p-3 border border-orange-100/50">
                                        <p className="text-[10px] text-orange-600 font-bold leading-relaxed">
                                            ※ Discogs側のデータ保護により、直接の統計抽出に制限がかかっています。「詳細を確認する」ボタンからDiscogsサイト上で直接ご確認ください。
                                        </p>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between px-1">
                                <p className="text-[10px] text-gray-400 font-bold italic">※ 通貨記号（¥/$）を優先的に解析しています。1ドル=150円で換算。</p>
                                <details className="group">
                                    <summary className="cursor-pointer text-gray-300 text-[10px] font-black uppercase list-none hover:text-gray-500 transition-colors">Debug Data</summary>
                                    <div className="absolute left-6 right-6 bottom-full mb-6 z-50 animate-in slide-in-from-bottom-2 duration-300">
                                        <pre className="max-h-64 overflow-auto rounded-3xl bg-black/95 p-6 text-[10px] font-mono text-green-400 shadow-2xl backdrop-blur-xl border border-white/10 ring-1 ring-black">
                                            <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-2">
                                                <span className="text-white font-black tracking-widest">NETWORK_RESPONSE_RAW</span>
                                                <span className="text-green-500/50">SCRAPED: {priceSuggestions.scraped ? 'TRUE' : 'FALSE'}</span>
                                            </div>
                                            {JSON.stringify(priceSuggestions, null, 2)}
                                        </pre>
                                    </div>
                                </details>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                            <div className="mb-4 h-12 w-12 text-gray-200">
                                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            </div>
                            <p className="max-w-[280px] text-sm font-bold text-gray-400 leading-relaxed">
                                {selectedReleaseId ? "「相場を更新」ボタンを押して、Discogsから最新の数値を読み込みます。" : "まず上部の検索でリリースを特定してください。"}
                            </p>
                        </div>
                    )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">storage_location</label>
                        <input name="storage_location" defaultValue={item.storageLocation ?? ''} className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 focus:ring-2 focus:ring-gold-2/50 focus:outline-none transition-all" />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-text-secondary">notes</label>
                        <textarea name="notes" defaultValue={item.notes ?? ''} className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 focus:ring-2 focus:ring-gold-2/50 focus:outline-none transition-all" rows={3} />
                    </div>
                </div>

                <div className="flex items-center justify-start gap-4 border-t border-gray-100 pt-8">
                    <Link href="/dashboard/items" className="rounded-xl border border-gray-300 bg-white px-6 py-4 text-sm font-black text-gray-700 hover:bg-gray-50 active:scale-95 transition-all">一覧へ戻る</Link>
                    <button className="rounded-xl bg-black px-10 py-4 text-sm font-black text-white shadow-xl hover:bg-gray-800 hover:-translate-y-0.5 active:scale-95 transition-all" type="submit" disabled={isLoading}>
                        {isLoading ? "保存中..." : "変更を保存する"}
                    </button>
                    <div className="ml-auto">
                        <DeleteItemButton id={item.id} sku={item.sku} />
                    </div>
                </div>
            </form >

            {showResultModal && (
                <DiscogsResultModal results={searchResults} onSelect={handleSelectResult} onClose={() => setShowResultModal(false)} />
            )}
        </>
    );
}
