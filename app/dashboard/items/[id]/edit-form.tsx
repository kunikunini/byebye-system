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
        setShowResultModal(false);
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
            {/* Toast Notification (Fixed Position) */}
            {showToast && (
                <div className="fixed top-6 left-1/2 z-50 -translate-x-1/2 transform rounded-full bg-black/90 px-6 py-3 text-white shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-2">
                        <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-medium">完了!</span>
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
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50"
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

                <div className="flex items-center justify-start gap-4 border-t border-borderColor-subtle pt-4">
                    <Link
                        href="/dashboard/items"
                        className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-md transition-all duration-200 hover:scale-105 hover:border-gold-2 hover:text-gold-3 hover:shadow-xl active:scale-95"
                    >
                        一覧へ戻る
                    </Link>
                    <button
                        className="rounded bg-black px-6 py-2 font-medium text-white shadow-md transition-all duration-200 hover:scale-105 hover:bg-gold-2 hover:text-black hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
                        type="submit"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <svg className="h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>保存中...</span>
                            </div>
                        ) : (
                            '保存'
                        )}
                    </button>
                    <DeleteItemButton id={item.id} />
                </div>
            </form>

            {showResultModal && (
                <DiscogsResultModal
                    results={searchResults}
                    onSelect={handleSelectResult}
                    onClose={() => setShowResultModal(false)}
                />
            )}
        </>
    );
}
