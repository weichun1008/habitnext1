import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { visibleSubtasks } from "./subtasks";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export const generateId = () => Math.random().toString(36).substr(2, 9);

// Format a Date as a LOCAL calendar day 'yyyy-mm-dd'.
//
// ⚠️ Do NOT use `date.toISOString().split('T')[0]` for "what day is it for
// the user" — toISOString is UTC, so for UTC+8 (Taiwan) the date is wrong for
// the 8 hours after local midnight (00:00–08:00 local still reads as the
// previous UTC day). That caused completions made late in the evening to look
// like they'd "jumped to today" after crossing midnight (2026-06-03 bug).
// History dates are the user's LOCAL calendar days, so every "today / yesterday
// / this day" derivation must be local too.
export const toLocalDateStr = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

export const getTodayStr = () => toLocalDateStr(new Date());

// Date comparison helpers for the date-navigation feature on the daily view.
// Both args are 'yyyy-mm-dd' strings; string comparison is reliable because
// the format is lexicographically sortable.
export const isFutureDate = (dateStr, todayStr = getTodayStr()) =>
    Boolean(dateStr && dateStr > todayStr);
export const isPastDate = (dateStr, todayStr = getTodayStr()) =>
    Boolean(dateStr && dateStr < todayStr);
export const isToday = (dateStr, todayStr = getTodayStr()) =>
    Boolean(dateStr && dateStr === todayStr);

// `t` 為選用的 i18n 翻譯函式（由呼叫端的 useT() 傳入）— lib 不碰 React context。
// 不傳 t 時維持 zh-TW 字串（向下相容）。`weekday` 維持 canonical 中文字，
// 供 isTaskDueToday 的 === 比對使用；顯示用字串是 desc / lastDesc。
export const getNthWeekday = (dateStr, t) => {
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

    // header.weekDays 是 Mon..Sun 陣列；getDay() 以週日為 0 → (day+6)%7。
    const tWeekDays = t ? t('header.weekDays') : null;
    const dayLabel = Array.isArray(tWeekDays) ? tWeekDays[(day + 6) % 7] : days[day];

    return {
        weekNum: weekNum,
        weekday: days[day],
        isLast: isLast,
        desc: t
            ? t('dates.nthWeekdayOfMonth', { n: weekNum, day: dayLabel })
            : `每月第 ${weekNum} 個星期${days[day]}`,
        lastDesc: t
            ? t('dates.lastWeekdayOfMonth', { day: dayLabel })
            : `每月最後一個星期${days[day]}`
    };
};

export const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
export const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)

export const getWeekRange = (dateStr) => {
    const curr = new Date(dateStr);
    const firstDay = new Date(curr.setDate(curr.getDate() - curr.getDay())); // Sunday
    const lastDay = new Date(curr.setDate(curr.getDate() + 6));
    return { start: toLocalDateStr(firstDay), end: toLocalDateStr(lastDay) };
}

export const getMonthRange = (dateStr) => {
    const curr = new Date(dateStr);
    const firstDay = toLocalDateStr(new Date(curr.getFullYear(), curr.getMonth(), 1));
    const lastDay = toLocalDateStr(new Date(curr.getFullYear(), curr.getMonth() + 1, 0));
    return { start: firstDay, end: lastDay };
}

export const isCompletedToday = (task) => {
    return isCompletedOnDate(task, getTodayStr());
};

export const isCompletedOnDate = (task, dateStr) => {
    // ★ Slice U — 反向習慣（越少越好）。當日發生次數 <= 上限即「達標/守住」。
    // 上限用 dailyTarget；戒除型 dailyTarget = 0（不可被 ||1 預設覆蓋）。
    // value 來源與量化一致（dailyProgress/.history 數字）。
    if (task.direction === 'decrease') {
        const value = task.dailyProgress?.[dateStr]?.value
            ?? (typeof task.history?.[dateStr] === 'number' ? task.history[dateStr] : 0);
        const limit = task.dailyTarget || 0;
        return (value || 0) <= limit;
    }

    if (task.type === 'quantitative') {
        return (task.dailyProgress?.[dateStr]?.value || 0) >= (task.dailyTarget || 1);
    }

    if (task.type === 'checklist') {
        // Checklist completion rule (2026-05-25): the task is "done" for a
        // given date only when ALL visible subtasks on that date are checked.
        //
        // History of this branch:
        //   - v1: `!!history[dateStr]` — marked done as soon as ANY history
        //     entry existed (toggling 1 subtask lit the whole task).
        //   - v2 (2fb3668): gated by `value >= dailyTarget`. But seed habits
        //     often ship with `dailyTarget = 1`, so 1 subtask checked still
        //     lit the task with 0/3 visible. User-reported again 2026-05-25.
        //   - v3 (this commit): ignore `dailyTarget` for checklists entirely
        //     — `dailyTarget` is degenerate for this task type — and require
        //     every visible subtask on that date to be true. Respects the
        //     subtask visibility window (addedAt/removedAt), so retiring an
        //     item doesn't strand old days at "9/10 forever".
        const entry = task.history?.[dateStr];
        if (!entry) return false;

        // Post-Slice-F shape: { value, subtaskCompletions, ... }.
        if (typeof entry === 'object' && entry !== null) {
            const visible = visibleSubtasks(task, dateStr);
            if (visible.length === 0) return false;
            const completions = entry.subtaskCompletions || {};
            return visible.every(s => completions[s.id] === true);
        }

        // Legacy v1.0 shapes — keep the old value-based gate so historical
        // entries written before Slice F still read sensibly. New writes
        // always produce the object shape, so this path is for archived rows.
        if (typeof entry === 'number') {
            return entry >= (task.dailyTarget || 1);
        }
        return !!entry;
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
    const yesterday = toLocalDateStr(new Date(Date.now() - 86400000));

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
            const dateStr = toLocalDateStr(checkDate);
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
        const dStr = toLocalDateStr(cursor);
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
