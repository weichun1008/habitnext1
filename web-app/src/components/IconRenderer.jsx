import React from 'react';
import { CATEGORY_CONFIG } from '@/lib/constants';

const IconRenderer = ({ category, size = 18, className = '' }) => {
    const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['star'] || { type: 'icon', value: 'Star', color: 'text-gray-400', bg: 'bg-gray-100', label: '預設' };
    if (config.type === 'icon') {
        const Icon = config.value;
        // Safety check: Ensure Icon is a valid component
        if (typeof Icon !== 'function' && typeof Icon !== 'object') {
            console.warn(`IconRenderer: Invalid icon component for category "${category}"`, Icon);
            return <div className={`w-[${size}px] h-[${size}px] ${config.bg} rounded-full`} />;
        }
        return <Icon size={size} className={`${config.color} ${className}`} />;
    }
    return (
        <span className={`text-${size / 4}xl ${className}`} style={{ fontSize: `${size}px` }}>
            {config.value}
        </span>
    );
};

export default IconRenderer;
