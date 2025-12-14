'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DeleteItemButton from './delete-button';

// Type definition matching the DB schema (simplified for UI)
type Item = {
    id: string;
    sku: string;
    itemType: 'VINYL' | 'CD' | 'BOOK' | 'OTHER';
    status: 'UNPROCESSED' | 'IDENTIFIED' | 'READY' | 'LISTED' | 'SOLD';
    title: string | null;
    artist: string | null;
    catalogNo: string | null;
    notes: string | null;
    storageLocation: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
};

export default function ItemEditForm({ item }: { item: Item }) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showToast, setShowToast] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);

        const formData = new FormData(e.currentTarget);
        try {
            const res = await fetch(`/api/items/${item.id}`, {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Failed to save');

            // Show success feedback
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000); // Auto-hide toast after 3s

            router.refresh(); // Refresh server-side data (e.g. if title changed in header)
        } catch (error) {
            alert('保存に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            {/* Toast Notification (Fixed Position) */}
            {showToast && (
                <div className="fixed top-6 left-1/2 z-50 -translate-x-1/2 transform rounded-full bg-black/90 px-6 py-3 text-white shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-2">
                        <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-medium">保存完了！</span>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">title</label>
                        <input
                            name="title"
                            defaultValue={item.title ?? ''}
                            className="mt-1 w-full rounded border border-gray-200 bg-white px-3 py-2 text-text-primary placeholder-text-muted focus:border-gold-2 focus:outline-none focus:ring-1 focus:ring-gold-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">artist</label>
                        <input
                            name="artist"
                            defaultValue={item.artist ?? ''}
                            className="mt-1 w-full rounded border border-gray-200 bg-white px-3 py-2 text-text-primary placeholder-text-muted focus:border-gold-2 focus:outline-none focus:ring-1 focus:ring-gold-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">catalog_no</label>
                        <input
                            name="catalog_no"
                            defaultValue={item.catalogNo ?? ''}
                            className="mt-1 w-full rounded border border-gray-200 bg-white px-3 py-2 text-text-primary placeholder-text-muted focus:border-gold-2 focus:outline-none focus:ring-1 focus:ring-gold-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">storage_location</label>
                        <input
                            name="storage_location"
                            defaultValue={item.storageLocation ?? ''}
                            className="mt-1 w-full rounded border border-gray-200 bg-white px-3 py-2 text-text-primary placeholder-text-muted focus:border-gold-2 focus:outline-none focus:ring-1 focus:ring-gold-2"
                        />
                    </div>
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-text-secondary">notes</label>
                        <textarea
                            name="notes"
                            defaultValue={item.notes ?? ''}
                            className="mt-1 w-full rounded border border-gray-200 bg-white px-3 py-2 text-text-primary placeholder-text-muted focus:border-gold-2 focus:outline-none focus:ring-1 focus:ring-gold-2"
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-secondary">status</label>
                        <select
                            name="status"
                            defaultValue={item.status}
                            className="mt-1 rounded border border-gray-200 bg-white px-3 py-2 text-text-primary focus:border-gold-2 focus:outline-none focus:ring-1 focus:ring-gold-2"
                        >
                            {['UNPROCESSED', 'IDENTIFIED', 'READY', 'LISTED', 'SOLD'].map((s) => (
                                <option key={s} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex items-center justify-start gap-4 border-t border-borderColor-subtle pt-4">
                    <Link
                        href="/dashboard/items"
                        className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-md transition-all duration-200 hover:scale-105 hover:border-gold-2 hover:text-gold-3 hover:shadow-xl active:scale-95"
                    >
                        一覧へ戻る
                    </Link>
                    <button
                        className="rounded bg-black px-6 py-2 font-medium text-white shadow-md transition-all duration-200 hover:scale-105 hover:bg-gold-2 hover:text-black hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100"
                        type="submit"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <div className="flex items-center gap-2">
                                <svg className="h-4 w-4 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>保存中...</span>
                            </div>
                        ) : (
                            '保存'
                        )}
                    </button>
                    <DeleteItemButton id={item.id} />
                </div>
            </form>
        </>
    );
}
