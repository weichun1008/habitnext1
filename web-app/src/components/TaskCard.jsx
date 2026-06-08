import React, { useState, useRef, useEffect } from 'react';
import { Check, Minus, Plus, Lock, ChevronDown, ChevronUp, RotateCcw, ShieldCheck, PartyPopper, Play, Star, TrendingDown, Ban } from 'lucide-react';
import { remainingQuota, dayStatus, settleYesterday, keptStreak } from '@/lib/reduceHabit';
import SwipeReveal from './taskCard/SwipeReveal';
import TaskHoverDots from './taskCard/TaskHoverDots';
import TaskActionMenu from './taskCard/TaskActionMenu';
import LocationChip from './taskCard/LocationChip';
import MemoryCapture from './journey/MemoryCapture';
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
const TaskCard = ({ task, onClick, onUpdate = () => { }, viewingDate, onAfterAction, onPickLocation, onAttachPhoto, attachingKey, onStartTool, onToggleStar }) => {
    const todayStr = getTodayStr();
    const dateStr = viewingDate || todayStr;
    const isFuture = isFutureDate(dateStr, todayStr);
    const isPast = isPastDate(dateStr, todayStr);

    // Inline subtask expand/collapse state. Checklist tasks default to EXPANDED
    // so subtasks are tappable without an extra "expand" tap (user feedback:
    // having to expand first was a chore). Non-checklist cards have no subtask
    // list, so the value is moot for them. Tapping the chevron flips it; tapping
    // the card body still opens the detail modal.
    const [subtasksExpanded, setSubtasksExpanded] = useState(task.type === 'checklist');

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
    // Slice U — reverse habit ("越少越好"). Stored as quantitative + direction.
    // It REPLACES the binary/quantitative completion control with a 零懲罰
    // record-occurrence UI and stays visible in the daily list all day.
    const isDecrease = task.direction === 'decrease';
    const isQuant = task.type === 'quantitative' && !isDecrease;
    const isPeriod = task.recurrence?.mode === 'period_count';
    const isChecklist = task.type === 'checklist';

    // Decrease day state — value = occurrences today, limit = dailyTarget cap.
    const decValue = task.dailyProgress?.[dateStr]?.value || 0;
    const decLimit = task.dailyTarget || 0;
    const decRemaining = remainingQuota({ value: decValue, limit: decLimit });
    const decStatus = dayStatus({ direction: 'decrease', value: decValue, limit: decLimit });

    // Slice U 視覺區隔 — 減低(琥珀) vs 戒除(玫紅)。色帶 + 標籤 + 淡底；戒除多「已守住 N 天」。
    const isReduce = isDecrease && decLimit > 0;
    const isQuit = isDecrease && decLimit === 0;
    const polColor = isQuit ? '#e11d48' : '#d97706';
    const polSoft = isQuit ? '#fff1f2' : '#fffbeb';
    const polBorder = isQuit ? '#fecdd3' : '#fde68a';
    const polLabel = isQuit ? '戒除' : '減低';
    const PolIcon = isQuit ? Ban : TrendingDown;
    const quitStreak = isQuit
        ? keptStreak({ limit: 0, dailyProgress: task.dailyProgress, history: task.history, todayStr, startStr: (task.createdAt ? String(task.createdAt).slice(0, 10) : (task.date || null)) })
        : 0;

    // Slice U model (c) — next-day settlement. On TODAY's view only, surface a
    // calm settle line for how yesterday landed (零懲罰: kept → teal, exceeded →
    // neutral gray). Pure display from data; shown only if yesterday was tracked.
    const yKey = (() => { const d = new Date(todayStr + 'T00:00:00'); d.setDate(d.getDate() - 1); const m = String(d.getMonth() + 1).padStart(2, '0'); const day = String(d.getDate()).padStart(2, '0'); return `${d.getFullYear()}-${m}-${day}`; })();
    const yHasEntry = task.dailyProgress?.[yKey] !== undefined || task.history?.[yKey] !== undefined;
    const yValue = task.dailyProgress?.[yKey]?.value ?? (typeof task.history?.[yKey] === 'number' ? task.history[yKey] : 0);
    const ySettle = (isDecrease && dateStr === todayStr && yHasEntry)
        ? settleYesterday({ direction: 'decrease', value: yValue, limit: decLimit })
        : null;

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

    // Slice U — a decrease habit is "completed" in the data sense (in-quota →
    // isCompletedOnDate true) but should NOT wear the calm done treatment; it
    // stays a normal active card all day. visuallyDone gates only the visual
    // done-state (faded border, accent rail, completed-only chip row).
    const visuallyDone = isCompleted && !isDecrease;

    const handleUpdate = (action, ...args) => {
        if (isLocked) return;
        onUpdate(task, action, ...args);
    };

    // Slice M — completed cards use a calm "done" treatment: 55% opacity, gray
    // border (not emerald), and a 3px emerald accent rail on the left rendered
    // as an absolute element. Title keeps its normal color (no strikethrough).
    const borderCls = visuallyDone
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
            className={`group p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden shadow-sm hover:shadow-md ${isDecrease ? '' : 'bg-white'} ${borderCls} ${isPast && !isCompleted ? 'opacity-75' : ''}`}
            style={isDecrease ? { backgroundColor: polSoft, borderColor: polBorder } : undefined}
        >

            {/* Slice M — left emerald accent rail when completed (non-strikethrough
                indicator that the task is done; complements the checkmark) */}
            {visuallyDone && (
                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-emerald-400" aria-hidden />
            )}

            {/* Slice U 視覺區隔 — 減低/戒除 左側極性色帶（琥珀/玫紅） */}
            {isDecrease && (
                <div className="absolute left-0 top-0 bottom-0 w-[5px]" style={{ backgroundColor: polColor }} aria-hidden />
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
                        {/* identity line removed 2026-06-03 — identity now
                            surfaces as a daily-view group header at the
                            aspiration level, not per card */}
                        {task.cue && (
                            <p className="text-[11px] font-medium text-emerald-600 mb-0.5 flex items-center gap-1 leading-tight">
                                <span>{task.cue}</span>
                                <span className="text-gray-300">→</span>
                            </p>
                        )}
                        <h3 className="font-bold text-sm text-gray-800 flex items-center gap-1">
                            {onToggleStar ? (
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onToggleStar(task); }}
                                    aria-label={task.starred ? '取消星號' : '加入星號'}
                                    aria-pressed={!!task.starred}
                                    className={`flex-shrink-0 -ml-1.5 -my-1 p-1 rounded-full hover:bg-amber-50 transition-all hover:scale-110 active:scale-95 ${
                                        task.starred
                                            ? 'text-amber-400'
                                            : 'text-gray-300 hover:text-amber-400 opacity-40 md:opacity-0 md:group-hover:opacity-100'
                                    }`}
                                >
                                    <Star size={19} className={task.starred ? 'fill-amber-400' : ''} />
                                </button>
                            ) : task.starred && (
                                <Star size={16} className="fill-amber-400 text-amber-400 flex-shrink-0" aria-label="已加星號" />
                            )}
                            <span className="min-w-0">{task.title}</span>
                            {isDecrease && (
                                <span
                                    className="flex-shrink-0 inline-flex items-center gap-0.5 text-[10px] font-black rounded-full px-1.5 py-0.5 border"
                                    style={{ color: polColor, backgroundColor: polSoft, borderColor: polBorder }}
                                >
                                    <PolIcon size={11} /> {polLabel}
                                </span>
                            )}
                        </h3>
                        <p className="text-xs text-gray-400 line-clamp-1">
                            {isPeriod ? (task.frequency === 'weekly' ? '本週目標' : '本月目標') : (task.details || '無詳細說明')}
                        </p>
                        {/* Slice O — completion location chip (where the user did it) */}
                        {visuallyDone && (
                            <div className="mt-0.5 flex items-center gap-3 flex-wrap" onClick={(e) => e.stopPropagation()}>
                                <LocationChip
                                    city={task.locationByDate?.[dateStr] || null}
                                    recentCities={Object.values(task.locationByDate || {}).slice(-3)}
                                    onPick={(cityName) => onPickLocation?.(task, dateStr, cityName)}
                                />
                                {/* Slice Q — meal-photo capture (Blob upload guarded) */}
                                <MemoryCapture
                                    hasPhoto={!!task.photoByDate?.[dateStr]}
                                    busy={attachingKey === `${task.id}:${dateStr}`}
                                    onAttach={(file) => onAttachPhoto?.(task, dateStr, file)}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-start gap-2 flex-shrink-0">
                    {/* 桌機 ⋮ — 排在打勾欄左邊、用 gap 隔開，保證不蓋到完成圈 */}
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
                    <div className="flex flex-col items-end gap-1">
                    {/* Slice T — tool widget launcher. When the habit carries a
                        tool (toolType), surface a small secondary 開始 button that
                        opens the ToolModal. stopPropagation so it doesn't also
                        open the detail modal. Zero-punishment: skipping is free. */}
                    {task.toolType && (
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onStartTool?.(task); }}
                            className="flex items-center gap-1 text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 px-2.5 py-1 rounded-full border border-gray-200 transition-colors hover:-translate-y-0.5"
                        >
                            <Play size={12} /> 開始
                        </button>
                    )}
                    {isDecrease ? (
                        // Decrease control lives in its own block below the title —
                        // the top-right slot just shows a calm status pill.
                        decLimit > 0 ? (
                            <span className={`text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap ${decStatus === 'over' ? 'bg-amber-50 text-amber-700' : 'bg-teal-50 text-teal-700'}`}>
                                {decStatus === 'over' ? '超過額度' : `剩 ${decRemaining} 次`}
                            </span>
                        ) : (
                            decValue === 0 ? (
                                <span className="text-xs font-black px-2 py-1 rounded-lg whitespace-nowrap flex items-center gap-1 text-white" style={{ backgroundColor: polColor }}>
                                    <ShieldCheck size={13} /> {quitStreak > 0 ? `已守住 ${quitStreak} 天` : '今天守著'}
                                </span>
                            ) : (
                                <span className="text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap bg-gray-100 text-gray-500">
                                    {`今天 ${decValue} 次`}
                                </span>
                            )
                        )
                    ) : (isQuant || isPeriod) ? (
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap transition-colors ${isCompleted ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-50 text-emerald-600'}`}>
                            {isCompleted ? (
                                <span className="flex items-center gap-1"><PartyPopper size={13} /> {displayStatus}</span>
                            ) : displayStatus}
                        </span>
                    ) : isChecklist ? (
                        // Checklist: X/Y badge + 主任務勾選圈（勾下去一次完成所有子任務，
                        // 走 handleUpdate('toggle') → 在 MainApp 設定全部 subtaskCompletions；
                        // 子任務狀態與逐項勾選共用同一份資料）+ chevron 展開子任務。
                        <div className="flex items-center gap-2">
                            {subtaskDisplay && (
                                <span className={`text-xs font-bold px-2 py-1 rounded-md ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                                    {subtaskDisplay}
                                </span>
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
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleUpdate('toggle'); }}
                                    disabled={isLocked}
                                    aria-label={isCompleted ? '取消完成（清空子任務）' : '全部完成'}
                                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-gray-200 hover:border-emerald-400'} ${isLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                                >
                                    {isCompleted && (
                                        <Check key={pulseKey} size={14} className="text-white animate-check-pop" strokeWidth={3} />
                                    )}
                                </button>
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

            {/* Slice U — decrease control. Replaces binary check / quant stepper.
                Stays visible all day; user records occurrences (+1 我做了) with a
                small -1 correction. 零懲罰 copy — no shaming, "重新開始" framing. */}
            {isDecrease && !isLocked && (
                <div
                    data-direction="decrease"
                    className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between gap-2"
                    onClick={(e) => e.stopPropagation()}
                >
                    <p className="text-xs text-gray-500 leading-tight flex-1 min-w-0">
                        {decLimit > 0
                            ? (decStatus === 'over'
                                ? '沒關係，明天重新開始'
                                : `今天還可以 ${decRemaining} 次`)
                            : (decValue === 0
                                ? '繼續保持，你做得很好'
                                : `今天記錄了 ${decValue} 次 · 沒關係，明天重新開始`)}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                            type="button"
                            aria-label="修正：減一次"
                            disabled={decValue <= 0}
                            onClick={(e) => { e.stopPropagation(); handleUpdate('add', -1); }}
                            className="w-8 h-7 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-full border border-gray-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Minus size={12} />
                        </button>
                        <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleUpdate('add', 1); }}
                            className="flex items-center gap-1 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-full border border-teal-100 transition-colors"
                        >
                            <Plus size={12} />
                            {decLimit > 0 ? '我做了' : '誠實記錄：我做了'}
                        </button>
                    </div>
                </div>
            )}

            {/* Slice U model (c) — yesterday settlement micro-line. Today's view
                only, when yesterday was tracked. 零懲罰: kept = subtle teal,
                exceeded = neutral gray with 重新開始 framing. */}
            {ySettle && (
                <p
                    data-testid="yesterday-settle"
                    className={`mt-2 flex items-center gap-1 text-xs leading-tight ${ySettle === 'kept' ? 'text-teal-600' : 'text-gray-400'}`}
                >
                    {ySettle === 'kept' ? (
                        <><ShieldCheck size={12} /> 昨天守住了</>
                    ) : (
                        <>昨天超過了，今天重新開始</>
                    )}
                </p>
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
