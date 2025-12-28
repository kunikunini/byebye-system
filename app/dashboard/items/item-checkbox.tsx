'use client';

import { useItemsSelection } from './items-selection-context';
import React from 'react';

export default function ItemCheckbox({ id }: { id: string }) {
    const { isSelected, toggleId } = useItemsSelection();

    return (
        <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            checked={isSelected(id)}
            onChange={() => toggleId(id)}
            onClick={(e) => e.stopPropagation()} // Prevent row click
        />
    );
}
