import React, { useState } from 'react';
import { Trash2, Info, ChevronDown, ChevronUp, Lock } from 'lucide-react';
import TaskCard from './TaskCard';
import { useT } from '@/lib/i18n';
import { localizeContent } from '@/lib/i18n/content';

const PlanGroup = ({ assignment, tasks, onDelete, onTaskClick, onTaskEdit, onTaskDelete, onUpdate }) => {
    const { t, locale } = useT();
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
                            {t('planGroup.plan')}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                                {assignment.template?.name || t('planGroup.defaultPlanName')}
                                {isExpertAssigned && <Lock size={12} className="text-emerald-500" />}
                            </h3>
                            <p className="text-xs text-gray-500">
                                {t('planGroup.createdBy', { name: assignment.expertName || assignment.expert?.name || t('planGroup.expertFallback') })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {assignment.template?.description && (
                            <button
                                className="p-2 text-gray-400 hover:text-emerald-500 transition-colors"
                                title={t('planGroup.planDescription')}
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

                {/* Tasks List - Grouped by Phase */}
                {isExpanded && (
                    <div className="p-3 bg-gray-50/50">
                        {(() => {
                            // Group tasks by phase
                            const phases = {};
                            tasks.forEach(task => {
                                const phaseName = task.metadata?.phaseName || t('planGroup.generalTasks');
                                if (!phases[phaseName]) {
                                    phases[phaseName] = {
                                        name: phaseName,
                                        order: task.metadata?.phaseOrder ?? 999,
                                        startDate: task.metadata?.phaseStartDate,
                                        days: task.metadata?.phaseDays,
                                        tasks: []
                                    };
                                }
                                phases[phaseName].tasks.push(task);
                            });

                            // Sort phases by order
                            const sortedPhases = Object.values(phases).sort((a, b) => a.order - b.order);
                            const today = new Date().toISOString().split('T')[0];

                            return sortedPhases.map((phase, idx) => {
                                // Check if this phase is active (current date is within phase period)
                                const isActive = !phase.startDate || phase.startDate <= today;
                                const isFuture = phase.startDate && phase.startDate > today;

                                return (
                                    <div key={phase.name} className={`mb-3 ${isFuture ? 'opacity-50' : ''}`}>
                                        {/* Phase Header - only show if there are multiple phases */}
                                        {sortedPhases.length > 1 && (
                                            <div className="flex items-center gap-2 mb-2 px-1">
                                                <div className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${isActive ? 'bg-emerald-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                                                    {idx + 1}
                                                </div>
                                                <span className="text-xs font-bold text-gray-700">{localizeContent(phase.name, locale)}</span>
                                                {phase.days && (
                                                    <span className="text-[10px] text-gray-400">{t('planGroup.phaseDays', { n: phase.days })}</span>
                                                )}
                                                {isFuture && (
                                                    <span className="text-[10px] text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded">{t('planGroup.notStarted')}</span>
                                                )}
                                            </div>
                                        )}
                                        {/* Tasks in this phase */}
                                        {phase.tasks.map(task => (
                                            <TaskCard
                                                key={task.id}
                                                task={task}
                                                onClick={() => onTaskClick(task)}
                                                onUpdate={onUpdate}
                                            />
                                        ))}
                                    </div>
                                );
                            });
                        })()}
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
                        <h3 className="text-lg font-bold text-gray-800 mb-2">
                            {isExpertAssigned ? t('planGroup.confirmDeleteExpertTitle') : t('planGroup.confirmDeleteTitle')}
                        </h3>

                        {isExpertAssigned ? (
                            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-6 leading-relaxed">
                                <p className="font-bold mb-2">{t('planGroup.warning')}</p>
                                {t('planGroup.expertDeleteWarning')}
                            </div>
                        ) : (
                            <p className="text-gray-500 mb-6 text-sm">
                                {t('planGroup.deleteWarning')}
                            </p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
                            >
                                {isExpertAssigned ? t('planGroup.deleteAnyway') : t('planGroup.confirmDeleteButton')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default PlanGroup;
