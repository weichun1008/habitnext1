import React, { useState, useEffect } from 'react';
import { X, Edit2, Check, Calendar, Target, Flame, Trophy, ChevronRight, ChevronLeft } from 'lucide-react';
import IconRenderer from './IconRenderer';
import { CATEGORY_CONFIG } from '@/lib/constants';
import { getTodayStr, isCompletedOnDate, calculateStats, isFutureDate } from '@/lib/utils';
import { visibleSubtasks } from '@/lib/subtasks';

const TaskDetailModal = ({ isOpen, onClose, task, onEdit, onUpdate, initialDate }) => {
    const [currentDate, setCurrentDate] = useState(initialDate || getTodayStr());

    // Sync internal date when the modal re-opens for a different task or the
    // parent's browsing date changes — otherwise the modal would keep showing
    // today even when the user is browsing a future/past day on the daily view.
    useEffect(() => {
        if (isOpen) {
            setCurrentDate(initialDate || getTodayStr());
        }
    }, [isOpen, task?.id, initialDate]);

    if (!isOpen || !task) return null;

    const config = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG['star'];
    const isCompleted = isCompletedOnDate(task, currentDate);

    // Subtask Progress
    const _subsForDate = visibleSubtasks(task, currentDate);
    const _historyForDate = task.history?.[currentDate];
    const _completionsForDate = (_historyForDate && typeof _historyForDate === 'object')
        ? (_historyForDate.subtaskCompletions || {})
        : {};
    const totalSubtasks = _subsForDate.length;
    const completedSubtasks = _subsForDate.filter(s => _completionsForDate[s.id] === true).length;
    const subtaskProgress = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

    // Real Stats
    const { streak, total: totalCompletions } = calculateStats(task);

    const handleDateChange = (days) => {
        const date = new Date(currentDate);
        date.setDate(date.getDate() + days);
        setCurrentDate(date.toISOString().split('T')[0]);
    };

    const todayStr = getTodayStr();
    const isToday = currentDate === todayStr;
    const isFuture = isFutureDate(currentDate, todayStr);
    const isLocked = isFuture;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end md:items-center justify-center">
            {/* h-[90dvh] uses dynamic viewport height — accounts for iOS Safari's
                shrinking URL bar so the modal top doesn't get clipped behind it. */}
            <div className="bg-white w-full md:max-w-md h-[90dvh] md:h-auto md:max-h-[90dvh] md:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col animate-fade-in-up">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-2xl">
                    <button onClick={onClose} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={24} className="text-gray-500" />
                    </button>
                    <div className="flex gap-2">
                        <button onClick={() => onEdit(task)} className="flex items-center gap-1 text-sm font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full hover:bg-gray-200 transition-colors">
                            <Edit2 size={14} /> 編輯
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">

                    {/* Date Navigation */}
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <button onClick={() => handleDateChange(-1)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400"><ChevronLeft size={20} /></button>
                        <div className="flex items-center gap-2 font-bold text-gray-700">
                            <Calendar size={16} className="text-emerald-500" />
                            {currentDate}
                            {isToday && <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full">今天</span>}
                            {isFuture && <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">未來</span>}
                        </div>
                        <button onClick={() => handleDateChange(1)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400"><ChevronRight size={20} /></button>
                    </div>

                    {/* Main Info */}
                    <div className="flex flex-col items-center mb-8">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${config.bg}`}>
                            <IconRenderer category={task.category} size={28} />
                        </div>
                        {task.identity && (
                            <p className="text-xs font-medium text-gray-500 mb-1">
                                {task.identity}
                            </p>
                        )}
                        {task.cue && (
                            <p className="text-sm font-medium text-emerald-600 mb-1 flex items-center gap-1">
                                <span>{task.cue}</span>
                                <span className="text-gray-300">→</span>
                            </p>
                        )}
                        <h2 className="text-2xl font-black text-gray-800 text-center mb-2">{task.title}</h2>
                        <p className="text-gray-500 text-center text-sm px-4">{task.details || '這個習慣沒有詳細說明，但持續做就對了！'}</p>
                    </div>

                    {/* Quick Actions (Complete for Selected Date) */}
                    <div className="mb-8 flex justify-center">
                        {task.type === 'quantitative' ? (
                            <div className="bg-gray-50 rounded-2xl p-4 w-full border border-gray-100">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-xs font-bold text-gray-400">當日進度</span>
                                    <span className="text-xl font-black text-gray-800">
                                        {task.dailyProgress?.[currentDate]?.value || 0} <span className="text-sm text-gray-400 font-medium">/ {task.dailyTarget} {task.unit}</span>
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
                                    <div className="bg-emerald-500 h-full transition-all duration-500" style={{ width: `${Math.min(100, ((task.dailyProgress?.[currentDate]?.value || 0) / task.dailyTarget) * 100)}%` }}></div>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button
                                        disabled={isLocked}
                                        onClick={() => onUpdate(task, 'add', -(task.stepValue || 1), null, currentDate)}
                                        className={`flex-1 py-3 rounded-xl bg-white border border-gray-200 font-bold text-gray-600 shadow-sm ${isLocked ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                                    >- {task.stepValue}</button>
                                    <button
                                        disabled={isLocked}
                                        onClick={() => onUpdate(task, 'add', (task.stepValue || 1), null, currentDate)}
                                        className={`flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold shadow-md shadow-emerald-200 ${isLocked ? 'opacity-40 cursor-not-allowed' : 'hover:bg-emerald-600'}`}
                                    >+ {task.stepValue}</button>
                                </div>
                            </div>
                        ) : totalSubtasks > 0 ? (
                            // Checklist with subtasks: 完成任務 is auto-derived from
                            // subtask completion, not a manual toggle. Button is
                            // disabled and shows progress until all subtasks are done.
                            <button
                                disabled
                                className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-all cursor-not-allowed ${
                                    isCompleted
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-gray-100 text-gray-500'
                                }`}
                            >
                                {isCompleted
                                    ? <><Check size={24} /> 已完成</>
                                    : <>需完成所有子任務（{completedSubtasks}/{totalSubtasks}）</>}
                            </button>
                        ) : (
                            <button
                                disabled={isLocked}
                                onClick={() => onUpdate(task, 'toggle', null, null, currentDate)}
                                className={`w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-all ${
                                    isLocked
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : isCompleted
                                            ? 'bg-gray-100 text-gray-500'
                                            : 'bg-emerald-500 text-white shadow-emerald-200 hover:bg-emerald-600 hover:scale-[1.02]'
                                }`}
                            >
                                {isLocked
                                    ? '尚未到當日'
                                    : isCompleted
                                        ? <><Check size={24} /> 已完成</>
                                        : '完成任務'}
                            </button>
                        )}
                    </div>

                    {/* Subtasks (Interactive) */}
                    {_subsForDate.length > 0 && (() => {
                        const isPastDate = currentDate < todayStr;
                        return (
                            <div className="mb-8">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2"><List size={18} className="text-blue-500" /> 子任務</h3>
                                    <span className="text-xs font-bold text-gray-400">{completedSubtasks}/{totalSubtasks}</span>
                                </div>
                                <div className="space-y-2">
                                    {_subsForDate.map(sub => {
                                        const isChecked = _completionsForDate[sub.id] === true;
                                        const isReadonly = isPastDate || isFuture;
                                        return (
                                            <div
                                                key={sub.id}
                                                onClick={isReadonly ? undefined : () => onUpdate(task, 'toggle_subtask', null, sub.id, currentDate)}
                                                className={`flex items-center gap-3 p-3 rounded-xl border border-gray-100 transition-colors ${isReadonly ? 'bg-gray-50 cursor-not-allowed' : 'bg-white hover:bg-gray-50 cursor-pointer'}`}
                                            >
                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-gray-300'}`}>
                                                    {isChecked && <Check size={12} className="text-white" strokeWidth={3} />}
                                                </div>
                                                <span className={`text-sm ${isChecked ? 'text-gray-400 line-through' : (isReadonly ? 'text-gray-400' : 'text-gray-700')}`}>{sub.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Stats Preview */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                            <div className="flex items-center gap-2 mb-1 text-orange-600">
                                <Flame size={16} /> <span className="text-xs font-bold">連續紀錄</span>
                            </div>
                            <p className="text-2xl font-black text-gray-800">{streak} <span className="text-xs font-medium text-gray-400">天</span></p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                            <div className="flex items-center gap-2 mb-1 text-blue-600">
                                <Trophy size={16} /> <span className="text-xs font-bold">累計完成</span>
                            </div>
                            <p className="text-2xl font-black text-gray-800">{totalCompletions} <span className="text-xs font-medium text-gray-400">次</span></p>
                        </div>
                    </div>

                    {/* Habit Tips (Static for now) */}
                    <div className="mt-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <h4 className="font-bold text-gray-800 text-sm mb-2">💡 養成小撇步</h4>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            {task.science || '將這個習慣與你已經養成的習慣綁定在一起（例如：刷牙後就做...），可以大幅提升成功率喔！'}
                        </p>
                    </div>

                </div>
            </div>
        </div>
    );
};

import { List } from 'lucide-react';

export default TaskDetailModal;
