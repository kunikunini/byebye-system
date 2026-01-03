'use client';

type Rank = 'N' | 'R' | 'SR' | 'SSR' | 'UR';

export default function RankSelector({
    value,
    onChange
}: {
    value: string;
    onChange: (rank: Rank) => void;
}) {
    const ranks: Rank[] = ['N', 'R', 'SR', 'SSR', 'UR'];

    const getRankStyle = (rank: Rank, selected: boolean) => {
        const base = "relative flex-1 py-3 px-2 rounded-xl text-sm font-black transition-all duration-200 border-2";

        if (!selected) {
            return `${base} bg-white text-gray-400 border-gray-100 hover:bg-gray-50 hover:border-gray-200`;
        }

        switch (rank) {
            case 'N':
                return `${base} bg-gray-100 text-gray-600 border-gray-300 shadow-inner`;
            case 'R':
                return `${base} bg-blue-50 text-blue-600 border-blue-200 shadow-[0_0_15px_rgba(37,99,235,0.15)]`;
            case 'SR':
                return `${base} bg-emerald-50 text-emerald-600 border-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.2)]`;
            case 'SSR':
                return `${base} bg-gradient-to-br from-yellow-50 to-amber-50 text-amber-600 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)] scale-105 z-10`;
            case 'UR':
                return `${base} bg-gradient-to-br from-fuchsia-50 via-purple-50 to-indigo-50 text-purple-600 border-purple-300 shadow-[0_0_25px_rgba(147,51,234,0.4)] scale-110 z-20 animate-pulse-slow`;
            default:
                return base;
        }
    };

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">Rarity Rank</span>
                {value === 'SSR' && <span className="text-[10px] font-bold text-amber-500 animate-pulse">✨ Super Rare!</span>}
                {value === 'UR' && <span className="text-[10px] font-bold text-purple-500 animate-pulse">💎 Ultra Rare!!</span>}
            </div>
            <div className="flex gap-2 p-1.5 bg-gray-50/50 rounded-2xl border border-gray-100">
                {ranks.map((r) => (
                    <button
                        key={r}
                        type="button"
                        onClick={() => onChange(r)}
                        className={getRankStyle(r, value === r)}
                    >
                        {r}
                        {value === r && (r === 'SSR' || r === 'UR') && (
                            <div className="absolute -top-1 -right-1 h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                            </div>
                        )}
                    </button>
                ))}
            </div>
            <style jsx>{`
                .animate-pulse-slow {
                    animation: pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}</style>
        </div>
    );
}
