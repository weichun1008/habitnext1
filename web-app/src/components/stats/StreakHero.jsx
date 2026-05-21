import React from 'react';
import { Flame } from 'lucide-react';

// StreakHero — Slice I §6.2 widget
// Renders the prominent current streak with longest streak as supporting text.
const StreakHero = ({ overall }) => {
    const { currentStreak, longestStreak, todayCompleted } = overall || {};
    const current = currentStreak || 0;
    const longest = longestStreak || 0;

    return (
        <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-100 rounded-2xl p-6 text-center">
            <div className="flex items-center justify-center gap-2 text-orange-500 mb-2">
                <Flame size={28} />
                <span className="text-sm font-medium tracking-wide uppercase">Current Streak</span>
            </div>
            <div className="text-5xl font-bold text-gray-800">
                {current}
                <span className="text-xl font-medium text-gray-500 ml-2">天</span>
            </div>
            {longest > 0 && longest >= current && (
                <p className="mt-3 text-sm text-gray-500">
                    你的最長紀錄 <span className="font-semibold text-gray-700">{longest}</span> 天
                </p>
            )}
            {!todayCompleted && current > 0 && (
                <p className="mt-2 text-xs text-orange-600">今天還沒打卡，加油 💪</p>
            )}
            {current === 0 && (
                <p className="mt-3 text-sm text-gray-500">今天打第一個卡，從 1 開始 🌱</p>
            )}
        </div>
    );
};

export default StreakHero;
