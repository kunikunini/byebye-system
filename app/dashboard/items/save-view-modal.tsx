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
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition-all hover:scale-105 hover:bg-gray-50 active:scale-95"
            >
                <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                <span>検索条件を保存</span>
            </button>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-in zoom-in-95 duration-200">
                <div className="text-center mb-6">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold-2/10 text-gold-4">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">ビューを保存</h2>
                    <p className="mt-2 text-sm text-gray-500">
                        現在の検索・フィルタ条件に名前を付けて保存し、いつでも呼び出せるようにします。
                    </p>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-2">
                            ビューの名前
                        </label>
                        <input
                            autoFocus
                            required
                            type="text"
                            placeholder="例: 未処理のLP、出品待ち（CD）"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm text-text-primary focus:border-black focus:outline-none focus:ring-1 focus:ring-black shadow-sm transition-all"
                            disabled={isLoading}
                        />
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-500 transition-all hover:bg-gray-50 active:scale-95"
                            disabled={isLoading}
                        >
                            キャンセル
                        </button>
                        <button
                            type="submit"
                            className="flex-1 rounded-xl bg-black py-3 text-sm font-bold text-white shadow-lg shadow-black/10 transition-all hover:scale-105 hover:bg-gold-2 hover:text-black active:scale-95 disabled:opacity-50"
                            disabled={isLoading || !name.trim()}
                        >
                            {isLoading ? (
                                <svg className="mx-auto h-5 w-5 animate-spin" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : (
                                '保存する'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
