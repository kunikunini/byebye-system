'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useItemsSelection } from './items-selection-context';

export default function DeleteItemButton({ id, sku }: { id: string; sku: string }) {
    const router = useRouter();
    const { showToast } = useItemsSelection();
    const [isOpen, setIsOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/items/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');

            setIsOpen(false);
            showToast(`${sku} を削除しました`);
            router.refresh();
        } catch (e) {
            alert('削除に失敗しました');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="relative" onClick={(e) => e.stopPropagation()}>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[2px]" onClick={() => setIsOpen(false)} />
                    <div className="fixed left-1/2 top-1/2 z-[70] -translate-x-1/2 -translate-y-1/2 w-[280px] rounded-2xl border border-gray-100 bg-white p-6 shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-in fade-in zoom-in-95 duration-200">
                        <div className="mb-4 text-center">
                            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-sm font-bold text-gray-900">アイテムを削除</h3>
                            <p className="mt-1 text-xs text-gray-500">{sku} を完全に削除しますか？</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsOpen(false)}
                                disabled={isDeleting}
                                className="flex-1 rounded-xl border border-gray-200 bg-white py-2.5 text-xs font-bold text-gray-600 transition-all hover:bg-gray-50 active:scale-95 disabled:opacity-50"
                            >
                                中止
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="flex-1 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white shadow-lg shadow-red-200 transition-all hover:bg-red-700 hover:shadow-red-300 active:scale-95 disabled:opacity-50"
                            >
                                {isDeleting ? (
                                    <svg className="mx-auto h-4 w-4 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : (
                                    '削除する'
                                )}
                            </button>
                        </div>
                    </div>
                </>
            )}

            <button
                onClick={() => setIsOpen(true)}
                type="button"
                className="group flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 text-gray-400 transition-all hover:bg-red-50 hover:text-red-600 hover:shadow-lg hover:shadow-red-50 active:scale-90"
                title="削除"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                </svg>
            </button>
        </div>
    );
}
