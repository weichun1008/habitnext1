'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar, CalendarDays } from 'lucide-react';
import WeekView from './calendar/WeekView';
import MonthView from './calendar/MonthView';
import { getTodayStr } from '@/lib/utils';

const HabitCalendar = ({ tasks, onUpdate, onTaskClick }) => {
    const [viewMode, setViewMode] = useState('week'); // 'week' | 'month'
    const [currentDate, setCurrentDate] = useState(new Date());

    const todayStr = getTodayStr();

    // Navigation handlers
    const goToToday = () => setCurrentDate(new Date());

    const goToPrev = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'week') {
            newDate.setDate(newDate.getDate() - 7);
        } else {
            newDate.setMonth(newDate.getMonth() - 1);
        }
        setCurrentDate(newDate);
    };

    const goToNext = () => {
        const newDate = new Date(currentDate);
        if (viewMode === 'week') {
            newDate.setDate(newDate.getDate() + 7);
        } else {
            newDate.setMonth(newDate.getMonth() + 1);
        }
        setCurrentDate(newDate);
    };

    // Format header title
    const getHeaderTitle = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;

        if (viewMode === 'month') {
            return `${year} 年 ${month} 月`;
        }

        // Week view: show week range
        const startOfWeek = new Date(currentDate);
        const day = startOfWeek.getDay();
        startOfWeek.setDate(startOfWeek.getDate() - day); // Sunday

        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);

        const startMonth = startOfWeek.getMonth() + 1;
        const endMonth = endOfWeek.getMonth() + 1;
        const startDay = startOfWeek.getDate();
        const endDay = endOfWeek.getDate();

        if (startMonth === endMonth) {
            return `${year} 年 ${startMonth} 月 ${startDay} - ${endDay} 日`;
        }
        return `${startMonth}/${startDay} - ${endMonth}/${endDay}`;
    };

    // Handle date click from month view to jump to week view
    const handleDateClick = (dateStr) => {
        setCurrentDate(new Date(dateStr));
        setViewMode('week');
    };

    return (
        <div className="h-full flex flex-col animate-fade-in-up">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 px-2">
                {/* Title & Navigation */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={goToPrev}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                        aria-label="Previous"
                    >
                        <ChevronLeft size={20} className="text-gray-600" />
                    </button>

                    <h2 className="text-lg sm:text-xl font-bold text-gray-800 min-w-[180px] text-center">
                        {getHeaderTitle()}
                    </h2>

                    <button
                        onClick={goToNext}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                        aria-label="Next"
                    >
                        <ChevronRight size={20} className="text-gray-600" />
                    </button>
                </div>

                {/* View Toggle & Today Button */}
                <div className="flex items-center gap-2">
                    <button
                        onClick={goToToday}
                        className="px-4 py-2 text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
                    >
                        今天
                    </button>

                    <div className="flex bg-gray-100 rounded-xl p-1">
                        <button
                            onClick={() => setViewMode('week')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${viewMode === 'week'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <CalendarDays size={16} />
                            週
                        </button>
                        <button
                            onClick={() => setViewMode('month')}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors ${viewMode === 'month'
                                    ? 'bg-white text-indigo-600 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <Calendar size={16} />
                            月
                        </button>
                    </div>
                </div>
            </div>

            {/* Calendar Content */}
            <div className="flex-1 overflow-auto">
                {viewMode === 'week' ? (
                    <WeekView
                        currentDate={currentDate}
                        tasks={tasks}
                        todayStr={todayStr}
                        onUpdate={onUpdate}
                        onTaskClick={onTaskClick}
                    />
                ) : (
                    <MonthView
                        currentDate={currentDate}
                        tasks={tasks}
                        todayStr={todayStr}
                        onDateClick={handleDateClick}
                        onTaskClick={onTaskClick}
                    />
                )}
            </div>
        </div>
    );
};

export default HabitCalendar;
