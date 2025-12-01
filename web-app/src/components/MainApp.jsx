"use client";

import React, { useState } from 'react';
import { Sun, Calendar, Target } from 'lucide-react';
import AppHeader from './AppHeader';
import TaskCard from './TaskCard';
import TaskFormModal from './TaskFormModal';
import TaskLibraryModal from './TaskLibraryModal';
import DashboardSummaryCard from './DashboardSummaryCard';
import DashboardDetailView from './DashboardDetailView';
import { generateId, getTodayStr } from '@/lib/utils';

const MainApp = () => {
    const [tasks, setTasks] = useState([
        {
            id: 't1', frequency: 'daily', type: 'quantitative', category: 'footprints',
            title: '走 8000 步', dailyTarget: 8000, unit: '步', stepValue: 1000,
            details: '目標是每日 8000 步，飯後散步是好幫手。',
            dailyProgress: { [getTodayStr()]: { value: 4500, completed: false } },
            recurrence: { type: 'daily', interval: 1 },
            reminder: { type: 'smart', time: '20:00', condition: 'if_incomplete' },
            history: { '2025-11-26': true, '2025-11-27': true }
        },
        {
            id: 't2', frequency: 'daily', type: 'quantitative', category: 'droplet',
            title: '喝水 1800 cc', dailyTarget: 1800, unit: 'cc', stepValue: 200,
            details: '分批小口喝水，定時提醒自己。',
            dailyProgress: { [getTodayStr()]: { value: 1200, completed: false } },
            recurrence: { type: 'daily', interval: 1 },
            reminder: { type: 'fixed', time: '10:00' },
            history: { '2025-11-26': false }
        },
        {
            id: 't3', frequency: 'daily', type: 'checklist', category: 'pill',
            title: '服用保健食品',
            details: '請在早餐或午餐後服用。',
            subtasks: [
                { id: 's1', title: '魚油', completed: true },
                { id: 's2', title: '維生素 B', completed: false },
            ],
            completed: false,
            recurrence: { type: 'daily', interval: 1 },
            history: {}
        },
        {
            id: 't4', frequency: 'weekly', type: 'mission', category: 'aperture',
            title: '上傳本週體態照片', completed: false, date: '2025-11-30',
            details: '請在週末前上傳正面、側面、背面。', subtasks: [],
            recurrence: { type: 'weekly', interval: 1 },
            history: {}
        },
        {
            id: 't6', frequency: 'monthly', type: 'mission', category: 'target',
            title: '設定下月體脂目標', completed: false, date: '2025-11-30',
            details: '檢視本月成果，設定新的挑戰。', subtasks: [],
            recurrence: { type: 'monthly', interval: 1 },
            history: {}
        },
    ]);

    const [currentView, setCurrentView] = useState('daily');
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);

    const handleUpdateProgress = (task, action, value) => {
        setTasks(prev => prev.map(t => {
            if (t.id !== task.id) return t;
            const todayStr = getTodayStr();

            if (t.type === 'quantitative') {
                const current = t.dailyProgress[todayStr]?.value || 0;
                const newVal = Math.max(0, current + (value || 0));
                const completedStatus = newVal >= t.dailyTarget;
                return {
                    ...t,
                    dailyProgress: { ...t.dailyProgress, [todayStr]: { value: newVal, completed: completedStatus } },
                    history: { ...(t.history || {}), [todayStr]: completedStatus }
                };
            } else {
                const newCompleted = !t.completed;
                return {
                    ...t,
                    completed: newCompleted,
                    history: { ...(t.history || {}), [todayStr]: newCompleted }
                };
            }
        }));
    };

    const handleSaveTask = (taskData) => {
        const todayStr = getTodayStr();
        const baseTask = {
            ...taskData,
            dailyTarget: taskData.dailyTarget || 1,
            unit: taskData.unit || '次',
            stepValue: taskData.stepValue || 1,
            dailyProgress: taskData.type === 'quantitative' ? (taskData.dailyProgress || { [todayStr]: { value: 0, completed: false } }) : {},
            completed: taskData.type !== 'quantitative' ? false : taskData.completed,
            history: taskData.history || {}
        };

        if (editingTask) {
            setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...baseTask, id: t.id } : t));
        } else {
            setTasks(prev => [...prev, { ...baseTask, id: generateId() }]);
        }
        setIsFormModalOpen(false);
        setEditingTask(null);
    };

    const handleDeleteTask = (taskId) => {
        if (window.confirm('確定要刪除此任務嗎？')) {
            setTasks(prev => prev.filter(t => t.id !== taskId));
            setIsFormModalOpen(false);
            setEditingTask(null);
        }
    };

    // Group Tasks
    const dailyTasks = tasks.filter(t => t.frequency === 'daily');
    const weeklyTasks = tasks.filter(t => t.frequency === 'weekly');
    const monthlyTasks = tasks.filter(t => t.frequency === 'monthly');

    return (
        <div className="bg-gray-50 min-h-screen font-sans flex flex-col md:flex-row w-full max-w-[420px] mx-auto border-x border-gray-200 shadow-2xl">

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <AppHeader
                    onViewChange={setCurrentView}
                    currentView={currentView}
                    onOpenAddFlow={() => setIsLibraryModalOpen(true)}
                    onOpenBadges={() => alert('成就系統即將推出！')}
                />

                <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 no-scrollbar">

                    {currentView === 'daily' && (
                        <div className="animate-fade-in-up">
                            <DashboardSummaryCard tasks={tasks} onOpenDetail={() => setCurrentView('dashboard_detail')} />

                            <div className="space-y-6">
                                {/* Daily Section */}
                                <div>
                                    <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <Sun size={20} className="text-orange-500" /> 今日任務
                                    </h2>
                                    <div className="space-y-3">
                                        {dailyTasks.map(task => (
                                            <TaskCard
                                                key={task.id}
                                                task={task}
                                                onClick={() => { setEditingTask(task); setIsFormModalOpen(true); }}
                                                onUpdate={handleUpdateProgress}
                                            />
                                        ))}
                                        {dailyTasks.length === 0 && <p className="text-gray-400 text-sm text-center py-4">今天沒有任務，去新增一個吧！</p>}
                                    </div>
                                </div>

                                {/* Weekly Section */}
                                {weeklyTasks.length > 0 && (
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                            <Calendar size={20} className="text-blue-500" /> 本週目標
                                        </h2>
                                        <div className="space-y-3">
                                            {weeklyTasks.map(task => (
                                                <TaskCard
                                                    key={task.id}
                                                    task={task}
                                                    onClick={() => { setEditingTask(task); setIsFormModalOpen(true); }}
                                                    onUpdate={handleUpdateProgress}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Monthly Section */}
                                {monthlyTasks.length > 0 && (
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                                            <Target size={20} className="text-purple-500" /> 本月挑戰
                                        </h2>
                                        <div className="space-y-3">
                                            {monthlyTasks.map(task => (
                                                <TaskCard
                                                    key={task.id}
                                                    task={task}
                                                    onClick={() => { setEditingTask(task); setIsFormModalOpen(true); }}
                                                    onUpdate={handleUpdateProgress}
                                                />
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

                </div>

                {/* Modals */}
                <TaskFormModal
                    isOpen={isFormModalOpen}
                    onClose={() => { setIsFormModalOpen(false); setEditingTask(null); }}
                    onSave={handleSaveTask}
                    onDelete={handleDeleteTask}
                    initialData={editingTask}
                />

                <TaskLibraryModal
                    isOpen={isLibraryModalOpen}
                    onClose={() => setIsLibraryModalOpen(false)}
                    onSelectTask={(task) => { handleSaveTask({ ...task, id: generateId() }); setIsLibraryModalOpen(false); }}
                    onOpenCustomForm={() => { setIsLibraryModalOpen(false); setIsFormModalOpen(true); }}
                />

            </main>
        </div>
    );
};

export default MainApp;
