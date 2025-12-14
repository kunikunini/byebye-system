'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteItemButton({ id }: { id: string }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    const handleDelete = async () => {
        try {
            const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
            router.push('/dashboard/items');
            router.refresh();
        } catch (e) {
            alert('削除に失敗しました');
        }
    };

    return (
        <div className="relative inline-block">
            {isOpen && (
                <>
                    {/* Backdrop for easy closing */}
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

                    <div className="absolute bottom-full left-0 mb-2 z-20 w-64 rounded-lg border border-gray-200 bg-white p-4 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                        <p className="mb-3 text-sm font-medium text-gray-900">本当に削除しますか？</p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="rounded px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100"
                            >
                                キャンセル
                            </button>
                            <button
                                onClick={handleDelete}
                                className="rounded bg-red-600 px-3 py-1.5 text-xs text-white shadow-sm hover:bg-red-700"
                            >
                                削除する
                            </button>
                        </div>
                    </div>
                </>
            )}

            <button
                onClick={() => setIsOpen(true)}
                type="button"
                className="rounded bg-gray-100 px-4 py-2 font-medium text-red-600 shadow-md transition-all duration-200 hover:scale-105 hover:bg-red-50 hover:shadow-xl active:scale-95"
            >
                この商品を削除
            </button>
        </div>
    );
}
