import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export const generateId = () => Math.random().toString(36).substr(2, 9);
export const getTodayStr = () => new Date().toISOString().split('T')[0];

export const getNthWeekday = (dateStr) => {
    if (!dateStr) return { weekNum: 1, weekday: '', isLast: false, desc: '', lastDesc: '' };
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return { weekNum: 1, weekday: '', isLast: false, desc: '', lastDesc: '' };

    const day = date.getDay(); // 0-6
    const d = date.getDate();
    const weekNum = Math.ceil(d / 7);
    const days = ['日', '一', '二', '三', '四', '五', '六'];

    const nextWeek = new Date(date);
    nextWeek.setDate(d + 7);
    const isLast = nextWeek.getMonth() !== date.getMonth();

    return {
        weekNum: weekNum,
        weekday: days[day],
        isLast: isLast,
        desc: `每月第 ${weekNum} 個星期${days[day]}`,
        lastDesc: `每月最後一個星期${days[day]}`
    };
};

export const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
export const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)

export const getWeekRange = (dateStr) => {
    const curr = new Date(dateStr);
    const firstDay = new Date(curr.setDate(curr.getDate() - curr.getDay())); // Sunday
    const lastDay = new Date(curr.setDate(curr.getDate() + 6));
    return { start: firstDay.toISOString().split('T')[0], end: lastDay.toISOString().split('T')[0] };
}

export const getMonthRange = (dateStr) => {
    const curr = new Date(dateStr);
    const firstDay = new Date(curr.getFullYear(), curr.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(curr.getFullYear(), curr.getMonth() + 1, 0).toISOString().split('T')[0];
    return { start: firstDay, end: lastDay };
}

export const isCompletedToday = (task) => {
    return isCompletedOnDate(task, getTodayStr());
};

export const isCompletedOnDate = (task, dateStr) => {
    if (task.type === 'quantitative') {
        return (task.dailyProgress[dateStr]?.value || 0) >= task.dailyTarget;
    }
    return !!task.history?.[dateStr];
};

export const calculatePeriodProgress = (task) => {
    const today = getTodayStr();
    const range = task.frequency === 'weekly' ? getWeekRange(today) : getMonthRange(today);

    let count = 0;
    if (task.history) {
        Object.keys(task.history).forEach(date => {
            if (date >= range.start && date <= range.end && task.history[date]) {
                const val = task.history[date];
                count += (typeof val === 'number' ? val : 1);
            }
        });
    }
    return count;
};

export const calculateStats = (task) => {
    const history = task.history || {};
    const dates = Object.keys(history).filter(d => history[d]).sort();

    // Total Completions
    const total = dates.length;

    // Current Streak
    let streak = 0;
    const today = getTodayStr();
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Check if completed today or yesterday to keep streak alive
    let currentCheck = today;
    if (!history[today] && history[yesterday]) {
        currentCheck = yesterday;
    }

    if (history[currentCheck]) {
        streak = 1;
        let checkDate = new Date(currentCheck);
        while (true) {
            checkDate.setDate(checkDate.getDate() - 1);
            const dateStr = checkDate.toISOString().split('T')[0];
            if (history[dateStr]) {
                streak++;
            } else {
                break;
            }
        }
    } else if (history[yesterday]) {
        // If not today, but yesterday was done, streak is at least 1 (already handled above logic partially)
        // Actually, let's simplify:
        // If today is done, start from today. If not, start from yesterday.
        // If neither, streak is 0.
    }

    // Re-calc streak properly
    streak = 0;
    let cursor = new Date();
    // If today is not done, check if yesterday was done. If not, streak is 0.
    // Exception: If today is not done, but it's still today, maybe the streak isn't broken yet? 
    // Usually streak includes today if done. If not done today, it shows streak up to yesterday.
    // If yesterday missed, streak is 0.

    const isTodayDone = history[today];
    const isYesterdayDone = history[yesterday];

    if (isTodayDone) {
        streak = 1;
        cursor.setDate(cursor.getDate() - 1);
    } else if (isYesterdayDone) {
        streak = 0; // Will count from loop
        cursor.setDate(cursor.getDate() - 1); // Start checking from yesterday
    } else {
        return { total, streak: 0 };
    }

    while (true) {
        const dStr = cursor.toISOString().split('T')[0];
        if (history[dStr]) {
            streak++;
            cursor.setDate(cursor.getDate() - 1);
        } else {
            break;
        }
    }

    return { total, streak };
};

export const isTaskDueToday = (task, dateStr = getTodayStr()) => {
    const r = task.recurrence;
    if (!r) return true; // Default to daily if no recurrence? Or once?

    // Period tasks are not "due" on a specific day in the fixed schedule sense (handled separately)
    if (r.mode === 'period_count') return false;

    const date = new Date(dateStr);

    if (r.type === 'daily') {
        // Check interval? For now assume interval 1 or just every day.
        // To support interval: need start date.
        // Simple version: always true for daily.
        return true;
    }

    if (r.type === 'weekly') {
        const day = date.getDay(); // 0-6
        return r.weekDays?.includes(day);
    }

    if (r.type === 'monthly') {
        if (r.monthType === 'date') {
            // Match date (e.g. 15th)
            // Need to know which date. stored in task.date? or r.date?
            // TaskFormModal uses task.date for start date.
            // And r.monthType='date' implies same date as start date?
            // TaskFormModal UI shows "Monthly {date}th".
            const targetDate = new Date(task.date).getDate();
            return date.getDate() === targetDate;
        }
        if (r.monthType === 'day') {
            // Match "First Friday", etc.
            // Need to calc.
            const info = getNthWeekday(dateStr);
            // We need to match with task's setting.
            // TaskFormModal doesn't seem to store "First Friday" explicitly in a clean way?
            // It stores `monthType: 'day'`. But what day?
            // It seems it implies "Same pattern as Start Date".
            const startInfo = getNthWeekday(task.date);
            return info.weekNum === startInfo.weekNum && info.weekday === startInfo.weekday;
        }
    }

    if (r.type === 'once') {
        return task.date === dateStr;
    }

    return false;
};
