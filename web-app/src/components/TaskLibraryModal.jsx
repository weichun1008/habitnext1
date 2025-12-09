"use client";

import React, { useState, useEffect } from 'react';
import { Target, X, Edit2, Plus, Loader, Search } from 'lucide-react';
import IconRenderer from './IconRenderer';
import { CATEGORY_CONFIG } from '@/lib/constants';

const DIFFICULTY_OPTIONS = [
    { key: 'beginner', label: '入門', color: 'emerald' },
    { key: 'intermediate', label: '進階', color: 'amber' },
    { key: 'challenge', label: '挑戰', color: 'red' },
];

const TaskLibraryModal = ({ isOpen, onClose, onSelectTask, onOpenCustomForm }) => {
    const [habits, setHabits] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [selectedDifficulty, setSelectedDifficulty] = useState({}); // { habitId: 'beginner' | 'intermediate' | 'challenge' }

    useEffect(() => {
        if (isOpen) {
            fetchHabits();
        }
    }, [isOpen]);

    const fetchHabits = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/habits');
            if (res.ok) {
                const data = await res.json();
                setHabits(data.habits || []);
                setCategories(data.categories || []);
            }
        } catch (error) {
            console.error('Fetch habits error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectHabit = (habit) => {
        const diffKey = selectedDifficulty[habit.id] || getDefaultDifficulty(habit);
        const config = habit.difficulties?.[diffKey];

        if (!config) {
            alert('請先選擇難度');
            return;
        }

        // Convert OfficialHabit to task format
        const task = {
            title: config.label || habit.name,
            details: habit.description || '',
            type: config.type || 'binary',
            category: habit.category || 'star',
            frequency: config.recurrence?.type || 'daily',
            recurrence: config.recurrence || { type: 'daily', interval: 1, endType: 'never' },
            dailyTarget: config.dailyTarget || 1,
            unit: config.unit || '次',
            stepValue: config.stepValue || 1,
            subtasks: config.subtasks || [],
        };

        onSelectTask(task);
    };

    const getDefaultDifficulty = (habit) => {
        const diffs = habit.difficulties || {};
        if (diffs.beginner?.enabled) return 'beginner';
        if (diffs.intermediate?.enabled) return 'intermediate';
        if (diffs.challenge?.enabled) return 'challenge';
        return 'beginner';
    };

    const getEnabledDifficulties = (habit) => {
        const diffs = habit.difficulties || {};
        return DIFFICULTY_OPTIONS.filter(d => diffs[d.key]?.enabled);
    };

    // Filter habits
    const filteredHabits = habits.filter(h => {
        const matchesSearch = !search || h.name.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = !filterCategory || h.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:max-w-xl h-[90vh] md:h-auto md:max-h-[85vh] md:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col animate-fade-in-up">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <Target size={20} className="text-emerald-500" /> 選擇習慣
                    </h3>
                    <button onClick={onClose}><X size={24} className="text-gray-500 hover:text-gray-800" /></button>
                </div>

                {/* Search & Filter */}
                <div className="p-4 border-b border-gray-100 space-y-3">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="搜尋習慣..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                    </div>
                    {categories.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto no-scrollbar">
                            <button
                                onClick={() => setFilterCategory('')}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${!filterCategory ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                            >
                                全部
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => setFilterCategory(cat.name)}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${filterCategory === cat.name ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}
                                >
                                    {cat.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <button
                        onClick={onOpenCustomForm}
                        className="w-full bg-gray-800 text-white text-base font-bold py-3 rounded-xl shadow-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                    >
                        <Edit2 size={20} /> 手動建立新任務
                    </button>

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader className="animate-spin text-emerald-500" size={32} />
                        </div>
                    ) : filteredHabits.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            {habits.length === 0 ? '暫無推薦習慣，請在後台添加' : '沒有符合條件的習慣'}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">推薦習慣</p>
                            {filteredHabits.map(habit => {
                                const enabledDiffs = getEnabledDifficulties(habit);
                                const currentDiff = selectedDifficulty[habit.id] || getDefaultDifficulty(habit);
                                const config = CATEGORY_CONFIG[habit.category] || CATEGORY_CONFIG['star'];

                                return (
                                    <div key={habit.id} className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-3 flex-1">
                                                <div className={`${config.bg} p-2 rounded-xl flex-shrink-0`}>
                                                    <IconRenderer category={habit.category} size={18} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-bold text-gray-800">{habit.name}</h4>
                                                    {habit.description && (
                                                        <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{habit.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleSelectHabit(habit)}
                                                className="flex items-center gap-1 text-sm text-white bg-emerald-500 px-3 py-1.5 rounded-full font-bold hover:bg-emerald-600 transition-colors flex-shrink-0 ml-2"
                                            >
                                                <Plus size={16} /> 新增
                                            </button>
                                        </div>

                                        {/* Difficulty Selection */}
                                        {enabledDiffs.length > 1 && (
                                            <div className="mt-3 pt-3 border-t border-gray-100">
                                                <p className="text-xs text-gray-500 mb-2">選擇難度：</p>
                                                <div className="flex gap-2">
                                                    {enabledDiffs.map(diff => {
                                                        const isSelected = currentDiff === diff.key;
                                                        const diffConfig = habit.difficulties[diff.key];
                                                        return (
                                                            <button
                                                                key={diff.key}
                                                                onClick={() => setSelectedDifficulty(prev => ({ ...prev, [habit.id]: diff.key }))}
                                                                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${isSelected
                                                                        ? `bg-${diff.color}-500 text-white`
                                                                        : `bg-${diff.color}-50 text-${diff.color}-600 hover:bg-${diff.color}-100`
                                                                    }`}
                                                                style={isSelected ? {
                                                                    backgroundColor: diff.color === 'emerald' ? '#10b981' : diff.color === 'amber' ? '#f59e0b' : '#ef4444',
                                                                    color: 'white'
                                                                } : {}}
                                                            >
                                                                {diffConfig?.label || diff.label}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskLibraryModal;
