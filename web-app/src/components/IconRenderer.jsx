import React from 'react';
import { CATEGORY_CONFIG } from '@/lib/constants';

const IconRenderer = ({ category, size = 18, className = '' }) => {
    const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG['star'];
    if (config.type === 'icon') {
        const Icon = config.value;
        return <Icon size={size} className={`${config.color} ${className}`} />;
    }
    return (
        <span className={`text-${size / 4}xl ${className}`} style={{ fontSize: `${size}px` }}>
            {config.value}
        </span>
    );
};

export default IconRenderer;
