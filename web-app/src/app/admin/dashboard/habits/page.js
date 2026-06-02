"use client";

import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit2, Trash2, Archive, RotateCcw, X, Save, Settings, FolderOpen, Link, BookOpen } from 'lucide-react';
import IconRenderer from '@/components/IconRenderer';
import { CATEGORY_CONFIG, domainToIconKey } from '@/lib/constants';
import { LIFE_MOMENTS_GROUPED } from '@/lib/anchors';
import HabitInsightsModal from './components/HabitInsightsModal';

const TASK_TYPES = [
    { value: 'binary', label: '一般' },
    { value: 'quantitative', label: '計量' },
    { value: 'checklist', label: '清單' },
];

const DIFFICULTY_TABS = [
    { key: 'beginner', label: '入門', color: 'emerald' },
    { key: 'intermediate', label: '進階', color: 'amber' },
    { key: 'challenge', label: '挑戰', color: 'red' },
];

const defaultDifficultyConfig = {
    enabled: false,
    label: '',
    type: 'binary',
    dailyTarget: 1,
    unit: '次',
    stepValue: 1,
    subtasks: [],
    recurrence: {
        type: 'daily',
        interval: 1,
        endType: 'never',
        weekDays: [],
        periodTarget: 1
    }
};

const defaultFormData = {
    name: '',
    description: '',
    category: '',
    icon: 'star',
    defaultCue: '',
    difficulties: {
        beginner: { ...defaultDifficultyConfig },
        intermediate: { ...defaultDifficultyConfig },
        challenge: { ...defaultDifficultyConfig }
    }
};

export default function HabitsPage() {
    const [habits, setHabits] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingHabit, setEditingHabit] = useState(null);
    // Slice N — admin insights manager modal (separate from the habit edit modal).
    const [insightsHabit, setInsightsHabit] = useState(null);
    const [formData, setFormData] = useState(defaultFormData);
    const [activeDiffTab, setActiveDiffTab] = useState('beginner');

    useEffect(() => {
        fetchHabits();
        fetchCategories();
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

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/admin/categories');
            if (res.ok) {
                const data = await res.json();
                setCategories(data);
            }
        } catch (error) {
            console.error('Failed to fetch categories', error);
        }
    };

    const openAddModal = () => {
        setEditingHabit(null);
        setFormData({
            ...defaultFormData,
            difficulties: {
                beginner: { ...defaultDifficultyConfig, enabled: true, label: '入門版' },
                intermediate: { ...defaultDifficultyConfig },
                challenge: { ...defaultDifficultyConfig }
            }
        });
        setActiveDiffTab('beginner');
        setIsModalOpen(true);
    };

    const openEditModal = (habit) => {
        setEditingHabit(habit);
        const difficulties = habit.difficulties || {};
        setFormData({
            name: habit.name || '',
            description: habit.description || '',
            category: habit.category || '',
            icon: habit.icon || domainToIconKey(habit.category),
            defaultCue: habit.defaultCue || '',
            difficulties: {
                beginner: { ...defaultDifficultyConfig, ...difficulties.beginner },
                intermediate: { ...defaultDifficultyConfig, ...difficulties.intermediate },
                challenge: { ...defaultDifficultyConfig, ...difficulties.challenge }
            }
        });
        // Set active tab to first enabled difficulty
        const firstEnabled = DIFFICULTY_TABS.find(t => difficulties[t.key]?.enabled)?.key || 'beginner';
        setActiveDiffTab(firstEnabled);
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        const hasEnabled = DIFFICULTY_TABS.some(t => formData.difficulties[t.key]?.enabled);
        if (!hasEnabled) {
            alert('請至少啟用一個難度等級');
            return;
        }
        if (!formData.name.trim()) {
            alert('請輸入習慣名稱');
            return;
        }

        try {
            const url = editingHabit
                ? `/api/admin/habits/${editingHabit.id}`
                : '/api/admin/habits';

            const res = await fetch(url, {
                method: editingHabit ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                setIsModalOpen(false);
                fetchHabits();
            } else {
                const error = await res.json();
                alert(error.error || '儲存失敗');
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('儲存失敗');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('確定要刪除這個習慣嗎？')) return;

        try {
            const res = await fetch(`/api/admin/habits/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchHabits();
            }
        } catch (error) {
            console.error('Delete error:', error);
        }
    };

    const toggleActive = async (habit) => {
        try {
            await fetch(`/api/admin/habits/${habit.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !habit.isActive })
            });
            fetchHabits();
        } catch (error) {
            console.error('Toggle active error:', error);
        }
    };

    const updateDifficulty = (key, field, value) => {
        setFormData(prev => ({
            ...prev,
            difficulties: {
                ...prev.difficulties,
                [key]: {
                    ...prev.difficulties[key],
                    [field]: value
                }
            }
        }));
    };

    const filteredHabits = habits.filter(h => {
        if (search && !h.name?.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterCategory && h.category !== filterCategory) return false;
        return true;
    });

    const getEnabledDifficulties = (habit) => {
        const d = habit.difficulties || {};
        return DIFFICULTY_TABS.filter(t => d[t.key]?.enabled).map(t => t.label);
    };

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white">習慣庫管理</h1>
                    <p className="text-gray-400 text-sm">管理官方習慣模板（入門/進階/挑戰）</p>
                </div>
                <div className="flex gap-3">
                    <a
                        href="/admin/dashboard/habits/categories"
                        className="admin-button-secondary flex items-center gap-2"
                    >
                        <FolderOpen size={16} /> 分類管理
                    </a>
                    <button onClick={openAddModal} className="admin-button-primary flex items-center gap-2">
                        <Plus size={16} /> 新增習慣
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="admin-card mb-6">
                <div className="flex gap-4 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="搜尋習慣..."
                                className="admin-input pl-10"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <select
                        className="admin-input admin-select w-40"
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                    >
                        <option value="">所有分類</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Habits List */}
            <div className="admin-card">
                {loading ? (
                    <div className="text-center py-12 text-gray-400">載入中...</div>
                ) : filteredHabits.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">沒有習慣</div>
                ) : (
                    <div className="space-y-3">
                        {filteredHabits.map(habit => (
                            <div
                                key={habit.id}
                                className={`flex items-center justify-between p-4 rounded-xl border transition-all ${habit.isActive
                                    ? 'bg-white/5 border-white/10 hover:border-emerald-500/30'
                                    : 'bg-gray-800/50 border-gray-700 opacity-60'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 flex items-center justify-center">
                                        <IconRenderer category={habit.icon || domainToIconKey(habit.category)} size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white">{habit.name}</h3>
                                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                            <span className="px-2 py-0.5 bg-gray-700 rounded">{habit.category}</span>
                                            {getEnabledDifficulties(habit).map(d => (
                                                <span key={d} className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">{d}</span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {/* Slice N — quick entry to the科學佐證 manager.
                                        Placed before Edit so users discover it (it's
                                        new); icon distinguishes it from the existing
                                        habit edit action. */}
                                    <button
                                        onClick={() => setInsightsHabit(habit)}
                                        className="p-2 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                        title="科學佐證"
                                    >
                                        <BookOpen size={18} />
                                    </button>
                                    <button
                                        onClick={() => toggleActive(habit)}
                                        className={`p-2 rounded-lg transition-colors ${habit.isActive
                                            ? 'text-gray-400 hover:text-amber-500 hover:bg-amber-500/10'
                                            : 'text-amber-500 hover:text-emerald-500 hover:bg-emerald-500/10'
                                            }`}
                                        title={habit.isActive ? '封存' : '啟用'}
                                    >
                                        {habit.isActive ? <Archive size={18} /> : <RotateCcw size={18} />}
                                    </button>
                                    <button
                                        onClick={() => openEditModal(habit)}
                                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    >
                                        <Edit2 size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(habit.id)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
                    <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">
                                {editingHabit ? '編輯習慣' : '新增習慣'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="admin-label">習慣名稱</label>
                                    <input
                                        type="text"
                                        className="admin-input"
                                        placeholder="例如：每日喝水"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="admin-label">分類</label>
                                    <select
                                        className="admin-input admin-select"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    >
                                        <option value="">選擇分類</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.name}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="admin-label">圖示</label>
                                    <select
                                        className="admin-input"
                                        value={formData.icon}
                                        onChange={e => setFormData({ ...formData, icon: e.target.value })}
                                    >
                                        {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                                            <option key={key} value={key}>{cfg.label} ({key})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="col-span-2">
                                    <label className="admin-label">說明</label>
                                    <textarea
                                        className="admin-input"
                                        rows={2}
                                        placeholder="習慣的詳細說明..."
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="admin-label">預設錨點（建議的養成時機）</label>
                                    <select
                                        className="admin-input"
                                        value={formData.defaultCue}
                                        onChange={e => setFormData({ ...formData, defaultCue: e.target.value })}
                                    >
                                        <option value="">（無預設 — 由使用者自選）</option>
                                        {LIFE_MOMENTS_GROUPED.map(group => (
                                            <optgroup key={group.key} label={group.title}>
                                                {group.items.map(m => (
                                                    <option key={m.id} value={m.label}>{m.label}</option>
                                                ))}
                                            </optgroup>
                                        ))}
                                    </select>
                                    <p className="text-[11px] text-gray-500 mt-1">
                                        使用者加入此習慣時，錨點選擇器會預選此值（仍可自行更改）。
                                    </p>
                                </div>
                            </div>

                            {/* Difficulty Tabs */}
                            <div>
                                <label className="admin-label mb-3 block">難度等級設定</label>
                                <div className="flex border-b border-gray-700 mb-4">
                                    {DIFFICULTY_TABS.map(tab => (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveDiffTab(tab.key)}
                                            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${activeDiffTab === tab.key
                                                ? `text-${tab.color}-500 border-${tab.color}-500`
                                                : 'text-gray-400 border-transparent hover:text-gray-300'
                                                } ${formData.difficulties[tab.key]?.enabled
                                                    ? ''
                                                    : 'opacity-50'
                                                }`}
                                        >
                                            {tab.label}
                                            {formData.difficulties[tab.key]?.enabled && (
                                                <span className="ml-1 text-xs">✓</span>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Active Tab Content */}
                                <div className="bg-gray-800/50 rounded-xl p-4 space-y-4">
                                    <label className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.difficulties[activeDiffTab]?.enabled || false}
                                            onChange={e => updateDifficulty(activeDiffTab, 'enabled', e.target.checked)}
                                            className="w-5 h-5 rounded"
                                        />
                                        <span className="text-white font-medium">
                                            啟用{DIFFICULTY_TABS.find(t => t.key === activeDiffTab)?.label}難度
                                        </span>
                                    </label>

                                    {formData.difficulties[activeDiffTab]?.enabled && (
                                        <>
                                            <div>
                                                <label className="admin-label">顯示標籤</label>
                                                <input
                                                    type="text"
                                                    className="admin-input"
                                                    placeholder={`例如：${DIFFICULTY_TABS.find(t => t.key === activeDiffTab)?.label}版`}
                                                    value={formData.difficulties[activeDiffTab]?.label || ''}
                                                    onChange={e => updateDifficulty(activeDiffTab, 'label', e.target.value)}
                                                />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="admin-label">任務類型</label>
                                                    <select
                                                        className="admin-input admin-select"
                                                        value={formData.difficulties[activeDiffTab]?.type || 'binary'}
                                                        onChange={e => updateDifficulty(activeDiffTab, 'type', e.target.value)}
                                                    >
                                                        {TASK_TYPES.map(t => (
                                                            <option key={t.value} value={t.value}>{t.label}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {formData.difficulties[activeDiffTab]?.type === 'quantitative' && (
                                                    <>
                                                        <div>
                                                            <label className="admin-label">目標數量</label>
                                                            <input
                                                                type="number"
                                                                className="admin-input"
                                                                min={1}
                                                                value={formData.difficulties[activeDiffTab]?.dailyTarget || 1}
                                                                onChange={e => updateDifficulty(activeDiffTab, 'dailyTarget', parseInt(e.target.value) || 1)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="admin-label">單位</label>
                                                            <input
                                                                type="text"
                                                                className="admin-input"
                                                                placeholder="杯、分鐘..."
                                                                value={formData.difficulties[activeDiffTab]?.unit || ''}
                                                                onChange={e => updateDifficulty(activeDiffTab, 'unit', e.target.value)}
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </div>

                                            <div>
                                                <label className="admin-label">頻率</label>
                                                <select
                                                    className="admin-input admin-select"
                                                    value={formData.difficulties[activeDiffTab]?.recurrence?.type || 'daily'}
                                                    onChange={e => updateDifficulty(activeDiffTab, 'recurrence', {
                                                        ...formData.difficulties[activeDiffTab]?.recurrence,
                                                        type: e.target.value
                                                    })}
                                                >
                                                    <option value="daily">每天</option>
                                                    <option value="weekly">每週</option>
                                                    <option value="monthly">每月</option>
                                                </select>
                                            </div>
                                            {/* Weekly/Monthly Mode Selector */}
                                            {(formData.difficulties[activeDiffTab]?.recurrence?.type === 'weekly' ||
                                                formData.difficulties[activeDiffTab]?.recurrence?.type === 'monthly') && (
                                                    <div>
                                                        <label className="admin-label">週期模式</label>
                                                        <div className="space-y-2">
                                                            <label className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700/70 transition-colors">
                                                                <input
                                                                    type="radio"
                                                                    name={`weekMode-${activeDiffTab}`}
                                                                    checked={formData.difficulties[activeDiffTab]?.recurrence?.weekMode !== 'flexible'}
                                                                    onChange={() => updateDifficulty(activeDiffTab, 'recurrence', {
                                                                        ...formData.difficulties[activeDiffTab]?.recurrence,
                                                                        weekMode: 'fixed'
                                                                    })}
                                                                    className="w-4 h-4"
                                                                />
                                                                <div>
                                                                    <span className="text-sm text-white font-medium">固定日期</span>
                                                                    <p className="text-xs text-gray-400">指定每週的特定星期執行</p>
                                                                </div>
                                                            </label>
                                                            <label className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700/70 transition-colors">
                                                                <input
                                                                    type="radio"
                                                                    name={`weekMode-${activeDiffTab}`}
                                                                    checked={formData.difficulties[activeDiffTab]?.recurrence?.weekMode === 'flexible'}
                                                                    onChange={() => updateDifficulty(activeDiffTab, 'recurrence', {
                                                                        ...formData.difficulties[activeDiffTab]?.recurrence,
                                                                        weekMode: 'flexible'
                                                                    })}
                                                                    className="w-4 h-4"
                                                                />
                                                                <div>
                                                                    <span className="text-sm text-white font-medium">彈性次數</span>
                                                                    <p className="text-xs text-gray-400">每週期達成目標次數即可，不限日期</p>
                                                                </div>
                                                            </label>
                                                        </div>
                                                    </div>
                                                )}

                                            {/* Fixed Mode: Weekday Selector */}
                                            {formData.difficulties[activeDiffTab]?.recurrence?.type === 'weekly' &&
                                                formData.difficulties[activeDiffTab]?.recurrence?.weekMode !== 'flexible' && (
                                                    <div>
                                                        <label className="admin-label">指定星期</label>
                                                        <div className="flex gap-2 flex-wrap">
                                                            {['日', '一', '二', '三', '四', '五', '六'].map((day, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const currentDays = formData.difficulties[activeDiffTab]?.recurrence?.weekDays || [];
                                                                        const newDays = currentDays.includes(idx)
                                                                            ? currentDays.filter(d => d !== idx)
                                                                            : [...currentDays, idx];
                                                                        updateDifficulty(activeDiffTab, 'recurrence', {
                                                                            ...formData.difficulties[activeDiffTab]?.recurrence,
                                                                            weekDays: newDays
                                                                        });
                                                                    }}
                                                                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${formData.difficulties[activeDiffTab]?.recurrence?.weekDays?.includes(idx)
                                                                            ? 'bg-emerald-500 text-white'
                                                                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                                                        }`}
                                                                >
                                                                    {day}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                            {/* Flexible Mode: Period Target */}
                                            {(formData.difficulties[activeDiffTab]?.recurrence?.type === 'weekly' ||
                                                formData.difficulties[activeDiffTab]?.recurrence?.type === 'monthly') &&
                                                formData.difficulties[activeDiffTab]?.recurrence?.weekMode === 'flexible' && (
                                                    <div>
                                                        <label className="admin-label">
                                                            每{formData.difficulties[activeDiffTab]?.recurrence?.type === 'weekly' ? '週' : '月'}目標次數
                                                        </label>
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="number"
                                                                className="admin-input w-20"
                                                                min={1}
                                                                max={formData.difficulties[activeDiffTab]?.recurrence?.type === 'weekly' ? 7 : 31}
                                                                value={formData.difficulties[activeDiffTab]?.recurrence?.periodTarget || 1}
                                                                onChange={e => updateDifficulty(activeDiffTab, 'recurrence', {
                                                                    ...formData.difficulties[activeDiffTab]?.recurrence,
                                                                    periodTarget: parseInt(e.target.value) || 1
                                                                })}
                                                            />
                                                            <span className="text-sm text-gray-400">次</span>
                                                        </div>
                                                    </div>
                                                )}

                                            {/* End Condition */}
                                            <div>
                                                <label className="admin-label">終止條件</label>
                                                <div className="space-y-2">
                                                    <label className="flex items-center gap-3 p-2 bg-gray-700/50 rounded-lg cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name={`endType-${activeDiffTab}`}
                                                            checked={formData.difficulties[activeDiffTab]?.recurrence?.endType === 'never'}
                                                            onChange={() => updateDifficulty(activeDiffTab, 'recurrence', {
                                                                ...formData.difficulties[activeDiffTab]?.recurrence,
                                                                endType: 'never'
                                                            })}
                                                            className="w-4 h-4"
                                                        />
                                                        <span className="text-sm text-gray-300">永不終止</span>
                                                    </label>
                                                    <label className="flex items-center gap-3 p-2 bg-gray-700/50 rounded-lg cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name={`endType-${activeDiffTab}`}
                                                            checked={formData.difficulties[activeDiffTab]?.recurrence?.endType === 'count'}
                                                            onChange={() => updateDifficulty(activeDiffTab, 'recurrence', {
                                                                ...formData.difficulties[activeDiffTab]?.recurrence,
                                                                endType: 'count',
                                                                endCount: formData.difficulties[activeDiffTab]?.recurrence?.endCount || 10
                                                            })}
                                                            className="w-4 h-4"
                                                        />
                                                        <span className="text-sm text-gray-300">重複</span>
                                                        <input
                                                            type="number"
                                                            className="admin-input w-20 py-1"
                                                            min={1}
                                                            value={formData.difficulties[activeDiffTab]?.recurrence?.endCount || 10}
                                                            onChange={e => updateDifficulty(activeDiffTab, 'recurrence', {
                                                                ...formData.difficulties[activeDiffTab]?.recurrence,
                                                                endType: 'count',
                                                                endCount: parseInt(e.target.value) || 1
                                                            })}
                                                            disabled={formData.difficulties[activeDiffTab]?.recurrence?.endType !== 'count'}
                                                        />
                                                        <span className="text-sm text-gray-300">次後終止</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="admin-button-secondary"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSave}
                                className="admin-button-primary flex items-center gap-2"
                            >
                                <Save size={16} /> 儲存
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Slice N — Scientific Brief manager. Rendered at root so it
                stacks on top of the habit list (and renders its own form
                modal on top of itself, z-index escalates). */}
            <HabitInsightsModal
                isOpen={Boolean(insightsHabit)}
                onClose={() => setInsightsHabit(null)}
                habit={insightsHabit}
            />
        </div>
    );
}
