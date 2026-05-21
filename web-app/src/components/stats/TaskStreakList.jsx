import React from 'react';
import { Trophy } from 'lucide-react';

// TaskStreakList — Slice I §6.2 widget
// Top 5 task streaks by current, then longest, then title.
const TaskStreakList = ({ topTaskStreaks }) => {
    if (!topTaskStreaks || topTaskStreaks.length === 0) return null;

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                <Trophy size={18} className="text-amber-500" />
                <p className="text-sm font-medium text-gray-700">你的金牌 Habit</p>
            </div>
            <ul className="divide-y divide-gray-100">
                {topTaskStreaks.map((item) => (
                    <li key={item.taskId} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{item.title}</p>
                            {item.identity && (
                                <p className="text-xs text-gray-400 truncate">{item.identity}</p>
                            )}
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-emerald-600">
                                {item.currentStreak}<span className="text-xs text-gray-400 ml-0.5">天</span>
                            </p>
                            <p className="text-xs text-gray-400">最長 {item.longestStreak}</p>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default TaskStreakList;
