import React, { useState } from 'react';
import { Trash2, Info, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import TaskCard from './TaskCard';

const PlanGroup = ({ assignment, tasks, onDelete, onTaskClick, onTaskEdit, onTaskDelete }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const isExpertAssigned = tasks.some(t => t.isLocked);

    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
    };

    const confirmDelete = () => {
        onDelete(assignment.id);
        setShowDeleteConfirm(false); // Likely redundant as component unmounts
    };

    return (
        <>
            <div className="mb-6 bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden relative">
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
                                {isExpertAssigned && <Lock size={12} className="text-emerald-500" />}
                            </h3>
                            <p className="text-xs text-gray-500">
                                由 {assignment.expertName || assignment.expert?.name || '專家'} 建立
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
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
                            onClick={handleDeleteClick}
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
                                onToggle={(date) => onTaskClick(task)}
                                onClick={() => onTaskClick(task)}
                                onEdit={() => onTaskEdit(task)}
                                onDelete={() => onTaskDelete(task.id)}
                                isLocked={task.isLocked}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-in-up">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">
                            {isExpertAssigned ? '確認刪除專家計畫？' : '確認刪除計畫？'}
                        </h3>

                        {isExpertAssigned ? (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 leading-relaxed">
                                <p className="font-bold mb-2">⚠️ 警告</p>
                                這是由專家幫你建立的清單，刪除前請先和你的專家充分討論。如果還沒進行討論直接刪除，資料將無法復原。
                            </div>
                        ) : (
                            <p className="text-gray-500 mb-6 text-sm">
                                刪除計畫後，其中包含的所有任務也將一併被刪除且無法復原。
                            </p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
                            >
                                {isExpertAssigned ? '仍要刪除' : '確認刪除'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PlanGroup;
