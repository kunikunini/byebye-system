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
                    setSelectedReleaseId(info.id);
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
        setSelectedReleaseId(result.id);
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

            console.log('Price suggestions data:', data);

            if (data.error) {
                if (data.error === 'no_data_available') {
                    alert('このリリースの相場データ（推奨価格・販売統計）が見つかりませんでした');
                } else {
                    alert('相場データの取得に失敗しました');
                }
                return;
            }

            setPriceSuggestions(data);

            setToastMessage(data.type === 'suggestions' ? '推奨価格を取得しました' : '販売統計を取得しました');
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

    return (
        <>
            {/* Toast Notification (Center Overlay) */}
            {showToast && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                    <div className="rounded-2xl bg-black/90 px-8 py-5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-md animate-in zoom-in-95 fade-in duration-300">
                        <div className="flex flex-col items-center gap-3 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-2 text-black">
                                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xl font-bold tracking-tight">{toastMessage}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="mb-6 flex flex-col items-start gap-4 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">✨</span>
                    <span className="text-sm font-bold text-blue-900">AIビジュアル検索</span>
                </div>
                <p className="text-xs text-blue-700">アップロード済みのジャケット画像（表面）から情報を自動入力します。</p>
                <button
                    type="button"
                    onClick={handleAIAnalyze}
                    disabled={isAnalyzing}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-all hover:scale-105 hover:bg-blue-700 hover:shadow-xl active:scale-95 disabled:opacity-50 disabled:scale-100"
                >
                    {isAnalyzing ? (
                        <>
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span>画像を解析中...</span>
                        </>
                    ) : (
                        <>
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                            <span>画像から情報を抽出</span>
                        </>
                    )}
                </button>
                <button
                    type="button"
                    onClick={handleClearAll}
                    disabled={isClearing}
                    className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700 shadow-lg shadow-gray-100 transition-all hover:scale-105 hover:bg-gray-50 hover:shadow-xl active:scale-95"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    <span>入力をクリア</span>
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <AutocompleteInput
                        label="title"
                        name="title"
                        value={title}
                        onChange={setTitle}
                        type="title"
                        artistContext={artist}
                    />
                    <AutocompleteInput
                        label="artist"
                        name="artist"
                        value={artist}
                        onChange={setArtist}
                        type="artist"
                    />
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">catalog_no</label>
                        <div className="mt-1 flex gap-2">
                            <input
                                name="catalog_no"
                                value={catalogNo}
                                onChange={(e) => setCatalogNo(e.target.value)}
                                className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-text-primary placeholder-text-muted focus:border-gold-2 focus:outline-none focus:ring-1 focus:ring-gold-2"
                            />
                            <button
                                type="button"
                                onClick={handleDiscogsSearch}
                                disabled={isSearching}
                                className="flex items-center gap-1 rounded bg-blue-600 px-3 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                                title="Discogsから情報を検索"
                            >
                                {isSearching ? (
                                    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : (
                                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                )}
                                <span>Discogs検索</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Price Suggestions Section */}
                <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-2 text-[10px] font-bold text-black">¥</span>
                            <span className="text-sm font-bold text-gray-900">相場分析</span>
                        </div>
                        <button
                            type="button"
                            onClick={handleFetchPriceSuggestions}
                            disabled={!selectedReleaseId || isFetchingPrice}
                            className={`
                                relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all active:scale-95 disabled:opacity-50
                                ${selectedReleaseId
                                    ? 'bg-black text-white hover:bg-gray-800 animate-pulse-outline ring-2 ring-gold-2/50'
                                    : 'bg-gray-100 text-gray-400'
                                }
                            `}
                        >
                            {isFetchingPrice ? (
                                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            )}
                            <span>相場を調べる</span>
                        </button>
                    </div>

                    {priceSuggestions ? (
                        <div className="space-y-3">
                            {priceSuggestions.type === 'suggestions' ? (
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="rounded-lg bg-gray-50 p-2">
                                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Low</div>
                                        <div className="text-sm font-mono font-bold text-gray-900">
                                            ${(priceSuggestions.data['Very Good (VG)']?.value || priceSuggestions.data['Good (G)']?.value || 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-gold-2/10 p-2 border border-gold-2/20">
                                        <div className="text-[10px] font-bold text-gold-4 uppercase tracking-wider">Med</div>
                                        <div className="text-sm font-mono font-bold text-gold-4">
                                            ${(priceSuggestions.data['Very Good Plus (VG+)']?.value || priceSuggestions.data['Near Mint (NM or M-)']?.value || 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-blue-50 p-2 border border-blue-100">
                                        <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">High</div>
                                        <div className="text-sm font-mono font-bold text-blue-600">
                                            ${(priceSuggestions.data['Mint (M)']?.value || priceSuggestions.data['Near Mint (NM or M-)']?.value || 0).toFixed(2)}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div className="rounded-lg bg-gray-50 p-2">
                                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Lowest</div>
                                        <div className="text-sm font-mono font-bold text-gray-900">
                                            ${(priceSuggestions.data.lowest_price?.value || 0).toFixed(2)}
                                        </div>
                                    </div>
                                    <div className="rounded-lg bg-gold-2/10 p-2 border border-gold-2/20">
                                        <div className="text-[10px] font-bold text-gold-4 uppercase tracking-wider">Median</div>
                                        <div className="text-sm font-mono font-bold text-gold-4">
                                            ${(priceSuggestions.data.community?.rating?.average || 0).toFixed(1)}
                                        </div>
                                        <div className="text-[8px] text-gray-400">Avg Rating</div>
                                    </div>
                                    <div className="rounded-lg bg-blue-50 p-2 border border-blue-100">
                                        <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">For Sale</div>
                                        <div className="text-sm font-mono font-bold text-blue-600">
                                            {priceSuggestions.data.num_for_sale || 0}
                                        </div>
                                    </div>
                                </div>
                            )}
                            <p className="text-[10px] text-right text-gray-400">
                                Data type: {priceSuggestions.type === 'suggestions' ? 'Market Suggestions' : 'Marketplace Stats'}
                            </p>
                        </div>
                    ) : (
                        <p className="text-center text-xs text-gray-400 py-4">
                            {selectedReleaseId ? 'ボタンを押して相場データを取得してください' : 'Discogs検索でリリースを特定すると利用可能になります'}
                        </p>
                    )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">storage_location</label>
                        <input
                            name="storage_location"
                            defaultValue={item.storageLocation ?? ''}
                            className="mt-1 w-full rounded border border-gray-200 bg-white px-3 py-2 text-text-primary placeholder-text-muted focus:border-gold-2 focus:outline-none focus:ring-1 focus:ring-gold-2"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-text-secondary">notes</label>
                        <textarea
                            name="notes"
                            defaultValue={item.notes ?? ''}
                            className="mt-1 w-full rounded border border-gray-200 bg-white px-3 py-2 text-text-primary placeholder-text-muted focus:border-gold-2 focus:outline-none focus:ring-1 focus:ring-gold-2"
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">status</label>
                        <select
                            name="status"
                            defaultValue={item.status}
                            className="mt-1 rounded border border-gray-200 bg-white px-3 py-2 text-text-primary focus:border-gold-2 focus:outline-none focus:ring-1 focus:ring-gold-2"
                        >
                            {['UNPROCESSED', 'IDENTIFIED', 'READY', 'LISTED', 'SOLD'].map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center justify-start gap-4 border-t border-gray-100 pt-6">
                    <Link
                        href="/dashboard/items"
                        className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700 shadow-lg shadow-gray-100 transition-all duration-200 hover:scale-105 hover:bg-gray-50 hover:shadow-xl active:scale-95"
                    >
                        一覧へ
                    </Link>
                    <button
                        className="rounded-xl bg-black px-8 py-3 text-sm font-bold text-white shadow-lg shadow-black/20 transition-all duration-200 hover:scale-105 hover:bg-gold-2 hover:text-black hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:scale-100"
                        type="submit"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>保存中...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span>保存する</span>
                            </div>
                        )}
                    </button>
                    <div className="ml-auto">
                        <DeleteItemButton id={item.id} sku={item.sku} />
                    </div>
                </div>
            </form >

            {showResultModal && (
                <DiscogsResultModal
                    results={searchResults}
                    onSelect={handleSelectResult}
                    onClose={() => setShowResultModal(false)}
                />
            )
            }
        </>
    );
}
