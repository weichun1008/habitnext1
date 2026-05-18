// src/components/TaskLibraryModal.jsx
"use client";

import React, { useState, useEffect } from 'react';
import { Target, X, Edit2, Loader, Search, ChevronLeft } from 'lucide-react';
import DomainGrid from './explore/DomainGrid';
import HabitListView from './explore/HabitListView';
import CategoryIcon from './explore/CategoryIcon';

const TaskLibraryModal = ({ isOpen, onClose, onSelectTask, onOpenCustomForm }) => {
    const [habits, setHabits] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [view, setView] = useState('domain');           // 'domain' | 'list' | 'search'
    const [selectedDomain, setSelectedDomain] = useState(null);
    const [selectedDifficulty, setSelectedDifficulty] = useState({});

    useEffect(() => {
        if (isOpen) {
            fetchHabits();
            setView('domain');
            setSelectedDomain(null);
            setSearch('');
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

    const handleSelectDomain = (cat) => {
        setSelectedDomain(cat);
        setView('list');
        setSearch('');
    };

    const handleBack = () => {
        setView('domain');
        setSelectedDomain(null);
        setSearch('');
    };

    const handleSearchChange = (value) => {
        setSearch(value);
        if (view === 'domain' && value.trim()) {
            setView('search');
        }
        if (view === 'search' && !value.trim()) {
            setView('domain');
        }
    };

    const handleSelectHabit = (habit, diffKey) => {
        const config = habit.difficulties?.[diffKey];
        if (!config) {
            alert('請先選擇難度');
            return;
        }
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

    const visibleHabits = (() => {
        const q = search.trim().toLowerCase();
        if (view === 'domain') return [];
        if (view === 'search') {
            return habits.filter(h => h.name.toLowerCase().includes(q));
        }
        // view === 'list'
        return habits.filter(h => {
            const matchesDomain = selectedDomain ? h.category === selectedDomain.name : true;
            const matchesSearch = !q || h.name.toLowerCase().includes(q);
            return matchesDomain && matchesSearch;
        });
    })();

    if (!isOpen) return null;

    const headerLabel = view === 'list' && selectedDomain
        ? selectedDomain.name
        : view === 'search'
            ? '搜尋結果'
            : '選擇習慣';

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:max-w-xl h-[90vh] md:h-auto md:max-h-[85vh] md:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col animate-fade-in-up">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {view !== 'domain' && (
                            <button onClick={handleBack} className="text-gray-500 hover:text-gray-800 -ml-1">
                                <ChevronLeft size={22} />
                            </button>
                        )}
                        <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                            {view === 'list' && selectedDomain?.icon ? (
                                <CategoryIcon name={selectedDomain.icon} size={20} style={{ color: selectedDomain.color || '#10B981' }} />
                            ) : (
                                <Target size={20} className="text-emerald-500" />
                            )}
                            {headerLabel}
                        </h3>
                    </div>
                    <button onClick={onClose}><X size={24} className="text-gray-500 hover:text-gray-800" /></button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder={view === 'list' ? `在「${selectedDomain?.name || ''}」內搜尋…` : '搜尋習慣…'}
                            value={search}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                    </div>
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
                    ) : view === 'domain' ? (
                        <>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">選擇一個健康面向</p>
                            <DomainGrid categories={categories} onSelect={handleSelectDomain} />
                        </>
                    ) : (
                        <>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                {view === 'search' ? `搜尋「${search}」` : '推薦習慣'}
                            </p>
                            <HabitListView
                                habits={visibleHabits}
                                selectedDifficulty={selectedDifficulty}
                                setSelectedDifficulty={setSelectedDifficulty}
                                onSelectHabit={handleSelectHabit}
                                emptyText={view === 'search' ? '沒有符合的習慣' : '這個面向目前還沒有推薦習慣'}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaskLibraryModal;
