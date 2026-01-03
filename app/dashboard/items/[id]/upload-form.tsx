'use client';

import { useState, ChangeEvent, useRef } from 'react';
import { useRouter } from 'next/navigation';

import Link from 'next/link';
import DeleteCaptureButton from './delete-capture-button';

type UploadStep = 'front' | 'back' | 'optional';

export default function UploadForm({ itemId, captures = [] }: { itemId: string; captures?: any[] }) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const [currentStep, setCurrentStep] = useState<UploadStep>('front');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadHistory, setUploadHistory] = useState<string[]>([]);
    const [showSuccess, setShowSuccess] = useState(false);
    const router = useRouter();

    const tabs: { id: UploadStep; label: string; icon: string }[] = [
        { id: 'front', label: '表面', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
        { id: 'back', label: '裏面', icon: 'M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
        { id: 'optional', label: 'その他', icon: 'M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z' },
    ];

    const getStepDescription = (step: UploadStep) => {
        switch (step) {
            case 'front': return 'ジャケットの表面 (Front Cover)';
            case 'back': return 'ジャケットの裏面 (Back Cover)';
            default: return '盤面・付属品など (Extras)';
        }
    };

    const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        await uploadFiles(files);
    };

    const uploadFiles = async (files: FileList) => {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('itemId', itemId);

        // Determine kind based on current step
        let kind = 'other';
        if (currentStep === 'front') kind = 'front';
        else if (currentStep === 'back') kind = 'back';

        formData.append('kind', kind);

        for (let i = 0; i < files.length; i++) {
            formData.append('file', files[i]);
        }

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Upload failed');

            // Success handling
            setUploadHistory(prev => [...prev, kind]);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);

            // Auto advance logic (User can still manually switch back)
            if (currentStep === 'front') {
                setCurrentStep('back');
            } else if (currentStep === 'back') {
                setCurrentStep('optional');
            }

            router.refresh();
        } catch (error) {
            console.error('Upload error:', error);
            alert('アップロードに失敗しました');
        } finally {
            setIsUploading(false);
            // Reset inputs
            if (fileInputRef.current) fileInputRef.current.value = '';
            if (cameraInputRef.current) cameraInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-6">
            <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm relative overflow-hidden">
                {/* Success Overlay (Fixed Center Toast) */}
                {showSuccess && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
                        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white/90 border border-gold-2/50 px-8 py-5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-2 text-black shadow-lg shadow-gold-2/30">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-sm font-black text-gray-900 tracking-tight">保存しました</p>
                        </div>
                    </div>
                )}

                {/* Tab Navigation (Switch Style) */}
                <div className="flex justify-between items-center mb-6 bg-gray-100 rounded-full p-1.5 gap-1 shadow-inner">
                    {tabs.map((tab) => {
                        const isActive = currentStep === tab.id;
                        // Check history OR props for done status
                        const hasImageInProps = captures.some(c => {
                            if (tab.id === 'optional') return c.kind === 'other';
                            return c.kind === tab.id;
                        });
                        const isDone = uploadHistory.includes(tab.id === 'optional' ? 'other' : tab.id) || hasImageInProps;
                        const isMandatory = tab.id !== 'optional';

                        return (
                            <button
                                key={tab.id}
                                onClick={() => setCurrentStep(tab.id)}
                                className={`
                                flex-1 flex flex-col items-center justify-center py-2.5 px-2 rounded-full transition-all duration-300 relative group
                                ${isActive
                                        ? 'bg-white text-black shadow-lg shadow-black/5 font-black scale-100 ring-1 ring-black/5'
                                        : 'text-gray-500 hover:text-gray-900 font-bold scale-95'
                                    }
                            `}
                            >
                                <div className="flex items-center gap-1.5 mb-0.5 relative z-10">
                                    {isDone ? (
                                        <div className="h-4 w-4 rounded-full bg-green-500 flex items-center justify-center shadow-md">
                                            <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    ) : (
                                        <svg className={`h-4 w-4 transition-colors ${isActive ? 'text-gold-5' : 'text-gray-400 group-hover:text-gray-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} />
                                        </svg>
                                    )}
                                    <span className="text-xs tracking-tight">{tab.label}</span>
                                </div>

                                {/* Mandatory Badge for Inactive */}
                                {isMandatory && !isDone && !isActive && (
                                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="text-center space-y-6">
                    <div className="relative">
                        <h3 className="text-lg font-black text-gray-900 mb-1 flex items-center justify-center gap-2">
                            {getStepDescription(currentStep)}
                            {currentStep !== 'optional' && (
                                <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-[10px] font-bold text-red-600 ring-1 ring-inset ring-red-600/10">必須</span>
                            )}
                        </h3>
                        <p className="text-xs text-gray-500 font-medium pb-2">
                            ※ 最低限 <span className="font-bold text-gray-900">「表面」</span> と <span className="font-bold text-gray-900">「裏面」</span> の画像の登録が必要です
                        </p>

                        {/* Active Tab Indicator Line for visual connection */}
                        <div className="mx-auto w-12 h-1 bg-gradient-to-r from-transparent via-gold-2 to-transparent rounded-full opacity-50" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Camera Button (Mobile prioritized) */}
                        <label className={`
                            relative cursor-pointer flex flex-col items-center justify-center gap-3 rounded-2xl bg-black py-8 text-white shadow-xl shadow-black/20 transition-all active:scale-95 group
                            ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:bg-gray-900'}
                        `}>
                            <div className="rounded-full bg-white/20 p-3 group-hover:scale-110 transition-transform">
                                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <span className="text-sm font-bold">カメラで撮影</span>
                            <input
                                ref={cameraInputRef}
                                type="file"
                                accept="image/*"
                                capture="environment"
                                className="hidden"
                                onChange={handleFileSelect}
                                disabled={isUploading}
                            />
                        </label>

                        {/* File Select Button */}
                        <label className={`
                            cursor-pointer flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 py-8 text-gray-400 transition-all active:scale-95
                            ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:border-gray-400 hover:text-gray-600 hover:bg-gray-100'}
                        `}>
                            <div className="rounded-full bg-white p-3 shadow-sm border border-gray-100">
                                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                            </div>
                            <span className="text-sm font-bold">ファイル選択</span>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                multiple
                                onChange={handleFileSelect}
                                disabled={isUploading}
                            />
                        </label>
                    </div>
                </div>

                {isUploading && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/40 backdrop-blur-[1px]">
                        <div className="flex flex-col items-center gap-3 rounded-2xl bg-black px-6 py-4 text-white shadow-xl">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gold-2 border-t-transparent" />
                            <span className="text-xs font-bold">Upload...</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Render Uploaded Images List with Highlighting */}
            {captures.length > 0 && (
                <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4 pt-2">
                    {captures.map((c: any) => {
                        // Logic to determine highlight
                        // front -> front, back -> back, optional -> other
                        const isActiveKind =
                            (currentStep === 'front' && c.kind === 'front') ||
                            (currentStep === 'back' && c.kind === 'back') ||
                            (currentStep === 'optional' && c.kind === 'other');

                        return (
                            <li
                                key={c.id}
                                className={`
                                    group relative rounded-2xl p-2 transition-all duration-300
                                    ${isActiveKind
                                        ? 'bg-white border-2 border-gold-2 shadow-[0_0_15px_-3px_rgba(255,215,0,0.5)] scale-[1.02] z-10'
                                        : 'bg-gray-50/30 border border-gray-100 hover:border-gold-2/30 hover:shadow-lg'
                                    }
                                `}
                            >
                                <DeleteCaptureButton id={c.id} />
                                <div className="aspect-square w-full overflow-hidden rounded-xl bg-gray-100 relative">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/captures/${c.storagePath}`}
                                        alt={c.kind}
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                    />
                                    {isActiveKind && (
                                        <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/20"></div>
                                    )}
                                </div>
                                <div className="mt-2 flex flex-col gap-0.5 px-1">
                                    <div className={`text-[10px] font-bold uppercase tracking-wider ${isActiveKind ? 'text-gold-6' : 'text-gray-400'}`}>
                                        {c.kind}
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
