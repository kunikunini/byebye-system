'use client';

import { useItemsSelection } from './items-selection-context';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BatchDiscogsModal from './batch-discogs-modal';

export default function BatchActionBar() {
    const { selectedIds, clearSelection, showToast } = useItemsSelection();
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
                showToast(`${selectedIds.length} 件を ${newStatus} に変更しました`);
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
                showToast(`${selectedIds.length} 件を削除しました`);
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
                showToast('CSVを出力しました');
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
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-2xl border border-gray-100 bg-white/95 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.2)] backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 ring-1 ring-black/5">
            <div className="flex items-center gap-3 pl-2">
                <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-black text-xs font-bold text-white shadow-lg">
                    {selectedIds.length}
                    <div className="absolute inset-0 rounded-full animate-ping bg-black/20"></div>
                </div>
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Selected</span>
            </div>

            <div className="h-8 w-px bg-gray-100 mx-2"></div>

            <div className="flex items-center gap-2">
                {/* Quick Status Actions */}
                <button
                    onClick={() => handleStatusChange('READY')}
                    disabled={loading}
                    className="group relative flex items-center gap-2 rounded-xl border border-green-100 bg-green-50/50 px-4 py-2.5 text-xs font-bold text-green-700 transition-all hover:scale-105 hover:bg-green-100 active:scale-95 disabled:opacity-50"
                    title="準備完了にする"
                >
                    <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                    <span>READY</span>
                </button>
                <button
                    onClick={() => handleStatusChange('LISTED')}
                    disabled={loading}
                    className="group relative flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-2.5 text-xs font-bold text-blue-700 transition-all hover:scale-105 hover:bg-blue-100 active:scale-95 disabled:opacity-50"
                    title="出品済みにする"
                >
                    <span className="h-2 w-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                    <span>LISTED</span>
                </button>

                <div className="h-8 w-px bg-gray-100 mx-2"></div>

                {/* Batch Discogs Search */}
                <button
                    onClick={() => setShowDiscogsModal(true)}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-[0_10px_20px_rgba(37,99,235,0.3)] transition-all hover:scale-105 hover:bg-blue-700 hover:shadow-[0_15px_30px_rgba(37,99,235,0.4)] active:scale-95 disabled:opacity-50"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <span>Discogs一括検索</span>
                </button>

                <button
                    onClick={handleExport}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 shadow-sm transition-all hover:scale-105 hover:bg-gray-50 active:scale-95 disabled:opacity-50"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    <span>CSV</span>
                </button>

                <div className="h-8 w-px bg-gray-100 mx-2"></div>

                <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50/50 px-4 py-2.5 text-xs font-bold text-red-600 transition-all hover:scale-105 hover:bg-red-100 active:scale-95 disabled:opacity-50"
                >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    <span>削除</span>
                </button>
            </div>

            <div className="h-8 w-px bg-gray-100 mx-2"></div>

            <button
                onClick={clearSelection}
                className="group flex h-10 w-10 items-center justify-center rounded-full text-gray-400 transition-all hover:bg-gray-100 hover:text-gray-900 active:scale-90"
                disabled={loading}
                title="選択解除"
            >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
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
