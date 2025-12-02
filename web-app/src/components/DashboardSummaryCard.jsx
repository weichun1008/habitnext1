import React from 'react';
import { Sparkles, Target, Flame } from 'lucide-react';
import { getTodayStr, isCompletedToday, calculatePeriodProgress } from '@/lib/utils';

const DashboardSummaryCard = ({ tasks, onOpenDetail }) => {
    const dailyTasks = tasks.filter(t => t.frequency === 'daily' && !t.recurrence?.mode?.includes('period'));

    const totalTasks = dailyTasks.length;
    let score = 0;

    dailyTasks.forEach(t => {
        if (t.type === 'quantitative') {
            const curr = t.dailyProgress[getTodayStr()]?.value || 0;
            const target = t.dailyTarget || 1;
            const ratio = Math.min(1, curr / target);
            score += (100 / totalTasks) * ratio;
        } else {
            score += (isCompletedToday(t) ? (100 / totalTasks) : 0);
        }
    });

    const finalScore = totalTasks > 0 ? Math.round(score) : 0;

    // Calculate Period Goal Status (Weekly)
    const periodTasks = tasks.filter(t => t.recurrence?.mode === 'period_count' && t.frequency === 'weekly');
    const periodTotal = periodTasks.length;
    const periodDone = periodTasks.filter(t => calculatePeriodProgress(t) >= t.recurrence.periodTarget).length;

    return (
        <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Main Score Block */}
            <div
                onClick={onOpenDetail}
                className="col-span-2 bg-gradient-to-br from-emerald-600 to-teal-800 rounded-3xl p-5 text-white shadow-lg relative overflow-hidden cursor-pointer flex justify-between items-center"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full transform translate-x-10 -translate-y-10"></div>
                <div>
                    <p className="text-emerald-100 font-bold text-sm mb-1 flex items-center gap-1"><Sparkles size={14} /> 今日健康分數</p>
                    <div className="flex items-baseline gap-1">
                        <h2 className="text-5xl font-black">{finalScore}</h2>
                        <span className="text-sm font-medium opacity-70">分</span>
                    </div>
                </div>

                {/* Visual Ring (CSS only) */}
                <div className="relative w-20 h-20 flex items-center justify-center">
                    <svg className="transform -rotate-90 w-full h-full">
                        <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/20" />
                        <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white transition-all duration-1000 ease-out" strokeDasharray={`${2 * Math.PI * 36}`} strokeDashoffset={`${2 * Math.PI * 36 * (1 - finalScore / 100)}`} strokeLinecap="round" />
                    </svg>
                </div>
            </div>

            {/* Period Goal Stats */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                    <Target size={16} className="text-amber-500" />
                    <span className="text-xs font-bold text-gray-500">本週目標</span>
                </div>
                <div className="flex items-end gap-1">
                    <span className="text-2xl font-black text-gray-800">{periodDone}</span>
                    <span className="text-xs text-gray-400 mb-1">/ {periodTotal} 達成</span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2">
                    <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${periodTotal > 0 ? (periodDone / periodTotal) * 100 : 0}%` }}></div>
                </div>
            </div>

            {/* Streak */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-2">
                    <Flame size={16} className="text-red-500" />
                    <span className="text-xs font-bold text-gray-500">連續紀錄</span>
                </div>
                <div className="flex items-end gap-1">
                    <span className="text-2xl font-black text-gray-800">5</span>
                    <span className="text-xs text-gray-400 mb-1">天</span>
                </div>
                <p className="text-[10px] text-gray-400 mt-1">保持下去！</p>
            </div>
        </div>
    );
};

export default DashboardSummaryCard;
