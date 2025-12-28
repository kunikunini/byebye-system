'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Props will receive the FIRST item ID from the server-side fetched list, 
// ensuring "Next" always goes to the top item of the current list.
export default function WorkQueueStatus({
    nextItemId,
    totalCount,
    viewName
}: {
    nextItemId?: string | null;
    totalCount: number;
    viewName?: string;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const viewId = searchParams.get('viewId');

    if (!viewId && !viewName) return null; // Only show if a view/queue is active

    const handleNext = () => {
        if (nextItemId) {
            router.push(`/dashboard/items/${nextItemId}`);
        } else {
            alert('処理対象のアイテムはありません');
        }
    };

    return (
        <div className="flex items-center gap-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2">
            <div className="flex flex-col">
                <span className="text-xs font-medium text-blue-600">Active Queue</span>
                <span className="text-sm font-bold text-gray-900">{viewName || 'Custom View'}</span>
            </div>

            <div className="h-8 w-px bg-blue-200"></div>

            <div className="text-sm text-gray-700">
                今日のキュー：<span className="font-bold">{totalCount}</span>件
            </div>

            <button
                onClick={handleNext}
                disabled={!nextItemId}
                className="ml-auto flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-bold text-white shadow-md transition-all hover:bg-blue-700 hover:shadow-lg disabled:opacity-50 disabled:shadow-none"
            >
                <span>次へ</span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </button>
        </div>
    );
}
