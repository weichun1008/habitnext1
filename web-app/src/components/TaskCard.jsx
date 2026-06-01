import React, { useState, useRef, useEffect } from 'react';
import { Check, Minus, Plus, Lock, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import SwipeReveal from './taskCard/SwipeReveal';
import TaskHoverDots from './taskCard/TaskHoverDots';
import TaskActionMenu from './taskCard/TaskActionMenu';
import LocationChip from './taskCard/LocationChip';
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
const TaskCard = ({ task, onClick, onUpdate = () => { }, viewingDate, onAfterAction, onPickLocation }) => {
    const todayStr = getTodayStr();
    const dateStr = viewingDate || todayStr;
    const isFuture = isFutureDate(dateStr, todayStr);
    const isPast = isPastDate(dateStr, todayStr);

    // Inline subtask expand/collapse state. Session-only (resets on refresh /
    // remount) — keeping the card list visually tidy by default. Tapping the
    // chevron flips it; tapping the card body still opens the detail modal.
    const [subtasksExpanded, setSubtasksExpanded] = useState(false);

    // Check-pulse trigger — when isCompleted transitions false → true we
    // bump pulseKey, which re-mounts the Check icon and runs the
    // animate-check-pop keyframe. Avoids needing imperative animation
    // libraries. The ref tracks previous value across renders.
    const [pulseKey, setPulseKey] = useState(0);
    const prevCompletedRef = useRef(isCompletedOnDate(task, dateStr));
    useEffect(() => {
        const nowCompleted = isCompletedOnDate(task, dateStr);
        if (!prevCompletedRef.current && nowCompleted) {
            setPulseKey(k => k + 1);
        }
        prevCompletedRef.current = nowCompleted;
        // task.history changing is the primary trigger; dateStr changes when
        // user navigates the week strip so we reset baseline then too.
    }, [task.history, dateStr, task]);

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

    // Subtask progress — hoisted so we can render both the X/Y badge AND the
    // inline subtask list (when expanded) from the same source.
    let subtaskDisplay = null;
    let visibleSubs = [];
    let subtaskCompletions = {};
    if (isChecklist) {
        visibleSubs = visibleSubtasks(task, dateStr);
        const historyForDate = task.history?.[dateStr];
        subtaskCompletions = (historyForDate && typeof historyForDate === 'object')
            ? (historyForDate.subtaskCompletions || {})
            : {};
        const completedCount = visibleSubs.filter(s => subtaskCompletions[s.id] === true).length;
        if (visibleSubs.length > 0) {
            subtaskDisplay = `${completedCount}/${visibleSubs.length}`;
        }
    }

    // Only FUTURE dates lock input. Past dates stay editable so the user can
    // retroactively complete a habit (catch-up streak) or un-toggle a past
    // mistake — the spec calls this "preserving flexibility on history".
    // Past styling (opacity-75) lives separately on the card border below.
    const isLocked = isFuture;

    // Suppress 暫停 / 隱藏 / 刪除 affordances except on today's incomplete
    // cards. Completed cards (any day) and past-day cards (any state) should
    // not offer them — those mutate the live habit definition, which makes
    // little sense on historical snapshots or done-for-the-day instances.
    const showActionMenu = !isPast && !isCompleted && !isFuture;

    const handleUpdate = (action, ...args) => {
        if (isLocked) return;
        onUpdate(task, action, ...args);
    };

    // Slice M — completed cards use a calm "done" treatment: 55% opacity, gray
    // border (not emerald), and a 3px emerald accent rail on the left rendered
    // as an absolute element. Title keeps its normal color (no strikethrough).
    const borderCls = isCompleted
        ? 'border-gray-200 opacity-55'
        : isFuture
            ? 'border-indigo-200 bg-indigo-50/20 border-dashed'
            : 'border-gray-100';

    // Past/future days are read-only snapshots — 暫停 / 隱藏 / 刪除 only
    // make sense on a live, active habit instance. Bypassing SwipeReveal +
    // TaskHoverDots when isLocked also fixes the user-reported regression
    // where the swipe layer's bg colors bled through the right edge of
    // historical cards (the inner translate wrapper could end up with a
    // residual offset across re-renders, leaving 暫停 / 刪除 visible behind
    // every past-day card).
    const cardBody = (
        <div
            onClick={onClick}
            className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden shadow-sm hover:shadow-md ${borderCls} ${isPast && !isCompleted ? 'opacity-75' : ''}`}
        >

            {/* Slice M — left emerald accent rail when completed (non-strikethrough
                indicator that the task is done; complements the checkmark) */}
            {isCompleted && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-400" aria-hidden />
            )}

            {/* Slice M — desktop hover dots top-right. Only show on today's
                incomplete cards; completed (any day) and past (any state)
                hide them because 暫停 / 隱藏 / 刪除 don't apply there. */}
            {showActionMenu && (
                <TaskHoverDots>
                    <TaskActionMenu
                        taskId={task.id}
                        taskTitle={task.title}
                        variant="popover"
                        onAction={(action, success) => { if (success) onAfterAction?.(action); }}
                    />
                </TaskHoverDots>
            )}

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
                        <h3 className="font-bold text-sm text-gray-800">
                            {task.title}
                        </h3>
                        <p className="text-xs text-gray-400 line-clamp-1">
                            {isPeriod ? (task.frequency === 'weekly' ? '本週目標' : '本月目標') : (task.details || '無詳細說明')}
                        </p>
                        {/* Slice O — completion location chip (where the user did it) */}
                        {isCompleted && (
                            <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
                                <LocationChip
                                    city={task.locationByDate?.[dateStr] || null}
                                    recentCities={Object.values(task.locationByDate || {}).slice(-3)}
                                    onPick={(cityName) => onPickLocation?.(task, dateStr, cityName)}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {(isQuant || isPeriod) ? (
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap transition-colors ${isCompleted ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-50 text-emerald-600'}`}>
                            {isCompleted ? (
                                <span className="flex items-center gap-1">🎉 {displayStatus}</span>
                            ) : displayStatus}
                        </span>
                    ) : isChecklist ? (
                        // Checklist: X/Y badge + chevron to expand inline subtasks.
                        // No outer toggle — the bug was that toggling here flipped
                        // `completed` on the task without going through subtask
                        // logic, leaving partial state ('1/3 + 已完成' inconsistency).
                        <div className="flex items-center gap-2">
                            {subtaskDisplay && (
                                <span className={`text-xs font-bold px-2 py-1 rounded-md ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                                    {subtaskDisplay}
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setSubtasksExpanded(v => !v); }}
                                aria-label={subtasksExpanded ? '收合子任務' : '展開子任務'}
                                aria-expanded={subtasksExpanded}
                                className="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors text-gray-400"
                            >
                                {subtasksExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                        </div>
                    ) : (
                        // Binary / other — keep the existing toggle button.
                        <div className="flex items-center gap-2">
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
                                    {isCompleted && (
                                        // key={pulseKey} re-mounts the Check on every
                                        // false→true transition so animate-check-pop replays.
                                        <Check
                                            key={pulseKey}
                                            size={14}
                                            className="text-white animate-check-pop"
                                            strokeWidth={3}
                                        />
                                    )}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Inline subtask list — only for checklist tasks when expanded.
                Subtasks tap-toggle through the same `toggle_subtask` handler
                the detail modal uses, so the completion contract (ALL
                visible subtasks checked → task complete) flows through
                naturally. Future/past dates show the same UI but with
                disabled checkboxes so users can still see structure. */}
            {isChecklist && subtasksExpanded && visibleSubs.length > 0 && (
                <div
                    className="mt-3 pt-3 border-t border-gray-100 space-y-1.5"
                    onClick={(e) => e.stopPropagation()}
                >
                    {visibleSubs.map(sub => {
                        const isChecked = subtaskCompletions[sub.id] === true;
                        return (
                            <button
                                key={sub.id}
                                type="button"
                                disabled={isLocked}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isLocked) return;
                                    handleUpdate('toggle_subtask', null, sub.id, dateStr);
                                }}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors ${
                                    isLocked
                                        ? 'cursor-not-allowed'
                                        : 'hover:bg-gray-50 cursor-pointer'
                                }`}
                            >
                                <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                                    isChecked
                                        ? 'bg-emerald-500 border-emerald-500'
                                        : 'border-gray-300'
                                } ${isLocked ? 'opacity-50' : ''}`}>
                                    {isChecked && <Check size={10} className="text-white" strokeWidth={3} />}
                                </div>
                                <span className={`text-xs ${
                                    isChecked
                                        ? 'text-gray-400 line-through'
                                        : isLocked ? 'text-gray-400' : 'text-gray-700'
                                }`}>
                                    {sub.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}

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

    // Future-locked tasks render raw — no swipe at all (Lock badge already
    // makes it clear the day hasn't arrived).
    if (isFuture) return cardBody;

    // SwipeReveal config branches by state:
    //   - 暫停 / 刪除 (left swipe reveal) only on today's incomplete cards
    //     via showActionMenu — past or completed cards get no leftActions,
    //     which the wrapper interprets as "left swipe is disabled, no bg
    //     bleeds through the card's right edge".
    //   - Right swipe always available (past or today, complete or not)
    //     for the corresponding action: 完成 if incomplete, 還原 if
    //     already completed. The hint icon during the gesture tells the
    //     user which action is about to fire.
    const HintIcon = isCompleted ? RotateCcw : Check;
    const hintColorClass = isCompleted ? 'text-amber-500' : 'text-emerald-500';
    const rightHint = (
        <div className={`flex items-center justify-center w-10 h-10 rounded-full bg-white shadow ${hintColorClass}`}>
            <HintIcon size={20} strokeWidth={2.5} />
        </div>
    );

    return (
        <SwipeReveal
            rightActions={showActionMenu ? (
                <TaskActionMenu
                    taskId={task.id}
                    taskTitle={task.title}
                    variant="swipe"
                    onAction={(action, success) => { if (success) onAfterAction?.(action); }}
                />
            ) : null}
            onSwipeRight={() => handleUpdate('toggle')}
            rightHintIcon={rightHint}
        >
            {cardBody}
        </SwipeReveal>
    );
};

export default TaskCard;
