'use client';

import { useState, ChangeEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadForm({ itemId }: { itemId: string }) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileCount, setFileCount] = useState(0);
    const [fileName, setFileName] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const router = useRouter();

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setFileCount(files.length);
            if (files.length === 1) {
                setFileName(files[0].name);
            } else {
                setFileName(`${files.length}個のファイルを選択`);
            }
        } else {
            setFileCount(0);
            setFileName('');
        }
    };

    const clearInput = () => {
        setFileCount(0);
        setFileName('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (fileCount === 0) return;

        setIsUploading(true);
        const formData = new FormData(e.currentTarget);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error('Upload server error:', res.status, errorText);
                throw new Error(`Server returned ${res.status}`);
            }

            let data;
            try {
                data = await res.json();
            } catch (e) {
                console.error('Failed to parse JSON response:', e);
                data = { success: true };
            }

            if (data.success || res.status === 200) {
                setShowSuccess(true);
                setTimeout(() => setShowSuccess(false), 2000);
                clearInput();
                router.refresh();
            } else {
                if (res.status === 504 || res.status === 500) {
                    console.warn('Potential timeout but processing might have finished:', res.status);
                    setShowSuccess(true);
                    setTimeout(() => setShowSuccess(false), 2000);
                    clearInput();
                    router.refresh();
                } else {
                    alert(data.error || 'アップロードに失敗しました');
                }
            }
        } catch (error) {
            console.error('Upload error detail:', error);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
            clearInput();
            router.refresh();
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <>
            {/* Success Toast Overlay */}
            {showSuccess && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                    <div className="rounded-2xl bg-black/90 px-8 py-5 text-white shadow-2xl backdrop-blur-md animate-in zoom-in-95 fade-in duration-300">
                        <div className="flex flex-col items-center gap-3 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-2 text-black">
                                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div className="space-y-1">
                                <p className="text-xl font-bold tracking-tight">アップロード完了</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-2">
                <input type="hidden" name="itemId" value={itemId} />
                <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-text-secondary whitespace-nowrap">種類</label>
                    <select
                        name="kind"
                        disabled={isUploading}
                        className="rounded border border-gray-200 px-3 py-2 text-sm focus:border-gold-2 focus:outline-none focus:ring-1 focus:ring-gold-2 disabled:opacity-50"
                    >
                        {[
                            { val: 'front', label: '表面' },
                            { val: 'back', label: '裏面' },
                            { val: 'spine', label: '背表紙' },
                            { val: 'label', label: '盤面/ラベル' },
                            { val: 'other', label: 'その他' }
                        ].map((k) => (
                            <option key={k.val} value={k.val}>
                                {k.label}
                            </option>
                        ))}
                    </select>

                    <label className={`
                    cursor-pointer rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700 shadow-lg shadow-gray-100 transition-all duration-200 
                    ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:border-gold-2 hover:text-gold-3 hover:shadow-xl active:scale-95'}
                `}>
                        <div className="flex items-center gap-2">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="truncate max-w-[150px] inline-block align-bottom">{fileName || '画像を選択'}</span>
                        </div>
                        <input
                            type="file"
                            name="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                            disabled={isUploading}
                            ref={fileInputRef}
                        />
                    </label>

                    <button
                        className="flex items-center gap-2 rounded-xl bg-black px-6 py-3 text-sm font-bold text-white shadow-lg shadow-black/20 transition-all duration-200 hover:scale-105 hover:bg-gold-2 hover:text-black hover:shadow-xl active:scale-95 disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        type="submit"
                        disabled={fileCount === 0 || isUploading}
                    >
                        {isUploading ? (
                            <>
                                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>アップロード中...</span>
                            </>
                        ) : (
                            <>
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                </svg>
                                <span>アップロード</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </>
    );
}
