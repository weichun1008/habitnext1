"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Save, Plus, X, List, Hash, CheckSquare } from 'lucide-react';
import TaskFormModal from '@/components/TaskFormModal';
import { generateId } from '@/lib/utils';

const CATEGORIES = [
    { value: 'health', label: '健康', color: '#10b981' },
    { value: 'fitness', label: '運動', color: '#f59e0b' },
    { value: 'nutrition', label: '營養', color: '#3b82f6' },
    { value: 'mental', label: '心理', color: '#8b5cf6' },
];

const TASK_TYPES = [
    { value: 'binary', label: '一般 (達成/未達成)', icon: CheckSquare },
    { value: 'quantitative', label: '計量 (步數/cc)', icon: Hash },
    { value: 'checklist', label: '清單 (子任務)', icon: List },
];

export default function TemplateForm({ initialData, mode = 'create' }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: 'health',
        isPublic: false,
        tasks: []
    });

    // Modal State
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTaskIndex, setEditingTaskIndex] = useState(null);

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                description: initialData.description || '',
                category: initialData.category || 'health',
                isPublic: initialData.isPublic || false,
                tasks: initialData.tasks || []
            });
        }
    }, [initialData]);

    const handleSave = async () => {
        if (!formData.name.trim()) {
            alert('請輸入模板名稱');
            return;
        }

        setLoading(true);
        try {
            const expertData = JSON.parse(localStorage.getItem('admin_expert') || '{}');

            const url = mode === 'edit'
                ? `/api/admin/templates/${initialData.id}`
                : '/api/admin/templates';

            const method = mode === 'edit' ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    expertId: expertData.id
                })
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

    // Open Modal for New Task
    const openNewTaskModal = () => {
        setEditingTaskIndex(null);
        setIsTaskModalOpen(true);
    };

    // Open Modal to Edit Task
    const openEditTaskModal = (index) => {
        setEditingTaskIndex(index);
        setIsTaskModalOpen(true);
    };

    // Handle Save from Modal
    const handleTaskSave = (taskData) => {
        if (editingTaskIndex !== null) {
            // Update
            const newTasks = [...formData.tasks];
            newTasks[editingTaskIndex] = { ...taskData, id: newTasks[editingTaskIndex].id }; // Keep ID
            setFormData({ ...formData, tasks: newTasks });
        } else {
            // Create
            const newTask = { ...taskData, id: Date.now().toString() };
            setFormData(prev => ({ ...prev, tasks: [...prev.tasks, newTask] }));
        }
        setIsTaskModalOpen(false);
    };

    // Handle Delete from Modal (or List)
    const handleTaskDelete = (taskId) => {
        // Since TaskFormModal passes ID, but we work with index sometimes, let's just filter
        // If passed from modal, taskId is valid. If from list, we might pass index.
        // Actually simplest is to filter by filtered ID logic if we have IDs.
        // Our tasks have IDs.
        setFormData(prev => ({
            ...prev,
            tasks: prev.tasks.filter(t => t.id !== taskId)
        }));
        setIsTaskModalOpen(false);
    };

    // Remove task directly from list
    const removeTaskFromList = (index) => {
        if (!confirm('確定要移除此任務嗎？')) return;
        setFormData(prev => ({
            ...prev,
            tasks: prev.tasks.filter((_, i) => i !== index)
        }));
    }

    return (
        <div className="max-w-4xl mx-auto admin-animate-in pb-20">
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
                        <h1 className="admin-title">{mode === 'edit' ? '編輯模板' : '建立新模板'}</h1>
                        <p className="admin-subtitle">{mode === 'edit' ? '修改現有的習慣模板內容' : '設定新的習慣模板與任務組合'}</p>
                    </div>
                </div>
                <button
                    className="admin-btn admin-btn-primary"
                    onClick={handleSave}
                    disabled={loading}
                >
                    <Save size={18} /> {loading ? '儲存中...' : '儲存模板'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Basic Info */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="admin-card">
                        <h3 className="admin-card-title">基本資訊</h3>

                        <div className="admin-form-group">
                            <label className="admin-label">模板名稱</label>
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
                                placeholder="模板的詳細說明..."
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                style={{ minHeight: '120px' }}
                            />
                        </div>

                        <div className="admin-form-group">
                            <label className="admin-label">公開設定</label>
                            <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={formData.isPublic}
                                    onChange={e => setFormData({ ...formData, isPublic: e.target.checked })}
                                    className="w-5 h-5 rounded border-gray-600/50 bg-transparent text-emerald-500 focus:ring-emerald-500"
                                />
                                <span className="text-sm text-gray-300">允許所有用戶選用</span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Right Column: Tasks */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="admin-card">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="admin-card-title m-0">包含任務 ({formData.tasks.length})</h3>
                            <button
                                onClick={openNewTaskModal}
                                className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-lg text-sm font-bold transition-all flex items-center gap-2"
                            >
                                <Plus size={16} /> 新增任務
                            </button>
                        </div>

                        <div className="space-y-4">
                            {formData.tasks.length === 0 ? (
                                <div className="text-center py-12 bg-white/5 rounded-xl border border-dashed border-white/10 cursor-pointer hover:border-emerald-500/50 transition-colors" onClick={openNewTaskModal}>
                                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-3">
                                        <Plus size={24} />
                                    </div>
                                    <p className="text-gray-400 font-medium">尚未加入任何任務</p>
                                    <p className="text-gray-600 text-xs mt-1">點擊此處開始建立</p>
                                </div>
                            ) : (
                                formData.tasks.map((task, index) => (
                                    <div
                                        key={task.id || index}
                                        className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:border-emerald-500/50 transition-colors cursor-pointer group"
                                        onClick={() => openEditTaskModal(index)}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                                {React.createElement(TASK_TYPES.find(t => t.value === task.type)?.icon || CheckSquare, { size: 20 })}
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-white group-hover:text-emerald-400 transition-colors">{task.title}</h4>
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <span>{TASK_TYPES.find(t => t.value === task.type)?.label}</span>
                                                    {task.recurrence?.type !== 'daily' && (
                                                        <span className="bg-white/10 px-1.5 py-0.5 rounded text-gray-400">
                                                            {task.recurrence?.type === 'weekly' ? '每週' : task.recurrence?.type === 'monthly' ? '每月' : '單次'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeTaskFromList(index); }}
                                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Reuse User Task Modal for Admin */}
            <TaskFormModal
                isOpen={isTaskModalOpen}
                onClose={() => setIsTaskModalOpen(false)}
                onSave={handleTaskSave}
                onDelete={(id) => handleTaskDelete(id)}
                initialData={editingTaskIndex !== null ? formData.tasks[editingTaskIndex] : null}
            />
        </div>
    );
}
