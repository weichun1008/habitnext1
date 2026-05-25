import React from 'react';
import { Check, Minus, Plus, Lock } from 'lucide-react';
import IconRenderer from './IconRenderer';
import { CATEGORY_CONFIG, resolveIconKey } from '@/lib/constants';
import {
    getTodayStr,
    isCompletedOnDate,
    isCompletedToday,
    calculatePeriodProgress,
    isFutureDate,
    isPastDate,
} from '@/lib/utils';
import { visibleSubtasks } from '@/lib/subtasks';

// `viewingDate` (yyyy-mm-dd) lets the card render any day's state — used by
// the daily view's interactive week strip. Defaults to today so existing
// callers that don't pass it (other views) behave unchanged.
const TaskCard = ({ task, onClick, onUpdate = () => { }, viewingDate }) => {
    const todayStr = getTodayStr();
    const dateStr = viewingDate || todayStr;
    const isFuture = isFutureDate(dateStr, todayStr);
    const isPast = isPastDate(dateStr, todayStr);

    let isCompleted, currentVal, targetVal, displayStatus, progressPercent;

    // Logic for Flexible Period Goals — period progress is window-based
    // (this week / this month), so it doesn't shift by viewing date.
    if (task.recurrence?.mode === 'period_count') {
        const count = calculatePeriodProgress(task);
        const target = task.recurrence.periodTarget || 1;
        isCompleted = count >= target;
        currentVal = count;
        targetVal = target;
        progressPercent = target > 0 ? Math.min(100, (count / target) * 100) : 0;
        displayStatus = `${count}/${target} 次`;
    }
    // Logic for Daily/Specific Day Tasks — date-driven.
    else {
        isCompleted = isCompletedOnDate(task, dateStr);
        if (task.type === 'quantitative') {
            currentVal = task.dailyProgress?.[dateStr]?.value || 0;
            targetVal = task.dailyTarget || 1;
            progressPercent = targetVal > 0 ? Math.min(100, (currentVal / targetVal) * 100) : 0;
            displayStatus = `${currentVal}/${targetVal} ${task.unit}`;
        } else {
            progressPercent = isCompleted ? 100 : 0;
            displayStatus = null;
        }
    }

    // Route through resolveIconKey: task.category is usually a HabitCategory
    // name ('飲食') for template-derived tasks, which would silently miss
    // CATEGORY_CONFIG and leave bg/color gray. resolveIconKey translates the
    // domain name to the right config key ('apple') first.
    const config = CATEGORY_CONFIG[resolveIconKey(task.category)];
    const isQuant = task.type === 'quantitative';
    const isPeriod = task.recurrence?.mode === 'period_count';
    const isChecklist = task.type === 'checklist';

    // Subtask Progress Display — also follows viewingDate.
    let subtaskDisplay = null;
    if (isChecklist) {
        const visible = visibleSubtasks(task, dateStr);
        const historyForDate = task.history?.[dateStr];
        const completions = (historyForDate && typeof historyForDate === 'object')
            ? (historyForDate.subtaskCompletions || {})
            : {};
        const completedCount = visible.filter(s => completions[s.id] === true).length;
        if (visible.length > 0) {
            subtaskDisplay = `${completedCount}/${visible.length}`;
        }
    }

    // Future-date guard: completion / quantity inputs are locked until that
    // day arrives. Past-date is read-only too (no edits) but we still show
    // the historical completion state via styling above.
    const isLocked = isFuture || isPast;

    const handleUpdate = (action, ...args) => {
        if (isLocked) return;
        onUpdate(task, action, ...args);
    };

    // Card border accent: emerald when complete, indigo dashed for future,
    // gray for past read-only, neutral otherwise.
    const borderCls = isCompleted
        ? 'border-emerald-200 bg-emerald-50/30'
        : isFuture
            ? 'border-indigo-200 bg-indigo-50/20 border-dashed'
            : 'border-gray-100';

    return (
        <div
            onClick={onClick}
            className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden shadow-sm hover:shadow-md ${borderCls} ${isPast && !isCompleted ? 'opacity-75' : ''}`}
        >

            {/* Background Progress for Quant or Period Tasks */}
            {(isQuant || isPeriod) && (
                <div
                    className={`absolute bottom-0 left-0 h-1 transition-all duration-700 ${isCompleted ? 'bg-gradient-to-r from-yellow-400 to-emerald-500' : 'bg-emerald-400'}`}
                    style={{ width: `${progressPercent}%` }}
                />
            )}

            {/* Title & Status */}
            <div className="flex justify-between items-start mb-2 gap-2">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`${config.bg} p-2 rounded-xl flex-shrink-0`}>
                        <IconRenderer category={task.category} size={18} className={config.type === 'emoji' ? 'text-2xl' : ''} />
                    </div>
                    <div className="min-w-0 flex-1">
                        {task.identity && (
                            <p className="text-[10px] font-medium text-gray-400 mb-0.5 leading-tight">
                                {task.identity}
                            </p>
                        )}
                        {task.cue && (
                            <p className="text-[11px] font-medium text-emerald-600 mb-0.5 flex items-center gap-1 leading-tight">
                                <span>{task.cue}</span>
                                <span className="text-gray-300">→</span>
                            </p>
                        )}
                        <h3 className={`font-bold text-sm ${isCompleted && !isQuant && !isPeriod ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                            {task.title}
                        </h3>
                        <p className="text-xs text-gray-400 line-clamp-1">
                            {isPeriod ? (task.frequency === 'weekly' ? '本週目標' : '本月目標') : (task.details || '無詳細說明')}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {(isQuant || isPeriod) ? (
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap transition-colors ${isCompleted ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-50 text-emerald-600'}`}>
                            {isCompleted ? (
                                <span className="flex items-center gap-1">🎉 {displayStatus}</span>
                            ) : displayStatus}
                        </span>
                    ) : (
                        <div className="flex items-center gap-2">
                            {isChecklist && subtaskDisplay && (
                                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">{subtaskDisplay}</span>
                            )}
                            {isFuture ? (
                                <span
                                    title="未來的任務 — 到那天才能完成"
                                    className="w-6 h-6 rounded-full border-2 border-dashed border-indigo-300 bg-white flex items-center justify-center"
                                >
                                    <Lock size={11} className="text-indigo-400" />
                                </span>
                            ) : (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleUpdate('toggle'); }}
                                    disabled={isLocked}
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-gray-200 hover:border-emerald-400'} ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                                >
                                    {isCompleted && <Check size={14} className="text-white" strokeWidth={3} />}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Add for Quant Tasks — hidden on past/future to prevent edits */}
            {isQuant && !isPeriod && !isLocked && (
                <div className="flex justify-end gap-2 mt-2">
                    <button onClick={(e) => { e.stopPropagation(); handleUpdate('add', -(task.stepValue || 1)); }} className="w-8 h-6 flex items-center justify-center text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-full border border-gray-200 transition-colors"><Minus size={12} /></button>
                    <button onClick={(e) => { e.stopPropagation(); handleUpdate('add', (task.stepValue || 1)); }} className="w-12 h-6 flex items-center justify-center text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-full border border-emerald-100 transition-colors">+{task.stepValue || 1}</button>
                    <span className="text-xs text-gray-400 pt-1.5">{task.unit}</span>
                </div>
            )}

            {/* Quick Add for Period Tasks — period tasks aren't date-locked since
                the window concept (this week / this month) is what matters. */}
            {isPeriod && (task.recurrence?.dailyLimit === false || !isCompletedToday(task)) && (
                <div className="flex justify-end mt-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleUpdate('period_add'); }}
                        className="text-xs flex items-center gap-1 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full font-bold hover:bg-emerald-100 transition-colors"
                    >
                        <Plus size={12} /> 紀錄一次
                    </button>
                </div>
            )}

            {/* Subtle future-day badge */}
            {isFuture && (
                <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-indigo-500 font-medium">
                    <Lock size={10} /> 未來預覽
                </div>
            )}
        </div>
    );
};

export default TaskCard;
