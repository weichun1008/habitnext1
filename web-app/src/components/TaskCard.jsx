import React from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import IconRenderer from './IconRenderer';
import { CATEGORY_CONFIG } from '@/lib/constants';
import { getTodayStr, isCompletedToday, calculatePeriodProgress } from '@/lib/utils';

const TaskCard = ({ task, onClick, onUpdate }) => {
    const todayStr = getTodayStr();
    let isCompleted, currentVal, targetVal, displayStatus, progressPercent;

    // Logic for Flexible Period Goals
    if (task.recurrence?.mode === 'period_count') {
        const count = calculatePeriodProgress(task);
        const target = task.recurrence.periodTarget || 1;
        isCompleted = count >= target;
        currentVal = count;
        targetVal = target;
        progressPercent = target > 0 ? Math.min(100, (count / target) * 100) : 0;
        displayStatus = `${count}/${target} 次`;
    }
    // Logic for Daily/Specific Day Tasks
    else {
        isCompleted = isCompletedToday(task);
        if (task.type === 'quantitative') {
            currentVal = task.dailyProgress?.[todayStr]?.value || 0;
            targetVal = task.dailyTarget || 1;
            progressPercent = targetVal > 0 ? Math.min(100, (currentVal / targetVal) * 100) : 0;
            displayStatus = `${currentVal}/${targetVal} ${task.unit}`;
        } else {
            progressPercent = isCompleted ? 100 : 0;
            displayStatus = null;
        }
    }

    const config = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG['star'];
    const isQuant = task.type === 'quantitative';
    const isPeriod = task.recurrence?.mode === 'period_count';
    const isChecklist = task.type === 'checklist';

    // Subtask Progress Display
    let subtaskDisplay = null;
    if (isChecklist && task.subtasks?.length > 0) {
        const completedCount = task.subtasks.filter(s => s.completed).length;
        subtaskDisplay = `${completedCount}/${task.subtasks.length}`;
    }

    return (
        <div onClick={onClick} className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden shadow-sm hover:shadow-md ${isCompleted ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-100'}`}>

            {/* Background Progress for Quant or Period Tasks */}
            {(isQuant || isPeriod) && (
                <div
                    className={`absolute bottom-0 left-0 h-1 transition-all duration-700 ${isCompleted ? 'bg-gradient-to-r from-yellow-400 to-emerald-500' : 'bg-emerald-400'}`}
                    style={{ width: `${progressPercent}%` }}
                />
            )}

            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                    <div className={`${config.bg} p-2 rounded-xl`}>
                        <IconRenderer category={task.category} size={18} className={config.type === 'emoji' ? 'text-2xl' : ''} />
                    </div>
                    <div>
                        <h3 className={`font-bold text-sm ${isCompleted && !isQuant && !isPeriod ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                            {task.title}
                        </h3>
                        <p className="text-xs text-gray-400 line-clamp-1">
                            {isPeriod ? (task.frequency === 'weekly' ? '本週目標' : '本月目標') : (task.details || '無詳細說明')}
                        </p>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                    {(isQuant || isPeriod) ? (
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap transition-colors ${isCompleted ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-50 text-emerald-600'}`}>
                            {isCompleted ? '🎉 達成' : displayStatus}
                        </span>
                    ) : (
                        <div className="flex items-center gap-2">
                            {isChecklist && subtaskDisplay && (
                                <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-md">{subtaskDisplay}</span>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); onUpdate(task, 'toggle'); }}
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-gray-200 hover:border-emerald-400'}`}
                            >
                                {isCompleted && <Check size={14} className="text-white" strokeWidth={3} />}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Add for Quant Tasks */}
            {isQuant && !isPeriod && (
                <div className="flex justify-end gap-2 mt-2">
                    <button onClick={(e) => { e.stopPropagation(); onUpdate(task, 'add', -(task.stepValue || 1)); }} className="w-8 h-6 flex items-center justify-center text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-full border border-gray-200 transition-colors"><Minus size={12} /></button>
                    <button onClick={(e) => { e.stopPropagation(); onUpdate(task, 'add', (task.stepValue || 1)); }} className="w-12 h-6 flex items-center justify-center text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-full border border-emerald-100 transition-colors">+{task.stepValue || 1}</button>
                    <span className="text-xs text-gray-400 pt-1.5">{task.unit}</span>
                </div>
            )}

            {/* Quick Add for Period Tasks */}
            {isPeriod && (task.recurrence?.dailyLimit === false || !isCompletedToday(task)) && (
                <div className="flex justify-end mt-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); onUpdate(task, 'period_add'); }}
                        className="text-xs flex items-center gap-1 bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full font-bold hover:bg-emerald-100 transition-colors"
                    >
                        <Plus size={12} /> 紀錄一次
                    </button>
                </div>
            )}
        </div>
    );
};

export default TaskCard;
