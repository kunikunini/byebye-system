'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

export default function SaveViewModal() {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const searchParams = useSearchParams();
    const router = useRouter();

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        setIsLoading(true);
        try {
            // Extract current filters from URL
            const filters = {
                q: searchParams.get('q') || '',
                status: searchParams.get('status') || '',
                type: searchParams.get('type') || '',
            };

            const res = await fetch('/api/views', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, filters }),
            });

            if (!res.ok) throw new Error('Failed to save');

            setIsOpen(false);
            setName('');
            router.refresh(); // Refresh the list/selector
        } catch (error) {
            alert('保存に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-95"
            >
                現在の条件を保存
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <h2 className="mb-4 text-lg font-bold text-gray-900 text-center">ビューを保存</h2>
                <p className="mb-6 text-sm text-gray-600 text-center">
                    現在の検索・フィルタ条件に名前を付けて保存します。
                </p>

                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            ビューの名前
                        </label>
                        <input
                            autoFocus
                            required
                            type="text"
                            placeholder="例: 未処理のLP、出品待ち（CD）"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-text-primary focus:border-gold-2 focus:outline-none focus:ring-1 focus:ring-gold-2 shadow-sm"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 active:scale-95"
                            disabled={isLoading}
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            className="flex-1 rounded-lg bg-black py-2.5 text-sm font-medium text-white shadow-md transition-all hover:bg-gold-2 hover:text-black active:scale-95 disabled:opacity-50"
                            disabled={isLoading || !name.trim()}
                        >
                            {isLoading ? '保存中...' : '保存する'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
