import { items, captures } from '@/db/schema';

type Item = typeof items.$inferSelect;
type Capture = typeof captures.$inferSelect;

const TARGET_CAPTURES = { VINYL: 5, CD: 4, BOOK: 5 } as const;

export default function WorkNavigation({
    item,
    captures,
}: {
    item: Item;
    captures: Capture[];
}) {
    const targetCount = TARGET_CAPTURES[item.itemType as keyof typeof TARGET_CAPTURES] || 5;
    const uploadedCount = captures.length;

    // 1. Text Progress
    const requiredFields = [
        { key: 'title', label: 'Title' },
        { key: 'artist', label: 'Artist' },
        { key: 'catalogNo', label: 'Catalog No' },
    ] as const;

    const missingFields = requiredFields.filter((f) => !item[f.key]);
    const filledCount = requiredFields.length - missingFields.length;

    // 2. Image Progress
    // Requirement: "front / back / label / sleeve / other" -> Check what is missing?
    // User spec: "未アップロードのものを抽出（最大2件表示）"
    // Let's check which *kinds* are present.
    const uploadedKinds = new Set(captures.map((c) => c.kind));
    const requiredKinds = ['front', 'back', 'label'] as const; // Primary ones usually
    // Requirement doesn't strictly say which kinds are *mandatory* for the "logic", 
    // but "判定ロジック" says: "front / back / label / sleeve / other" -> "未アップロードのものを抽出"
    // This implies we should check for these specific kinds.
    const checkKinds = ['front', 'back', 'label', 'spine'] as const; // 'other' is usually optional or extra
    const missingKinds = checkKinds.filter((k) => !uploadedKinds.has(k as any));

    // 3. Determine Status (Same as List Page)
    let status = { label: '', color: '', icon: '' };
    let nextActions: string[] = [];

    // Priority Logic
    if (item.status === 'SOLD') {
        status = { label: 'SOLD', color: 'bg-purple-100 text-purple-700 ring-1 ring-purple-600/20', icon: '🟣' };
    } else if (item.status === 'LISTED') {
        status = { label: 'Listd (出品済)', color: 'bg-blue-100 text-blue-700 ring-1 ring-blue-600/20', icon: '🔵' };
    } else if (uploadedCount < targetCount) {
        status = { label: 'Image Missing (画像不足)', color: 'bg-yellow-100 text-yellow-800 ring-1 ring-yellow-600/20', icon: '🟡' };

        // Add actions
        // Prioritize missing kinds
        missingKinds.forEach(k => nextActions.push(`${k} の画像をアップロードしてください`));
        // If we have kinds but just not enough count
        if (nextActions.length === 0 && uploadedCount < targetCount) {
            nextActions.push(`あと ${targetCount - uploadedCount} 枚、画像を追加してください`);
        }
    } else if (filledCount < 3) {
        status = { label: 'Info Missing (情報不足)', color: 'bg-orange-100 text-orange-800 ring-1 ring-orange-600/20', icon: '🟠' }; // Orange for info? List page was Orange.

        // Add actions
        missingFields.forEach(f => nextActions.push(`${f.label} を入力してください`));
    } else {
        // READY
        status = { label: 'Listable (出品可能)', color: 'bg-green-100 text-green-700 ring-1 ring-green-600/20', icon: '🟢' };
        nextActions.push('マーケットへ出品できます');
    }

    // Limit actions to 3 lines as per spec
    const displayActions = nextActions.slice(0, 3);
    const isFinished = item.status === 'SOLD' || item.status === 'LISTED';

    return (
        <div className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${isFinished ? 'opacity-50' : ''}`}>
            <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Status Badge */}
                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${status.color}`}>
                    <span>{status.icon}</span>
                    <span>{status.label}</span>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-4 text-sm font-medium text-gray-700">
                    <div title="画像進捗">
                        <span className="mr-1 text-lg">📷</span>
                        <span>{uploadedCount} / {targetCount}</span>
                    </div>
                    <div className="h-4 w-px bg-gray-300"></div>
                    <div title="情報進捗">
                        <span className="mr-1 text-lg">📝</span>
                        <span>{filledCount} / 3</span>
                    </div>
                </div>
            </div>

            {/* Next Actions */}
            {!isFinished && displayActions.length > 0 && (
                <div className="mt-4 border-t border-gray-100 pt-3">
                    <p className="mb-2 text-xs font-bold text-gray-500 uppercase tracking-wide">Next Actions</p>
                    <ul className="space-y-1">
                        {displayActions.map((action, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
                                <span className="mt-1 block h-1.5 w-1.5 flex-none rounded-full bg-blue-400" />
                                {action}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
