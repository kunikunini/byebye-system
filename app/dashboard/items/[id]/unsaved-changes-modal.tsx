'use client';

export default function UnsavedChangesModal({
    isOpen,
    onSave,
    onDiscard,
    onCancel,
}: {
    isOpen: boolean;
    onSave: () => void;
    onDiscard: () => void;
    onCancel: () => void;
}) {
    if (!isOpen) return null;

    return (
        <>
            <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" onClick={onCancel} />
            <div className="fixed left-1/2 top-1/2 z-[101] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h3 className="mb-2 text-lg font-bold text-gray-900">保存しますか？</h3>
                    <p className="text-sm text-gray-500">変更内容が保存されていません。<br />他のページへ移動する前に保存しますか？</p>
                </div>
                <div className="flex divide-x border-t border-gray-100 bg-gray-50">
                    <button
                        onClick={onDiscard}
                        className="flex-1 py-4 text-sm font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                    >
                        保存しない
                    </button>
                    <button
                        onClick={onCancel}
                        className="flex-1 py-4 text-sm font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                    >
                        キャンセル
                    </button>
                    <button
                        onClick={onSave}
                        className="flex-1 py-4 text-sm font-bold text-gold-6 hover:bg-gold-50"
                    >
                        保存
                    </button>
                </div>
            </div>
        </>
    );
}
