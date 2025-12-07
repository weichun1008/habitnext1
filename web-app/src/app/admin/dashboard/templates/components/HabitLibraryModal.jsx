"use client";

import React, { useState, useEffect } from 'react';
import { X, Search, Plus, Check } from 'lucide-react';

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

export default function HabitLibraryModal({ isOpen, onClose, onSelect }) {
    const [habits, setHabits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterDifficulty, setFilterDifficulty] = useState('');
    const [selected, setSelected] = useState([]);

    useEffect(() => {
        if (isOpen) {
            fetchHabits();
            setSelected([]);
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

    const toggleSelect = (habit) => {
        if (selected.find(s => s.id === habit.id)) {
            setSelected(selected.filter(s => s.id !== habit.id));
        } else {
            setSelected([...selected, habit]);
        }
    };

    const handleConfirm = () => {
        // Convert habits to task format
        const tasks = selected.map(habit => ({
            id: `lib_${habit.id}_${Date.now()}`,
            title: habit.title,
            details: habit.description || '',
            type: habit.taskType || 'binary',
            category: habit.icon || 'star',
            frequency: 'daily',
            recurrence: { type: 'daily', interval: 1, endType: 'never' },
            reminder: { enabled: false, offset: 0 },
            ...(habit.defaultConfig || {})
        }));
        onSelect(tasks);
        onClose();
    };

    const filteredHabits = habits.filter(h => {
        const matchSearch = h.title.toLowerCase().includes(search.toLowerCase());
        const matchCategory = !filterCategory || h.category === filterCategory;
        const matchDifficulty = !filterDifficulty || h.difficulty === filterDifficulty;
        return matchSearch && matchCategory && matchDifficulty;
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-[#1e1e1e] border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl animate-fade-in-up max-h-[85vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-gray-800">
                    <h3 className="text-lg font-bold text-white">從習慣庫匯入</h3>
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
                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <select
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none"
                        value={filterDifficulty}
                        onChange={e => setFilterDifficulty(e.target.value)}
                    >
                        <option value="">所有難度</option>
                        {DIFFICULTIES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                </div>

                {/* Habits List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <p className="text-center text-gray-500 py-8">載入中...</p>
                    ) : filteredHabits.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">沒有找到習慣</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {filteredHabits.map(habit => {
                                const isSelected = selected.find(s => s.id === habit.id);
                                const diffConfig = DIFFICULTIES.find(d => d.value === habit.difficulty);
                                return (
                                    <div
                                        key={habit.id}
                                        onClick={() => toggleSelect(habit)}
                                        className={`p-3 rounded-xl border cursor-pointer transition-all ${isSelected ? 'bg-emerald-500/10 border-emerald-500' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="text-2xl">{habit.icon || '🎯'}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-medium text-white truncate">{habit.title}</h4>
                                                    {isSelected && <Check size={14} className="text-emerald-500 flex-shrink-0" />}
                                                </div>
                                                <p className="text-xs text-gray-500 line-clamp-1">{habit.description}</p>
                                                <span className={`text-xs px-1.5 py-0.5 rounded mt-1 inline-block bg-${diffConfig?.color || 'gray'}-500/10 text-${diffConfig?.color || 'gray'}-500`}>
                                                    {diffConfig?.label || habit.difficulty}
                                                </span>
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
                    <span className="text-sm text-gray-500">已選擇 {selected.length} 個習慣</span>
                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm bg-gray-800 text-gray-300 hover:bg-gray-700">
                            取消
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={selected.length === 0}
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
