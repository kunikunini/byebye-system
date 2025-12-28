'use client';

import { useItemsSelection } from './items-selection-context';

export default function ItemsTableSelectAll({ ids }: { ids: string[] }) {
    const { selectedIds, selectAll, clearSelection } = useItemsSelection();

    // Simple logic: if all visible IDs are selected, checks is true
    const allSelected = ids.length > 0 && ids.every(id => selectedIds.includes(id));

    const handleToggle = () => {
        if (allSelected) {
            clearSelection();
        } else {
            selectAll(ids);
        }
    };

    return (
        <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            checked={allSelected}
            onChange={handleToggle}
        />
    );
}
