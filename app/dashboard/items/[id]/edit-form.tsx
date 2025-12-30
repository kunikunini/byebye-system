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
                    alert('Gemini APIキーが設定されていません。管理者に確認してください。');
                } else {
                    alert(data.message || 'AI分析中にエラーが発生しました');
                }
                return;
            }

            if (data.artist) setArtist(data.artist);
            if (data.title) setTitle(data.title);
            if (data.catalogNo) setCatalogNo(data.catalogNo);

            // Success toast for AI
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
            } else if (data.error === 'missing_token') {
                alert('Discogs APIトークンが設定されていません (.env.local の DISCOGS_TOKEN)');
            } else {
                alert('該当する商品が見つかりませんでした');
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
            alert('まずDiscogs検索で商品を特定してください');
            return;
        }

        setIsFetchingPrice(true);
        try {
            const res = await fetch(`/api/discogs/price?releaseId=${selectedReleaseId}`);
            const data = await res.json();

            console.log('Detailed Price Data:', data);

            if (data.error) {
                if (data.error === 'no_data_available') {
                    alert('このリリースの相場データが見つかりませんでした');
                } else {
                    alert('相場データの取得に失敗しました');
                }
                return;
            }

            setPriceSuggestions(data);
            setToastMessage('最新の市場データを取得しました');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2000);
        } catch (error) {
            console.error('Price fetch error:', error);
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

            setToastMessage('保存完了しました');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);

            router.refresh();
        } catch (error) {
            alert('保存に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    // Helper for formatting prices based on Discogs rules
    const formatDiscogsPrice = (priceObj: any) => {
        if (!priceObj) return { display: '-', sub: '' };

        let val = typeof priceObj === 'object' ? priceObj.value : priceObj;
        let curr = typeof priceObj === 'object' ? (priceObj.currency || '').toUpperCase() : '';

        if (val === undefined || val === null) return { display: '-', sub: '' };

        // Normalizing currency labels
        if (curr === '円' || curr === '¥') curr = 'JPY';
        if (curr === '$') curr = 'USD';

        // 1. Strict Currency Logic
        if (curr === 'JPY') {
            return { display: `¥${Math.round(val).toLocaleString()}`, sub: '' };
        }

        if (curr === 'USD') {
            return {
                display: `¥${Math.round(val * 150).toLocaleString()}`,
                sub: `$${val.toFixed(2)}`
            };
        }

        // 2. Multi-currency handling (EUR, GBP, etc.)
        if (curr) {
            return { display: `${curr} ${val.toLocaleString()}`, sub: '' };
        }

        // 3. Fallback Smart Detection (if currency is missing)
        if (val > 500) {
            return { display: `¥${Math.round(val).toLocaleString()}`, sub: '※円と推定' };
        } else {
            return {
                display: `¥${Math.round(val * 150).toLocaleString()}`,
                sub: `$${val.toFixed(2)} ※ドルと推定`
            };
        }
    };

    return (
        <>
            {/* Toast Notification */}
            {showToast && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                    <div className="rounded-2xl bg-black/90 px-8 py-5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-md animate-in zoom-in-95 fade-in duration-300">
                        <div className="flex flex-col items-center gap-3 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-2 text-black">
                                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-xl font-bold tracking-tight">{toastMessage}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="mb-6 flex flex-col items-start gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">✨</span>
                    <span className="text-sm font-bold text-blue-900">AIビジュアル検索</span>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={handleAIAnalyze}
                        disabled={isAnalyzing}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-all hover:scale-105 hover:bg-blue-700 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:scale-100"
                    >
                        {isAnalyzing ? "解析中..." : "ジャケットから情報を抽出"}
                    </button>
                    <button
                        type="button"
                        onClick={handleClearAll}
                        disabled={isClearing}
                        className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-50 active:scale-95"
                    >
                        クリア
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <AutocompleteInput label="title" name="title" value={title} onChange={setTitle} type="title" artistContext={artist} />
                    <AutocompleteInput label="artist" name="artist" value={artist} onChange={setArtist} type="artist" />
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">catalog_no</label>
                        <div className="mt-1 flex gap-2">
                            <input name="catalog_no" value={catalogNo} onChange={(e) => setCatalogNo(e.target.value)} className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-text-primary focus:border-gold-2 focus:outline-none" />
                            <button type="button" onClick={handleDiscogsSearch} disabled={isSearching} className="rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">検索</button>
                        </div>
                    </div>
                </div>

                {/* --- NEW PRICE ANALYSIS SECTION (Discogs Style) --- */}
                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gold-2 text-[14px] font-black text-black shadow-sm">¥</div>
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">マーケットプレイス相場</h3>
                        </div>
                        <div className="flex gap-2">
                            {priceSuggestions?.releaseId && (
                                <Link
                                    href={`https://www.discogs.com/release/${priceSuggestions.releaseId}`}
                                    target="_blank"
                                    className="flex items-center gap-1 rounded-xl border border-gray-200 px-4 py-2 text-xs font-black text-gray-600 hover:bg-gray-50 hover:text-black transition-colors"
                                >
                                    <span>Discogsで見る</span>
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                </Link>
                            )}
                            <button
                                type="button"
                                onClick={handleFetchPriceSuggestions}
                                disabled={!selectedReleaseId || isFetchingPrice}
                                className={`
                                    flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition-all active:scale-95 disabled:opacity-50
                                    ${selectedReleaseId ? 'bg-black text-white hover:bg-gray-800 ring-4 ring-gold-2/20' : 'bg-gray-50 text-gray-400'}
                                `}
                            >
                                {isFetchingPrice ? "取得中..." : "相場を更新"}
                            </button>
                        </div>
                    </div>

                    {priceSuggestions ? (
                        <div className="space-y-6">
                            {/* Demand Metrics */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="rounded-2xl border border-pink-100 bg-pink-50/30 p-3 text-center">
                                    <div className="text-[10px] font-black text-pink-400 uppercase tracking-widest mb-1">Want list</div>
                                    <div className="text-lg font-black text-pink-600">{(priceSuggestions.stats?.num_want || priceSuggestions.release?.community?.want) ?? '-'}</div>
                                    <div className="text-[8px] font-bold text-pink-300">ほしい</div>
                                </div>
                                <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-3 text-center">
                                    <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Collection</div>
                                    <div className="text-lg font-black text-blue-600">{(priceSuggestions.stats?.num_have || priceSuggestions.release?.community?.have) ?? '-'}</div>
                                    <div className="text-[8px] font-bold text-blue-300">持ってる</div>
                                </div>
                                <div className="rounded-2xl border border-gold-1 bg-gold-2/10 p-3 text-center">
                                    <div className="text-[10px] font-black text-gold-4 uppercase tracking-widest mb-1">Avg Rating</div>
                                    <div className="text-lg font-black text-gold-5">{(priceSuggestions.release?.community?.rating?.average)?.toFixed(1) ?? '-'}</div>
                                    <div className="text-[8px] font-bold text-gold-4/60">評価点</div>
                                </div>
                            </div>

                            {/* Section 1: Current Listings */}
                            <div className="rounded-2xl bg-gray-50/50 p-5 border border-gray-100">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="flex items-center gap-2 text-xs font-black text-gray-500 uppercase tracking-widest">
                                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                                        現在の出品状況
                                    </h4>
                                    {priceSuggestions.stats?.num_for_sale !== undefined && (
                                        <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                            {priceSuggestions.stats.num_for_sale} 点が販売中
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[10px] font-bold text-gray-400">販売中の最安値:</span>
                                    {(() => {
                                        const p = formatDiscogsPrice(priceSuggestions.stats?.lowest_price || (priceSuggestions.release?.lowest_price !== undefined ? { value: priceSuggestions.release.lowest_price, currency: 'USD' } : null));
                                        return (
                                            <div className="flex items-baseline gap-2">
                                                <span className="text-2xl font-black text-gray-900">{p.display}</span>
                                                <span className="text-[10px] text-gray-400 font-bold">{p.sub}</span>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Section 2: Sales History (Low / Med / High) */}
                            <div className="rounded-2xl bg-white p-5 border border-gray-100 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3">
                                    <div className="text-[8px] font-black text-gray-300 uppercase rotate-90 origin-right">Sales Statistics</div>
                                </div>
                                <div className="flex items-center justify-between mb-5">
                                    <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">過去の売買履歴 (Sales History)</h4>
                                    <div className="text-[10px] font-bold text-gray-400">
                                        最終販売: <span className="text-gray-900 font-black">{priceSuggestions.stats?.last_sold ?? priceSuggestions.release?.last_sold ?? 'なし'}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    {[
                                        { label: '最低 (Low)', key: 'lowest_price' },
                                        { label: '中間点 (Med)', key: 'median' },
                                        { label: '最高 (High)', key: 'highest_price' }
                                    ].map((stat) => {
                                        const priceData = priceSuggestions.stats?.[stat.key];
                                        const p = formatDiscogsPrice(priceData);
                                        return (
                                            <div key={stat.key} className="space-y-1">
                                                <div className="text-[10px] font-black text-gray-400">{stat.label}</div>
                                                <div className={`text-xl font-black ${stat.key === 'median' ? 'text-gold-5' : 'text-gray-900'}`}>{p.display}</div>
                                                {p.sub && <div className="text-[8px] text-gray-400 font-bold leading-none">{p.sub}</div>}
                                            </div>
                                        );
                                    })}
                                </div>

                                {(!priceSuggestions.stats?.median) && (
                                    <p className="mt-4 text-[9px] text-gray-400 font-bold leading-relaxed border-t border-gray-50 pt-3">
                                        ※ Discogs APIの仕様により、販売数が少ないアイテムは「中間点」「最高値」が取得できない場合があります。
                                        その際はDiscogsサイト上の詳細画面を直接ご確認ください。
                                    </p>
                                )}
                            </div>

                            {/* Section 3: Debug Tools */}
                            <div className="flex items-center justify-between px-1">
                                <p className="text-[9px] text-gray-300 font-bold italic">※ 1ドル=150円で算出 / 円貨データはそのまま表示</p>
                                <details className="group">
                                    <summary className="cursor-pointer text-gray-300 text-[10px] font-black uppercase list-none hover:text-gray-500 flex items-center gap-1">
                                        <span>Show API Debug</span>
                                        <svg className="h-3 w-3 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                                    </summary>
                                    <div className="absolute left-6 right-6 bottom-full mb-4 z-50">
                                        <div className="rounded-2xl bg-black/95 p-5 shadow-2xl backdrop-blur-xl border border-white/10 ring-1 ring-black">
                                            <div className="mb-2 flex items-center justify-between border-b border-white/10 pb-2">
                                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Raw Network Response</span>
                                                <span className="text-[9px] font-mono text-green-400">STATUS: OK</span>
                                            </div>
                                            <pre className="max-h-60 overflow-auto text-[10px] font-mono text-green-400 scrollbar-thin scrollbar-thumb-white/20">
                                                {JSON.stringify(priceSuggestions, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                </details>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                            <div className="mb-4 text-gray-300">
                                <svg className="h-10 w-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            </div>
                            <p className="max-w-[240px] text-xs font-bold text-gray-400 leading-relaxed">
                                {selectedReleaseId
                                    ? "「相場を更新」ボタンを押すと、現在の価格推移と統計データを取得します。"
                                    : "まず上部の品番・Discogs検索でリリースを特定してください。"}
                            </p>
                        </div>
                    )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">storage_location</label>
                        <input name="storage_location" defaultValue={item.storageLocation ?? ''} className="mt-1 w-full rounded border border-gray-200 bg-white px-3 py-2 text-text-primary focus:border-gold-2 focus:outline-none" />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-text-secondary">notes</label>
                        <textarea name="notes" defaultValue={item.notes ?? ''} className="mt-1 w-full rounded border border-gray-200 bg-white px-3 py-2 text-text-primary focus:border-gold-2 focus:outline-none" rows={3} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">status</label>
                        <select name="status" defaultValue={item.status} className="mt-1 rounded border border-gray-200 bg-white px-3 py-2 text-text-primary focus:border-gold-2 focus:outline-none">
                            {['UNPROCESSED', 'IDENTIFIED', 'READY', 'LISTED', 'SOLD'].map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center justify-start gap-4 border-t border-gray-100 pt-6">
                    <Link href="/dashboard/items" className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all">一覧へ</Link>
                    <button className="rounded-xl bg-black px-8 py-3 text-sm font-bold text-white shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50" type="submit" disabled={isLoading}>
                        {isLoading ? "保存中..." : "保存する"}
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
