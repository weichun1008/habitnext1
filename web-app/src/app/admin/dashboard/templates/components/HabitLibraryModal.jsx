"use client";

import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Check, ChevronDown } from 'lucide-react';

const DIFFICULTY_OPTIONS = [
    { key: 'beginner', label: '入門', color: 'emerald' },
    { key: 'intermediate', label: '進階', color: 'amber' },
    { key: 'challenge', label: '挑戰', color: 'red' },
];

// Auto-suggest difficulty based on phase order
const getSuggestedDifficulty = (phaseOrder) => {
    if (phaseOrder === 0) return 'beginner';
    if (phaseOrder === 1) return 'intermediate';
    return 'challenge';
};

export default function HabitLibraryModal({ isOpen, onClose, onSelect, phaseOrder = 0 }) {
    const [habits, setHabits] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('');

    // Selection state: { habitId: selectedDifficultyKey }
    const [selections, setSelections] = useState({});

    useEffect(() => {
        if (isOpen) {
            fetchHabits();
            fetchCategories();
            setSelections({});
        }
    }, [isOpen]);

    const fetchHabits = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/habits?active=true');
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

    const getEnabledDifficulties = (habit) => {
        const d = habit.difficulties || {};
        return DIFFICULTY_OPTIONS.filter(opt => d[opt.key]?.enabled);
    };

    const toggleHabit = (habit) => {
        const habitId = habit.id;
        if (selections[habitId]) {
            // Deselect
            const newSelections = { ...selections };
            delete newSelections[habitId];
            setSelections(newSelections);
        } else {
            // Select with auto-suggested difficulty
            const enabledDiffs = getEnabledDifficulties(habit);
            const suggested = getSuggestedDifficulty(phaseOrder);
            const defaultDiff = enabledDiffs.find(d => d.key === suggested)
                || enabledDiffs[0];

            if (defaultDiff) {
                setSelections({ ...selections, [habitId]: defaultDiff.key });
            }
        }
    };

    const changeDifficulty = (habitId, diffKey) => {
        setSelections({ ...selections, [habitId]: diffKey });
    };

    const handleConfirm = () => {
        // Convert selections to task format
        const tasks = Object.entries(selections).map(([habitId, diffKey]) => {
            const habit = habits.find(h => h.id === habitId);
            const diffConfig = habit?.difficulties?.[diffKey] || {};

            return {
                id: `lib_${habitId}_${diffKey}_${Date.now()}`,
                title: diffConfig.label || `${habit?.name} (${DIFFICULTY_OPTIONS.find(d => d.key === diffKey)?.label})`,
                details: habit?.description || '',
                type: diffConfig.type || 'binary',
                category: habit?.icon || 'star',
                frequency: diffConfig.recurrence?.type || 'daily',
                recurrence: diffConfig.recurrence || { type: 'daily', interval: 1, endType: 'never' },
                reminder: { enabled: false, offset: 0 },
                dailyTarget: diffConfig.dailyTarget || 1,
                unit: diffConfig.unit || '次',
                stepValue: diffConfig.stepValue || 1,
                subtasks: diffConfig.subtasks || []
            };
        });

        onSelect(tasks);
        onClose();
    };

    const filteredHabits = habits.filter(h => {
        const matchSearch = h.name?.toLowerCase().includes(search.toLowerCase());
        const matchCategory = !filterCategory || h.category === filterCategory;
        const hasEnabledDiff = getEnabledDifficulties(h).length > 0;
        return matchSearch && matchCategory && hasEnabledDiff;
    });

    const selectedCount = Object.keys(selections).length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl animate-fade-in-up max-h-[85vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-800">
                    <div>
                        <h3 className="text-lg font-bold text-white">從習慣庫匯入</h3>
                        <p className="text-xs text-gray-500">
                            建議難度：{DIFFICULTY_OPTIONS.find(d => d.key === getSuggestedDifficulty(phaseOrder))?.label}
                            （階段 {phaseOrder + 1}）
                        </p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 p-4 border-b border-gray-800">
                    <div className="relative flex-1 min-w-[150px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:border-emerald-500 outline-none"
                            placeholder="搜尋..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <select
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none"
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                    >
                        <option value="">所有分類</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>

                {/* Habits List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <p className="text-center text-gray-500 py-8">載入中...</p>
                    ) : filteredHabits.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">沒有找到習慣</p>
                    ) : (
                        <div className="space-y-3">
                            {filteredHabits.map(habit => {
                                const isSelected = !!selections[habit.id];
                                const enabledDiffs = getEnabledDifficulties(habit);
                                const selectedDiff = selections[habit.id];

                                return (
                                    <div
                                        key={habit.id}
                                        className={`p-3 rounded-xl border transition-all ${isSelected
                                                ? 'bg-emerald-500/10 border-emerald-500'
                                                : 'bg-white/5 border-white/10 hover:border-white/20'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div
                                                className="text-2xl cursor-pointer"
                                                onClick={() => toggleHabit(habit)}
                                            >
                                                {habit.icon || '🎯'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div
                                                    className="flex items-center gap-2 cursor-pointer"
                                                    onClick={() => toggleHabit(habit)}
                                                >
                                                    <h4 className="font-medium text-white truncate">{habit.name}</h4>
                                                    {isSelected && <Check size={14} className="text-emerald-500 flex-shrink-0" />}
                                                </div>
                                                <p className="text-xs text-gray-500 line-clamp-1">{habit.description}</p>

                                                {/* Difficulty Pills */}
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {enabledDiffs.map(diff => (
                                                        <button
                                                            key={diff.key}
                                                            onClick={() => {
                                                                if (!isSelected) {
                                                                    setSelections({ ...selections, [habit.id]: diff.key });
                                                                } else {
                                                                    changeDifficulty(habit.id, diff.key);
                                                                }
                                                            }}
                                                            className={`text-xs px-2 py-0.5 rounded transition-all ${selectedDiff === diff.key
                                                                    ? `bg-${diff.color}-500 text-white`
                                                                    : `bg-${diff.color}-500/10 text-${diff.color}-500 hover:bg-${diff.color}-500/20`
                                                                }`}
                                                        >
                                                            {diff.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-800 flex justify-between items-center">
                    <span className="text-sm text-gray-500">已選擇 {selectedCount} 個習慣</span>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-gray-800 text-gray-300 hover:bg-gray-700">
                            取消
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={selectedCount === 0}
                            className="px-4 py-2 rounded-lg text-sm bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Plus size={16} /> 加入階段
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
