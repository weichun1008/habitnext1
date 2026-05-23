import React from 'react';
import { CATEGORY_CONFIG, resolveIconKey } from '@/lib/constants';
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
    // resolveIconKey handles all three cases: direct config key, HabitCategory
    // domain name (mapped via DOMAIN_TO_ICON_KEY), and unknown/falsy → 'star'.
    const config = CATEGORY_CONFIG[resolveIconKey(category)];

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
