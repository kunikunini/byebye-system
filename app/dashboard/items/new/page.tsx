'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewItemPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setShowSuccess(true);
        // Delay redirect to show success message
        setTimeout(() => {
          router.push(data.location as any);
        }, 1200);
      } else {
        alert(data.error || '登録に失敗しました');
        setIsLoading(false);
      }
    } catch (error) {
      alert('通信エラーが発生しました');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative space-y-6">
      {/* Success Overlay */}
      {showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-white/50 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="rounded-2xl bg-black/95 px-10 py-8 text-white shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-2 text-black animate-bounce">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-bold tracking-tight">登録完了！</p>
                <p className="text-sm text-gray-400">詳細画面へ移動します</p>
              </div>
            </div>
          </div>
        </div>
      )}
      <h1 className="text-xl font-semibold text-text-primary">新規登録</h1>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-text-secondary">アイテム種別</label>
          <select
            name="itemType"
            disabled={isLoading}
            className="mt-1 w-full rounded border border-gray-200 bg-white px-3 py-2 text-text-primary focus:border-gold-2 focus:outline-none focus:ring-1 focus:ring-gold-2 disabled:bg-gray-50"
          >
            <option value="VINYL">VINYL (レコード)</option>
            <option value="CD">CD</option>
          </select>
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="flex items-center justify-center gap-2 min-w-[100px] rounded bg-black px-6 py-2.5 text-sm font-bold text-white shadow-md transition-all duration-200 hover:scale-105 hover:bg-gold-2 hover:text-black hover:shadow-xl active:scale-95 disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>登録中...</span>
            </>
          ) : (
            '登録する'
          )}
        </button>
      </form>
      <p className="text-sm text-text-secondary">
        SKU（管理番号）は登録時に自動採番されます。<br />
        例: <span className="font-mono bg-gray-100 px-1 rounded">BB-20251230-0001</span>
      </p>
    </div>
  );
}

