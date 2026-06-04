import React, { useMemo } from 'react';
import { Calendar, Award, Plus, X, BookOpen, BarChart3, Map, Globe } from 'lucide-react';
import Avatar from './Avatar';
import WeekStrip from './WeekStrip';

const WEEK_DAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']; // Mon..Sun

const AppHeader = ({
    onViewChange,
    currentView,
    onOpenAddFlow,
    onOpenBadges,
    onOpenExplore,
    onOpenJourney,
    user,
    onOpenProfile,
    className,
    // Date navigation — pass from MainApp so daily view can browse past/future
    selectedDate,
    onSelectDate,
}) => {
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
                <button
                    onClick={onOpenProfile || (() => onViewChange('daily'))}
                    className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
                    aria-label="開啟個人資料"
                >
                    <Avatar user={user} size="w-8 h-8" />
                    <span className="font-bold text-gray-800 text-sm md:text-base truncate max-w-[4.5rem] sm:max-w-none">{user?.nickname || user?.name || '訪客'}</span>
                </button>

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
                            : currentView === 'world' ? '世界'
                            : currentView === 'journey' ? '旅程'
                            : currentView === 'figure' ? '公仔'
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
                            <button onClick={() => onViewChange('world')} className="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center hover:bg-amber-100 transition-colors" aria-label="世界">
                                <Globe size={20} />
                            </button>
                            <button onClick={onOpenJourney} className="w-8 h-8 bg-teal-50 text-teal-600 rounded-lg flex items-center justify-center hover:bg-teal-100 transition-colors" aria-label="旅程">
                                <Map size={20} />
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

            {/* Interactive Week Strip — extracted to WeekStrip so the desktop
                daily view (which hides this whole AppHeader) can render the
                same control. Tap a day to view it; swipe (mobile) or the
                chevrons (desktop) shift the week ±7 days. */}
            {currentView === 'daily' && (
                <WeekStrip
                    selectedDate={selectedDate}
                    onSelectDate={onSelectDate}
                    className="px-1 md:px-6 pb-0"
                />
            )}
        </div>
    );
};

export default AppHeader;
