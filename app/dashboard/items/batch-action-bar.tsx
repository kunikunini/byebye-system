'use client';

import { useItemsSelection } from './items-selection-context';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BatchDiscogsModal from './batch-discogs-modal';

export default function BatchActionBar() {
    const { selectedIds, clearSelection } = useItemsSelection();
    const [loading, setLoading] = useState(false);
    const [showDiscogsModal, setShowDiscogsModal] = useState(false);
    const router = useRouter();

    if (selectedIds.length === 0) return null;

    const handleStatusChange = async (newStatus: string) => {
        if (!newStatus) return;
        if (!confirm(`${selectedIds.length} 件のステータスを ${newStatus} に変更しますか？`)) return;

        setLoading(true);
        try {
            const res = await fetch('/api/items/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds, patch: { status: newStatus } }),
            });

            if (res.ok) {
                clearSelection();
                router.refresh();
            } else {
                alert('ステータスの更新に失敗しました');
            }
        } catch (e) {
            alert('通信エラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`選択された ${selectedIds.length} 件を完全に削除しますか？\nこの操作は取り消せません。`)) return;

        setLoading(true);
        try {
            const res = await fetch('/api/items/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds, action: 'delete' }),
            });

            if (res.ok) {
                clearSelection();
                router.refresh();
            } else {
                alert('削除に失敗しました');
            }
        } catch (e) {
            alert('通信エラーが発生しました');
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/items/export', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds }),
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `items_export_${new Date().toISOString().slice(0, 10)}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
            } else {
                alert('CSV出力に失敗しました');
            }
        } catch (e) {
            alert('CSV出力に失敗しました');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-xl border border-gray-200 bg-white/90 p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-[10px] font-bold text-white">
                    {selectedIds.length}
                </span>
                <span className="text-sm font-bold text-gray-900">selected</span>
            </div>

            <div className="h-6 w-px bg-gray-200"></div>

            <div className="flex items-center gap-2">
                {/* Quick Status Actions */}
                <button
                    onClick={() => handleStatusChange('READY')}
                    disabled={loading}
                    className="flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-xs font-bold text-green-700 shadow-sm shadow-green-100 transition-all hover:scale-105 hover:bg-green-100 hover:shadow-md active:scale-95 disabled:opacity-50"
                    title="準備完了にする"
                >
                    🟢 READY
                </button>
                <button
                    onClick={() => handleStatusChange('LISTED')}
                    disabled={loading}
                    className="flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold text-blue-700 shadow-sm shadow-blue-100 transition-all hover:scale-105 hover:bg-blue-100 hover:shadow-md active:scale-95 disabled:opacity-50"
                    title="出品済みにする"
                >
                    🔵 LISTED
                </button>

                <div className="h-6 w-px bg-gray-200 mx-1"></div>

                {/* Batch Discogs Search */}
                <button
                    onClick={() => setShowDiscogsModal(true)}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-200 transition-all hover:scale-105 hover:bg-blue-700 hover:shadow-xl active:scale-95 disabled:opacity-50"
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <span>Discogs一括検索</span>
                </button>

                <button
                    onClick={handleExport}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 shadow-md shadow-gray-100 transition-all hover:scale-105 hover:bg-gray-50 hover:shadow-lg active:scale-95 disabled:opacity-50"
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    <span>CSV</span>
                </button>

                <div className="h-6 w-px bg-gray-200 mx-1"></div>

                <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-bold text-red-600 shadow-md shadow-red-50 transition-all hover:scale-105 hover:bg-red-100 hover:shadow-lg active:scale-95 disabled:opacity-50"
                >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    <span>削除</span>
                </button>
            </div>

            <button
                onClick={clearSelection}
                className="ml-2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                disabled={loading}
                title="選択解除"
            >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>

            {showDiscogsModal && (
                <BatchDiscogsModal
                    selectedIds={selectedIds}
                    onClose={() => setShowDiscogsModal(false)}
                    onComplete={() => {
                        setShowDiscogsModal(false);
                        clearSelection();
                        router.refresh();
                    }}
                />
            )}
        </div>
    );
}
