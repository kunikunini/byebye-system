'use client';

import { useState, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function UploadForm({ itemId }: { itemId: string }) {
    const [fileCount, setFileCount] = useState(0);
    const [fileName, setFileName] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
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

            if (!res.ok) throw new Error('Upload failed');

            // Clear state after success
            setFileCount(0);
            setFileName('');
            const fileInput = e.currentTarget.querySelector('input[type="file"]') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

            router.refresh(); // Update the image list
        } catch (error) {
            alert('アップロードに失敗しました');
        } finally {
            setIsUploading(false);
        }
    };

    return (
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
                    cursor-pointer rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-md transition-all duration-200 
                    ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:border-gold-2 hover:text-gold-3 hover:shadow-xl active:scale-95'}
                `}>
                    <span className="truncate max-w-[150px] inline-block align-bottom">{fileName || '画像を選択'}</span>
                    <input
                        type="file"
                        name="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={isUploading}
                    />
                </label>

                <button
                    className="flex items-center gap-2 rounded bg-black px-4 py-2 text-sm font-bold text-white shadow-md transition-all duration-200 hover:scale-105 hover:bg-gold-2 hover:text-black hover:shadow-xl active:scale-95 disabled:scale-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    type="submit"
                    disabled={fileCount === 0 || isUploading}
                >
                    {isUploading ? (
                        <>
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>中...</span>
                        </>
                    ) : (
                        'アップロード'
                    )}
                </button>
            </div>
        </form>
    );
}
