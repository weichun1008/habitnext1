import React from 'react';
import { Check, Minus } from 'lucide-react';
import IconRenderer from './IconRenderer';
import { CATEGORY_CONFIG } from '@/lib/constants';
import { getTodayStr } from '@/lib/utils';

const TaskCard = ({ task, onClick, onUpdate }) => {
    const isCompleted = task.type === 'quantitative'
        ? (task.dailyProgress[getTodayStr()]?.value || 0) >= task.dailyTarget
        : task.completed;

    const config = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG['star'];
    const currentVal = task.type === 'quantitative' ? (task.dailyProgress[getTodayStr()]?.value || 0) : 0;
    const targetVal = task.type === 'quantitative' ? task.dailyTarget : 0;
    const stepVal = task.type === 'quantitative' ? task.stepValue || 1 : 0;
    const percent = targetVal > 0 ? Math.min(100, Math.round((currentVal / targetVal) * 100)) : 0;

    return (
        <div onClick={onClick} className={`bg-white p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden shadow-sm hover:shadow-md ${isCompleted ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-100'}`}>
            {/* Progress Bar Background */}
            {(task.type === 'quantitative') && (
                <div
                    className={`absolute bottom-0 left-0 h-1 transition-all duration-700 ${isCompleted ? 'bg-gradient-to-r from-yellow-400 to-emerald-500' : 'bg-emerald-400'}`}
                    style={{ width: `${percent}%` }}
                />
            )}

            <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-3">
                    <div className={`${config.bg} p-2 rounded-xl`}>
                        <IconRenderer category={task.category} size={18} className={config.type === 'emoji' ? 'text-2xl' : ''} />
                    </div>
                    <div>
                        <h3 className={`font-bold text-sm ${isCompleted && task.type !== 'quantitative' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                            {task.title}
                        </h3>
                        <p className="text-xs text-gray-400 line-clamp-1">{task.details || '無詳細說明'}</p>
                    </div>
                </div>

                <div className="flex flex-col items-end gap-1">
                    {task.type === 'quantitative' ? (
                        <span className={`text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap transition-colors ${isCompleted ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-50 text-emerald-600'}`}>
                            {isCompleted ? '🎉 達成' : `${currentVal}/${targetVal} ${task.unit}`}
                        </span>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); onUpdate(task, 'toggle'); }}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-gray-200 hover:border-emerald-400'}`}
                        >
                            {isCompleted && <Check size={14} className="text-white" strokeWidth={3} />}
                        </button>
                    )}
                </div>
            </div>

            {task.type === 'quantitative' && (
                <div className="flex justify-end gap-2 mt-2">
                    <button onClick={(e) => { e.stopPropagation(); onUpdate(task, 'add', -stepVal); }} className="w-8 h-6 flex items-center justify-center text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-full border border-gray-200 transition-colors"><Minus size={12} /></button>
                    <button onClick={(e) => { e.stopPropagation(); onUpdate(task, 'add', stepVal); }} className="w-12 h-6 flex items-center justify-center text-xs font-bold text-emerald-600 hover:bg-emerald-50 rounded-full border border-emerald-100 transition-colors">+{stepVal}</button>
                    <span className="text-xs text-gray-400 pt-1.5">{task.unit}</span>
                </div>
            )}
        </div>
    );
};

export default TaskCard;
