'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useItemsSelection } from './items-selection-context';

type SavedView = {
    id: string;
    name: string;
    filters: any;
    sort?: any;
};

export default function SavedViewsSelector() {
    const { showToast } = useItemsSelection();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [views, setViews] = useState<SavedView[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [newViewName, setNewViewName] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Active view check
    const currentViewId = searchParams.get('viewId');
    const activeView = views.find((v) => v.id === currentViewId);

    useEffect(() => {
        fetchViews();
    }, []);

    const fetchViews = async () => {
        try {
            const res = await fetch('/api/views');
            if (res.ok) {
                const data = await res.json();
                setViews(data);
            }
        } catch (e) {
            console.error('Failed to fetch views', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAs = async () => {
        if (!newViewName.trim()) return;

        // Construct filters from current URL params
        const filters: Record<string, string> = {};
        searchParams.forEach((val, key) => {
            if (key !== 'viewId') filters[key] = val;
        });

        try {
            const res = await fetch('/api/views', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newViewName, filters }),
            });

            if (res.ok) {
                const created = await res.json();
                setNewViewName('');
                setShowSaveModal(false);
                fetchViews();
                showToast(`ビュー「${newViewName}」を保存しました`);

                const params = new URLSearchParams(searchParams);
                params.set('viewId', created.id);
                router.push(`/dashboard/items?${params.toString()}`);
            }
        } catch (e) {
            alert('保存に失敗しました');
        }
    };

    const getCurrentFiltersFromURL = () => {
        const filters: Record<string, string> = {};
        searchParams.forEach((val, key) => {
            if (key !== 'viewId') filters[key] = val;
        });
        return filters;
    };

    const handleOverwrite = async () => {
        if (!activeView) {
            setShowSaveModal(true);
            return;
        }

        const filters = getCurrentFiltersFromURL();
        setSaving(true);
        try {
            const res = await fetch(`/api/views/${activeView.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filters }),
            });
            if (!res.ok) throw new Error('Failed');
            await fetchViews();
            showToast('条件を上書き保存しました');
        } catch (e) {
            alert('上書き保存に失敗しました');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteActive = async () => {
        if (!activeView) return;
        if (!confirm('選択中のキューを削除しますか？')) return;
        try {
            await fetch(`/api/views/${activeView.id}`, { method: 'DELETE' });
            showToast('ビューを削除しました');
            const newViews = views.filter(v => v.id !== activeView.id);
            setViews(newViews);
            const params = new URLSearchParams(searchParams);
            params.delete('viewId');
            router.push(`/dashboard/items?${params.toString()}`);
        } catch (e) {
            alert('削除に失敗しました');
        }
    };

    const isDirty = (() => {
        if (!activeView) return false;
        const current = getCurrentFiltersFromURL();
        const a = JSON.stringify(current);
        const b = JSON.stringify(activeView.filters || {});
        return a !== b;
    })();

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('削除しますか？')) return;

        try {
            await fetch(`/api/views/${id}`, { method: 'DELETE' });
            showToast('削除しました');
            const newViews = views.filter(v => v.id !== id);
            setViews(newViews);

            if (currentViewId === id) {
                const params = new URLSearchParams(searchParams);
                params.delete('viewId');
                router.push(`/dashboard/items?${params.toString()}`);
            }
        } catch (e) {
            alert('削除に失敗しました');
        }
    };

    const handleSelect = (view: SavedView) => {
        const params = new URLSearchParams();
        if (view.filters) {
            Object.entries(view.filters).forEach(([k, v]) => {
                params.set(k, String(v));
            });
        }
        params.set('viewId', view.id);
        router.push(`/dashboard/items?${params.toString()}`);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <div className="flex gap-2 items-center flex-wrap">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`flex items-center gap-3 rounded-xl border px-5 py-2.5 text-sm font-bold shadow-sm transition-all hover:scale-105 active:scale-95 ${activeView ? 'border-gold-2 bg-gold-2/5 text-black ring-1 ring-gold-2' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                    <svg className={`h-4 w-4 ${activeView ? 'text-gold-4' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <span>{activeView ? `キュー: ${activeView.name}` : '作業キューを選択'}</span>
                    <svg className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                </button>

                {activeView && (
                    <>
                        <button
                            onClick={handleOverwrite}
                            className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold shadow-sm transition-all hover:scale-105 active:scale-95 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 ${isDirty ? 'ring-2 ring-orange-500/20 bg-orange-50/50' : ''}`}
                            disabled={saving}
                            title="現在の条件で上書き保存"
                        >
                            {saving ? (
                                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                            )}
                            <span>保存</span>
                            {isDirty && <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"></span>}
                        </button>

                        <button
                            onClick={handleDeleteActive}
                            className="flex items-center gap-2 rounded-xl border border-red-100 bg-white px-4 py-2.5 text-sm font-bold text-red-600 shadow-sm transition-all hover:scale-105 hover:bg-red-50 hover:border-red-200 active:scale-95"
                            title="このビューを削除"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40 bg-black/5" onClick={() => setIsOpen(false)} />
                    <div className="absolute left-0 mt-3 z-50 w-72 rounded-2xl border border-gray-100 bg-white/95 p-3 shadow-[0_20px_50px_rgba(0,0,0,0.2)] backdrop-blur-md animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200">
                        <div className="mb-2 px-3 py-2">
                            <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Saved Views</h4>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto space-y-1">
                            {loading && <div className="p-4 text-center text-xs text-gray-400">読み込み中...</div>}
                            {!loading && views.length === 0 && <div className="p-4 text-center text-xs text-gray-400">保存されたビューはありません</div>}

                            {views.map((v) => (
                                <div
                                    key={v.id}
                                    onClick={() => handleSelect(v)}
                                    className={`group flex items-center justify-between rounded-xl px-4 py-3 text-sm cursor-pointer transition-all hover:bg-gray-50 ${currentViewId === v.id ? 'bg-gold-2/10 text-black font-bold ring-1 ring-gold-2/20' : 'text-gray-700'}`}
                                >
                                    <span className="truncate">{v.name}</span>
                                    <button
                                        onClick={(e) => handleDelete(v.id, e)}
                                        className="opacity-0 group-hover:opacity-100 h-8 w-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all"
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                        {!loading && views.length > 0 && (
                            <div className="mt-2 border-t border-gray-50 pt-2 px-1">
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        setShowSaveModal(true);
                                    }}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-all"
                                >
                                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    <span>新しく保存する</span>
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* Save Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="w-full max-w-sm rounded-[2rem] bg-white p-8 shadow-[0_30px_60px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-200">
                        <div className="text-center mb-6">
                            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-gray-900">条件を保存</h3>
                            <p className="mt-2 text-sm text-gray-500">
                                この検索条件に名前を付けて保存します。
                            </p>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 pl-1">Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="例: 未処理のLP、出品待ち"
                                    value={newViewName}
                                    onChange={(e) => setNewViewName(e.target.value)}
                                    className="w-full rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 text-sm focus:border-black focus:bg-white focus:outline-none focus:ring-1 focus:ring-black shadow-inner transition-all"
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowSaveModal(false)}
                                    className="flex-1 rounded-2xl border border-gray-100 py-4 text-sm font-bold text-gray-500 hover:bg-gray-50 active:scale-95 transition-all"
                                >
                                    戻る
                                </button>
                                <button
                                    onClick={handleSaveAs}
                                    disabled={!newViewName.trim() || saving}
                                    className="flex-1 rounded-2xl bg-black py-4 text-sm font-bold text-white shadow-lg shadow-black/20 hover:bg-gold-2 hover:text-black hover:shadow-gold-2/30 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    保存する
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
