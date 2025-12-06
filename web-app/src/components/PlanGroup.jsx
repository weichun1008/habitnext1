import React, { useState } from 'react';
import { Trash2, Info, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import TaskCard from './TaskCard';

const PlanGroup = ({ assignment, tasks, onDelete, onTaskClick, onTaskEdit, onTaskDelete }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    const handleDelete = () => {
        // Check if any task in this assignment is locked (Expert Assigned)
        const isExpertAssigned = tasks.some(t => t.isLocked);

        if (isExpertAssigned) {
            const confirmed = window.confirm(
                "這是由專家幫你建立的清單，刪除前請先和你的專家充分討論，如果還沒進行討論直接刪除，資料將無法復原。是否確認刪除？"
            );
            if (confirmed) {
                onDelete(assignment.id);
            }
        } else {
            if (window.confirm("確定要刪除此計畫嗎？包含的所有任務也會被刪除。")) {
                onDelete(assignment.id);
            }
        }
    };

    return (
        <div className="mb-6 bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-50 to-white px-4 py-3 flex items-center justify-between border-b border-emerald-50">
                <div
                    className="flex items-center gap-3 cursor-pointer flex-1"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs">
                        計畫
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                            {assignment.template?.name || '專屬計畫'}
                            {tasks.some(t => t.isLocked) && <Lock size={12} className="text-emerald-500" />}
                        </h3>
                        <p className="text-xs text-gray-500">
                            由 {assignment.expertName || assignment.expert?.name || '專家'} 建立
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Info Button (Optional, can show description) */}
                    {assignment.template?.description && (
                        <button
                            className="p-2 text-gray-400 hover:text-emerald-500 transition-colors"
                            title="計畫說明"
                            onClick={() => alert(assignment.template.description)}
                        >
                            <Info size={18} />
                        </button>
                    )}

                    <button
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        onClick={handleDelete}
                    >
                        <Trash2 size={18} />
                    </button>

                    <button
                        className="p-2 text-gray-400 transition-colors"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </button>
                </div>
            </div>

            {/* Tasks List */}
            {isExpanded && (
                <div className="p-3 bg-gray-50/50">
                    {tasks.map(task => (
                        <TaskCard
                            key={task.id}
                            task={task}
                            onToggle={(date) => onTaskClick(task)} // Assuming onTaskClick handles toggle or open detail
                            onClick={() => onTaskClick(task)}
                            onEdit={() => onTaskEdit(task)}
                            onDelete={() => onTaskDelete(task.id)}
                            isLocked={task.isLocked}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default PlanGroup;
