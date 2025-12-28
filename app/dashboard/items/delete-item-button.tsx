'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteItemButton({ id, sku }: { id: string; sku: string }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
            setIsOpen(false);
            router.refresh();
        } catch (e) {
            alert('削除に失敗しました');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-30 opacity-0" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-full mt-1 z-40 w-48 rounded-md border border-gray-200 bg-white p-3 shadow-lg animate-in fade-in zoom-in-95 duration-100">
                        <p className="mb-2 text-xs font-medium text-gray-900">
                            {sku} を削除しますか？
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setIsOpen(false)}
                                disabled={isDeleting}
                                className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                            >
                                中止
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {isDeleting ? '...' : '削除'}
                            </button>
                        </div>
                    </div>
                </>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                type="button"
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 transition-colors"
                title="削除"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
            </button>
        </div>
    );
}
