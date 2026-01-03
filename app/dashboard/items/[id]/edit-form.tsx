'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DeleteItemButton from './delete-button';
import DiscogsResultModal from './discogs-result-modal';
import AutocompleteInput from './autocomplete-input';
import UnsavedChangesModal from './unsaved-changes-modal';

const STATUS_LABELS: Record<string, string> = {
    UNPROCESSED: '未処理',
    IDENTIFIED: '特定済み',
    READY: '準備完了',
    LISTED: '出品済み',
    SOLD: '売却済み',
};

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

    // Dirty state tracking
    const [isDirty, setIsDirty] = useState(false);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);

    // Handler for Back button with protection
    const handleBack = () => {
        if (isDirty) {
            setShowUnsavedModal(true);
        } else {
            router.push('/dashboard/items');
        }
    };

    const handleDiscard = () => {
        setShowUnsavedModal(false);
        router.push('/dashboard/items');
    };

    const handleConfirmSave = async () => {
        setShowUnsavedModal(false);
        // Trigger generic submit logic properly?
        // Since the button is outside the form in the modal, we need access to form ref or just manually invoke.
        // Actually, easiest is to just use a ref for the form and request submit.
        const formElement = document.querySelector('form') as HTMLFormElement;
        if (formElement) formElement.requestSubmit();
    };

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const formData = new FormData(e.currentTarget);
            await fetch(`/api/items/${item.id}`, { method: 'POST', body: formData });
            setToastMessage('変更を保存しました');
            setShowToast(true);
            setIsDirty(false); // Reset dirty state
            setTimeout(() => { setShowToast(false); router.refresh(); }, 2000);
        } catch (err) {
            alert('保存できませんでした');
        } finally {
            setIsLoading(false);
        }
    };

    const guidePhase = useMemo(() => {
        if (!selectedReleaseId) return 'manual_search';
        if (selectedReleaseId && !priceSuggestions) return 'fetch_price';
        return 'none';
    }, [selectedReleaseId, priceSuggestions]);

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

            if (!res.ok) {
                // Show specific error from API if available
                alert(`AI分析エラー: ${data.message || data.error || '不明なエラーが発生しました'}`);
                return;
            }

            if (data.artist) setArtist(data.artist);
            if (data.title) setTitle(data.title);
            if (data.catalogNo) setCatalogNo(data.catalogNo);

            setToastMessage('情報を抽出しました');
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        } catch (error: any) {
            console.error('AI Analyze error:', error);
            alert('AI分析に失敗しました。ネットワーク接続を確認してください。');
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
        // CLEAR previous stats to show active update
        setPriceSuggestions(null);
        try {
            const res = await fetch(`/api/discogs/price?releaseId=${selectedReleaseId}&t=${Date.now()}`);
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
            // Handle Japanese or currency markers from scraping
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
            <style jsx global>{`
                @keyframes softPulse {
                    0% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.4); transform: scale(1); }
                    50% { box-shadow: 0 0 0 10px rgba(234, 179, 8, 0); transform: scale(1.02); }
                    100% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0); transform: scale(1); }
                }
                .next-step-pulse {
                    animation: softPulse 2s infinite ease-in-out;
                    z-index: 10;
                }
            `}</style>

            {showToast && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                    <div className="rounded-2xl bg-black/90 px-8 py-5 text-white shadow-2xl backdrop-blur-md animate-in zoom-in-95 fade-in duration-300">
                        <div className="flex flex-col items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-2 text-black font-black">✓</div>
                            <p className="text-lg font-bold tracking-tight">{toastMessage}</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="mb-6 rounded-3xl border-2 border-dashed border-blue-200 bg-blue-50/20 p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600">
                        <span className="text-[10px] text-white font-bold italic">AI</span>
                    </div>
                    <span className="text-blue-900 font-extrabold text-sm uppercase tracking-wider">Visual Search Support</span>
                </div>
                <div className="flex gap-3">
                    <button type="button" onClick={handleAIAnalyze} disabled={isAnalyzing} className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-black text-white shadow-lg hover:bg-blue-700 hover:scale-105 active:scale-95 disabled:opacity-50 transition-all">
                        {isAnalyzing ? "解析中..." : "ジャケットから詳細を埋める"}
                    </button>
                    <button type="button" onClick={handleClearAll} className="rounded-2xl border border-gray-200 bg-white px-6 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-all">リセット</button>
                </div>
            </div>

            {/* Unsaved Changes Warning Modal */}
            <UnsavedChangesModal
                isOpen={showUnsavedModal}
                onSave={handleConfirmSave}
                onDiscard={handleDiscard}
                onCancel={() => setShowUnsavedModal(false)}
            />

            <form onSubmit={handleFormSubmit} className="space-y-8 pb-12">
                <div className="grid gap-6 sm:grid-cols-2">
                    <AutocompleteInput
                        label="title"
                        name="title"
                        value={title}
                        onChange={(v) => { setTitle(v); setIsDirty(true); }}
                        type="title"
                        artistContext={artist}
                    />
                    <AutocompleteInput
                        label="artist"
                        name="artist"
                        value={artist}
                        onChange={(v) => { setArtist(v); setIsDirty(true); }}
                        type="artist"
                    />

                    <div className="sm:col-span-1">
                        <label className="block text-sm font-black text-gray-500 uppercase tracking-widest mb-2 px-1">catalog_no</label>
                        <div className="flex gap-2">
                            <input
                                name="catalog_no"
                                value={catalogNo}
                                onChange={(e) => { setCatalogNo(e.target.value); setIsDirty(true); }}
                                placeholder="例: B0022378-01"
                                className="w-full rounded-2xl border border-gray-100 bg-white px-5 py-3.5 font-bold shadow-sm focus:ring-4 focus:ring-gold-2/20 outline-none transition-all placeholder:text-gray-300"
                            />
                            <button
                                type="button"
                                onClick={handleDiscogsSearch}
                                disabled={isSearching || !catalogNo}
                                className={`whitespace-nowrap rounded-2xl px-6 py-3.5 text-xs font-black transition-all active:scale-95 shadow-lg shadow-black/5 hover:scale-105 ${guidePhase === 'manual_search' && catalogNo ? 'bg-gold-2 text-black next-step-pulse' : 'bg-gray-900 text-white hover:bg-black disabled:opacity-30'}`}
                            >
                                {isSearching ? "検索中..." : "Discogsで商品を特定"}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="rounded-[2.5rem] border border-gray-100 bg-white p-8 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.03)] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-gold-1 via-gold-2 to-gold-4 opacity-50" />

                    <div className="flex flex-wrap items-center justify-between gap-6 mb-10">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-xl font-black text-gold-2 shadow-xl shadow-black/20">¥</div>
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tighter">マーケットプレイス相場分析</h3>
                                {selectedReleaseId && <p className="text-[10px] font-bold text-gray-400 mt-0.5 px-1">Discogs Release ID: {selectedReleaseId}</p>}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            {selectedReleaseId && (
                                <Link href={`https://www.discogs.com/release/${selectedReleaseId}`} target="_blank" className="flex items-center gap-2 rounded-2xl border border-gray-100 bg-white px-6 py-4 text-sm font-black text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-200 active:scale-95">
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    <span>商品ページを見る</span>
                                </Link>
                            )}
                            <button
                                type="button"
                                onClick={handleFetchPriceSuggestions}
                                disabled={!selectedReleaseId || isFetchingPrice}
                                className={`flex items-center gap-3 rounded-2xl px-8 py-4 text-sm font-black transition-all active:scale-95 shadow-xl disabled:opacity-30 ${guidePhase === 'fetch_price' ? 'bg-gold-2 text-black next-step-pulse shadow-gold-2/20' : 'bg-black text-white hover:bg-gray-800'}`}
                            >
                                <svg className={`h-4 w-4 ${isFetchingPrice ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                {isFetchingPrice ? "取得中..." : "データを更新"}
                            </button>
                        </div>
                    </div>

                    {priceSuggestions ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-1 space-y-4">
                                    <div className="rounded-3xl border border-pink-100 bg-pink-50/20 p-5 text-center shadow-sm">
                                        <div className="text-[10px] font-black text-pink-400 uppercase tracking-widest mb-2">ほしいリスト</div>
                                        <div className="text-2xl font-black text-pink-600 tracking-tighter">{priceSuggestions.stats?.num_want ?? '-'}</div>
                                    </div>
                                    <div className="rounded-3xl border border-blue-100 bg-blue-50/20 p-5 text-center shadow-sm">
                                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">コレクション</div>
                                        <div className="text-2xl font-black text-blue-600 tracking-tighter">{priceSuggestions.stats?.num_have ?? '-'}</div>
                                    </div>
                                </div>
                                <div className="md:col-span-2 rounded-[2rem] border border-gold-2/30 bg-gold-50/20 p-6 flex flex-col items-center justify-center text-center shadow-sm">
                                    <h4 className="text-sm font-black text-gray-900 mb-2">市場実績 (Sales History)</h4>
                                    <p className="text-[10px] text-gray-500 mb-4 font-medium leading-relaxed">
                                        過去の取引価格（Low/Mid/High）は、<br />公式サイトで正確な値をご確認ください。
                                    </p>
                                    <a
                                        href={priceSuggestions.stats?.sales_history_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 rounded-2xl bg-gold-2 px-8 py-4 text-sm font-black text-black shadow-lg shadow-gold-2/20 transition-all hover:scale-105 hover:bg-gold-1 hover:shadow-xl active:scale-95"
                                    >
                                        <span>販売履歴ページを開く</span>
                                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                                    </a>
                                </div>
                            </div>

                            {/* Section 2: Current Marketplace */}
                            <div className="group rounded-[2rem] bg-gray-900 p-8 text-white shadow-2xl shadow-black/20 hover:scale-[1.01] transition-transform duration-500">
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-gray-500">
                                        <div className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                        現在販売中の最低価格 (Currently Listed)
                                    </h4>
                                    <span className="rounded-full bg-white/10 px-4 py-1.5 text-[10px] font-black text-green-400 border border-white/10 uppercase tracking-tighter">
                                        {priceSuggestions.stats?.num_for_sale ?? 0} ITEMS FOR SALE
                                    </span>
                                </div>
                                <div className="flex items-baseline gap-6 pb-2">
                                    <span className="text-xs font-black text-gray-500 uppercase">出品中の最安:</span>
                                    {(() => {
                                        const p = formatDiscogsPrice(priceSuggestions.stats?.lowest_listing);
                                        return (
                                            <div className="flex items-baseline gap-3">
                                                <span className="text-5xl font-black tracking-tighter bg-gradient-to-br from-white to-white/70 bg-clip-text text-transparent">{p.display}</span>
                                                {p.sub && <span className="text-sm text-gray-500 font-bold">{p.sub}</span>}
                                            </div>
                                        );
                                    })()}
                                </div>
                                <p className="text-[9px] text-gray-600 mt-2 font-bold uppercase tracking-widest italic">※ 商品の状態（コンディション）が考慮されていない可能性があるため、実績最低〜平均値も併せてご参照ください。</p>
                            </div>

                            <p className="text-[10px] text-gray-300 font-bold italic text-center pt-2">
                                Data fetched at {new Date(priceSuggestions.timestamp).toLocaleTimeString()} (Fresh Version)
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-24 text-center bg-gray-50/30 rounded-[2rem] border-2 border-dashed border-gray-100">
                            <div className="mb-6 h-16 w-16 text-gray-100 flex items-center justify-center rounded-full bg-white shadow-inner">
                                <svg fill="none" viewBox="0 0 24 24" className="h-8 w-8" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            </div>
                            <h4 className="text-lg font-black text-gray-300 mb-2 italic">Awaiting sync...</h4>
                            <p className="max-w-[320px] text-xs font-bold text-gray-400 leading-relaxed px-6">
                                左上の「データを更新」ボタンを押すと、公式サイトの生の取引実績を読み込みます。
                            </p>
                        </div>
                    )}
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-black text-gray-500 uppercase tracking-widest mb-3 px-1">保管場所 / Storage</label>
                        <input name="storage_location" onChange={() => setIsDirty(true)} defaultValue={item.storageLocation ?? ''} className="w-full rounded-2xl border border-gray-100 bg-white px-5 py-4 font-bold shadow-sm focus:ring-4 focus:ring-gold-2/10 outline-none transition-all" />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-black text-gray-500 uppercase tracking-widest mb-3 px-1">備考 / Notes</label>
                        <textarea name="notes" onChange={() => setIsDirty(true)} defaultValue={item.notes ?? ''} className="w-full rounded-2xl border border-gray-100 bg-white px-5 py-4 font-bold shadow-sm focus:ring-4 focus:ring-gold-2/10 outline-none transition-all" rows={4} />
                    </div>
                    <div>
                        <label className="block text-sm font-black text-gray-500 uppercase tracking-widest mb-3 px-1">ステータス / Status</label>
                        <select name="status" onChange={() => setIsDirty(true)} defaultValue={item.status} className="w-full rounded-2xl border border-gray-100 bg-white px-5 py-4 font-black shadow-sm focus:ring-4 focus:ring-gold-2/10 outline-none transition-all appearance-none cursor-pointer">
                            {['UNPROCESSED', 'IDENTIFIED', 'READY', 'LISTED', 'SOLD'].map((s) => (
                                <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="sticky bottom-6 flex items-center gap-4 rounded-3xl border border-gray-100 bg-white/80 p-6 shadow-2xl backdrop-blur-xl z-20">
                    <button
                        type="button"
                        onClick={handleBack}
                        className="rounded-2xl border border-gray-200 bg-white px-8 py-4 text-sm font-black text-gray-600 hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all"
                    >
                        一覧へ戻る
                    </button>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`rounded-2xl px-12 py-4 text-sm font-black transition-all shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98]
                            ${isDirty
                                ? 'bg-gold-2 text-black shadow-gold-2/30 animate-pulse'
                                : 'bg-black text-white hover:bg-gray-800'
                            }
                        `}
                    >
                        {isLoading ? "保存中..." : "保存"}
                    </button>
                    <div className="ml-auto">
                        <DeleteItemButton id={item.id} sku={item.sku} />
                    </div>
                </div>
            </form>

            {showResultModal && (
                <DiscogsResultModal results={searchResults} onSelect={(r) => {
                    handleSelectResult(r);
                }} onClose={() => setShowResultModal(false)} />
            )}
        </>
    );
}
