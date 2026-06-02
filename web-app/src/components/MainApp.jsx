"use client";

import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Sun, Calendar, Target, BookOpen, Grid, List, Award, User, Compass, BarChart3, ChevronDown, ChevronUp, Map } from 'lucide-react';
import AppHeader from './AppHeader';
import WeekStrip from './WeekStrip';
import TaskCard from './TaskCard';
import UndoToast from './UndoToast';
import TaskFormModal from './TaskFormModal';
import TaskLibraryModal from './TaskLibraryModal';
import DashboardSummaryCard from './DashboardSummaryCard';
import HabitCalendar from './HabitCalendar';
import TaskDetailModal from './TaskDetailModal';
import LoginModal from './LoginModal';
import { generateId, getTodayStr, isTaskDueToday, isCompletedOnDate } from '@/lib/utils';
import { cueOrderFor } from '@/lib/anchors';
import { getCachedPosition } from '@/lib/geolocation';
import { nearestCity } from '@/lib/cities';
import { USER_TYPE_PROFILES } from '@/lib/typeKeys';
import { SLEEP_TYPE_PROFILES } from '@/lib/sleepTypeKeys';
import { CATEGORY_CONFIG, domainToIconKey } from '@/lib/constants';
import { visibleSubtasks, computeChecklistValue } from '@/lib/subtasks';
import PlanGroup from './PlanGroup';
import TemplateExplorer from './TemplateExplorer';
import ProfileModal from './ProfileModal';
import Avatar from './Avatar';
import AspirationPicker from './AspirationPicker';
import AspirationRecommendationPanel from './AspirationRecommendationPanel';
import FocusMapModal from './FocusMapModal';
import JourneyView from './journey/JourneyView';

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

    // Slice K — aspiration-driven add flow.
    //   - isAspirationPickerOpen: Step 1 modal (嚮往 Picker) visibility.
    //   - activeAspiration: the chosen aspiration row. When non-null, the
    //     RecommendationPanel renders on top of the picker. Kept set until
    //     the downstream Task/Assignment commits, at which point
    //     handleSaveTask / handleTemplateJoined tag AspirationHabit rows.
    //     Cleared on every flow exit (picker close, modal close mid-flow).
    //   - initialTemplateForExplorer: when set, TemplateExplorer opens with
    //     this template's detail panel pre-expanded (saves the user a scroll).
    //   - aspirationHabitForLibrary: when set, TaskLibraryModal opens with
    //     this single habit pre-selected (skipping the domain grid) so the
    //     user goes through the full difficulty / anchor / identity flow.
    //     Lifecycle mirrors activeAspiration: set on RecommendationPanel pick,
    //     cleared when library closes.
    const [isAspirationPickerOpen, setIsAspirationPickerOpen] = useState(false);

    // Slice L — focus map / candidate pool.
    //   - isFocusMapModalOpen: controls FocusMapModal visibility
    //   - candidateCount: cached number of candidate-status tasks; banner
    //     appears when >= 5. Refreshed after add/rate/login.
    //   - bannerDismissed: per-session hide flag (resets on page reload).
    const [isFocusMapModalOpen, setIsFocusMapModalOpen] = useState(false);
    const [candidateCount, setCandidateCount] = useState(0);
    const [bannerDismissed, setBannerDismissed] = useState(false);
    // Daily view — completed-section collapse state. Defaults to collapsed
    // so the daily list visually focuses on incomplete tasks; users tap the
    // divider row to peek at what they've already done. Session-only (resets
    // on full page reload), no persistence needed.
    const [completedExpanded, setCompletedExpanded] = useState(false);
    // Completion-flow animation — when a binary task is toggled to complete
    // we keep the card visible for ~700ms (so the check-pop animation reads),
    // then collapse the row height for ~300ms, then re-fetch to remove it.
    // During the window, the user sees a 還原 undo toast.
    //   completingTaskIds: cards in the full t=0→1000ms completion window.
    //     Keeps them pinned to the *incomplete* list (so the check shows +
    //     pulses) even though their optimistic isCompleted already flipped.
    //   exitingTaskIds:    subset in the t=700ms→1000ms collapse phase;
    //     drives the max-height/opacity slide-out class.
    //   undoToast:      the most-recent completion's undo snackbar payload
    //   exitTimersRef:  cancellation handles, keyed by taskId
    const [completingTaskIds, setCompletingTaskIds] = useState(() => new Set());
    const [exitingTaskIds, setExitingTaskIds] = useState(() => new Set());
    const [undoToast, setUndoToast] = useState(null);   // { taskId, message, date } | null
    const exitTimersRef = useRef({});
    const [activeAspiration, setActiveAspiration] = useState(null);
    const [initialTemplateForExplorer, setInitialTemplateForExplorer] = useState(null);
    const [aspirationHabitForLibrary, setAspirationHabitForLibrary] = useState(null);

    console.log('MainApp Render:', { user, isTemplateExplorerOpen }); // Debug Log

    const [editingTask, setEditingTask] = useState(null);
    const [viewingTask, setViewingTask] = useState(null);
    const [selectedDate, setSelectedDate] = useState(getTodayStr());

    // Slice P — journey world. Fetched on-demand when the user opens the
    // 旅程 view (click-triggered, see the sidebar button below).
    const [journeyData, setJourneyData] = useState(null);
    const [journeyLoading, setJourneyLoading] = useState(false);

    // Slice Q — photo capture. attachingKey = `${taskId}:${dateStr}` while a
    // single row's compress/upload is in flight (drives MemoryCapture busy).
    const [attachingKey, setAttachingKey] = useState(null);

    // 1. Check Auth on Load
    useEffect(() => {
        const storedUser = localStorage.getItem('habit_user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            fetchTasks(parsedUser.id);
            fetchAssignments(parsedUser.id);
            fetchCandidateCount(parsedUser.id);  // Slice L
        } else {
            setIsLoginModalOpen(true);
            setLoading(false);
        }
    }, []);

    // Slice L — refresh candidate count after add/rate. Cheap fetch (1 row).
    const fetchCandidateCount = async (userId) => {
        try {
            const res = await fetch(`/api/tasks/candidates?userId=${userId}`);
            if (res.ok) {
                const data = await res.json();
                setCandidateCount(Array.isArray(data) ? data.length : 0);
            }
        } catch (e) {
            console.error('Fetch candidate count error', e);
        }
    };

    // Slice P — fetch the journey world (read-only aggregation). Triggered
    // by the 旅程 sidebar button; cheap enough to re-fetch on each open.
    const fetchJourney = async (uid) => {
        if (!uid) return;
        setJourneyLoading(true);
        try {
            const res = await fetch(`/api/journey?userId=${uid}`);
            if (res.ok) setJourneyData(await res.json());
        } catch (e) { console.error('fetchJourney failed', e); }
        finally { setJourneyLoading(false); }
    };

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
                    const locationByDate = {};   // ★ Slice O — { 'yyyy-mm-dd': '台北' }
                    const photoByDate = {};      // ★ Slice Q — { 'yyyy-mm-dd': true }

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

                            if (h.city) locationByDate[h.date] = h.city;   // ★ Slice O
                            if (h.photoUrl) photoByDate[h.date] = true;    // ★ Slice Q
                        });
                    }
                    return { ...t, history: historyMap, dailyProgress: dailyProgressMap, locationByDate, photoByDate };
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
            fetchCandidateCount(userData.id);  // Slice L
        } else {
            fetchTasks(userData.id);
            fetchAssignments(userData.id);
            fetchCandidateCount(userData.id);  // Slice L
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

        // Slice O — capture city on a completion (not un-completion) when the
        // user has opted in. Best-effort: failure / denial just skips location.
        if (historyUpdate && historyUpdate.completed && user?.trackLocation) {
            try {
                const pos = await getCachedPosition({ maxAgeMs: 15 * 60 * 1000 });
                if (pos) {
                    const city = nearestCity(pos.lat, pos.lng);
                    if (city) {
                        historyUpdate.lat = pos.lat;
                        historyUpdate.lng = pos.lng;
                        historyUpdate.city = city;
                        setTasks(prev => prev.map(t => t.id === task.id
                            ? { ...t, locationByDate: { ...(t.locationByDate || {}), [dateStr]: city } }
                            : t));
                    }
                }
            } catch (e) {
                console.warn('[Slice O] location capture skipped', e);
            }
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

    // Slice O — manual city correction from a card's / detail's LocationChip.
    // Persists city on the date's TaskHistory without disturbing completion value.
    const handlePickLocation = async (task, dateStr, cityName) => {
        setTasks(prev => prev.map(t => t.id === task.id
            ? { ...t, locationByDate: { ...(t.locationByDate || {}), [dateStr]: cityName } }
            : t));
        const curVal = task.history?.[dateStr];
        const valNum = typeof curVal === 'number' ? curVal
            : (curVal && typeof curVal === 'object' ? (curVal.value || 0) : (curVal ? 1 : 0));
        try {
            await fetch(`/api/tasks/${task.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...task,
                    historyUpdate: { date: dateStr, completed: true, value: valNum, city: cityName },
                }),
            });
        } catch (e) {
            console.error('pick location failed', e);
        }
    };

    // Slice Q — attach a meal photo to a completed+located row. Compresses
    // client-side (strips EXIF/GPS), then the actual Blob upload is GUARDED:
    // Vercel Blob isn't provisioned yet, so the dynamic @vercel/blob/client
    // import is expected to fail and we surface a "coming soon" notice rather
    // than throwing. Q1b wires the real mod.upload(...) + PUT photoUrl here.
    const handleAttachPhoto = async (task, dateStr, file) => {
        if (!file) return;
        setAttachingKey(`${task.id}:${dateStr}`);
        try {
            const { compressImage } = await import('@/lib/imageCompress');
            await compressImage(file);
            // ★ Blob 上傳 guard：Vercel Blob 尚未供應（Q1b 接線）
            let uploaded = null;
            try {
                // webpackIgnore: @vercel/blob/client 尚未安裝，避免 bundler 在
                // build 期靜態解析失敗；Q1b 安裝套件後此匯入才會真正成立。
                await import(/* webpackIgnore: true */ '@vercel/blob/client');
                // Q1b 會在這裡呼叫 mod.upload(...)；目前無 token，視為未供應
                uploaded = null;
            } catch {
                uploaded = null;
            }
            if (!uploaded) {
                console.info('[Slice Q] 美食回憶即將推出（Blob 尚未供應）');
                return;
            }
            // 有上傳結果（Q1b）→ PUT photoUrl（鏡像 handlePickLocation 的 PUT 形狀）
            // const curVal = task.history?.[dateStr];
            // const valNum = typeof curVal === 'number' ? curVal
            //     : (curVal && typeof curVal === 'object' ? (curVal.value || 0) : (curVal ? 1 : 0));
            // await fetch(`/api/tasks/${task.id}`, {
            //     method: 'PUT', headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ ...task, historyUpdate: { date: dateStr, completed: true, value: valNum, photoUrl: uploaded.url } }),
            // });
            // setTasks(prev => prev.map(t => t.id === task.id
            //     ? { ...t, photoByDate: { ...(t.photoByDate || {}), [dateStr]: true } } : t));
            // if (user?.id) fetchTasks(user.id);
        } catch (err) {
            console.error('attach photo failed', err);
        } finally {
            setAttachingKey(null);
        }
    };

    // ────────────────────────────────────────────────────────────────
    // Completion-flow animation glue
    //
    // handleTaskUpdate wraps handleUpdateProgress: it runs the existing
    // optimistic update + API call unchanged, then for a binary 'toggle'
    // that transitioned the task to completed on the SELECTED date, it
    // schedules a three-phase animation:
    //   t=0      check-pop runs inside TaskCard (it detects the false→true
    //            transition via its own useEffect)
    //   t=700ms  add task.id to exitingTaskIds → wrapper collapses height
    //   t=1000ms re-fetch tasks (server truth) → row leaves the DOM
    // Undo toast shows for 5s; tapping it cancels the pending exit AND
    // toggles the task back to incomplete via the same handleUpdateProgress
    // path with action='toggle' (which flips it back since now completed).
    // ────────────────────────────────────────────────────────────────

    const clearExitTimersFor = (taskId) => {
        const t = exitTimersRef.current[taskId];
        if (!t) return;
        clearTimeout(t.collapseAt);
        clearTimeout(t.fetchAt);
        delete exitTimersRef.current[taskId];
    };

    const scheduleCompletionExit = (task) => {
        clearExitTimersFor(task.id);
        // Phase 1 (t=0) — pin the card in the incomplete list so its check
        // shows + pulses. Without this the optimistic isCompleted=true would
        // make the partition filter drop the card immediately (vanish bug).
        setCompletingTaskIds(prev => {
            const next = new Set(prev);
            next.add(task.id);
            return next;
        });
        const collapseAt = setTimeout(() => {
            // Phase 2 (t=700ms) — start the height-collapse animation. The
            // check has now been visible ~700ms; the wrapper class transitions
            // max-height + opacity over 300ms.
            setExitingTaskIds(prev => {
                const next = new Set(prev);
                next.add(task.id);
                return next;
            });
            const fetchAt = setTimeout(() => {
                // Phase 3 (t=1000ms) — refresh from server and release both
                // sets. The completed task now naturally sorts into the
                // (collapsed) 已完成 N 個 section.
                if (user?.id) fetchTasks(user.id);
                setExitingTaskIds(prev => {
                    const next = new Set(prev);
                    next.delete(task.id);
                    return next;
                });
                setCompletingTaskIds(prev => {
                    const next = new Set(prev);
                    next.delete(task.id);
                    return next;
                });
                delete exitTimersRef.current[task.id];
            }, 300);
            exitTimersRef.current[task.id] = { collapseAt: null, fetchAt };
        }, 700);
        exitTimersRef.current[task.id] = { collapseAt, fetchAt: null };
    };

    const handleUndoCompletion = async () => {
        if (!undoToast) return;
        const { taskId } = undoToast;

        // Cancel any pending exit animation + clear the row out of both sets
        // immediately so the card snaps back to full height and full opacity.
        clearExitTimersFor(taskId);
        setExitingTaskIds(prev => {
            const next = new Set(prev);
            next.delete(taskId);
            return next;
        });
        setCompletingTaskIds(prev => {
            const next = new Set(prev);
            next.delete(taskId);
            return next;
        });

        // Flip completion off via the same handler the card uses.
        const t = tasks.find(x => x.id === taskId);
        if (t) {
            // selectedDate is current view; if user navigated away meanwhile
            // we still un-complete on the original date.
            await handleUpdateProgress(t, 'toggle', null, null, undoToast.date || selectedDate);
        }
        setUndoToast(null);
    };

    const handleTaskUpdate = (task, action, value, subtaskId, dateStr) => {
        const date = dateStr || selectedDate;
        // Snapshot the pre-update completion state on the relevant date.
        // We compare against this AFTER the underlying update to decide if
        // this action moved the task from incomplete → complete.
        const wasCompleted = isCompletedOnDate(task, date);

        handleUpdateProgress(task, action, value, subtaskId, date);

        // Only celebrate a binary 'toggle' that flipped false → true on the
        // currently-viewed date. Subtask toggle completion happens via the
        // inline accordion which has its own X/Y feedback; quantitative
        // tasks have a progress bar. Layering a slide-out + toast on those
        // would be noise.
        if (action !== 'toggle' || wasCompleted) return;
        if (date !== selectedDate) return;
        if (task.type === 'quantitative') return;
        if (task.type === 'checklist') return;   // checklist completes via subtasks

        scheduleCompletionExit(task);
        setUndoToast({
            taskId: task.id,
            date,
            message: `完成「${task.title}」`,
        });
    };

    // Clean up timers + toast on unmount.
    useEffect(() => () => {
        Object.keys(exitTimersRef.current).forEach(clearExitTimersFor);
    }, []);   // eslint-disable-line react-hooks/exhaustive-deps

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
                    // Slice L — candidates don't appear in the daily view yet;
                    // bump the candidate count badge instead of adding to tasks.
                    if (created.status === 'candidate') {
                        setCandidateCount(c => c + 1);
                    } else {
                        const formatted = { ...created, history: {}, dailyProgress: {} };
                        setTasks(prev => [...prev, formatted]);
                    }

                    // Slice K — if the user entered through the aspiration
                    // flow, tag this new task as belonging to that aspiration.
                    // Best-effort: a failure here doesn't roll back the task,
                    // it just leaves the aspiration's habit count under-counted.
                    if (activeAspiration?.id) {
                        try {
                            await fetch(`/api/aspirations/${activeAspiration.id}/habits`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ taskId: created.id }),
                            });
                        } catch (e) {
                            console.warn('[MainApp] aspiration habit tag failed:', e);
                        }
                        setActiveAspiration(null);
                    }
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

    // ────────────────────────────────────────────────────────────────
    // Slice K — aspiration flow callbacks (Picker → RecommendationPanel
    // → existing template/habit flows). Centralised here so the modal
    // tree stays readable and activeAspiration's lifetime is obvious.
    // ────────────────────────────────────────────────────────────────

    // Picker's onSelectAspiration: store the chosen aspiration; the
    // RecommendationPanel renders on top because it's gated by activeAspiration.
    const handleAspirationSelected = (aspiration) => {
        setActiveAspiration(aspiration);
    };

    // RecommendationPanel "加入候選": create a Task with status='candidate'
    // from the OfficialHabit + its first enabled difficulty (typically
    // beginner). The user defers difficulty / anchor / identity choices to
    // the FocusMap rating step. We keep the panel open so the user can
    // accumulate multiple candidates before evaluating.
    const handleAddHabitAsCandidate = async (habit, aspiration) => {
        if (!user?.id || !habit) {
            console.warn('[MainApp] add candidate aborted — missing user or habit');
            return;
        }

        const difficulties = habit.difficulties || {};
        const firstEnabledKey = ['beginner', 'intermediate', 'challenge']
            .find(k => difficulties[k]?.enabled);
        const diffConfig = firstEnabledKey ? difficulties[firstEnabledKey] : {};

        const taskPayload = {
            userId: user.id,
            title: habit.name,
            details: habit.description || '',
            type: diffConfig.type || 'binary',
            category: habit.icon || domainToIconKey(habit.category),
            frequency: diffConfig.recurrence?.type || 'daily',
            recurrence: diffConfig.recurrence || { type: 'daily', interval: 1, endType: 'never' },
            reminder: { enabled: false, offset: 0 },
            dailyTarget: diffConfig.dailyTarget || 1,
            unit: diffConfig.unit || '次',
            stepValue: diffConfig.stepValue || 1,
            subtasks: diffConfig.subtasks || [],
            officialHabitId: habit.id,
            status: 'candidate',
        };

        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(taskPayload),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const created = await res.json();

            setCandidateCount(c => c + 1);

            // Tag with aspiration — best-effort, same pattern as handleSaveTask.
            if (aspiration?.id) {
                fetch(`/api/aspirations/${aspiration.id}/habits`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ taskId: created.id }),
                }).catch(e => console.warn('[MainApp] aspiration habit tag failed:', e));
            }
        } catch (e) {
            console.error('[MainApp] add candidate failed:', e);
            alert('加入候選失敗，請再試一次');
            throw e;  // let the panel's pickingId clear so the button can retry
        }
    };

    // RecommendationPanel sticky-CTA "開始評分": tear down the aspiration
    // chain (panel + picker) and open the focus-map modal directly. Bypasses
    // the dashboard banner's 5+ threshold for users who want to evaluate
    // mid-session.
    const handleOpenFocusMapFromPanel = () => {
        setIsAspirationPickerOpen(false);
        setActiveAspiration(null);
        setIsFocusMapModalOpen(true);
    };

    // RecommendationPanel back arrow → keep picker open, drop activeAspiration
    // so the panel unmounts but Step 1 is still visible underneath.
    const handleRecommendationBack = () => {
        setActiveAspiration(null);
    };

    // Pick a template from the recommendation panel: close the picker chain,
    // open the existing TemplateExplorer with the picked template's detail
    // pane auto-expanded. activeAspiration is kept so the eventual onJoin
    // can write AspirationHabit rows for each task the assignment spawns.
    const handlePickTemplateFromAspiration = (template) => {
        setIsAspirationPickerOpen(false);
        setInitialTemplateForExplorer(template);
        setIsTemplateExplorerOpen(true);
    };

    // Pick a habit from the recommendation panel: close the picker chain
    // and hand the habit to TaskLibraryModal as `initialHabit`. The library
    // jumps to that habit's list view so the user picks difficulty, then
    // walks the existing anchor → identity → emit flow. handleSaveTask
    // writes AspirationHabit afterward because activeAspiration is still
    // set when the library's onSelectTask fires.
    const handlePickHabitFromAspiration = (habit) => {
        setIsAspirationPickerOpen(false);
        setAspirationHabitForLibrary(habit);
        setIsLibraryModalOpen(true);
    };

    // Skip-to-explore branches: aspiration is dropped on purpose — these are
    // the "I'd rather just browse" exits. Closes the picker chain and lands
    // the user on the same explorer / library modal they had before Slice K.
    const handleSkipToTemplates = () => {
        setIsAspirationPickerOpen(false);
        setActiveAspiration(null);
        setInitialTemplateForExplorer(null);
        setIsTemplateExplorerOpen(true);
    };
    const handleSkipToHabits = () => {
        setIsAspirationPickerOpen(false);
        setActiveAspiration(null);
        setIsLibraryModalOpen(true);
    };

    // Picker close (X button or backdrop tap): clear all aspiration state.
    const handleAspirationPickerClose = () => {
        setIsAspirationPickerOpen(false);
        setActiveAspiration(null);
    };

    // TemplateExplorer onJoin — called after an assignment is created. When
    // the user arrived via the aspiration flow, tag every task the assignment
    // spawned with an AspirationHabit row. We can't get the tasks from
    // confirmJoin's response (it only returns the assignment), so we fetch
    // them fresh and filter by assignmentId.
    const handleTemplateJoined = async (assignment) => {
        fetchTasks(user.id);
        fetchAssignments(user.id);
        if (activeAspiration?.id && assignment?.id) {
            try {
                const res = await fetch(`/api/tasks?userId=${user.id}`, { cache: 'no-store' });
                if (res.ok) {
                    const allTasks = await res.json();
                    const newTasks = allTasks.filter(t => t.assignmentId === assignment.id);
                    await Promise.all(newTasks.map(t =>
                        fetch(`/api/aspirations/${activeAspiration.id}/habits`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ taskId: t.id }),
                        }).catch(e => console.warn('[MainApp] tag fail for task', t.id, e))
                    ));
                }
            } catch (e) {
                console.warn('[MainApp] aspiration template tag failed:', e);
            }
            setActiveAspiration(null);
        }
        setInitialTemplateForExplorer(null);
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

    // Group Tasks — daily filter follows selectedDate so the interactive
    // week strip can preview future days and replay past days. Period
    // (week/month-windowed) tasks always show on the daily view since
    // their progress doesn't shift by browsing date.
    // Slice M — daily view sort:
    //   1. status='active' only (paused/archived 已被 GET /api/tasks?status=active 過濾，
    //      但加保險避免 stale state)
    //   2. 未完成在上、已完成在下
    //   3. 組內按 cue 在 anchors.js 中的時間序升冪
    //   4. tie-break: createdAt asc
    const dailyTasks = tasks
        .filter(t => isTaskDueToday(t, selectedDate))
        .filter(t => !t.status || t.status === 'active')  // safety: hide paused/archived
        .sort((a, b) => {
            const ac = isCompletedOnDate(a, selectedDate) ? 1 : 0;
            const bc = isCompletedOnDate(b, selectedDate) ? 1 : 0;
            if (ac !== bc) return ac - bc;
            const ao = cueOrderFor(a.cue);
            const bo = cueOrderFor(b.cue);
            if (ao !== bo) return ao - bo;
            return new Date(a.createdAt) - new Date(b.createdAt);
        });
    // Split into incomplete (rendered prominently above) + completed (rendered
    // inside the collapsible '已完成 N 個' section below). The sort above
    // already groups completed at the bottom, but we still need an explicit
    // partition for the divider + collapse UI.
    //
    // IMPORTANT: a task that was JUST completed (and is mid exit-animation)
    // must stay in the *incomplete* list, NOT immediately jump to completed —
    // otherwise the optimistic update flips isCompletedOnDate→true, the
    // filter drops the card on the very next render, and React unmounts it
    // before the check-pulse + slide-out animation can run (the card just
    // vanishes — exactly the "no checkmark dwell" the user reported).
    // We keep exitingTaskIds in the incomplete bucket so the card lingers
    // with its check showing, then the t=1000ms re-fetch finally moves it.
    const incompleteDailyTasks = dailyTasks.filter(t =>
        !isCompletedOnDate(t, selectedDate) || completingTaskIds.has(t.id)
    );
    const completedDailyTasks = dailyTasks.filter(t =>
        isCompletedOnDate(t, selectedDate) && !completingTaskIds.has(t.id)
    );
    const flexibleTasks = tasks.filter(t => t.recurrence?.mode === 'period_count');
    const todayStr = getTodayStr();
    const isSelectedToday = selectedDate === todayStr;
    const dailySectionLabel = (() => {
        if (isSelectedToday) return '今日行程';
        const d = new Date(selectedDate);
        if (isNaN(d.getTime())) return '行程';
        const m = d.getMonth() + 1;
        const day = d.getDate();
        // Quick relative label for tomorrow / yesterday
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const ds = selectedDate;
        if (ds === tomorrow.toISOString().split('T')[0]) return '明日行程';
        if (ds === yesterday.toISOString().split('T')[0]) return '昨日行程';
        return `${m}/${day} 行程`;
    })();

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
                    onOpenAddFlow={() => {
                        // [+] opens TaskLibraryModal (the habit picker). Direct
                        // task creation stays the default — most users come
                        // here knowing roughly what they want to add. The
                        // aspiration funnel is reachable as an entry button
                        // inside TaskLibraryModal's domain view for users
                        // who prefer to start from an outcome / goal.
                        setIsLibraryModalOpen(true);
                        setIsFormModalOpen(false);
                        setEditingTask(null);
                        setSelectedDate(getTodayStr());
                    }}
                    onOpenBadges={() => setCurrentView('badges')}
                    onOpenExplore={() => setIsTemplateExplorerOpen(true)}
                    user={user}
                    onOpenProfile={() => setIsProfileModalOpen(true)}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
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
                            onClick={() => { setCurrentView('journey'); fetchJourney(user?.id); }}
                            className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-colors ${currentView === 'journey' ? 'bg-indigo-100 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <Map size={20} />
                            旅程
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
                            <Avatar user={user} size="w-8 h-8" />
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-800 truncate">{user?.nickname || user?.name || '使用者'}</p>
                                <p className="text-xs text-gray-500 truncate">{user?.phone || user?.email || ''}</p>
                            </div>
                        </button>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col h-screen overflow-hidden relative min-w-0 w-full">
                    {/* Mobile header is now handled above, desktop sidebar handles navigation */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 no-scrollbar">

                        {currentView === 'daily' && (
                            <div className="animate-fade-in-up">
                                {/* Desktop-only week strip — AppHeader (which
                                    carries the mobile strip) is md:hidden, so
                                    without this desktop users have no way to
                                    switch dates. Hidden on mobile to avoid a
                                    duplicate strip. */}
                                <div className="hidden md:block mb-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                    <WeekStrip
                                        selectedDate={selectedDate}
                                        onSelectDate={setSelectedDate}
                                        className="px-3 py-1"
                                    />
                                </div>
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
                                {/* Slice L — focus-map banner. Shown when the user has built up
                                    >= 5 candidates and hasn't dismissed this session. Per-session
                                    dismiss only (resets on full page reload). */}
                                {isSelectedToday && candidateCount >= 5 && !bannerDismissed && (
                                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 mb-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-amber-700">
                                                    ✨ 你有 {candidateCount} 個候選習慣
                                                </p>
                                                <p className="text-sm font-black text-gray-800 mt-1">開始焦點地圖，挑出黃金行為</p>
                                                <p className="text-[11px] text-gray-500 mt-1">Fogg 建議篩 3 個實際開始</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setBannerDismissed(true)}
                                                className="p-1 -mr-1 text-gray-400 hover:text-gray-600 text-lg leading-none"
                                                aria-label="暫時隱藏"
                                            >
                                                ×
                                            </button>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsFocusMapModalOpen(true)}
                                            className="mt-3 w-full px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors"
                                        >
                                            開始評分 →
                                        </button>
                                    </div>
                                )}

                                {isSelectedToday && (
                                    <DashboardSummaryCard tasks={tasks} onOpenDetail={() => setCurrentView('dashboard_detail')} />
                                )}

                                {/* Date browsing pill — only when viewing a non-today date */}
                                {!isSelectedToday && (
                                    <div className="mb-4 flex items-center justify-between gap-2 bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
                                        <p className="text-xs text-indigo-700">
                                            正在預覽 <span className="font-bold">{dailySectionLabel}</span>
                                        </p>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedDate(todayStr)}
                                            className="text-xs font-bold px-3 py-1 rounded-full bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                                        >
                                            回到今天
                                        </button>
                                    </div>
                                )}

                                <div className="space-y-6">
                                    {/* Section 1: Scheduled tasks for selected date */}
                                    <div>
                                        <h3 className="text-gray-800 font-bold text-lg mb-4 flex items-center gap-2">
                                            <span className="w-1 h-5 bg-emerald-500 rounded-full"></span> {dailySectionLabel}
                                        </h3>
                                        <div className="space-y-3">
                                            {/* Incomplete tasks — prominent, always visible.
                                                Each card is wrapped in an exit-animation div so
                                                that when a binary task is completed, the wrapper
                                                collapses max-height + fades opacity → the cards
                                                below naturally slide up (CSS layout reflow). */}
                                            {incompleteDailyTasks.map(task => {
                                                const isExiting = exitingTaskIds.has(task.id);
                                                return (
                                                    <div
                                                        key={task.id}
                                                        className={`overflow-hidden transition-all duration-300 ease-out ${
                                                            isExiting
                                                                ? 'max-h-0 opacity-0 pointer-events-none'
                                                                : 'max-h-[640px] opacity-100'
                                                        }`}
                                                    >
                                                        <TaskCard task={task} viewingDate={selectedDate} onClick={() => { setViewingTask(task); setIsDetailModalOpen(true); }} onUpdate={handleTaskUpdate} onAfterAction={() => { if (user?.id) fetchTasks(user.id); }} onPickLocation={handlePickLocation} onAttachPhoto={handleAttachPhoto} attachingKey={attachingKey} />
                                                    </div>
                                                );
                                            })}

                                            {/* Divider + collapsible 已完成 section. Only renders when
                                                there's at least one completed task; tap toggles expand.
                                                Default state is collapsed (set via completedExpanded
                                                useState above) so the daily list visually focuses on
                                                what still needs doing. */}
                                            {completedDailyTasks.length > 0 && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => setCompletedExpanded(v => !v)}
                                                        aria-expanded={completedExpanded}
                                                        className="w-full flex items-center gap-3 py-2 px-2 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
                                                    >
                                                        <span className="flex-1 h-px bg-gray-200" />
                                                        <span className="flex items-center gap-1 whitespace-nowrap">
                                                            已完成 {completedDailyTasks.length} 個
                                                            {completedExpanded
                                                                ? <ChevronUp size={14} />
                                                                : <ChevronDown size={14} />}
                                                        </span>
                                                        <span className="flex-1 h-px bg-gray-200" />
                                                    </button>
                                                    {completedExpanded && completedDailyTasks.map(task => (
                                                        // Re-completing from the already-done section
                                                        // un-toggles back to incomplete; no exit animation
                                                        // needed (Task naturally jumps back into the list
                                                        // above on re-fetch). Use handleUpdateProgress
                                                        // directly to skip the toast / scheduled exit.
                                                        <TaskCard key={task.id} task={task} viewingDate={selectedDate} onClick={() => { setViewingTask(task); setIsDetailModalOpen(true); }} onUpdate={handleUpdateProgress} onAfterAction={() => { if (user?.id) fetchTasks(user.id); }} onPickLocation={handlePickLocation} onAttachPhoto={handleAttachPhoto} attachingKey={attachingKey} />
                                                    ))}
                                                </>
                                            )}

                                            {dailyTasks.length === 0 && (
                                                <p className="text-gray-400 text-sm col-span-full">
                                                    {isSelectedToday ? '今日無固定行程。' : '這天沒有安排任務。'}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Section 2: Period Goals (Flexible) — only on today */}
                                    {isSelectedToday && flexibleTasks.length > 0 && (
                                        <div>
                                            <h3 className="text-gray-800 font-bold text-lg mb-4 flex items-center gap-2">
                                                <span className="w-1 h-5 bg-amber-500 rounded-full"></span> 週期目標 (彈性)
                                            </h3>
                                            <div className="space-y-3">
                                                {flexibleTasks.map(task => (
                                                    <TaskCard key={task.id} task={task} viewingDate={selectedDate} onClick={() => { setViewingTask(task); setIsDetailModalOpen(true); }} onUpdate={handleUpdateProgress} onAfterAction={() => { if (user?.id) fetchTasks(user.id); }} onPickLocation={handlePickLocation} onAttachPhoto={handleAttachPhoto} attachingKey={attachingKey} />
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
                                            onPickLocation={handlePickLocation}
                                            onAttachPhoto={handleAttachPhoto}
                                            attachingKey={attachingKey}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {currentView === 'stats' && (
                            <StatsView userId={user?.id} onBack={() => setCurrentView('daily')} />
                        )}

                        {currentView === 'journey' && (
                            <JourneyView
                                data={journeyData}
                                trackLocationOn={!!user?.trackLocation}
                                loading={journeyLoading}
                                onOpenSettings={() => setIsProfileModalOpen(true)}
                                userId={user?.id}
                            />
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
                onClose={() => {
                    setIsTemplateExplorerOpen(false);
                    // Drop the initial-template hint AND clear activeAspiration
                    // — if the user closes without joining, we shouldn't keep
                    // an aspiration "armed" for the next add flow.
                    setInitialTemplateForExplorer(null);
                    if (activeAspiration) setActiveAspiration(null);
                }}
                userId={user?.id}
                onJoin={handleTemplateJoined}
                userTypeKey={user?.typeKey || null}
                userSleepTypeKey={user?.sleepTypeKey || null}
                initialTemplate={initialTemplateForExplorer}
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
                initialDate={selectedDate}
                onEdit={(task) => { setIsDetailModalOpen(false); setEditingTask(task); setIsFormModalOpen(true); }}
                onUpdate={handleUpdateProgress}
                onAfterAction={() => { if (user?.id) fetchTasks(user.id); }} // ★ Slice M
                onPickLocation={handlePickLocation} // ★ Slice O
            />

            <TaskLibraryModal
                isOpen={isLibraryModalOpen}
                onClose={() => {
                    setIsLibraryModalOpen(false);
                    // If the user opened the library via the aspiration flow
                    // and closes without completing, drop both the library's
                    // initial-habit hint AND the active aspiration. Otherwise
                    // the next time [+] is pressed we'd silently tag a fresh
                    // task with a stale aspiration.
                    if (aspirationHabitForLibrary) setAspirationHabitForLibrary(null);
                    if (activeAspiration) setActiveAspiration(null);
                }}
                onSelectTask={(task) => {
                    handleSaveTask({ ...task, id: generateId() });
                    // Slice L — only auto-close on the aspiration-derived
                    // single-habit flow. Normal batch adding keeps the modal
                    // open so the library's toast + persist banner can guide
                    // the user to add 3-5 candidates before exiting (Fogg's
                    // Behavior Swarm). User dismisses via the persist banner's
                    // 「完成 →」 button or the modal's X.
                    if (aspirationHabitForLibrary) {
                        setIsLibraryModalOpen(false);
                        setAspirationHabitForLibrary(null);
                    }
                }}
                onOpenCustomForm={() => { setIsLibraryModalOpen(false); setIsFormModalOpen(true); }}
                onOpenAspirationPicker={() => {
                    // The library's "從嚮往開始" button hands off to the
                    // aspiration funnel. We close the library and open the
                    // picker — activeAspiration / aspirationHabitForLibrary
                    // start clean since the user is entering Step 1 fresh.
                    setIsLibraryModalOpen(false);
                    setActiveAspiration(null);
                    setAspirationHabitForLibrary(null);
                    setIsAspirationPickerOpen(true);
                }}
                yourTasks={tasks}
                userTypeKey={user?.typeKey || null}
                initialHabit={aspirationHabitForLibrary}
            />

            <LoginModal
                isOpen={isLoginModalOpen}
                onLogin={handleLogin}
            />

            {/* Slice L — focus map modal. Opens from the daily-view banner
                when the user has accumulated >= 5 candidate tasks. On submit
                runs PATCH /api/tasks/batch-rate and we refresh both the
                active task list and the candidate count. */}
            <FocusMapModal
                isOpen={isFocusMapModalOpen}
                userId={user?.id}
                onClose={() => setIsFocusMapModalOpen(false)}
                onActivated={() => {
                    setIsFocusMapModalOpen(false);
                    setBannerDismissed(false);
                    if (user?.id) {
                        fetchTasks(user.id);
                        fetchCandidateCount(user.id);
                    }
                }}
            />

            {/* Slice K — Aspiration flow (Step 1 picker + Step 2 panel).
                Both modals are gated on isAspirationPickerOpen so the panel
                can never render orphaned (and so closing the picker tears
                both down at once). The panel is visually layered on top
                because its container uses z-[10000] vs the picker's z-[9999]. */}
            <AspirationPicker
                isOpen={isAspirationPickerOpen && !activeAspiration}
                onClose={handleAspirationPickerClose}
                userId={user?.id}
                userTypeKey={user?.typeKey || null}
                userSleepTypeKey={user?.sleepTypeKey || null}
                onSelectAspiration={handleAspirationSelected}
            />
            {isAspirationPickerOpen && activeAspiration && (
                <AspirationRecommendationPanel
                    aspiration={activeAspiration}
                    onBack={handleRecommendationBack}
                    onPickTemplate={handlePickTemplateFromAspiration}
                    onPickHabit={handlePickHabitFromAspiration}
                    onAddHabitAsCandidate={handleAddHabitAsCandidate}
                    onOpenFocusMap={handleOpenFocusMapFromPanel}
                    onSkipToTemplates={handleSkipToTemplates}
                    onSkipToHabits={handleSkipToHabits}
                />
            )}

            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                user={user}
                onLogout={() => { setIsProfileModalOpen(false); handleLogout(); }}
                onUpdate={(updatedUser) => {
                    setUser(updatedUser);
                    localStorage.setItem('habit_user', JSON.stringify(updatedUser));
                }}
            />

            {/* Bottom undo snackbar — shown for 5s after a binary task is
                completed via the daily list. Tapping 還原 cancels the
                pending exit animation and toggles the task back. */}
            <UndoToast
                visible={!!undoToast}
                message={undoToast?.message || ''}
                onUndo={handleUndoCompletion}
                onDismiss={() => setUndoToast(null)}
            />
        </>
    );
};

export default MainApp;
