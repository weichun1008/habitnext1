import React, { useMemo } from 'react';
import { Calendar, Award, Plus, X, BookOpen, LogOut, BarChart3 } from 'lucide-react';
import { getTodayStr } from '@/lib/utils';

const WEEK_DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']; // Mon..Sun

// Build a 7-cell array describing this calendar week (Mon..Sun) anchored
// on today's actual date — used by the interactive week strip on the
// daily view.
const computeThisWeek = (todayDate) => {
    // JS getDay: Sun=0, Mon=1, ..., Sat=6. We display Mon..Sun, so map
    // today to its index in our display order: Mon→0, Tue→1, ..., Sun→6.
    const jsDay = todayDate.getDay();
    const mondayOffset = (jsDay + 6) % 7;
    const monday = new Date(todayDate);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(todayDate.getDate() - mondayOffset);

    const todayStr = getTodayStr();
    return WEEK_DAY_LABELS.map((label, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        return {
            label,
            dateStr,
            dayNum: d.getDate(),
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
    const weekCells = useMemo(() => computeThisWeek(new Date()), []);
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
                Future days show preview-only tasks; past days show historical
                completion state. Today is marked with a small dot. */}
            {currentView === 'daily' && (
                <div className="flex items-center px-1 md:px-6 pb-0">
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
            )}
        </div>
    );
};

export default AppHeader;
