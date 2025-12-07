"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Archive, RotateCcw, X, Save, Dumbbell, Droplets, Brain, Heart, Apple, Footprints } from 'lucide-react';

const CATEGORIES = [
    { value: 'health', label: '健康', color: 'emerald' },
    { value: 'fitness', label: '運動', color: 'orange' },
    { value: 'nutrition', label: '營養', color: 'blue' },
    { value: 'mental', label: '心理', color: 'purple' },
];

const DIFFICULTIES = [
    { value: 'EASY', label: '簡單', color: 'emerald' },
    { value: 'MEDIUM', label: '中等', color: 'amber' },
    { value: 'HARD', label: '挑戰', color: 'red' },
];

const TASK_TYPES = [
    { value: 'binary', label: '一般' },
    { value: 'quantitative', label: '計量' },
    { value: 'checklist', label: '清單' },
];

const FREQUENCIES = [
    { value: 'daily', label: '每天' },
    { value: 'weekly', label: '每週幾次' },
    { value: 'monthly', label: '每月幾次' },
];

const defaultFormData = {
    title: '',
    description: '',
    category: 'health',
    difficulty: 'EASY',
    icon: '🏃',
    taskType: 'binary',
    defaultConfig: {
        frequency: 'daily',
        periodTarget: 1,
        dailyTarget: 1,
        unit: '次',
        stepValue: 1
    }
};

export default function HabitsPage() {
    const [habits, setHabits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterDifficulty, setFilterDifficulty] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHabit, setEditingHabit] = useState(null);
    const [formData, setFormData] = useState(defaultFormData);

    useEffect(() => {
        fetchHabits();
    }, []);

    const fetchHabits = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/habits');
            if (res.ok) {
                const data = await res.json();
                setHabits(data);
            }
        } catch (error) {
            console.error('Failed to fetch habits', error);
        } finally {
            setLoading(false);
        }
    };

    const openAddModal = () => {
        setEditingHabit(null);
        setFormData(defaultFormData);
        setIsModalOpen(true);
    };

    const openEditModal = (habit) => {
        setEditingHabit(habit);
        setFormData({
            title: habit.title,
            description: habit.description || '',
            category: habit.category,
            difficulty: habit.difficulty,
            icon: habit.icon || '🏃',
            taskType: habit.taskType,
            defaultConfig: {
                frequency: 'daily',
                periodTarget: 1,
                dailyTarget: 1,
                unit: '次',
                stepValue: 1,
                ...(habit.defaultConfig || {})
            }
        });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        if (!formData.title.trim()) {
            alert('請輸入習慣名稱');
            return;
        }

        try {
            const url = editingHabit ? `/api/admin/habits/${editingHabit.id}` : '/api/admin/habits';
            const method = editingHabit ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchHabits();
            } else {
                const data = await res.json();
                alert(data.error || '儲存失敗');
            }
        } catch (error) {
            console.error(error);
            alert('儲存錯誤');
        }
    };

    const handleToggleActive = async (habit) => {
        try {
            await fetch(`/api/admin/habits/${habit.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !habit.isActive })
            });
            fetchHabits();
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (habit) => {
        if (!confirm(`確定要刪除「${habit.title}」嗎？`)) return;
        try {
            await fetch(`/api/admin/habits/${habit.id}`, { method: 'DELETE' });
            fetchHabits();
        } catch (error) {
            console.error(error);
        }
    };

    const filteredHabits = habits.filter(h => {
        const matchSearch = h.title.toLowerCase().includes(search.toLowerCase());
        const matchCategory = !filterCategory || h.category === filterCategory;
        const matchDifficulty = !filterDifficulty || h.difficulty === filterDifficulty;
        return matchSearch && matchCategory && matchDifficulty;
    });

    const getCategoryColor = (cat) => CATEGORIES.find(c => c.value === cat)?.color || 'gray';
    const getDifficultyColor = (diff) => DIFFICULTIES.find(d => d.value === diff)?.color || 'gray';

    return (
        <div className="max-w-7xl mx-auto admin-animate-in">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="admin-title">官方習慣庫</h1>
                    <p className="admin-subtitle">管理可被加入計畫的習慣模組</p>
                </div>
                <button onClick={openAddModal} className="admin-btn admin-btn-primary">
                    <Plus size={18} /> 新增習慣
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-4 mb-6">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        className="admin-input pl-10"
                        placeholder="搜尋習慣..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <select
                    className="admin-input w-auto"
                    value={filterCategory}
                    onChange={e => setFilterCategory(e.target.value)}
                >
                    <option value="">所有分類</option>
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <select
                    className="admin-input w-auto"
                    value={filterDifficulty}
                    onChange={e => setFilterDifficulty(e.target.value)}
                >
                    <option value="">所有難度</option>
                    {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="admin-card text-center">
                    <p className="text-2xl font-bold text-white">{habits.length}</p>
                    <p className="text-xs text-gray-500">總習慣數</p>
                </div>
                {DIFFICULTIES.map(d => (
                    <div key={d.value} className="admin-card text-center">
                        <p className={`text-2xl font-bold text-${d.color}-500`}>
                            {habits.filter(h => h.difficulty === d.value).length}
                        </p>
                        <p className="text-xs text-gray-500">{d.label}</p>
                    </div>
                ))}
            </div>

            {/* Habits Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <p className="text-gray-500 col-span-full text-center py-12">載入中...</p>
                ) : filteredHabits.length === 0 ? (
                    <p className="text-gray-500 col-span-full text-center py-12">沒有找到習慣</p>
                ) : (
                    filteredHabits.map(habit => (
                        <div
                            key={habit.id}
                            className={`admin-card !p-4 relative group ${!habit.isActive ? 'opacity-50' : ''}`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="text-3xl">{habit.icon || '🎯'}</div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-white truncate">{habit.title}</h4>
                                    <p className="text-xs text-gray-500 line-clamp-2">{habit.description}</p>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className={`text-xs px-2 py-0.5 rounded-full bg-${getCategoryColor(habit.category)}-500/10 text-${getCategoryColor(habit.category)}-500`}>
                                            {CATEGORIES.find(c => c.value === habit.category)?.label}
                                        </span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full bg-${getDifficultyColor(habit.difficulty)}-500/10 text-${getDifficultyColor(habit.difficulty)}-500`}>
                                            {DIFFICULTIES.find(d => d.value === habit.difficulty)?.label}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEditModal(habit)} className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded">
                                    <Edit2 size={14} />
                                </button>
                                <button onClick={() => handleToggleActive(habit)} className="p-1.5 text-gray-400 hover:text-amber-400 hover:bg-amber-400/10 rounded">
                                    {habit.isActive ? <Archive size={14} /> : <RotateCcw size={14} />}
                                </button>
                                <button onClick={() => handleDelete(habit)} className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
                    <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl animate-fade-in-up">
                        <div className="flex justify-between items-center p-4 border-b border-gray-800">
                            <h3 className="text-lg font-bold text-white">{editingHabit ? '編輯習慣' : '新增習慣'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div className="grid grid-cols-[60px_1fr] gap-4 items-start">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2">圖示</label>
                                    <input
                                        className="w-14 h-14 text-3xl text-center bg-white/5 border border-white/10 rounded-xl focus:border-emerald-500 outline-none"
                                        value={formData.icon}
                                        onChange={e => setFormData({ ...formData, icon: e.target.value })}
                                        maxLength={2}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2">習慣名稱</label>
                                    <input
                                        className="admin-input"
                                        placeholder="例如：每日喝水 2000cc"
                                        value={formData.title}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2">描述</label>
                                <textarea
                                    className="admin-input admin-textarea"
                                    placeholder="習慣說明..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    rows={2}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2">分類</label>
                                    <select
                                        className="admin-input"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2">難度</label>
                                    <select
                                        className="admin-input"
                                        value={formData.difficulty}
                                        onChange={e => setFormData({ ...formData, difficulty: e.target.value })}
                                    >
                                        {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2">任務類型</label>
                                <div className="flex gap-2">
                                    {TASK_TYPES.map(t => (
                                        <button
                                            key={t.value}
                                            onClick={() => setFormData({ ...formData, taskType: t.value })}
                                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${formData.taskType === t.value ? 'bg-emerald-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Frequency Settings */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2">執行頻率</label>
                                <div className="flex gap-2">
                                    {FREQUENCIES.map(f => (
                                        <button
                                            key={f.value}
                                            onClick={() => setFormData({
                                                ...formData,
                                                defaultConfig: { ...formData.defaultConfig, frequency: f.value }
                                            })}
                                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${formData.defaultConfig.frequency === f.value ? 'bg-blue-500 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                                        >
                                            {f.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Period Target (for weekly/monthly) */}
                            {formData.defaultConfig.frequency !== 'daily' && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2">
                                        {formData.defaultConfig.frequency === 'weekly' ? '每週目標次數' : '每月目標次數'}
                                    </label>
                                    <input
                                        type="number"
                                        min={1}
                                        className="admin-input w-24"
                                        value={formData.defaultConfig.periodTarget}
                                        onChange={e => setFormData({
                                            ...formData,
                                            defaultConfig: { ...formData.defaultConfig, periodTarget: parseInt(e.target.value) || 1 }
                                        })}
                                    />
                                    <span className="text-gray-500 text-sm ml-2">次</span>
                                </div>
                            )}

                            {/* Quantitative Settings */}
                            {formData.taskType === 'quantitative' && (
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-2">每日目標</label>
                                        <input
                                            type="number"
                                            min={1}
                                            className="admin-input"
                                            value={formData.defaultConfig.dailyTarget}
                                            onChange={e => setFormData({
                                                ...formData,
                                                defaultConfig: { ...formData.defaultConfig, dailyTarget: parseInt(e.target.value) || 1 }
                                            })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-2">單位</label>
                                        <input
                                            type="text"
                                            className="admin-input"
                                            placeholder="cc"
                                            value={formData.defaultConfig.unit}
                                            onChange={e => setFormData({
                                                ...formData,
                                                defaultConfig: { ...formData.defaultConfig, unit: e.target.value }
                                            })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 mb-2">每次增減</label>
                                        <input
                                            type="number"
                                            min={1}
                                            className="admin-input"
                                            value={formData.defaultConfig.stepValue}
                                            onChange={e => setFormData({
                                                ...formData,
                                                defaultConfig: { ...formData.defaultConfig, stepValue: parseInt(e.target.value) || 1 }
                                            })}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4">
                                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-sm bg-gray-800 text-gray-300 hover:bg-gray-700">
                                    取消
                                </button>
                                <button onClick={handleSave} className="px-4 py-2 rounded-lg text-sm bg-emerald-600 text-white hover:bg-emerald-500 flex items-center gap-2">
                                    <Save size={16} /> 儲存
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
