import React from 'react';
import { CATEGORY_CONFIG, DOMAIN_TO_ICON_KEY } from '@/lib/constants';
import MaterialIcon from './MaterialIcon';

// IconRenderer — single rendering point for category-style icons.
//
// Accepts either:
//   - a CATEGORY_CONFIG key  (e.g. 'apple', 'moon')   — used by OfficialHabit.icon
//   - a HabitCategory name   (e.g. '飲食', '運動')     — used by template-seeded
//                                                       Task.category fields
//
// After PR D (Material Symbols migration) every config entry renders via
// <MaterialIcon /> — no more emoji vs Lucide branching, no more 'value:
// SVGComponent' pointers in CATEGORY_CONFIG.
const IconRenderer = ({ category, size = 18, className = '' }) => {
    // 1. Direct lookup
    let config = CATEGORY_CONFIG[category];

    // 2. Fall back to domain → config-key translation. Template-derived
    //    tasks have Task.category = '飲食' / '運動' / … (HabitCategory.name).
    //    Without this fallback every such task would render the 'star'
    //    default — the bug user reported.
    if (!config) {
        const mappedKey = DOMAIN_TO_ICON_KEY[category];
        if (mappedKey) config = CATEGORY_CONFIG[mappedKey];
    }

    // 3. Last-resort default
    if (!config) config = CATEGORY_CONFIG['star'];

    // Backwards-compat: TaskFormModal can dynamically add entries with
    // type 'emoji' when the user enters a custom emoji as their icon.
    if (config.type === 'emoji') {
        return (
            <span
                aria-hidden="true"
                className={className}
                style={{ fontSize: `${size}px`, lineHeight: 1 }}
            >
                {config.value}
            </span>
        );
    }

    return (
        <MaterialIcon
            name={config.name || 'star'}
            size={size}
            className={`${config.color || 'text-gray-400'} ${className}`}
        />
    );
};

export default IconRenderer;
