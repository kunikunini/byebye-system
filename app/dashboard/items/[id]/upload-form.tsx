'use client';

import { useState, ChangeEvent } from 'react';

export default function UploadForm({ itemId }: { itemId: string }) {
    const [fileCount, setFileCount] = useState(0);
    const [fileName, setFileName] = useState<string>('');

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            setFileCount(files.length);
            if (files.length === 1) {
                setFileName(files[0].name);
            } else {
                setFileName(`${files.length} files selected`);
            }
        } else {
            setFileCount(0);
            setFileName('');
        }
    };

    return (
        <form action="/api/upload" method="post" encType="multipart/form-data" className="space-y-2">
            <input type="hidden" name="itemId" value={itemId} />
            <div className="flex items-center gap-3">
                <label className="text-sm">kind</label>
                <select name="kind" className="rounded border border-gray-300 px-3 py-2 text-sm focus:border-black focus:outline-none focus:ring-1 focus:ring-black">
                    {['front', 'back', 'spine', 'label', 'other'].map((k) => (
                        <option key={k} value={k}>
                            {k}
                        </option>
                    ))}
                </select>

                <label className="cursor-pointer rounded border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all duration-200 hover:scale-105 hover:bg-gray-50 hover:shadow-lg active:scale-95">
                    <span>{fileName || 'ファイルを選択'}</span>
                    <input
                        type="file"
                        name="file"
                        multiple
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </label>

                <button
                    className="rounded bg-black px-4 py-2 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:scale-105 hover:bg-gray-800 hover:shadow-lg active:scale-95"
                    type="submit"
                    disabled={fileCount === 0}
                >
                    アップロード
                </button>
            </div>
        </form>
    );
}
