// src/components/TaskLibraryModal.jsx
"use client";

import React, { useState, useEffect } from 'react';
import { Target, X, Edit2, Loader, Search, ChevronLeft } from 'lucide-react';
import DomainGrid from './explore/DomainGrid';
import HabitListView from './explore/HabitListView';
import CategoryIcon from './explore/CategoryIcon';
import AnchorPicker from './explore/AnchorPicker';
import IdentityPicker from './explore/IdentityPicker';

const TaskLibraryModal = ({ isOpen, onClose, onSelectTask, onOpenCustomForm, userTypeKey = null, yourTasks = [] }) => {
    const [habits, setHabits] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [view, setView] = useState('domain');           // 'domain' | 'list' | 'search' | 'anchor' | 'identity'
    const [selectedDomain, setSelectedDomain] = useState(null);
    const [selectedDifficulty, setSelectedDifficulty] = useState({});
    const [pendingHabit, setPendingHabit] = useState(null);    // { habit, diffKey } when entering anchor view
    const [pendingCue, setPendingCue] = useState(null);        // chosen anchor string (null = skip)
    const [identityChoice, setIdentityChoice] = useState(null);

    useEffect(() => {
        if (isOpen) {
            fetchHabits();
            setView('domain');
            setSelectedDomain(null);
            setSearch('');
            setPendingHabit(null);
            setPendingCue(null);
            setIdentityChoice(null);
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
        if (view === 'identity') {
            setView('anchor');
            return;
        }
        if (view === 'anchor') {
            setView('list');
            setPendingHabit(null);
            setPendingCue(null);
            setIdentityChoice(null);
            return;
        }
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
        setPendingHabit({ habit, diffKey });
        setPendingCue(null);
        setView('anchor');
    };

    const emitPendingTask = (cue, identity) => {
        if (!pendingHabit) return;
        const { habit, diffKey } = pendingHabit;
        const config = habit.difficulties[diffKey];
        const task = {
            title: habit.name,
            details: habit.description || '',
            cue: cue || null,
            identity: identity || null,
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
        setPendingCue(null);
        setIdentityChoice(null);
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
            : view === 'anchor'
                ? '選擇錨點'
                : view === 'identity'
                    ? '選擇身份'
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
                {view !== 'anchor' && view !== 'identity' && (
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
                )}

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {view !== 'anchor' && view !== 'identity' && (
                        <button
                            onClick={onOpenCustomForm}
                            className="w-full bg-gray-800 text-white text-base font-bold py-3 rounded-xl shadow-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <Edit2 size={20} /> 手動建立新任務
                        </button>
                    )}

                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader className="animate-spin text-emerald-500" size={32} />
                        </div>
                    ) : view === 'domain' ? (
                        <>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">選擇一個健康面向</p>
                            <DomainGrid categories={categories} onSelect={handleSelectDomain} />
                        </>
                    ) : view === 'anchor' ? (
                        <>
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mb-2">
                                <p className="text-xs text-emerald-700 mb-1">準備加入：</p>
                                <p className="text-sm font-bold text-emerald-900">{pendingHabit?.habit?.name}</p>
                                <p className="text-xs text-emerald-700 mt-0.5">難度：{pendingHabit?.diffKey === 'beginner' ? '入門' : pendingHabit?.diffKey === 'intermediate' ? '進階' : '挑戰'}</p>
                            </div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">挑一個錨點（你習慣在什麼時候做）</p>
                            <AnchorPicker
                                value={pendingCue}
                                onChange={setPendingCue}
                                yourTasks={yourTasks}
                            />
                            <div className="flex gap-2 pt-2 border-t border-gray-100">
                                <button
                                    onClick={() => {
                                        setPendingCue(null);
                                        setIdentityChoice(null);
                                        setView('identity');
                                    }}
                                    className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 transition-colors"
                                >
                                    跳過此步驟
                                </button>
                                <button
                                    onClick={() => {
                                        setIdentityChoice(null);
                                        setView('identity');
                                    }}
                                    disabled={!pendingCue}
                                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${
                                        pendingCue
                                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    {pendingCue ? `確認（錨點：${pendingCue}）` : '請先選一個錨點'}
                                </button>
                            </div>
                        </>
                    ) : view === 'identity' ? (
                        <>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                為什麼做這個習慣？(可跳過)
                            </p>
                            <IdentityPicker
                                value={identityChoice}
                                onChange={setIdentityChoice}
                                userTypeKey={userTypeKey}
                            />
                            <div className="flex gap-3 pt-3 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => emitPendingTask(pendingCue, null)}
                                    className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
                                >
                                    跳過
                                </button>
                                <button
                                    type="button"
                                    disabled={!identityChoice}
                                    onClick={() => emitPendingTask(pendingCue, identityChoice)}
                                    className={`flex-1 py-3 rounded-xl text-sm font-bold transition-colors ${
                                        identityChoice
                                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    確認
                                </button>
                            </div>
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
