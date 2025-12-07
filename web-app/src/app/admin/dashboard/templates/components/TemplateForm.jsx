"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Save, Plus, X, List, Hash, CheckSquare, Lock, GripVertical, Layers, ChevronDown, ChevronUp, Trash2, Edit2, BookOpen } from 'lucide-react';
import TaskFormModal from '@/components/TaskFormModal';
import HabitLibraryModal from './HabitLibraryModal';
import { generateId } from '@/lib/utils';

const CATEGORIES = [
    { value: 'health', label: '健康', color: '#10b981' },
    { value: 'fitness', label: '運動', color: '#f59e0b' },
    { value: 'nutrition', label: '營養', color: '#3b82f6' },
    { value: 'mental', label: '心理', color: '#8b5cf6' },
];

const TASK_TYPES = [
    { value: 'binary', label: '一般', icon: CheckSquare },
    { value: 'quantitative', label: '計量', icon: Hash },
    { value: 'checklist', label: '清單', icon: List },
];

// Default phase structure
const createDefaultPhase = (index = 0) => ({
    id: generateId(),
    name: `階段 ${index + 1}`,
    days: 7,
    tasks: []
});

export default function TemplateForm({ initialData, mode = 'create' }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: 'health',
        isPublic: false,
        startDateType: 'user_choice', // 'user_choice' or 'fixed_date'
        fixedStartDate: '', // Only used when startDateType === 'fixed_date'
        phases: [createDefaultPhase(0)] // New: array of phases
    });

    // Phase editing state
    const [editingPhaseId, setEditingPhaseId] = useState(null);
    const [expandedPhases, setExpandedPhases] = useState({});

    // Task Modal State
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTaskData, setEditingTaskData] = useState({ phaseId: null, taskIndex: null });

    // Library Modal State
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [libraryTargetPhaseId, setLibraryTargetPhaseId] = useState(null);
    const [libraryTargetPhaseOrder, setLibraryTargetPhaseOrder] = useState(0);

    const [isApproved, setIsApproved] = useState(false);

    useEffect(() => {
        // Safe localStorage access
        try {
            const expertData = JSON.parse(localStorage.getItem('admin_expert') || '{}');
            setIsApproved(!!expertData.isApproved);
        } catch (e) {
            console.error('Failed to parse admin_expert:', e);
        }

        if (initialData) {
            // Handle legacy format (flat tasks array) and new format (phases)
            let phases = [];
            if (initialData.tasks) {
                // Check if it's the new format (has phases property)
                if (initialData.tasks.version === '2.0' && initialData.tasks.phases) {
                    phases = initialData.tasks.phases;
                } else if (Array.isArray(initialData.tasks)) {
                    // Legacy: wrap flat tasks in a single phase
                    phases = [{
                        id: generateId(),
                        name: '主階段',
                        days: 30,
                        tasks: initialData.tasks
                    }];
                }
            }

            setFormData({
                name: initialData.name || '',
                description: initialData.description || '',
                category: initialData.category || 'health',
                isPublic: initialData.isPublic || false,
                startDateType: initialData.startDateType || 'user_choice',
                fixedStartDate: initialData.fixedStartDate || '',
                phases: phases.length > 0 ? phases : [createDefaultPhase(0)]
            });

            // Expand all phases by default
            const expanded = {};
            phases.forEach(p => { expanded[p.id] = true; });
            setExpandedPhases(expanded);
        }
    }, [initialData]);

    const handleSave = async () => {
        if (!formData.name.trim()) {
            alert('請輸入計畫名稱');
            return;
        }

        setLoading(true);
        try {
            const expertData = JSON.parse(localStorage.getItem('admin_expert') || '{}');

            const url = mode === 'edit'
                ? `/api/admin/templates/${initialData.id}`
                : '/api/admin/templates';

            const method = mode === 'edit' ? 'PUT' : 'POST';

            // Save in new format
            const saveData = {
                name: formData.name,
                description: formData.description,
                category: formData.category,
                isPublic: formData.isPublic,
                startDateType: formData.startDateType,
                fixedStartDate: formData.fixedStartDate || null,
                tasks: {
                    version: '2.0',
                    phases: formData.phases
                },
                expertId: expertData.id
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(saveData)
            });

            if (res.ok) {
                router.push('/admin/dashboard/templates');
                router.refresh();
            } else {
                const error = await res.json();
                alert(error.error || '儲存失敗');
            }
        } catch (error) {
            console.error('Save template error:', error);
            alert('儲存失敗');
        } finally {
            setLoading(false);
        }
    };

    // Phase Management
    const addPhase = () => {
        const newPhase = createDefaultPhase(formData.phases.length);
        setFormData(prev => ({
            ...prev,
            phases: [...prev.phases, newPhase]
        }));
        // Auto-expand new phase
        setExpandedPhases(prev => ({ ...prev, [newPhase.id]: true }));
    };

    const updatePhase = (phaseId, updates) => {
        setFormData(prev => ({
            ...prev,
            phases: prev.phases.map(p => p.id === phaseId ? { ...p, ...updates } : p)
        }));
    };

    const removePhase = (phaseId) => {
        if (formData.phases.length <= 1) {
            alert('計畫至少需要一個階段');
            return;
        }
        if (!confirm('確定要刪除此階段嗎？階段內的所有任務也會被刪除。')) return;
        setFormData(prev => ({
            ...prev,
            phases: prev.phases.filter(p => p.id !== phaseId)
        }));
    };

    const togglePhaseExpand = (phaseId) => {
        setExpandedPhases(prev => ({ ...prev, [phaseId]: !prev[phaseId] }));
    };

    // Task Management (within phases)
    const openNewTaskModal = (phaseId) => {
        setEditingTaskData({ phaseId, taskIndex: null });
        setIsTaskModalOpen(true);
    };

    const openEditTaskModal = (phaseId, taskIndex) => {
        setEditingTaskData({ phaseId, taskIndex });
        setIsTaskModalOpen(true);
    };

    const handleTaskSave = (taskData) => {
        const { phaseId, taskIndex } = editingTaskData;

        setFormData(prev => ({
            ...prev,
            phases: prev.phases.map(phase => {
                if (phase.id !== phaseId) return phase;

                let newTasks;
                if (taskIndex !== null) {
                    // Update existing task
                    newTasks = [...phase.tasks];
                    newTasks[taskIndex] = { ...taskData, id: newTasks[taskIndex].id };
                } else {
                    // Add new task
                    newTasks = [...phase.tasks, { ...taskData, id: generateId() }];
                }

                return { ...phase, tasks: newTasks };
            })
        }));

        setIsTaskModalOpen(false);
    };

    const handleTaskDelete = (phaseId, taskIndex) => {
        if (!confirm('確定要移除此任務嗎？')) return;

        setFormData(prev => ({
            ...prev,
            phases: prev.phases.map(phase => {
                if (phase.id !== phaseId) return phase;
                return {
                    ...phase,
                    tasks: phase.tasks.filter((_, i) => i !== taskIndex)
                };
            })
        }));
    };

    // Library Import
    const openLibraryModal = (phaseId, phaseOrder) => {
        setLibraryTargetPhaseId(phaseId);
        setLibraryTargetPhaseOrder(phaseOrder);
        setIsLibraryOpen(true);
    };

    const handleLibraryImport = (tasks) => {
        if (!libraryTargetPhaseId) return;

        setFormData(prev => ({
            ...prev,
            phases: prev.phases.map(phase => {
                if (phase.id !== libraryTargetPhaseId) return phase;
                return {
                    ...phase,
                    tasks: [...phase.tasks, ...tasks]
                };
            })
        }));
        setIsLibraryOpen(false);
    };

    const totalTasks = formData.phases.reduce((sum, p) => sum + p.tasks.length, 0);

    return (
        <div className="max-w-5xl mx-auto admin-animate-in pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <div>
                        <h1 className="admin-title">{mode === 'edit' ? '編輯計畫' : '建立新計畫'}</h1>
                        <p className="admin-subtitle">{mode === 'edit' ? '修改現有的習慣計畫內容' : '設定新的習慣計畫、階段與任務'}</p>
                    </div>
                </div>
                <button
                    className="admin-btn admin-btn-primary"
                    onClick={handleSave}
                    disabled={loading}
                >
                    <Save size={18} /> {loading ? '儲存中...' : '儲存計畫'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Basic Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="admin-card">
                        <h3 className="admin-card-title">基本資訊</h3>

                        <div className="admin-form-group">
                            <label className="admin-label">計畫名稱</label>
                            <input
                                type="text"
                                className="admin-input"
                                placeholder="例如：減重 30 天計畫"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>

                        <div className="admin-form-group">
                            <label className="admin-label">分類</label>
                            <select
                                className="admin-input admin-select"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                            >
                                {CATEGORIES.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="admin-form-group">
                            <label className="admin-label">描述</label>
                            <textarea
                                className="admin-input admin-textarea"
                                placeholder="計畫的詳細說明..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                style={{ minHeight: '100px' }}
                            />
                        </div>

                        <div className="admin-form-group">
                            <label className="admin-label">公開設定</label>
                            {isApproved ? (
                                <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={formData.isPublic}
                                        onChange={e => setFormData({ ...formData, isPublic: e.target.checked })}
                                        className="w-5 h-5 rounded border-gray-600/50 bg-transparent text-emerald-500 focus:ring-emerald-500"
                                    />
                                    <span className="text-sm text-gray-300">允許所有用戶選用</span>
                                </label>
                            ) : (
                                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                    <div className="flex items-center gap-2 text-amber-500 text-sm font-bold mb-1">
                                        <Lock size={16} />
                                        尚未開通公開權限
                                    </div>
                                    <p className="text-xs text-gray-400">請聯繫管理員開通。</p>
                                </div>
                            )}
                        </div>

                        {/* Start Date Setting */}
                        <div className="admin-form-group">
                            <label className="admin-label">開始日期設定</label>
                            <div className="space-y-2">
                                <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                                    <input
                                        type="radio"
                                        name="startDateType"
                                        value="user_choice"
                                        checked={formData.startDateType === 'user_choice'}
                                        onChange={e => setFormData({ ...formData, startDateType: e.target.value })}
                                        className="w-4 h-4 text-emerald-500 focus:ring-emerald-500"
                                    />
                                    <div>
                                        <span className="text-sm text-gray-300">用戶自選開始日</span>
                                        <p className="text-xs text-gray-500">用戶加入時可選:今天/明天/指定日期</p>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                                    <input
                                        type="radio"
                                        name="startDateType"
                                        value="fixed_date"
                                        checked={formData.startDateType === 'fixed_date'}
                                        onChange={e => setFormData({ ...formData, startDateType: e.target.value })}
                                        className="w-4 h-4 text-emerald-500 focus:ring-emerald-500"
                                    />
                                    <span className="text-sm text-gray-300">指定固定日期</span>
                                </label>
                                {formData.startDateType === 'fixed_date' && (
                                    <input
                                        type="date"
                                        className="admin-input mt-2"
                                        value={formData.fixedStartDate}
                                        onChange={e => setFormData({ ...formData, fixedStartDate: e.target.value })}
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="admin-card">
                        <h3 className="admin-card-title">計畫統計</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white/5 p-3 rounded-lg text-center">
                                <p className="text-2xl font-bold text-emerald-500">{formData.phases.length}</p>
                                <p className="text-xs text-gray-500">階段</p>
                            </div>
                            <div className="bg-white/5 p-3 rounded-lg text-center">
                                <p className="text-2xl font-bold text-blue-500">{totalTasks}</p>
                                <p className="text-xs text-gray-500">任務</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Phases & Tasks */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Layers size={20} className="text-emerald-500" />
                            階段與任務
                        </h3>
                        <button
                            onClick={addPhase}
                            className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                        >
                            <Plus size={16} /> 新增階段
                        </button>
                    </div>

                    {formData.phases.map((phase, phaseIndex) => (
                        <div key={phase.id} className="admin-card !p-0 overflow-hidden">
                            {/* Phase Header */}
                            <div
                                className="flex items-center justify-between p-4 bg-white/5 border-b border-white/10 cursor-pointer"
                                onClick={() => togglePhaseExpand(phase.id)}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
                                        {phaseIndex + 1}
                                    </div>
                                    {editingPhaseId === phase.id ? (
                                        <input
                                            className="admin-input py-1 px-2 w-40"
                                            value={phase.name}
                                            onChange={e => updatePhase(phase.id, { name: e.target.value })}
                                            onBlur={() => setEditingPhaseId(null)}
                                            onKeyDown={e => e.key === 'Enter' && setEditingPhaseId(null)}
                                            onClick={e => e.stopPropagation()}
                                            autoFocus
                                        />
                                    ) : (
                                        <div>
                                            <span className="font-medium text-white">{phase.name}</span>
                                            <span className="text-xs text-gray-500 ml-2">({phase.tasks.length} 任務)</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1 mr-2" onClick={e => e.stopPropagation()}>
                                        <span className="text-xs text-gray-500">持續</span>
                                        <input
                                            type="number"
                                            className="w-12 bg-white/10 border border-white/10 rounded px-2 py-1 text-sm text-white text-center"
                                            value={phase.days}
                                            onChange={e => updatePhase(phase.id, { days: e.target.value === '' ? '' : (parseInt(e.target.value) || 1) })}
                                            onBlur={e => { if (e.target.value === '' || parseInt(e.target.value) < 1) updatePhase(phase.id, { days: 1 }); }}
                                            onFocus={e => e.target.select()}
                                            min={1}
                                        />
                                        <span className="text-xs text-gray-500">天</span>
                                    </div>
                                    <button
                                        onClick={e => { e.stopPropagation(); setEditingPhaseId(phase.id); }}
                                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                    <button
                                        onClick={e => { e.stopPropagation(); removePhase(phase.id); }}
                                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                    {expandedPhases[phase.id] ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                                </div>
                            </div>

                            {/* Phase Content (Tasks) */}
                            {expandedPhases[phase.id] && (
                                <div className="p-4 space-y-3">
                                    {phase.tasks.length === 0 ? (
                                        <div className="text-center py-8 border border-dashed border-white/10 rounded-xl">
                                            <p className="text-sm text-gray-500 mb-4">此階段尚無任務</p>
                                            <div className="flex items-center justify-center gap-4">
                                                <button
                                                    onClick={() => openNewTaskModal(phase.id)}
                                                    className="px-3 py-2 text-sm bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg flex items-center gap-2 transition-colors"
                                                >
                                                    <Plus size={14} /> 手動新增
                                                </button>
                                                <button
                                                    onClick={() => openLibraryModal(phase.id, phaseIndex)}
                                                    className="px-3 py-2 text-sm bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg flex items-center gap-2 transition-colors"
                                                >
                                                    <BookOpen size={14} /> 從習慣庫匯入
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            {phase.tasks.map((task, taskIndex) => (
                                                <div
                                                    key={task.id || taskIndex}
                                                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:border-emerald-500/30 transition-colors cursor-pointer group"
                                                    onClick={() => openEditTaskModal(phase.id, taskIndex)}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                                                            {(() => {
                                                                const iconConfig = TASK_TYPES.find(t => t.value === task.type);
                                                                const IconComponent = iconConfig ? iconConfig.icon : CheckSquare;
                                                                return <IconComponent size={16} />;
                                                            })()}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-white">{task.title}</p>
                                                            <p className="text-xs text-gray-500">
                                                                {TASK_TYPES.find(t => t.value === task.type)?.label}
                                                                {task.type === 'quantitative' && task.dailyTarget && ` • ${task.dailyTarget}${task.unit || '次'}/天`}
                                                                {task.recurrence?.type && task.recurrence.type !== 'daily' && ` • ${task.recurrence.type === 'weekly' ? '每週' : '每月'}`}
                                                                {task.recurrence?.weekMode === 'flexible' && task.recurrence?.periodTarget && ` ${task.recurrence.periodTarget}次`}
                                                                {task.recurrence?.weekMode !== 'flexible' && task.recurrence?.weekDays?.length > 0 && ` (${task.recurrence.weekDays.map(d => ['日', '一', '二', '三', '四', '五', '六'][d]).join(',')})`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleTaskDelete(phase.id, taskIndex); }}
                                                        className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            ))}

                                            <div className="flex items-center justify-center gap-4 pt-2">
                                                <button
                                                    onClick={() => openNewTaskModal(phase.id)}
                                                    className="py-2 text-sm text-gray-500 hover:text-emerald-500 flex items-center justify-center gap-1 transition-colors"
                                                >
                                                    <Plus size={14} /> 新增任務
                                                </button>
                                                <button
                                                    onClick={() => openLibraryModal(phase.id, phaseIndex)}
                                                    className="py-2 text-sm text-gray-500 hover:text-blue-500 flex items-center justify-center gap-1 transition-colors"
                                                >
                                                    <BookOpen size={14} /> 從習慣庫匯入
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Task Modal */}
            <TaskFormModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                onSave={handleTaskSave}
                onDelete={() => {
                    handleTaskDelete(editingTaskData.phaseId, editingTaskData.taskIndex);
                    setIsTaskModalOpen(false);
                }}
                initialData={
                    editingTaskData.phaseId && editingTaskData.taskIndex !== null
                        ? formData.phases.find(p => p.id === editingTaskData.phaseId)?.tasks[editingTaskData.taskIndex]
                        : null
                }
                templateMode={true}
            />

            {/* Habit Library Modal */}
            <HabitLibraryModal
                isOpen={isLibraryOpen}
                onClose={() => setIsLibraryOpen(false)}
                onSelect={handleLibraryImport}
                phaseOrder={libraryTargetPhaseOrder}
            />
        </div>
    );
}
