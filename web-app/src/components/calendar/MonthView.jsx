'use client';

import React from 'react';
import { isTaskDueToday, getDaysInMonth, getFirstDayOfMonth } from '@/lib/utils';
import { CATEGORY_CONFIG } from '@/lib/constants';

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const MonthView = ({ currentDate, tasks, todayStr, onDateClick, onTaskClick }) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Generate calendar grid (6 weeks x 7 days)
    const generateCalendarDays = () => {
        const daysInMonth = getDaysInMonth(year, month);
        const firstDayOfWeek = getFirstDayOfMonth(year, month); // 0 = Sunday
        const daysInPrevMonth = getDaysInMonth(year, month - 1);

        const days = [];

        // Previous month days (grayed out)
        for (let i = firstDayOfWeek - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            const date = new Date(year, month - 1, day);
            days.push({
                date,
                dateStr: date.toISOString().split('T')[0],
                day,
                isCurrentMonth: false
            });
        }

        // Current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            days.push({
                date,
                dateStr: date.toISOString().split('T')[0],
                day,
                isCurrentMonth: true
            });
        }

        // Next month days to fill 6 weeks (42 cells)
        const remaining = 42 - days.length;
        for (let day = 1; day <= remaining; day++) {
            const date = new Date(year, month + 1, day);
            days.push({
                date,
                dateStr: date.toISOString().split('T')[0],
                day,
                isCurrentMonth: false
            });
        }

        return days;
    };

    const calendarDays = generateCalendarDays();

    // Get tasks for a specific date
    const getTasksForDate = (dateStr) => {
        return tasks.filter(task => isTaskDueToday(task, dateStr));
    };

    // Calculate completion rate for a date
    const getCompletionRate = (dateTasks, dateStr) => {
        if (dateTasks.length === 0) return 0;

        let completed = 0;
        dateTasks.forEach(task => {
            if (task.type === 'quantitative') {
                if ((task.history?.[dateStr] || 0) >= (task.dailyTarget || 1)) {
                    completed++;
                }
            } else if (task.history?.[dateStr]) {
                completed++;
            }
        });

        return Math.round((completed / dateTasks.length) * 100);
    };

    // Get category color for task chip
    const getCategoryColor = (category) => {
        const config = CATEGORY_CONFIG[category];
        if (!config) return 'bg-gray-200';
        // Extract color class like 'text-blue-500' -> 'bg-blue-500'
        const colorMatch = config.color?.match(/text-(\w+)-(\d+)/);
        if (colorMatch) {
            return `bg-${colorMatch[1]}-${colorMatch[2]}`;
        }
        return 'bg-gray-400';
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header - Weekday Names */}
            <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
                {WEEKDAYS.map((day, i) => (
                    <div
                        key={day}
                        className={`p-3 text-center text-sm font-medium ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-500'
                            }`}
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7">
                {calendarDays.map(({ dateStr, day, isCurrentMonth }, index) => {
                    const dateTasks = getTasksForDate(dateStr);
                    const completionRate = getCompletionRate(dateTasks, dateStr);
                    const isToday = dateStr === todayStr;
                    const isWeekend = index % 7 === 0 || index % 7 === 6;

                    return (
                        <div
                            key={dateStr}
                            onClick={() => onDateClick?.(dateStr)}
                            className={`min-h-[100px] p-2 border-b border-r border-gray-100 cursor-pointer transition-colors hover:bg-gray-50 ${!isCurrentMonth ? 'bg-gray-50/50' : ''
                                } ${isToday ? 'bg-indigo-50' : ''}`}
                        >
                            {/* Date Number */}
                            <div className="flex justify-between items-start mb-1">
                                <span
                                    className={`text-sm font-bold ${isToday
                                            ? 'w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center'
                                            : !isCurrentMonth
                                                ? 'text-gray-300'
                                                : isWeekend
                                                    ? index % 7 === 0 ? 'text-red-400' : 'text-blue-400'
                                                    : 'text-gray-800'
                                        }`}
                                >
                                    {day}
                                </span>
                                {isCurrentMonth && dateTasks.length > 0 && (
                                    <span className="text-xs text-gray-400">
                                        {dateTasks.length}
                                    </span>
                                )}
                            </div>

                            {/* Task Pills (up to 2 visible) */}
                            {isCurrentMonth && (
                                <div className="space-y-1">
                                    {dateTasks.slice(0, 2).map(task => {
                                        const isCompleted = task.type === 'quantitative'
                                            ? (task.history?.[dateStr] || 0) >= (task.dailyTarget || 1)
                                            : !!task.history?.[dateStr];
                                        const config = CATEGORY_CONFIG[task.category] || {};

                                        return (
                                            <div
                                                key={task.id}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onTaskClick?.(task);
                                                }}
                                                className={`text-xs px-1.5 py-0.5 rounded truncate flex items-center gap-1 cursor-pointer transition-opacity ${isCompleted ? 'opacity-50' : ''
                                                    }`}
                                                style={{
                                                    backgroundColor: config.bg?.replace('bg-', '').includes('-')
                                                        ? undefined
                                                        : '#f3f4f6'
                                                }}
                                                title={task.title}
                                            >
                                                <span
                                                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${config.color?.replace('text-', 'bg-') || 'bg-gray-400'
                                                        }`}
                                                ></span>
                                                <span className={`truncate ${isCompleted ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                                    {task.title}
                                                </span>
                                            </div>
                                        );
                                    })}
                                    {dateTasks.length > 2 && (
                                        <div className="text-xs text-gray-400 text-center">
                                            +{dateTasks.length - 2}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Mini Progress Bar */}
                            {isCurrentMonth && dateTasks.length > 0 && (
                                <div className="mt-auto pt-2">
                                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all ${completionRate >= 100
                                                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                                                    : completionRate >= 50
                                                        ? 'bg-emerald-400'
                                                        : 'bg-amber-400'
                                                }`}
                                            style={{ width: `${Math.min(100, completionRate)}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MonthView;
