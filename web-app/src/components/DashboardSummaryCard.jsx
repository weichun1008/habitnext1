import React from 'react';
import { Sparkles } from 'lucide-react';
import { getTodayStr } from '@/lib/utils';

const DashboardSummaryCard = ({ tasks, onOpenDetail }) => {
    const dailyTasks = tasks.filter(t => t.frequency === 'daily');

    // Calculate Score (Behavioral Science Logic: All tasks matter)
    const totalTasks = dailyTasks.length;
    let score = 0;

    dailyTasks.forEach(t => {
        if (t.type === 'quantitative') {
            const curr = t.dailyProgress[getTodayStr()]?.value || 0;
            const target = t.dailyTarget || 1;
            const ratio = Math.min(1, curr / target);
            score += (100 / totalTasks) * ratio;
        } else {
            score += t.completed ? (100 / totalTasks) : 0;
        }
    });

    const finalScore = Math.round(score);

    return (
        <div
            onClick={onOpenDetail}
            className="bg-gradient-to-br from-emerald-600 to-teal-800 rounded-3xl p-6 text-white shadow-lg mb-6 relative overflow-hidden cursor-pointer hover:shadow-xl transition-all"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full transform translate-x-10 -translate-y-10"></div>
            <div className="relative z-10 flex items-center justify-between">
                <div>
                    <p className="text-emerald-100 font-bold text-sm mb-1 flex items-center gap-1"><Sparkles size={14} /> 今日健康分數</p>
                    <h2 className="text-4xl font-black">{finalScore} <span className="text-lg font-medium opacity-70">/ 100</span></h2>
                    <p className="text-xs text-emerald-100 mt-2 opacity-80">點擊查看詳細洞察報告 &rarr;</p>
                </div>

                {/* Circular Progress (Simple CSS) */}
                <div className="relative w-20 h-20 flex items-center justify-center">
                    <svg className="transform -rotate-90 w-full h-full">
                        <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/20" />
                        <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white transition-all duration-1000 ease-out" strokeDasharray={`${2 * Math.PI * 36}`} strokeDashoffset={`${2 * Math.PI * 36 * (1 - finalScore / 100)}`} strokeLinecap="round" />
                    </svg>
                    <span className="absolute text-xl font-bold">{finalScore}%</span>
                </div>
            </div>
        </div>
    );
};

export default DashboardSummaryCard;
