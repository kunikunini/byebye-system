'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type SavedView = {
    id: string;
    name: string;
    filters: any;
    sort?: any;
};

export default function SavedViewsSelector() {
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
        // Exclude 'viewId' itself
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
                fetchViews(); // Refresh list

                // Switch to the new view
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
            const newViews = views.filter(v => v.id !== activeView.id);
            setViews(newViews);
            const params = new URLSearchParams(searchParams);
            params.delete('viewId');
            router.push(`/dashboard/items?${params.toString()}`);
        } catch (e) {
            alert('削除に失敗しました');
        }
    };

    // unsaved indicator if URL filters differ from active view filters
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
            const newViews = views.filter(v => v.id !== id);
            setViews(newViews);

            // If deleted view was active, clear viewId
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
        // Apply saved filters
        if (view.filters) {
            Object.entries(view.filters).forEach(([k, v]) => {
                params.set(k, String(v));
            });
        }
        // Set viewId
        params.set('viewId', view.id);
        router.push(`/dashboard/items?${params.toString()}`);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <div className="flex gap-2 items-center">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
                >
                    <span>{activeView ? `キュー: ${activeView.name}` : '作業キューを選択'}</span>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>

                {activeView && (
                    <button
                        onClick={() => {
                            const params = new URLSearchParams(searchParams);
                            params.delete('viewId');
                            router.push(`/dashboard/items?${params.toString()}`);
                        }}
                        className="px-2 py-2 text-gray-500 hover:text-gray-700"
                        title="選択解除"
                    >
                        ✕
                    </button>
                )}

                <button
                    onClick={handleOverwrite}
                    className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm disabled:opacity-50"
                    disabled={saving}
                >
                    保存
                </button>
                <button
                    onClick={() => setShowSaveModal(true)}
                    className="rounded border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"
                >
                    名前を付けて保存
                </button>
                <button
                    onClick={handleDeleteActive}
                    className="rounded border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 shadow-sm disabled:opacity-50"
                    disabled={!activeView}
                >
                    削除
                </button>

                {activeView && isDirty && (
                    <span className="ml-1 text-xs text-orange-600">● 未保存</span>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute left-0 mt-1 z-20 w-64 rounded-md border border-gray-200 bg-white shadow-lg animate-in fade-in zoom-in-95 duration-100">
                        <div className="p-1">
                            {loading && <div className="p-2 text-xs text-gray-500">Loading...</div>}
                            {!loading && views.length === 0 && <div className="p-2 text-xs text-gray-500">保存されたキューはありません</div>}

                            {views.map((v) => (
                                <div
                                    key={v.id}
                                    onClick={() => handleSelect(v)}
                                    className={`flex items-center justify-between rounded px-3 py-2 text-sm cursor-pointer hover:bg-gray-100 ${currentViewId === v.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                                >
                                    <span className="truncate">{v.name}</span>
                                    <button
                                        onClick={(e) => handleDelete(v.id, e)}
                                        className="text-gray-400 hover:text-red-500 p-1"
                                    >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Save Modal */}
            {showSaveModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-80 rounded-lg bg-white p-4 shadow-xl">
                        <h3 className="mb-3 text-sm font-bold">現在の条件を保存</h3>
                        <input
                            type="text"
                            placeholder="キューの名前 (例: 今日の出品)"
                            value={newViewName}
                            onChange={(e) => setNewViewName(e.target.value)}
                            className="mb-4 w-full rounded border border-gray-300 px-3 py-2 text-sm"
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowSaveModal(false)}
                                className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleSaveAs}
                                disabled={!newViewName.trim()}
                                className="rounded bg-black px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                            >
                                保存
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
