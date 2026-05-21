"use client";

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Sun, Calendar, Target, BookOpen, Grid, List, Award, User, LogOut, Compass, BarChart3 } from 'lucide-react';
import AppHeader from './AppHeader';
import TaskCard from './TaskCard';
import TaskFormModal from './TaskFormModal';
import TaskLibraryModal from './TaskLibraryModal';
import DashboardSummaryCard from './DashboardSummaryCard';
import HabitCalendar from './HabitCalendar';
import TaskDetailModal from './TaskDetailModal';
import LoginModal from './LoginModal';
import { generateId, getTodayStr, isTaskDueToday } from '@/lib/utils';
import { USER_TYPE_PROFILES } from '@/lib/typeKeys';
import { SLEEP_TYPE_PROFILES } from '@/lib/sleepTypeKeys';
import { CATEGORY_CONFIG } from '@/lib/constants';
import { visibleSubtasks, computeChecklistValue } from '@/lib/subtasks';
import PlanGroup from './PlanGroup';
import TemplateExplorer from './TemplateExplorer';
import ProfileModal from './ProfileModal';

// StatsView is dynamically imported to keep recharts (~96kb gzip) off the
// `/` route's First Load JS — it only loads when the user opens the stats tab.
// Loading placeholder matches StatsView's container shape so users don't see
// a width / padding jump when the chunk finishes loading.
const StatsView = dynamic(() => import('./StatsView'), {
    ssr: false,
    loading: () => (
        <div className="p-4 space-y-4 w-full">
            <div className="text-center text-gray-400 py-12">載入中…</div>
        </div>
    ),
});

const MainApp = () => {
    const [user, setUser] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);

    const [currentView, setCurrentView] = useState('daily');
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
    const [isTemplateExplorerOpen, setIsTemplateExplorerOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isMenstrualMode, setIsMenstrualMode] = useState(false);
    const [menstrualStart, setMenstrualStart] = useState(null);

    console.log('MainApp Render:', { user, isTemplateExplorerOpen }); // Debug Log

    const [editingTask, setEditingTask] = useState(null);
    const [viewingTask, setViewingTask] = useState(null);
    const [selectedDate, setSelectedDate] = useState(getTodayStr());

    // 1. Check Auth on Load
    useEffect(() => {
        const storedUser = localStorage.getItem('habit_user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            fetchTasks(parsedUser.id);
            fetchAssignments(parsedUser.id);
        } else {
            setIsLoginModalOpen(true);
            setLoading(false);
        }
    }, []);

    // 2. Fetch Tasks
    const fetchTasks = async (userId) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/tasks?userId=${userId}`);
            if (res.ok) {
                const data = await res.json();
                // Transform history array to object map for frontend compatibility
                const formattedTasks = data.map(t => {
                    const historyMap = {};
                    const dailyProgressMap = {};

                    if (t.history) {
                        t.history.forEach(h => {
                            if (t.type === 'checklist') {
                                historyMap[h.date] = {
                                    value: h.value,
                                    completed: h.completed,
                                    subtaskCompletions: h.subtaskCompletions || {},
                                };
                            } else {
                                const val = t.type === 'quantitative' || t.recurrence?.mode === 'period_count' ? h.value : h.completed;
                                historyMap[h.date] = val;
                            }

                            if (t.type === 'quantitative') {
                                dailyProgressMap[h.date] = {
                                    value: h.value,
                                    completed: h.completed
                                };
                            }
                        });
                    }
                    return { ...t, history: historyMap, dailyProgress: dailyProgressMap };
                });
                setTasks(formattedTasks);
            }
        } catch (err) {
            console.error('Fetch tasks failed', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAssignments = async (userId) => {
        try {
            const res = await fetch(`/api/user/assignments?userId=${userId}`);
            if (res.ok) {
                const data = await res.json();
                setAssignments(data);
                const anyActive = (data || []).find(a => a.isMenstrual);
                setIsMenstrualMode(Boolean(anyActive));
                setMenstrualStart(anyActive?.menstrualStart || null);
            }
        } catch (err) {
            console.error('Fetch assignments failed', err);
        }
    };

    const handleToggleMenstrual = async (next) => {
        if (!user?.id) return;
        setIsMenstrualMode(next);
        if (next) setMenstrualStart(new Date().toISOString());
        else setMenstrualStart(null);
        try {
            await fetch('/api/user/menstrual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, isMenstrual: next }),
            });
        } catch (e) {
            console.error('Menstrual toggle failed', e);
        }
    };

    const menstrualExpired = (() => {
        if (!isMenstrualMode || !menstrualStart) return false;
        const startDate = new Date(menstrualStart);
        const days = (Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24);
        return days > 5;
    })();

    const handleLogin = (userData) => {
        setUser(userData);
        localStorage.setItem('habit_user', JSON.stringify(userData));
        setIsLoginModalOpen(false);

        // If user has tasks from DB, use them. 
        // Note: The login API already returns tasks, so we could use that to save a fetch.
        // But for consistency with the transformer above, let's just call fetchTasks or transform here.
        // Let's use the data from login response if available to be faster.
        if (userData.tasks) {
            const formattedTasks = userData.tasks.map(t => {
                const historyMap = {};
                const dailyProgressMap = {};

                if (t.history) {
                    t.history.forEach(h => {
                        if (t.type === 'checklist') {
                            historyMap[h.date] = {
                                value: h.value,
                                completed: h.completed,
                                subtaskCompletions: h.subtaskCompletions || {},
                            };
                        } else {
                            const val = t.type === 'quantitative' || t.recurrence?.mode === 'period_count' ? h.value : h.completed;
                            historyMap[h.date] = val;
                        }

                        if (t.type === 'quantitative') {
                            dailyProgressMap[h.date] = {
                                value: h.value,
                                completed: h.completed
                            };
                        }
                    });
                }
                return { ...t, history: historyMap, dailyProgress: dailyProgressMap };
            });
            setTasks(formattedTasks);
            // Also fetch assignments
            fetchAssignments(userData.id);
        } else {
            fetchTasks(userData.id);
            fetchAssignments(userData.id);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('habit_user');
        setUser(null);
        setTasks([]);
        setAssignments([]);
        setIsLoginModalOpen(true);
    };

    const handleUpdateProgress = async (task, action, value, subtaskId, dateStr = getTodayStr()) => {
        // Optimistic Update
        const prevTasks = [...tasks];

        let updatedTask = null;
        let historyUpdate = null;

        const newTasks = tasks.map(t => {
            if (t.id !== task.id) return t;

            // Subtask Logic
            if (action === 'toggle_subtask' && subtaskId) {
                // Per-date subtask state lives in TaskHistory.subtaskCompletions
                const prevHistoryForDate = t.history?.[dateStr] || {};
                const prevCompletions = prevHistoryForDate.subtaskCompletions || {};
                const newCompletions = { ...prevCompletions, [subtaskId]: !prevCompletions[subtaskId] };
                const newValue = computeChecklistValue(newCompletions);
                const visibleCount = visibleSubtasks(t, dateStr).length;
                // Task.dailyTarget is set at create time (per chosen difficulty); fallback to total visible if missing
                const target = t.dailyTarget || visibleCount;
                const newCompleted = newValue >= target;

                const newHistory = {
                    ...t.history,
                    [dateStr]: {
                        ...prevHistoryForDate,
                        subtaskCompletions: newCompletions,
                        value: newValue,
                        completed: newCompleted,
                    },
                };
                updatedTask = { ...t, history: newHistory };
                historyUpdate = {
                    taskId: t.id,
                    date: dateStr,
                    subtaskCompletions: newCompletions,
                    value: newValue,
                    completed: newCompleted,
                };
                return updatedTask;
            }

            // Period Goals Logic
            if (task.recurrence?.mode === 'period_count' && action === 'period_add') {
                const currentVal = t.history[dateStr];
                const dailyLimit = t.recurrence.dailyLimit !== false;

                let newVal;
                if (dailyLimit) {
                    newVal = true;
                } else {
                    const base = typeof currentVal === 'number' ? currentVal : (currentVal ? 1 : 0);
                    newVal = base + (value || 1);
                    if (newVal < 0) newVal = 0;
                    if (newVal === 0) newVal = false;
                }

                historyUpdate = { date: dateStr, completed: !!newVal, value: typeof newVal === 'number' ? newVal : (newVal ? 1 : 0) };
                updatedTask = { ...t, history: { ...t.history, [dateStr]: newVal } };
                return updatedTask;
            }

            if (t.type === 'quantitative') {
                const current = t.dailyProgress?.[dateStr]?.value || 0; // Note: API data structure might need adjustment for dailyProgress if we rely on history map
                // Actually, for quantitative, we should rely on history map now since we transformed it.
                // But wait, the UI uses t.dailyProgress for quantitative. 
                // We need to ensure t.dailyProgress is derived from history in the transformer or here.
                // Let's assume for now we update history map, and UI reads from history map or we sync them.
                // To minimize UI changes, let's keep dailyProgress structure in state but sync to history.

                // Correction: The API doesn't store dailyProgress JSON, it stores history.
                // So we should update the transformer to populate dailyProgress from history for the current date?
                // Or just update the UI to read from history.
                // Let's stick to updating history map in state.

                const currentHist = t.history[dateStr] || 0;
                const newVal = Math.max(0, currentHist + (value || 0));
                const completedStatus = newVal >= t.dailyTarget;

                historyUpdate = { date: dateStr, completed: completedStatus, value: newVal };
                updatedTask = {
                    ...t,
                    history: { ...t.history, [dateStr]: newVal },
                    // Mock dailyProgress for UI compatibility if needed, or update UI to use history
                    dailyProgress: { ...t.dailyProgress, [dateStr]: { value: newVal, completed: completedStatus } }
                };
                return updatedTask;
            } else {
                const currentStatus = !!t.history?.[dateStr];
                const newCompleted = !currentStatus;

                historyUpdate = { date: dateStr, completed: newCompleted, value: newCompleted ? 1 : 0 };
                updatedTask = {
                    ...t,
                    completed: dateStr === getTodayStr() ? newCompleted : t.completed,
                    history: { ...t.history, [dateStr]: newCompleted }
                };
                return updatedTask;
            }
        });

        setTasks(newTasks);
        if (viewingTask?.id === task.id && updatedTask) {
            setViewingTask(updatedTask);
        }

        // API Call
        try {
            if (updatedTask) {
                await fetch(`/api/tasks/${task.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...updatedTask,
                        historyUpdate
                    })
                });
            }
        } catch (err) {
            console.error('Update failed', err);
            setTasks(prevTasks); // Revert
        }
    };

    const handleSaveTask = async (taskData) => {
        // Sanitize data before sending
        const sanitizedData = {
            ...taskData,
            dailyTarget: taskData.dailyTarget || 1, // Ensure no NaN/null for required logic
            stepValue: taskData.stepValue || 1,
            unit: taskData.unit || '次',
            recurrence: {
                ...taskData.recurrence,
                periodTarget: taskData.recurrence?.periodTarget || 1
            }
        };

        try {
            if (editingTask) {
                // Update
                const res = await fetch(`/api/tasks/${editingTask.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(sanitizedData)
                });
                if (res.ok) {
                    const updated = await res.json();
                    const historyMap = {};
                    if (updated.history) {
                        updated.history.forEach(h => {
                            const val = updated.type === 'quantitative' || updated.recurrence?.mode === 'period_count' ? h.value : h.completed;
                            historyMap[h.date] = val;
                        });
                    }
                    const formatted = { ...updated, history: historyMap };

                    setTasks(prev => prev.map(t => t.id === editingTask.id ? formatted : t));
                } else {
                    const err = await res.json();
                    alert(`儲存失敗: ${err.error || '未知錯誤'}`);
                }
            } else {
                // Create
                const res = await fetch('/api/tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...sanitizedData, userId: user.id })
                });
                if (res.ok) {
                    const created = await res.json();
                    const formatted = { ...created, history: {}, dailyProgress: {} };
                    setTasks(prev => [...prev, formatted]);
                } else {
                    const err = await res.json();
                    alert(`建立失敗: ${err.error || '未知錯誤'}`);
                }
            }
        } catch (err) {
            console.error('Save failed', err);
            alert('儲存失敗，請檢查網路連線');
        }

        setIsFormModalOpen(false);
        setEditingTask(null);
    };

    const handleDeleteTask = async (taskId) => {
        if (window.confirm('確定要刪除此任務嗎？')) {
            const prevTasks = [...tasks];
            setTasks(prev => prev.filter(t => t.id !== taskId));
            setIsFormModalOpen(false);
            setEditingTask(null);

            try {
                await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
            } catch (err) {
                console.error('Delete failed', err);
                setTasks(prevTasks);
                alert('刪除失敗');
            }
        }
    };

    // Group Tasks
    const dailyTasks = tasks.filter(t => isTaskDueToday(t));
    const flexibleTasks = tasks.filter(t => t.recurrence?.mode === 'period_count');

    const hasJoinedFlowerTemplate = (() => {
        if (!user?.typeKey) return false;
        return (assignments || []).some(a =>
            a.status === 'active' &&
            a.template?.category === user.typeKey
        );
    })();

    const hasJoinedSleepTemplate = (() => {
        if (!user?.sleepTypeKey) return false;
        const target = SLEEP_TYPE_PROFILES[user.sleepTypeKey]?.categorySlug;
        if (!target) return false;
        return (assignments || []).some(a =>
            a.status === 'active' &&
            a.template?.category === target
        );
    })();

    const handleTaskClick = (task) => {
        if (task.isLocked) {
            // Cannot edit locked tasks directly
            setViewingTask(task);
            setIsDetailModalOpen(true);
        } else {
            setEditingTask(task);
            setIsFormModalOpen(true);
        }
    };

    const handleDeleteAssignment = async (id) => {
        try {
            const res = await fetch(`/api/user/assignments/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchTasks(user.id);
                fetchAssignments(user.id);
            }
        } catch (error) {
            console.error('Delete assignment error:', error);
        }
    };

    // Group tasks
    const groupedTasks = assignments.map(assignment => ({
        ...assignment,
        tasks: tasks.filter(t => t.assignmentId === assignment.id)
    }));

    const soloTasks = tasks.filter(t => !t.assignmentId);

    if (loading && !user) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-emerald-600 font-bold">載入中...</div>;
    }

    return (
        <>
            <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row max-w-5xl mx-auto overflow-hidden shadow-2xl md:rounded-3xl md:my-8 md:border border-gray-100">
                {/* Mobile Header */}
                <AppHeader
                    onViewChange={setCurrentView}
                    currentView={currentView}
                    onOpenAddFlow={() => { setIsLibraryModalOpen(true); setIsFormModalOpen(false); setEditingTask(null); setSelectedDate(getTodayStr()); }}
                    onOpenBadges={() => setCurrentView('badges')}
                    onOpenExplore={() => setIsTemplateExplorerOpen(true)}
                    user={user}
                    onLogout={handleLogout}
                    onOpenProfile={() => setIsProfileModalOpen(true)}
                    className="md:hidden" // Hide on desktop
                />

                {/* Sidebar (Desktop) */}
                <aside className="hidden md:flex w-64 bg-white flex-col border-r border-gray-100">
                    <div className="p-8 pb-4">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
                                <Target className="text-white" size={24} />
                            </div>
                            <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight">HabitNext</h1>
                        </div>

                        <button
                            onClick={() => setIsTemplateExplorerOpen(true)}
                            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:shadow-emerald-300 transform hover:-translate-y-1 transition-all flex items-center justify-center gap-2 mb-4"
                        >
                            <BookOpen size={20} />
                            探索計畫
                        </button>

                        <button
                            onClick={() => {
                                setEditingTask(null);
                                setIsLibraryModalOpen(true);
                            }}
                            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white p-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transform hover:-translate-y-1 transition-all flex items-center justify-center gap-2 mb-4"
                        >
                            <Compass size={20} />
                            探索習慣
                        </button>

                        <button
                            onClick={() => {
                                setEditingTask(null);
                                setIsFormModalOpen(true);
                            }}
                            className="w-full bg-white text-gray-700 border border-gray-200 p-4 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                            <span className="text-xl leading-none">+</span>
                            建立習慣
                        </button>
                    </div>

                    <nav className="flex-1 px-4 py-2 space-y-2">
                        <button
                            onClick={() => setCurrentView('daily')}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${currentView === 'daily' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <Sun size={20} />
                            今日
                        </button>
                        <button
                            onClick={() => setCurrentView('manage')}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${currentView === 'manage' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <Grid size={20} />
                            計畫總覽
                        </button>
                        <button
                            onClick={() => setCurrentView('dashboard_detail')}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${currentView === 'dashboard_detail' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <Calendar size={20} />
                            日曆
                        </button>
                        <button
                            onClick={() => setCurrentView('stats')}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${currentView === 'stats' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <BarChart3 size={20} />
                            統計
                        </button>
                        <button
                            onClick={() => setCurrentView('badges')}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${currentView === 'badges' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <Award size={20} />
                            成就
                        </button>
                    </nav>

                    <div className="p-4 border-t border-gray-100 space-y-2">
                        <button
                            onClick={() => setIsProfileModalOpen(true)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                        >
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-400 to-purple-400 flex items-center justify-center text-white font-bold text-sm">
                                {user?.nickname?.[0] || user?.name?.[0] || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-800 truncate">{user?.nickname || user?.name || '使用者'}</p>
                                <p className="text-xs text-gray-500 truncate">{user?.phone || user?.email || ''}</p>
                            </div>
                        </button>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-3 p-3 rounded-xl text-left text-red-500 hover:bg-red-50 transition-colors"
                        >
                            <LogOut size={20} />
                            登出
                        </button>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                    {/* Mobile header is now handled above, desktop sidebar handles navigation */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 no-scrollbar">

                        {currentView === 'daily' && (
                            <div className="animate-fade-in-up">
                                <div className="flex items-center justify-between gap-2 mb-3 px-1">
                                    <span className="text-sm text-gray-600">
                                        {isMenstrualMode
                                            ? (menstrualExpired ? '生理期模式（超過 5 天）' : '生理期模式進行中')
                                            : '生理期模式'}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleToggleMenstrual(!isMenstrualMode)}
                                        className={`text-xs font-bold px-3 py-1.5 rounded-full transition-colors ${
                                            isMenstrualMode
                                                ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {isMenstrualMode ? '結束生理期' : '我正在生理期'}
                                    </button>
                                </div>
                                {user?.typeKey && USER_TYPE_PROFILES[user.typeKey] && !hasJoinedFlowerTemplate && (
                                    <div className="bg-gradient-to-br from-rose-50 to-amber-50 border border-rose-100 rounded-2xl p-4 mb-4">
                                        <p className="text-xs text-rose-600 font-bold uppercase tracking-wider">為你準備的小課程</p>
                                        <h3 className="text-lg font-black text-gray-800 mt-1">{USER_TYPE_PROFILES[user.typeKey].label}小課程</h3>
                                        <p className="text-xs text-gray-500 mt-1">根據你的問卷結果量身打造</p>
                                        <button
                                            type="button"
                                            onClick={() => setIsTemplateExplorerOpen(true)}
                                            className="mt-3 px-4 py-2 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 transition-colors"
                                        >
                                            查看小課程 →
                                        </button>
                                    </div>
                                )}
                                {user?.sleepTypeKey && SLEEP_TYPE_PROFILES[user.sleepTypeKey] && !hasJoinedSleepTemplate && (
                                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-4 mb-4">
                                        <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider">為你準備的睡眠處方</p>
                                        <h3 className="text-lg font-black text-gray-800 mt-1">{SLEEP_TYPE_PROFILES[user.sleepTypeKey].label}睡眠處方</h3>
                                        <p className="text-xs text-gray-500 mt-1">14 天循序漸進,從 baby step 開始建立睡眠節奏</p>
                                        <button
                                            type="button"
                                            onClick={() => setIsTemplateExplorerOpen(true)}
                                            className="mt-3 px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-bold hover:bg-indigo-600 transition-colors"
                                        >
                                            查看睡眠處方 →
                                        </button>
                                    </div>
                                )}
                                <DashboardSummaryCard tasks={tasks} onOpenDetail={() => setCurrentView('dashboard_detail')} />

                                <div className="space-y-6">
                                    {/* Section 1: Today's Schedule (Fixed) */}
                                    <div>
                                        <h3 className="text-gray-800 font-bold text-lg mb-4 flex items-center gap-2">
                                            <span className="w-1 h-5 bg-emerald-500 rounded-full"></span> 今日行程
                                        </h3>
                                        <div className="space-y-3">
                                            {dailyTasks.map(task => (
                                                <TaskCard key={task.id} task={task} onClick={() => { setViewingTask(task); setIsDetailModalOpen(true); }} onUpdate={handleUpdateProgress} />
                                            ))}
                                            {dailyTasks.length === 0 && <p className="text-gray-400 text-sm col-span-full">今日無固定行程。</p>}
                                        </div>
                                    </div>

                                    {/* Section 2: Period Goals (Flexible) */}
                                    {flexibleTasks.length > 0 && (
                                        <div>
                                            <h3 className="text-gray-800 font-bold text-lg mb-4 flex items-center gap-2">
                                                <span className="w-1 h-5 bg-amber-500 rounded-full"></span> 週期目標 (彈性)
                                            </h3>
                                            <div className="space-y-3">
                                                {flexibleTasks.map(task => (
                                                    <TaskCard key={task.id} task={task} onClick={() => { setViewingTask(task); setIsDetailModalOpen(true); }} onUpdate={handleUpdateProgress} />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {currentView === 'dashboard_detail' && (
                            <HabitCalendar
                                tasks={tasks}
                                onUpdate={handleUpdateProgress}
                                onTaskClick={(task) => { setViewingTask(task); setIsDetailModalOpen(true); }}
                            />
                        )}

                        {currentView === 'manage' && (
                            <div className="p-4">
                                <h2 className="text-2xl font-black text-gray-800 mb-6">計畫總覽</h2>
                                {/* Tasks List */}
                                <div className="space-y-4 pb-24 md:pb-0">
                                    {loading && <div className="text-center py-10 text-gray-400">載入中...</div>}

                                    {!loading && tasks.length === 0 && (
                                        <div className="text-center py-20">
                                            <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">🌵</div>
                                            <h3 className="text-xl font-bold text-gray-800 mb-2">還沒有習慣</h3>
                                            <p className="text-gray-500 mb-6">開始建立你的第一個習慣，或是探索專家計畫</p>
                                            <div className="flex justify-center gap-4">
                                                <button onClick={() => setIsTemplateExplorerOpen(true)} className="text-emerald-500 font-bold hover:underline">探索計畫</button>
                                                <button onClick={() => setIsFormModalOpen(true)} className="text-indigo-500 font-bold hover:underline">建立習慣</button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Plan Groups */}
                                    {groupedTasks.map(group => (
                                        <PlanGroup
                                            key={group.id}
                                            assignment={group}
                                            tasks={group.tasks}
                                            onDelete={handleDeleteAssignment}
                                            onTaskClick={handleTaskClick}
                                            onTaskEdit={handleTaskClick}
                                            onTaskDelete={handleDeleteTask}
                                            onUpdate={handleUpdateProgress}
                                        />
                                    ))}

                                    {/* Solo Tasks */}
                                    {soloTasks.map(task => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            onClick={() => handleTaskClick(task)}
                                            onUpdate={handleUpdateProgress}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {currentView === 'stats' && (
                            <StatsView userId={user?.id} onBack={() => setCurrentView('daily')} />
                        )}

                        {currentView === 'badges' && (
                            <div className="p-4 text-center py-20">
                                <Award size={64} className="mx-auto text-yellow-400 mb-4" />
                                <h2 className="text-2xl font-bold text-gray-800">成就中心</h2>
                                <p className="text-gray-500">持續完成任務，解鎖更多徽章！</p>
                            </div>
                        )}

                    </div>
                </main>
            </div>

            {/* Modals moved outside to prevent clipping */}
            <TemplateExplorer
                isOpen={isTemplateExplorerOpen}
                onClose={() => setIsTemplateExplorerOpen(false)}
                userId={user?.id}
                onJoin={() => {
                    fetchTasks(user.id);
                    fetchAssignments(user.id);
                }}
                userTypeKey={user?.typeKey || null}
                userSleepTypeKey={user?.sleepTypeKey || null}
            />

            <TaskFormModal
                isOpen={isFormModalOpen}
                onClose={() => { setIsFormModalOpen(false); setEditingTask(null); }}
                onSave={handleSaveTask}
                onDelete={handleDeleteTask}
                initialData={editingTask}
                defaultDate={selectedDate}
                yourTasks={tasks}
                userTypeKey={user?.typeKey || null}
            />

            <TaskDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => { setIsDetailModalOpen(false); setViewingTask(null); }}
                task={viewingTask}
                onEdit={(task) => { setIsDetailModalOpen(false); setEditingTask(task); setIsFormModalOpen(true); }}
                onUpdate={handleUpdateProgress}
            />

            <TaskLibraryModal
                isOpen={isLibraryModalOpen}
                onClose={() => setIsLibraryModalOpen(false)}
                onSelectTask={(task) => { handleSaveTask({ ...task, id: generateId() }); setIsLibraryModalOpen(false); }}
                onOpenCustomForm={() => { setIsLibraryModalOpen(false); setIsFormModalOpen(true); }}
                yourTasks={tasks}
                userTypeKey={user?.typeKey || null}
            />

            <LoginModal
                isOpen={isLoginModalOpen}
                onLogin={handleLogin}
            />

            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                user={user}
                onUpdate={(updatedUser) => {
                    setUser(updatedUser);
                    localStorage.setItem('habit_user', JSON.stringify(updatedUser));
                }}
            />
        </>
    );
};

export default MainApp;
