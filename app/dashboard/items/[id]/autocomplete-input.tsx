'use client';

import { useState, useEffect, useRef } from 'react';

type Suggestion = {
    title: string;
    artist: string;
    thumb?: string;
    year?: string;
    label?: string;
};

export default function AutocompleteInput({
    label,
    name,
    value,
    onChange,
    type = 'artist', // 'artist' or 'title'
    artistContext = '', // used to narrow down title search
}: {
    label: string;
    name: string;
    value: string;
    onChange: (val: string) => void;
    type?: 'artist' | 'title';
    artistContext?: string;
}) {
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const fetchSuggestions = async (query: string) => {
        if (query.length < 2) {
            setSuggestions([]);
            return;
        }

        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (type === 'artist') {
                params.set('q', query);
                params.set('type', 'artist');
            } else {
                params.set('title', query);
                if (artistContext) params.set('artist', artistContext);
            }

            const res = await fetch(`/api/discogs/search?${params.toString()}`);
            const data = await res.json();
            setSuggestions(data.results || []);
            setShowDropdown(true);
        } catch (e) {
            console.error('Autocomplete fetch error:', e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        onChange(newValue);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchSuggestions(newValue);
        }, 500);
    };

    const handleSelect = (s: Suggestion) => {
        onChange(type === 'artist' ? s.artist : s.title);
        setShowDropdown(false);
    };

    return (
        <div className="relative" ref={containerRef}>
            <label className="block text-sm font-medium text-text-secondary">{label}</label>
            <div className="relative mt-1">
                <input
                    name={name}
                    value={value}
                    onChange={handleInputChange}
                    onFocus={() => value.length >= 2 && setShowDropdown(true)}
                    autoComplete="off"
                    className="w-full rounded border border-gray-200 bg-white px-3 py-2 text-text-primary placeholder-text-muted focus:border-gold-2 focus:outline-none focus:ring-1 focus:ring-gold-2 shadow-sm"
                />
                {isLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gold-2 border-t-transparent" />
                    </div>
                )}
            </div>

            {showDropdown && suggestions.length > 0 && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white p-1 shadow-2xl animate-in fade-in slide-in-from-top-2">
                    {suggestions.map((s, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => handleSelect(s)}
                            className="flex w-full items-center gap-3 rounded-md p-2 text-left hover:bg-gray-50 transition-colors group"
                        >
                            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                                {s.thumb ? (
                                    <img src={s.thumb} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-gray-300">
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>
                                    </div>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-bold text-gray-900 group-hover:text-gold-3">
                                    {type === 'artist' ? s.artist : s.title}
                                </div>
                                {type === 'title' && (
                                    <div className="truncate text-xs text-gray-500">{s.artist}</div>
                                )}
                                {s.year && <span className="text-[10px] text-gray-400">{s.year} • {s.label}</span>}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
