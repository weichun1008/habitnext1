import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export const generateId = () => Math.random().toString(36).substr(2, 9);
export const getTodayStr = () => new Date().toISOString().split('T')[0];

export const getNthWeekday = (dateStr) => {
    const date = new Date(dateStr);
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
    const today = getTodayStr();
    if (task.type === 'quantitative') {
        return (task.dailyProgress[today]?.value || 0) >= task.dailyTarget;
    }
    return !!task.history?.[today] || task.completed;
};

export const calculatePeriodProgress = (task) => {
    const today = getTodayStr();
    const range = task.frequency === 'weekly' ? getWeekRange(today) : getMonthRange(today);

    let count = 0;
    if (task.history) {
        Object.keys(task.history).forEach(date => {
            if (date >= range.start && date <= range.end && task.history[date]) {
                count++;
            }
        });
    }
    return count;
};
