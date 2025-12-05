"use client";

import React, { useState, useEffect } from 'react';
import { Sun, Calendar, Target, BookOpen, Grid, List, Award, User } from 'lucide-react';
import AppHeader from './AppHeader';
import TaskCard from './TaskCard';
import TaskFormModal from './TaskFormModal';
import TaskLibraryModal from './TaskLibraryModal';
import DashboardSummaryCard from './DashboardSummaryCard';
import DashboardDetailView from './DashboardDetailView';
import TaskDetailModal from './TaskDetailModal';
import LoginModal from './LoginModal';
import { generateId, getTodayStr, isTaskDueToday } from '@/lib/utils';
import { CATEGORY_CONFIG } from '@/lib/constants';

const MainApp = () => {
    const [user, setUser] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const [currentView, setCurrentView] = useState('daily');
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

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
                            const val = t.type === 'quantitative' || t.recurrence?.mode === 'period_count' ? h.value : h.completed;
                            historyMap[h.date] = val;

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
                        const val = t.type === 'quantitative' || t.recurrence?.mode === 'period_count' ? h.value : h.completed;
                        historyMap[h.date] = val;

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
        } else {
            fetchTasks(userData.id);
        }
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
                const newSubtasks = t.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s);
                updatedTask = { ...t, subtasks: newSubtasks };
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

    if (loading && !user) {
        return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-emerald-600 font-bold">載入中...</div>;
    }

    return (
        <div className="bg-gray-50 min-h-screen font-sans flex flex-col md:flex-row w-full max-w-[420px] mx-auto border-x border-gray-200 shadow-2xl">

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <AppHeader
                    onViewChange={setCurrentView}
                    currentView={currentView}
                    onOpenAddFlow={() => { setIsLibraryModalOpen(true); setIsFormModalOpen(false); setEditingTask(null); setSelectedDate(getTodayStr()); }}
                    onOpenBadges={() => setCurrentView('badges')}
                    user={user}
                />

                <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 no-scrollbar">

                    {currentView === 'daily' && (
                        <div className="animate-fade-in-up">
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
                        <DashboardDetailView tasks={tasks} />
                    )}

                    {currentView === 'manage' && (
                        <div className="p-4">
                            <h2 className="text-2xl font-black text-gray-800 mb-6">計畫總覽</h2>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
                                {tasks.map(task => (
                                    <div key={task.id} onClick={() => { setEditingTask(task); setIsFormModalOpen(true); }} className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${(CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG['star']).bg}`}>
                                                <IconRenderer category={task.category} size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800">{task.title}</h4>
                                                <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                                    {task.recurrence?.mode === 'period_count'
                                                        ? `${task.frequency === 'weekly' ? '每週' : '每月'} ${task.recurrence.periodTarget} 次`
                                                        : (task.frequency === 'daily' ? '每天' : '特定日')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {currentView === 'badges' && (
                        <div className="p-4 text-center py-20">
                            <Award size={64} className="mx-auto text-yellow-400 mb-4" />
                            <h2 className="text-2xl font-bold text-gray-800">成就中心</h2>
                            <p className="text-gray-500">持續完成任務，解鎖更多徽章！</p>
                        </div>
                    )}

                </div>

                {/* Modals */}
                <TaskFormModal
                    isOpen={isFormModalOpen}
                    onClose={() => { setIsFormModalOpen(false); setEditingTask(null); }}
                    onSave={handleSaveTask}
                    onDelete={handleDeleteTask}
                    initialData={editingTask}
                    defaultDate={selectedDate}
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
                />

                <LoginModal
                    isOpen={isLoginModalOpen}
                    onLogin={handleLogin}
                />

            </main>
        </div>
    );
};

export default MainApp;
