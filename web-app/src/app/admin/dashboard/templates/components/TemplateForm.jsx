"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Save, Plus, X, List, Hash, CheckSquare } from 'lucide-react';

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

    const [newTask, setNewTask] = useState({
        title: '',
        type: 'binary',
        category: 'star',
        frequency: 'daily',
        dailyTarget: 1,
        unit: '次',
        stepValue: 1
    });

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

    const addTaskToTemplate = () => {
        if (!newTask.title.trim()) {
            alert('請輸入任務名稱');
            return;
        }

        const taskToAdd = {
            ...newTask,
            id: Date.now().toString(),
            recurrence: {
                type: 'daily',
                interval: 1,
                endType: 'never',
                weekDays: [],
                monthType: 'date',
                periodTarget: 1,
                dailyLimit: true
            }
        };

        setFormData(prev => ({
            ...prev,
            tasks: [...prev.tasks, taskToAdd]
        }));

        setNewTask({ title: '', type: 'binary', category: 'star', frequency: 'daily', dailyTarget: 1, unit: '次', stepValue: 1 });
    };

    const removeTaskFromTemplate = (index) => {
        if (!confirm('確定要移除此任務嗎？')) return;
        setFormData(prev => ({
            ...prev,
            tasks: prev.tasks.filter((_, i) => i !== index)
        }));
    };

    return (
        <div className="max-w-4xl mx-auto admin-animate-in">
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
                        <h3 className="admin-card-title flex justify-between items-center">
                            <span>包含任務 ({formData.tasks.length})</span>
                        </h3>

                        <div className="space-y-4 mb-8">
                            {formData.tasks.length === 0 ? (
                                <div className="text-center py-12 bg-white/5 rounded-xl border border-dashed border-white/10">
                                    <p className="text-gray-500 text-sm">此模板尚未加入任何任務</p>
                                </div>
                            ) : (
                                formData.tasks.map((task, index) => (
                                    <div key={task.id || index} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 hover:border-emerald-500/50 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                                                {React.createElement(TASK_TYPES.find(t => t.value === task.type)?.icon || CheckSquare, { size: 20 })}
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-white">{task.title}</h4>
                                                <span className="text-xs text-gray-500">
                                                    {TASK_TYPES.find(t => t.value === task.type)?.label}
                                                    {task.type === 'quantitative' && ` • 目標: ${task.dailyTarget}${task.unit}`}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => removeTaskFromTemplate(index)}
                                            className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Add Task Form */}
                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-6">
                            <h4 className="text-sm font-bold text-emerald-500 mb-4 uppercase tracking-wider">新增任務</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="admin-form-group text-left" style={{ textAlign: 'left' }}>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">任務名稱</label>
                                    <input
                                        type="text"
                                        className="admin-input"
                                        placeholder="例如：喝水"
                                        value={newTask.title}
                                        onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                    />
                                </div>
                                <div className="admin-form-group" style={{ textAlign: 'left' }}>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">類型</label>
                                    <select
                                        className="admin-input admin-select"
                                        value={newTask.type}
                                        onChange={e => setNewTask({ ...newTask, type: e.target.value })}
                                    >
                                        {TASK_TYPES.map(type => (
                                            <option key={type.value} value={type.value}>{type.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {newTask.type === 'quantitative' && (
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    <div style={{ textAlign: 'left' }}>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">目標數值</label>
                                        <input
                                            type="number"
                                            className="admin-input"
                                            value={newTask.dailyTarget}
                                            onChange={e => setNewTask({ ...newTask, dailyTarget: parseInt(e.target.value) || 0 })}
                                        />
                                    </div>
                                    <div style={{ textAlign: 'left' }}>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">單位</label>
                                        <input
                                            type="text"
                                            className="admin-input"
                                            value={newTask.unit}
                                            onChange={e => setNewTask({ ...newTask, unit: e.target.value })}
                                        />
                                    </div>
                                    <div style={{ textAlign: 'left' }}>
                                        <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">每次增量</label>
                                        <input
                                            type="number"
                                            className="admin-input"
                                            value={newTask.stepValue}
                                            onChange={e => setNewTask({ ...newTask, stepValue: parseInt(e.target.value) || 1 })}
                                        />
                                    </div>
                                </div>
                            )}

                            <button className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2" onClick={addTaskToTemplate}>
                                <Plus size={20} /> 加入任務到列表
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
