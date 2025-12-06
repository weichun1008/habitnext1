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
import PlanGroup from './PlanGroup';
import TemplateExplorer from './TemplateExplorer';

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

    const fetchAssignments = async (userId) => {
        try {
            const res = await fetch(`/api/user/assignments?userId=${userId}`);
            if (res.ok) {
                const data = await res.json();
                setAssignments(data);
            }
        } catch (err) {
            console.error('Fetch assignments failed', err);
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
            // Also fetch assignments
            fetchAssignments(userData.id);
        } else {
            fetchTasks(userData.id);
            fetchAssignments(userData.id);
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
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row max-w-7xl mx-auto overflow-hidden shadow-2xl md:rounded-3xl md:my-8 md:border border-gray-100">
            {/* Mobile Header */}
            <AppHeader
                onViewChange={setCurrentView}
                currentView={currentView}
                onOpenAddFlow={() => { setIsLibraryModalOpen(true); setIsFormModalOpen(false); setEditingTask(null); setSelectedDate(getTodayStr()); }}
                onOpenBadges={() => setCurrentView('badges')}
                user={user}
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
                        onClick={() => setCurrentView('badges')}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${currentView === 'badges' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}
                    >
                        <Award size={20} />
                        成就
                    </button>
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={() => { /* handle user profile/settings */ }}
                        className="w-full flex items-center gap-3 p-3 rounded-xl text-left text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                        <User size={20} />
                        {user?.name || '使用者'}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                {/* Mobile header is now handled above, desktop sidebar handles navigation */}
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
                                        onTaskClick={handleTaskClick} // Actually toggle check but reusing handler name
                                        onTaskEdit={handleTaskClick}
                                        onTaskDelete={handleDeleteTask}
                                    />
                                ))}

                                {/* Solo Tasks */}
                                {soloTasks.map(task => (
                                    <TaskCard
                                        key={task.id}
                                        task={task}
                                        onToggle={() => handleUpdateProgress(task, 'toggle')} // Ensure correct toggle logic
                                        onClick={() => handleTaskClick(task)}
                                        onEdit={() => handleTaskClick(task)}
                                        onDelete={() => handleDeleteTask(task.id)}
                                    />
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
