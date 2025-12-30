'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

type ItemsSelectionContextType = {
    selectedIds: string[];
    toggleId: (id: string) => void;
    selectAll: (ids: string[]) => void;
    clearSelection: () => void;
    isSelected: (id: string) => boolean;
    showToast: (message: string) => void;
};

const ItemsSelectionContext = createContext<ItemsSelectionContextType | undefined>(undefined);

export function ItemsSelectionProvider({ children }: { children: React.ReactNode }) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

    const toggleId = useCallback((id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    }, []);

    const selectAll = useCallback((ids: string[]) => {
        setSelectedIds(ids);
    }, []);

    const clearSelection = useCallback(() => {
        setSelectedIds([]);
    }, []);

    const isSelected = useCallback((id: string) => {
        return selectedIds.includes(id);
    }, [selectedIds]);

    const showToast = useCallback((message: string) => {
        setToast({ show: true, message });
        setTimeout(() => setToast((prev) => ({ ...prev, show: false })), 3000);
    }, []);

    return (
        <ItemsSelectionContext.Provider value={{ selectedIds, toggleId, selectAll, clearSelection, isSelected, showToast }}>
            {children}
            {/* Global Toast component */}
            {toast.show && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none">
                    <div className="rounded-2xl bg-black/90 px-8 py-5 text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-md animate-in zoom-in-95 fade-in duration-300">
                        <div className="flex flex-col items-center gap-3 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-2 text-black">
                                <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-xl font-bold tracking-tight">{toast.message}</p>
                        </div>
                    </div>
                </div>
            )}
        </ItemsSelectionContext.Provider>
    );
}

export function useItemsSelection() {
    const context = useContext(ItemsSelectionContext);
    if (!context) {
        throw new Error('useItemsSelection must be used within an ItemsSelectionProvider');
    }
    return context;
}
