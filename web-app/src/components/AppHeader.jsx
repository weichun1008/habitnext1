import React, { useMemo, useState, useEffect } from 'react';
import { Calendar, Award, Plus, X, BookOpen, LogOut, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { getTodayStr } from '@/lib/utils';

const WEEK_DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']; // Mon..Sun

// Build a 7-cell array describing the calendar week (Mon..Sun) that contains
// `anchorDate`. Used by the interactive week strip on the daily view — anchor
// advances ±7 days when the user taps prev/next week.
const computeWeek = (anchorDate) => {
    // JS getDay: Sun=0, Mon=1, ..., Sat=6. We display Mon..Sun, so map the
    // anchor to its index in our display order: Mon→0, Tue→1, ..., Sun→6.
    const jsDay = anchorDate.getDay();
    const mondayOffset = (jsDay + 6) % 7;
    const monday = new Date(anchorDate);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(anchorDate.getDate() - mondayOffset);

    const todayStr = getTodayStr();
    return WEEK_DAY_LABELS.map((label, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        return {
            label,
            dateStr,
            dayNum: d.getDate(),
            month: d.getMonth() + 1,
            isToday: dateStr === todayStr,
        };
    });
};

const AppHeader = ({
    onViewChange,
    currentView,
    onOpenAddFlow,
    onOpenBadges,
    onOpenExplore,
    user,
    onLogout,
    onOpenProfile,
    className,
    // Date navigation — pass from MainApp so daily view can browse past/future
    selectedDate,
    onSelectDate,
}) => {
    // Week anchor — any date inside the displayed week. Initialized from
    // selectedDate (fallback today) so the strip opens on the week the user
    // is actually viewing.
    const [weekAnchor, setWeekAnchor] = useState(() => {
        const seed = selectedDate ? new Date(selectedDate) : new Date();
        return isNaN(seed.getTime()) ? new Date() : seed;
    });

    // Keep the strip in sync if the parent jumps selectedDate outside the
    // currently displayed week (e.g. the "+" flow resets selectedDate to today).
    useEffect(() => {
        if (!selectedDate) return;
        const d = new Date(selectedDate);
        if (isNaN(d.getTime())) return;
        const cells = computeWeek(weekAnchor);
        const inRange = cells.some(c => c.dateStr === selectedDate);
        if (!inRange) setWeekAnchor(d);
    }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

    const weekCells = useMemo(() => computeWeek(weekAnchor), [weekAnchor]);
    const weekRangeLabel = useMemo(() => {
        const first = weekCells[0];
        const last = weekCells[weekCells.length - 1];
        if (!first || !last) return '';
        return first.month === last.month
            ? `${first.month}月`
            : `${first.month}/${last.month}月`;
    }, [weekCells]);
    const isThisWeek = weekCells.some(c => c.isToday);

    const shiftWeek = (deltaDays) => {
        const d = new Date(weekAnchor);
        d.setDate(d.getDate() + deltaDays);
        setWeekAnchor(d);
    };
    const goToThisWeek = () => setWeekAnchor(new Date());

    const todayStr = getTodayStr();
    const headerDateLabel = useMemo(() => {
        if (!selectedDate) return '';
        const d = new Date(selectedDate);
        if (isNaN(d.getTime())) return '';
        const m = d.getMonth() + 1;
        const day = d.getDate();
        const wd = WEEK_DAY_LABELS[(d.getDay() + 6) % 7];
        return `${m}/${day} (${wd})`;
    }, [selectedDate]);

    return (
        <div className={`bg-white sticky top-0 z-30 shadow-sm ${className || ''}`}>
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                    <button
                        onClick={onOpenProfile || (() => onViewChange('daily'))}
                        className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                    >
                        <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-100 flex items-center justify-center">
                            {user?.nickname ? (
                                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.nickname}`} alt="Avatar" className="w-full h-full" />
                            ) : (
                                <span className="text-xs text-gray-500 font-bold">{user?.name?.[0] || 'U'}</span>
                            )}
                        </div>
                        <span className="font-bold text-gray-800 text-sm md:text-base">{user?.nickname || user?.name || '訪客'}</span>
                    </button>
                    {onLogout && (
                        <button
                            onClick={onLogout}
                            className="w-8 h-8 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg flex items-center justify-center transition-colors"
                            title="登出"
                        >
                            <LogOut size={18} />
                        </button>
                    )}
                </div>

                {currentView === 'daily' ? (
                    // Date label hidden on mobile — the week strip below already
                    // shows the current day. Reflects the actual selectedDate.
                    <div className="hidden sm:flex items-center gap-2">
                        <Calendar size={18} className="text-gray-600" />
                        <span className="font-bold text-gray-800 text-sm md:text-base">{headerDateLabel}</span>
                    </div>
                ) : (
                    <span className="font-bold text-emerald-600">
                        {currentView === 'manage' ? '任務管理'
                            : currentView === 'dashboard_detail' ? '洞察報告'
                            : currentView === 'stats' ? '統計'
                            : '成就中心'}
                    </span>
                )}

                <div className="flex gap-2">
                    {currentView === 'daily' && (
                        <>
                            <button onClick={onOpenExplore} className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center hover:bg-indigo-100 transition-colors">
                                <BookOpen size={20} />
                            </button>
                            <button onClick={() => onViewChange('dashboard_detail')} className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-100 transition-colors">
                                <Calendar size={20} />
                            </button>
                            <button onClick={() => onViewChange('stats')} className="w-8 h-8 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center hover:bg-purple-100 transition-colors">
                                <BarChart3 size={20} />
                            </button>
                            <button onClick={onOpenBadges} className="w-8 h-8 bg-gray-100 text-yellow-600 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors">
                                <Award size={20} />
                            </button>
                            <button onClick={onOpenAddFlow} className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center hover:bg-emerald-100 transition-colors">
                                <Plus size={20} />
                            </button>
                        </>
                    )}
                    {(currentView !== 'daily' && currentView !== 'dashboard_detail') && (
                        <button onClick={() => onViewChange('daily')} className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center hover:bg-emerald-100 transition-colors">
                            <Calendar size={20} />
                        </button>
                    )}
                    {currentView === 'dashboard_detail' && (
                        <button onClick={() => onViewChange('daily')} className="w-8 h-8 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors">
                            <X size={20} />
                        </button>
                    )}
                    {currentView === 'manage' && (
                        <button onClick={onOpenAddFlow} className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white hover:bg-gray-700 transition-colors">
                            <Plus size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Interactive Week Strip — tap any day to view its tasks.
                Prev/next chevrons shift the displayed week ±7 days; the center
                label shows the month range and (when off this week) doubles as
                a "back to this week" shortcut. Today is marked with a dot. */}
            {currentView === 'daily' && (
                <div className="px-1 md:px-6 pb-0">
                    <div className="flex items-center justify-between px-1 pb-1">
                        <button
                            type="button"
                            onClick={() => shiftWeek(-7)}
                            className="p-1 text-gray-400 hover:text-emerald-600 rounded-full hover:bg-gray-100 transition-colors"
                            aria-label="上一週"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            type="button"
                            onClick={goToThisWeek}
                            disabled={isThisWeek}
                            className={`text-[11px] font-bold tracking-wide px-2 py-0.5 rounded-full transition-colors ${
                                isThisWeek
                                    ? 'text-gray-500 cursor-default'
                                    : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                            }`}
                        >
                            {isThisWeek ? weekRangeLabel : `${weekRangeLabel}・回到本週`}
                        </button>
                        <button
                            type="button"
                            onClick={() => shiftWeek(7)}
                            className="p-1 text-gray-400 hover:text-emerald-600 rounded-full hover:bg-gray-100 transition-colors"
                            aria-label="下一週"
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>
                    <div className="flex items-center">
                        {weekCells.map((cell) => {
                            const isSelected = selectedDate === cell.dateStr;
                            return (
                                <button
                                    type="button"
                                    key={cell.dateStr}
                                    onClick={() => onSelectDate?.(cell.dateStr)}
                                    className={`flex-1 flex flex-col items-center justify-center py-2 px-1 md:px-6 cursor-pointer relative transition-colors ${
                                        isSelected
                                            ? 'text-emerald-600 font-bold'
                                            : cell.isToday
                                                ? 'text-gray-700 font-medium hover:text-emerald-500'
                                                : 'text-gray-400 font-medium hover:text-gray-600'
                                    }`}
                                >
                                    <span className="text-[11px] leading-none">{cell.label}</span>
                                    <span className="text-sm leading-tight mt-0.5">{cell.dayNum}</span>
                                    {cell.isToday && !isSelected && (
                                        <span className="absolute top-0.5 right-1/2 translate-x-3 w-1 h-1 bg-emerald-500 rounded-full" />
                                    )}
                                    {isSelected && <div className="absolute bottom-0 w-full h-[3px] bg-emerald-500 rounded-t-full" />}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AppHeader;
