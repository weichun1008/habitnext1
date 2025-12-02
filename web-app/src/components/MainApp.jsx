"use client";

import React, { useState } from 'react';
import { Sun, Calendar, Target, BookOpen, Grid, List, Award, User } from 'lucide-react';
import AppHeader from './AppHeader';
import TaskCard from './TaskCard';
import TaskFormModal from './TaskFormModal';
import TaskLibraryModal from './TaskLibraryModal';
import DashboardSummaryCard from './DashboardSummaryCard';
import DashboardDetailView from './DashboardDetailView';
import { generateId, getTodayStr } from '@/lib/utils';
import { CATEGORY_CONFIG } from '@/lib/constants';

const MainApp = () => {
    const [tasks, setTasks] = useState([
        {
            id: 't1', frequency: 'daily', type: 'quantitative', category: 'footprints',
            title: '走 8000 步', dailyTarget: 8000, unit: '步', stepValue: 1000,
            details: '目標是每日 8000 步，飯後散步是好幫手。',
            dailyProgress: { [getTodayStr()]: { value: 4500, completed: false } },
            recurrence: { type: 'daily', interval: 1 },
            time: '08:00',
            reminder: { enabled: true, offset: 0 },
            history: { '2025-11-26': true, '2025-11-27': true }
        },
        {
            id: 't2', frequency: 'daily', type: 'quantitative', category: 'droplet',
            title: '喝水 1800 cc', dailyTarget: 1800, unit: 'cc', stepValue: 200,
            details: '分批小口喝水，定時提醒自己。',
            dailyProgress: { [getTodayStr()]: { value: 1200, completed: false } },
            recurrence: { type: 'daily', interval: 1 },
            time: '09:00',
            reminder: { enabled: true, offset: 60 },
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
        // Flexible Weekly Goal
        {
            id: 't_flex_1', frequency: 'weekly', type: 'binary', category: 'dumbbell',
            title: '重訓 3 次',
            details: '每週目標：完成 3 次重訓。',
            subtasks: [],
            recurrence: { type: 'weekly', mode: 'period_count', periodTarget: 3 },
            history: { '2025-11-25': true, '2025-11-27': true }
        },
        {
            id: 't4', frequency: 'weekly', type: 'mission', category: 'aperture',
            title: '上傳本週體態照片', completed: false, date: '2025-11-30',
            details: '請在週末前上傳正面、側面、背面。', subtasks: [],
            recurrence: { type: 'weekly', interval: 1 },
            history: {}
        },
    ]);

    const [currentView, setCurrentView] = useState('daily');
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [selectedDate, setSelectedDate] = useState(getTodayStr());

    const handleUpdateProgress = (task, action, value) => {
        setTasks(prev => prev.map(t => {
            if (t.id !== task.id) return t;
            const todayStr = getTodayStr();

            // Period Goals Logic (Directly update history)
            if (task.recurrence?.mode === 'period_count' && action === 'period_add') {
                return {
                    ...t,
                    history: { ...t.history, [todayStr]: true }
                };
            }

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
    // Filter 1: Daily Tasks (Fixed Time)
    const dailyTasks = tasks.filter(t => t.frequency === 'daily' && t.recurrence?.mode !== 'period_count');
    // Filter 2: Period Goals (Flexible)
    const flexibleTasks = tasks.filter(t => t.recurrence?.mode === 'period_count');

    return (
        <div className="bg-gray-50 min-h-screen font-sans flex flex-col md:flex-row w-full max-w-[420px] mx-auto border-x border-gray-200 shadow-2xl">

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
                <AppHeader
                    onViewChange={setCurrentView}
                    currentView={currentView}
                    onOpenAddFlow={() => { setIsLibraryModalOpen(true); setIsFormModalOpen(false); setEditingTask(null); setSelectedDate(getTodayStr()); }}
                    onOpenBadges={() => setCurrentView('badges')}
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
                                            <TaskCard key={task.id} task={task} onClick={() => { setEditingTask(task); setIsFormModalOpen(true); }} onUpdate={handleUpdateProgress} />
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
                                                <TaskCard key={task.id} task={task} onClick={() => { setEditingTask(task); setIsFormModalOpen(true); }} onUpdate={handleUpdateProgress} />
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

                {/* Bottom Nav (Mobile Only - Mimicking the snippet's bottom nav if needed, but keeping it simple for now as per previous design) */}
                {/* The previous design didn't have a bottom nav in MainApp, it relied on AppHeader. I'll stick to AppHeader for navigation within the mobile view context. */}

                {/* Modals */}
                <TaskFormModal
                    isOpen={isFormModalOpen}
                    onClose={() => { setIsFormModalOpen(false); setEditingTask(null); }}
                    onSave={handleSaveTask}
                    onDelete={handleDeleteTask}
                    initialData={editingTask}
                    defaultDate={selectedDate}
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
