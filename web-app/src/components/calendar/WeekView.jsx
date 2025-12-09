'use client';

import React from 'react';
import CalendarTaskChip from './CalendarTaskChip';
import { isTaskDueToday } from '@/lib/utils';

// Generate time slots from 6:00 to 23:00
const TIME_SLOTS = Array.from({ length: 18 }, (_, i) => {
    const hour = i + 6;
    return {
        hour,
        label: `${hour.toString().padStart(2, '0')}:00`
    };
});

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

const WeekView = ({ currentDate, tasks, todayStr, onUpdate, onTaskClick }) => {
    // Calculate week days (Sunday to Saturday)
    const getWeekDays = () => {
        const startOfWeek = new Date(currentDate);
        const day = startOfWeek.getDay();
        startOfWeek.setDate(startOfWeek.getDate() - day);

        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(startOfWeek);
            date.setDate(date.getDate() + i);
            return {
                date,
                dateStr: date.toISOString().split('T')[0],
                dayOfMonth: date.getDate(),
                dayOfWeek: WEEKDAYS[i]
            };
        });
    };

    const weekDays = getWeekDays();

    // Get tasks for a specific date
    const getTasksForDate = (dateStr) => {
        return tasks.filter(task => isTaskDueToday(task, dateStr));
    };

    // Separate all-day tasks (no time) from timed tasks
    const separateTasksByTime = (dateTasks) => {
        const allDay = [];
        const timed = {};

        dateTasks.forEach(task => {
            if (!task.time) {
                allDay.push(task);
            } else {
                // Parse time like "09:00" or "14:30"
                const hour = parseInt(task.time.split(':')[0], 10);
                if (!timed[hour]) timed[hour] = [];
                timed[hour].push(task);
            }
        });

        return { allDay, timed };
    };

    // Check if a task is completed on a date
    const isCompletedOnDate = (task, dateStr) => {
        if (task.type === 'quantitative') {
            return (task.history?.[dateStr] || 0) >= (task.dailyTarget || 1);
        }
        return !!task.history?.[dateStr];
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header Row - Day Names */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-100">
                <div className="p-2 bg-gray-50"></div>
                {weekDays.map(({ dateStr, dayOfMonth, dayOfWeek }) => {
                    const isToday = dateStr === todayStr;
                    return (
                        <div
                            key={dateStr}
                            className={`p-3 text-center border-l border-gray-100 ${isToday ? 'bg-indigo-50' : 'bg-gray-50'
                                }`}
                        >
                            <div className={`text-xs font-medium ${isToday ? 'text-indigo-600' : 'text-gray-500'}`}>
                                {dayOfWeek}
                            </div>
                            <div className={`text-lg font-bold mt-1 ${isToday
                                    ? 'w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center mx-auto'
                                    : 'text-gray-800'
                                }`}>
                                {dayOfMonth}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* All-day Section */}
            <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200">
                <div className="p-2 text-xs font-medium text-gray-400 bg-gray-50 flex items-center justify-center">
                    全日
                </div>
                {weekDays.map(({ dateStr }) => {
                    const { allDay } = separateTasksByTime(getTasksForDate(dateStr));
                    const isToday = dateStr === todayStr;
                    return (
                        <div
                            key={`allday-${dateStr}`}
                            className={`min-h-[60px] p-1 border-l border-gray-100 ${isToday ? 'bg-indigo-50/50' : ''
                                }`}
                        >
                            <div className="space-y-1">
                                {allDay.slice(0, 3).map(task => (
                                    <CalendarTaskChip
                                        key={task.id}
                                        task={task}
                                        isCompleted={isCompletedOnDate(task, dateStr)}
                                        onClick={() => onTaskClick?.(task)}
                                        compact
                                    />
                                ))}
                                {allDay.length > 3 && (
                                    <div className="text-xs text-gray-400 text-center">
                                        +{allDay.length - 3} 更多
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Time Grid */}
            <div className="max-h-[500px] overflow-y-auto">
                {TIME_SLOTS.map(({ hour, label }) => (
                    <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-50">
                        <div className="p-2 text-xs text-gray-400 text-right pr-3 bg-gray-50">
                            {label}
                        </div>
                        {weekDays.map(({ dateStr }) => {
                            const { timed } = separateTasksByTime(getTasksForDate(dateStr));
                            const hourTasks = timed[hour] || [];
                            const isToday = dateStr === todayStr;
                            return (
                                <div
                                    key={`${dateStr}-${hour}`}
                                    className={`min-h-[40px] p-1 border-l border-gray-50 ${isToday ? 'bg-indigo-50/30' : ''
                                        }`}
                                >
                                    {hourTasks.map(task => (
                                        <CalendarTaskChip
                                            key={task.id}
                                            task={task}
                                            isCompleted={isCompletedOnDate(task, dateStr)}
                                            onClick={() => onTaskClick?.(task)}
                                            showTime
                                        />
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WeekView;
