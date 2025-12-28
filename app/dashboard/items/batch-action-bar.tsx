'use client';

import { useItemsSelection } from './items-selection-context';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BatchActionBar() {
    const { selectedIds, clearSelection } = useItemsSelection();
    const [loading, setLoading] = useState(false);
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
                alert('エラーが発生しました');
            }
        } catch (e) {
            alert('エラーが発生しました');
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
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-lg border border-gray-200 bg-white p-4 shadow-xl animate-in fade-in slide-in-from-bottom-4">
            <div className="text-sm font-bold text-gray-900">
                {selectedIds.length} <span className="font-normal text-gray-500">selected</span>
            </div>

            <div className="h-6 w-px bg-gray-200"></div>

            <div className="flex items-center gap-2">
                <select
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="rounded border border-gray-300 px-3 py-1.5 text-sm"
                    value=""
                    disabled={loading}
                >
                    <option value="" disabled>ステータス変更...</option>
                    <option value="UNPROCESSED">UNPROCESSED</option>
                    <option value="IDENTIFIED">IDENTIFIED</option>
                    <option value="READY">READY</option>
                    <option value="LISTED">LISTED</option>
                    <option value="SOLD">SOLD</option>
                </select>

                <button
                    onClick={handleExport}
                    disabled={loading}
                    className="rounded border border-gray-300 bg-gray-50 px-3 py-1.5 text-sm font-medium hover:bg-gray-100"
                >
                    ⬇ CSV
                </button>
            </div>

            <button
                onClick={clearSelection}
                className="ml-2 text-xs text-gray-400 hover:text-gray-600"
                disabled={loading}
            >
                ✕ 解除
            </button>
        </div>
    );
}
