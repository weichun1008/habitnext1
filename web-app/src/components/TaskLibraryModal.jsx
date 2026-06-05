// src/components/TaskLibraryModal.jsx
"use client";

import React, { useState, useEffect } from 'react';
import { Target, X, Edit2, Loader, Search, ChevronLeft, Sparkles, ChevronRight } from 'lucide-react';
import DomainGrid from './explore/DomainGrid';
import HabitListView from './explore/HabitListView';
import CategoryIcon from './explore/CategoryIcon';
import AnchorPicker from './explore/AnchorPicker';

// Slice K (2026-05-26): added two optional props.
//   - onOpenAspirationPicker: when set, an "✨ 從嚮往開始" entry button
//     renders above the domain grid. Lets users who haven't decided on a
//     habit start from a goal/outcome (Aspiration) and follow recommendations.
//   - initialHabit: when set, the modal skips the domain grid on open and
//     jumps straight to a single-habit list (the picked habit's accordion +
//     difficulty picker). After the user picks difficulty, the existing
//     anchor → identity → emit flow runs unchanged. Used when the user
//     picked a habit card from AspirationRecommendationPanel.
//
// 2026-06-03 — the per-habit identity step was removed; identity now lives on
// the aspiration. The add flow is now domain → list → anchor → emit.
const TaskLibraryModal = ({
    isOpen,
    onClose,
    onSelectTask,
    onOpenCustomForm,
    userTypeKey = null,
    yourTasks = [],
    onOpenAspirationPicker = null,
    initialHabit = null,
}) => {
    const [habits, setHabits] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [view, setView] = useState('domain');           // 'domain' | 'list' | 'search' | 'anchor'
    const [selectedDomain, setSelectedDomain] = useState(null);
    const [selectedDifficulty, setSelectedDifficulty] = useState({});
    const [pendingHabit, setPendingHabit] = useState(null);    // { habit, diffKey } when entering anchor view
    const [pendingCue, setPendingCue] = useState(null);        // chosen anchor string (null = skip)

    // Slice L — candidate-pool feedback: after each save we keep the modal
    // open and show a transient toast + a persistent footer count. The
    // toast self-clears after ~2.2s via a setTimeout we track in state so
    // rapid re-saves can cancel the previous one cleanly.
    const [toast, setToast] = useState(null);          // { text } | null
    const [toastTimer, setToastTimer] = useState(null);
    const [savedThisSession, setSavedThisSession] = useState(0);

    useEffect(() => {
        if (isOpen) {
            fetchHabits();
            // Slice K: if initialHabit is set, skip the domain grid and land
            // on the single-habit list view so the user picks difficulty next.
            // selectedDomain is synthesized from the habit's category so the
            // header shows the domain name + the back arrow still walks the
            // user back to the domain grid if they change their mind.
            if (initialHabit) {
                setView('list');
                setSelectedDomain({
                    name: initialHabit.category || '習慣',
                    color: '#10B981',
                    icon: null,
                });
            } else {
                setView('domain');
                setSelectedDomain(null);
            }
            setSearch('');
            setPendingHabit(null);
            setPendingCue(null);
            // Slice L — reset session-only feedback on each fresh open
            setToast(null);
            setSavedThisSession(0);
        }
    }, [isOpen, initialHabit?.id]);

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
        if (view === 'anchor') {
            setView('list');
            setPendingHabit(null);
            setPendingCue(null);
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
        // 預選官方習慣的預設錨點（若後台有設定）；使用者仍可在 AnchorPicker 改或清除。
        setPendingCue(habit.defaultCue || null);
        setView('anchor');
    };

    const emitPendingTask = (cue) => {
        if (!pendingHabit) return;
        const { habit, diffKey } = pendingHabit;
        const config = habit.difficulties[diffKey];
        const task = {
            title: habit.name,
            details: habit.description || '',
            cue: cue || null,
            type: config.type || 'binary',
            category: habit.category || 'star',
            frequency: config.recurrence?.type || 'daily',
            recurrence: config.recurrence || { type: 'daily', interval: 1, endType: 'never' },
            dailyTarget: config.dailyTarget || 1,
            unit: config.unit || '次',
            stepValue: config.stepValue || 1,
            subtasks: config.subtasks || [],
            // Slice L — flow into the candidate pool by default. officialHabitId
            // lets the focus-map sliders seed from the catalog impact/ability.
            status: 'candidate',
            officialHabitId: habit.id,
        };
        onSelectTask(task);

        // Slice L — reset to domain grid so the user can keep adding without
        // re-opening the modal. Show a transient toast confirming the save.
        setPendingHabit(null);
        setPendingCue(null);
        setView('domain');
        setSelectedDomain(null);
        setSearch('');

        setSavedThisSession(n => n + 1);
        if (toastTimer) clearTimeout(toastTimer);
        const timer = setTimeout(() => setToast(null), 2200);
        setToastTimer(timer);
        setToast({ text: `+1 候選：${habit.name}` });
    };

    const visibleHabits = (() => {
        // Slice K initialHabit override: when the user landed here via the
        // aspiration recommendation flow, show ONLY that habit so they
        // proceed directly to its difficulty picker. The back arrow on the
        // header still lets them escape to the domain grid if they change
        // their mind. Match by id from the fetched list so we use the
        // canonical row (recommendation API returns a subset).
        if (initialHabit && view === 'list') {
            const match = habits.find(h => h.id === initialHabit.id);
            return match ? [match] : [initialHabit];
        }
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
                : '選擇習慣';

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:max-w-xl h-[90dvh] md:h-auto md:max-h-[85dvh] md:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col animate-fade-in-up">
                {/* Slice L — transient toast confirming each save */}
                {toast && (
                    <div className="mx-6 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold flex items-center gap-2 animate-fade-in-up">
                        <Sparkles size={14} /> {toast.text}
                    </div>
                )}
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
                {view !== 'anchor' && (
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
                    {/* Slice K — aspiration entry. Only on the 'domain' view
                        (and only when the parent wired a handler) so it
                        doesn't compete for attention once the user has
                        already picked a domain or is deep in the flow. */}
                    {view === 'domain' && onOpenAspirationPicker && (
                        <button
                            type="button"
                            onClick={onOpenAspirationPicker}
                            className="group relative w-full overflow-hidden rounded-2xl p-4 text-left flex items-center gap-3 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5 transition-all"
                        >
                            <Sparkles size={68} className="absolute -right-3 -bottom-4 opacity-20 group-hover:opacity-30 group-hover:scale-110 transition-all" aria-hidden />
                            <div className="relative flex-shrink-0 w-11 h-11 rounded-xl bg-white/25 flex items-center justify-center">
                                <Sparkles size={20} className="text-white" />
                            </div>
                            <div className="relative flex-1 min-w-0">
                                <p className="text-base font-extrabold">從嚮往開始</p>
                                <p className="text-xs text-white/90 leading-snug mt-0.5">不知從何下手？從你想成為的樣子出發，我們幫你配習慣</p>
                            </div>
                            <ChevronRight size={18} className="relative text-white/90 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    )}
                    {view !== 'anchor' && (
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
                                    onClick={() => emitPendingTask(null)}
                                    className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 transition-colors"
                                >
                                    略過錨點，直接加入
                                </button>
                                <button
                                    onClick={() => emitPendingTask(pendingCue)}
                                    disabled={!pendingCue}
                                    className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${
                                        pendingCue
                                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    }`}
                                >
                                    {pendingCue ? `加入（錨點：${pendingCue}）` : '請先選一個錨點'}
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

                {/* Slice L — persistent footer count, only after >=1 save this session.
                    Reminds the user that closing won't lose their candidate pool. */}
                {savedThisSession > 0 && (
                    <div className="px-6 py-3 border-t border-gray-100 bg-amber-50 flex items-center justify-between gap-3 flex-shrink-0">
                        <p className="text-xs text-amber-700">
                            <span className="font-bold">{savedThisSession}</span> 個已加候選 · 關閉後到 daily 一起評分
                        </p>
                        <button
                            type="button"
                            onClick={onClose}
                            className="text-xs font-bold text-amber-700 underline hover:text-amber-800"
                        >
                            完成 →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TaskLibraryModal;
