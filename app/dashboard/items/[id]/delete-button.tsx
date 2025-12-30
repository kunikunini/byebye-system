'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteItemButton({ id, sku }: { id: string; sku: string }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');

            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                router.push('/dashboard/items');
                router.refresh();
            }, 1200);
        } catch (e) {
            alert('削除に失敗しました');
            setIsDeleting(false);
        }
    };

    return (
        <div className="relative inline-block">
            {/* Success Overlay */}
            {showSuccess && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/50 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="rounded-2xl bg-black/95 px-10 py-8 text-white shadow-2xl animate-in zoom-in-95 duration-300">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white animate-bounce">
                                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <div className="space-y-1">
                                <p className="text-2xl font-bold tracking-tight">削除完了</p>
                                <p className="text-sm text-gray-400">一覧画面に戻ります</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => (isDeleting ? null : setIsOpen(false))} />
                    <div className="absolute bottom-full left-0 mb-3 z-20 w-72 rounded-xl border border-gray-200 bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <p className="mb-4 text-sm font-bold text-gray-900 leading-tight">
                            SKU: <span className="text-red-600 font-mono">{sku}</span><br />
                            この商品を完全に削除しますか？
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsOpen(false)}
                                disabled={isDeleting}
                                className="rounded-lg px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-red-200 transition-all hover:bg-red-700 active:scale-95 disabled:opacity-50"
                            >
                                {isDeleting ? (
                                    <>
                                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>削除中...</span>
                                    </>
                                ) : (
                                    <span>削除する</span>
                                )}
                            </button>
                        </div>
                    </div>
                </>
            )}

            <button
                onClick={() => setIsOpen(true)}
                type="button"
                className="rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-600 shadow-lg shadow-red-50 transition-all duration-200 hover:scale-105 hover:bg-red-50 hover:shadow-xl active:scale-95"
            >
                商品を削除
            </button>
        </div>
    );
}
