'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewItemPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        body: formData,
        redirect: 'manual'
      });

      if (res.status === 303 || res.status === 302 || res.status === 201) {
        const location = res.headers.get('Location');
        if (location) {
          router.push(location as any);
        } else {
          // Fallback if no location header (though API adds it)
          router.push('/dashboard/items' as any);
        }
      } else {
        const data = await res.json();
        alert(data.error || '登録に失敗しました');
        setIsLoading(false);
      }
    } catch (error) {
      alert('通信エラーが発生しました');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
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

