'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type ItemInfo = {
    id: string;
    sku: string;
    catalogNo: string | null;
    title: string | null;
    artist: string | null;
};

type ProcessState = {
    id: string;
    sku: string;
    status: 'pending' | 'searching' | 'found' | 'multiple' | 'not_found' | 'error';
    result?: any;
};

export default function BatchDiscogsModal({
    selectedIds,
    onClose,
    onComplete,
}: {
    selectedIds: string[];
    onClose: () => void;
    onComplete: () => void;
}) {
    const [items, setItems] = useState<ItemInfo[]>([]);
    const [states, setStates] = useState<ProcessState[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isFinished, setIsFinished] = useState(false);
    const router = useRouter();

    // Load items info on mount
    useEffect(() => {
        const fetchInfo = async () => {
            const res = await fetch('/api/items/batch/info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds }),
            });
            const data = await res.json();
            setItems(data);
            setStates(data.map((item: any) => ({ id: item.id, sku: item.sku, status: 'pending' })));
        };
        fetchInfo();
    }, [selectedIds]);

    const startBatchSearch = async () => {
        setIsProcessing(true);
        const newStates = [...states];

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.catalogNo) {
                newStates[i].status = 'not_found';
                setStates([...newStates]);
                continue;
            }

            newStates[i].status = 'searching';
            setStates([...newStates]);

            try {
                const res = await fetch(`/api/discogs/search?catno=${encodeURIComponent(item.catalogNo)}`);
                const data = await res.json();

                if (data.results && data.results.length === 1) {
                    // Exactly one match - apply it
                    const result = data.results[0];
                    await fetch('/api/items/batch', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ids: [item.id],
                            patch: { title: result.title, artist: result.artist },
                        }),
                    });
                    newStates[i].status = 'found';
                    newStates[i].result = result;
                } else if (data.results && data.results.length > 1) {
                    newStates[i].status = 'multiple';
                } else {
                    newStates[i].status = 'not_found';
                }
            } catch (e) {
                newStates[i].status = 'error';
            }
            setStates([...newStates]);

            // Small delay to be kind to API and show UI transition
            await new Promise(r => setTimeout(r, 300));
        }

        setIsProcessing(false);
        setIsFinished(true);
        router.refresh();
    };

    const getStatusIcon = (status: ProcessState['status']) => {
        switch (status) {
            case 'searching': return <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />;
            case 'found': return <span className="text-green-500">✅</span>;
            case 'multiple': return <span className="text-yellow-500" title="複数の候補があるため手動同定が必要です">⚠️ 複数</span>;
            case 'not_found': return <span className="text-gray-400">❓ 不明</span>;
            case 'error': return <span className="text-red-500">❌ エラー</span>;
            default: return <span className="text-gray-300">○</span>;
        }
    };

    const foundCount = states.filter(s => s.status === 'found').length;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="border-b border-gray-100 px-6 py-4">
                    <h2 className="text-xl font-bold text-gray-900">Discogs 一括検索</h2>
                    <p className="text-sm text-gray-500">品番をもとに商品情報を自動取得します（{selectedIds.length}件）</p>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-3">
                        {states.map((s, i) => (
                            <div key={s.id} className="flex items-center justify-between rounded-lg border border-gray-50 bg-gray-50/50 px-4 py-2">
                                <div className="flex flex-col">
                                    <span className="font-mono text-xs font-medium text-gray-500">{s.sku}</span>
                                    <span className="text-sm font-bold text-gray-900">{items[i]?.catalogNo || '(品番なし)'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                    {getStatusIcon(s.status)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-gray-50 px-6 py-4">
                    {!isFinished ? (
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                disabled={isProcessing}
                                className="flex-1 rounded-xl border border-gray-300 bg-white py-3 text-sm font-bold text-gray-700 shadow-md shadow-gray-100 transition-all hover:scale-105 hover:bg-gray-50 active:scale-95 disabled:opacity-50"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={startBatchSearch}
                                disabled={isProcessing || items.length === 0}
                                className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition-all hover:scale-105 hover:bg-blue-700 hover:shadow-xl active:scale-95 disabled:opacity-50"
                            >
                                {isProcessing ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                        <span>検索中...</span>
                                    </div>
                                ) : (
                                    '検索を開始'
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="text-center">
                            <p className="mb-4 text-sm font-medium text-gray-600">
                                完了しました。{foundCount} 件の情報を更新しました。
                            </p>
                            <button
                                onClick={onComplete}
                                className="w-full rounded-xl bg-black py-4 text-sm font-bold text-white shadow-xl shadow-black/20 transition-all hover:scale-105 hover:bg-gold-2 hover:text-black hover:shadow-2xl active:scale-95"
                            >
                                閉じる
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
