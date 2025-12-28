'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

type ItemsSelectionContextType = {
    selectedIds: string[];
    toggleId: (id: string) => void;
    selectAll: (ids: string[]) => void;
    clearSelection: () => void;
    isSelected: (id: string) => boolean;
};

const ItemsSelectionContext = createContext<ItemsSelectionContextType | undefined>(undefined);

export function ItemsSelectionProvider({ children }: { children: React.ReactNode }) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

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

    return (
        <ItemsSelectionContext.Provider value={{ selectedIds, toggleId, selectAll, clearSelection, isSelected }}>
            {children}
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
