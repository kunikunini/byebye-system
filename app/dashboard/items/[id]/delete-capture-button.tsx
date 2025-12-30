'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteCaptureButton({ id }: { id: string }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/captures/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');

            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                setIsOpen(false);
                router.refresh();
            }, 1000);
        } catch (e) {
            alert('削除に失敗しました');
            setIsDeleting(false);
        }
    };

    return (
        <>
            {/* Success Overlay */}
            {showSuccess && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                    <div className="rounded-2xl bg-black/90 px-8 py-5 text-white shadow-2xl backdrop-blur-md animate-in zoom-in-95 fade-in duration-300">
                        <div className="flex flex-col items-center gap-3 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-600 text-white">
                                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xl font-bold tracking-tight">削除完了</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => (isDeleting ? null : setIsOpen(false))} />
                    <div className="absolute right-0 top-8 z-20 w-48 rounded-lg border border-gray-200 bg-white p-3 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                        <p className="mb-2 text-xs font-medium text-gray-900">画像を削除しますか？</p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setIsOpen(false)}
                                disabled={isDeleting}
                                className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                            >
                                No
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="flex items-center gap-1 rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {isDeleting && (
                                    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                )}
                                {isDeleting ? '削除中...' : 'Yes'}
                            </button>
                        </div>
                    </div>
                </>
            )}
            <button
                onClick={() => setIsOpen(true)}
                type="button"
                className="absolute top-1 right-1 z-[5] flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-all hover:scale-110 hover:bg-red-600 active:scale-90"
                title="画像を削除"
            >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </>
    );
}
