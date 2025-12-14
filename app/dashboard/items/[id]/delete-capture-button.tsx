'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DeleteCaptureButton({ id }: { id: string }) {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    const handleDelete = async () => {
        try {
            const res = await fetch(`/api/captures/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed');
            router.refresh();
        } catch (e) {
            alert('削除に失敗しました');
        }
    };

    return (
        <>
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-8 z-20 w-48 rounded-lg border border-gray-200 bg-white p-3 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                        <p className="mb-2 text-xs font-medium text-gray-900">画像を削除しますか？</p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                            >
                                No
                            </button>
                            <button
                                onClick={handleDelete}
                                className="rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
                            >
                                Yes
                            </button>
                        </div>
                    </div>
                </>
            )}
            <button
                onClick={() => setIsOpen(true)}
                type="button"
                className="absolute top-1 right-1 z-[5] flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-colors hover:bg-red-600"
                title="画像を削除"
            >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </>
    );
}
