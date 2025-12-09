'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { CATEGORY_CONFIG } from '@/lib/constants';

const CalendarTaskChip = ({ task, isCompleted, onClick, compact = false, showTime = false }) => {
    const config = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG['star'] || {};

    // Extract color for border
    const getBorderColor = () => {
        const colorMatch = config.color?.match(/text-(\w+)-(\d+)/);
        if (colorMatch) {
            return `border-l-${colorMatch[1]}-${colorMatch[2]}`;
        }
        return 'border-l-gray-400';
    };

    // Get background color class
    const bgClass = config.bg || 'bg-gray-50';

    return (
        <div
            onClick={(e) => {
                e.stopPropagation();
                onClick?.();
            }}
            className={`
                flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer
                border-l-2 transition-all hover:shadow-sm
                ${getBorderColor()}
                ${isCompleted ? 'opacity-60 bg-gray-100' : bgClass}
                ${compact ? 'text-[10px]' : 'text-xs'}
            `}
            title={task.title}
        >
            {/* Completion indicator */}
            {isCompleted && (
                <Check size={compact ? 10 : 12} className="text-emerald-500 flex-shrink-0" strokeWidth={3} />
            )}

            {/* Time badge */}
            {showTime && task.time && (
                <span className="text-gray-400 flex-shrink-0">
                    {task.time}
                </span>
            )}

            {/* Task title */}
            <span className={`truncate ${isCompleted ? 'line-through text-gray-400' : 'text-gray-700 font-medium'}`}>
                {task.title}
            </span>
        </div>
    );
};

export default CalendarTaskChip;
