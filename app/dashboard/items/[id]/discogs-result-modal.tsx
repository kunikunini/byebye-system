'use client';

type DiscogsResult = {
    title: string;
    artist: string;
    catalogNo: string;
    year?: string;
    label?: string;
    format?: string;
    thumb?: string;
};

export default function DiscogsResultModal({
    results,
    onSelect,
    onClose,
}: {
    results: DiscogsResult[];
    onSelect: (result: DiscogsResult) => void;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Discogs 検索結果</h2>
                        <p className="text-sm text-gray-500">{results.length} 件の候補が見つかりました</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-2">
                    <div className="space-y-2">
                        {results.map((res, i) => (
                            <button
                                key={i}
                                onClick={() => onSelect(res)}
                                className="flex w-full items-center gap-4 rounded-xl border border-transparent bg-white p-3 text-left transition-all hover:border-gold-2 hover:bg-gold-2/5 hover:shadow-md group"
                            >
                                {/* Thumbnail */}
                                <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 shadow-inner">
                                    {res.thumb ? (
                                        <img
                                            src={res.thumb}
                                            alt={res.title}
                                            className="h-full w-full object-cover transition-transform group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center text-gray-300">
                                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                            </svg>
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="truncate font-bold text-gray-900 group-hover:text-gold-3">
                                        {res.title}
                                    </h3>
                                    <p className="truncate text-sm font-medium text-gray-700">{res.artist}</p>
                                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                                        {res.year && <span className="rounded bg-gray-100 px-1.5 py-0.5">{res.year}</span>}
                                        {res.label && <span className="rounded bg-gray-100 px-1.5 py-0.5 truncate max-w-[150px]">{res.label}</span>}
                                        {res.catalogNo && <span className="rounded bg-gray-100 px-1.5 py-0.5">{res.catalogNo}</span>}
                                    </div>
                                </div>

                                {/* Action */}
                                <div className="pr-4">
                                    <div className="rounded-full bg-black px-4 py-1.5 text-xs font-bold text-white transition-colors group-hover:bg-gold-2 group-hover:text-black">
                                        選択
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
                    <p className="text-center text-xs text-gray-400">
                        お探しのものがない場合は、品番を再確認して検索してください。
                    </p>
                </div>
            </div>
        </div>
    );
}
