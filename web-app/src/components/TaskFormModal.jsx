import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Clock, ChevronUp, ChevronDown, Trash2, Plus, Calendar, Check, Bell, TrendingUp, TrendingDown, Ban } from 'lucide-react';
import IconRenderer from './IconRenderer';
import LockedTaskAlert from './LockedTaskAlert';
import AnchorPicker from './explore/AnchorPicker';
import { CATEGORY_CONFIG, resolveIconKey } from '@/lib/constants';
import { generateId, getTodayStr, getNthWeekday } from '@/lib/utils';
import { useT } from '@/lib/i18n';

const TaskFormModal = ({ isOpen, onClose, onSave, onDelete, initialData, defaultDate, templateMode = false, yourTasks = [], userTypeKey = null }) => {
    const { t } = useT();
    const [mounted, setMounted] = useState(false);
    const [showLockedAlert, setShowLockedAlert] = useState(false);

    // Ensure we only render on client and when body is available
    useEffect(() => {
        setMounted(true);
    }, []);

    const [formData, setFormData] = useState({
        title: '', details: '', cue: '', type: 'binary', category: 'star', frequency: 'daily',
        direction: 'increase',
        date: defaultDate || getTodayStr(), time: '09:00',
        dailyTarget: 10, unit: '次', stepValue: 1, subtasks: [],
        recurrence: { type: 'daily', interval: 1, endType: 'never', endDate: '', endCount: 10, weekDays: [], monthType: 'date', periodTarget: 3, dailyLimit: true },
        reminder: { enabled: false, offset: 0 }
    });

    const [customEmoji, setCustomEmoji] = useState('');
    const [activeTab, setActiveTab] = useState('basic');
    const iconContainerRef = useRef(null);

    // Helper for monthly recurrence labels
    const dateInfo = getNthWeekday(formData.date);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                // Check if task is locked
                if (initialData.isLocked) {
                    setShowLockedAlert(true);
                }
                setFormData({
                    ...initialData,
                    direction: initialData.direction || 'increase',
                    cue: initialData.cue || '',
                    time: initialData.time || '09:00',
                    recurrence: {
                        type: 'daily', mode: 'specific_days', interval: 1, endType: 'never', endDate: '', endCount: 10, weekDays: [], monthType: 'date', periodTarget: 3, dailyLimit: true,
                        ...(initialData.recurrence || {})
                    },
                    reminder: { enabled: false, offset: 0, ...(initialData.reminder || {}) },
                    stepValue: initialData.stepValue || 1,
                    subtasks: initialData.subtasks || []
                });
            } else {
                setFormData({
                    title: '', details: '', cue: '', type: 'binary', category: 'star', frequency: 'daily',
                    direction: 'increase',
                    date: defaultDate || getTodayStr(), time: '09:00',
                    dailyTarget: 10, unit: '次', stepValue: 1, subtasks: [],
                    recurrence: { type: 'daily', mode: 'specific_days', interval: 1, endType: 'never', endDate: '', endCount: 10, weekDays: [], monthType: 'date', periodTarget: 3, dailyLimit: true },
                    reminder: { enabled: false, offset: 0 }
                });
            }
            setActiveTab('basic');
        } else {
            setShowLockedAlert(false);
        }
    }, [isOpen, initialData, defaultDate]);

    const scrollIcons = (direction) => {
        if (iconContainerRef.current) {
            iconContainerRef.current.scrollBy({ left: direction === 'left' ? -150 : 150, behavior: 'smooth' });
        }
    };

    // Robust check for Portal target
    if (!isOpen || !mounted || typeof document === 'undefined') return null;

    const modalRoot = document.body;
    if (!modalRoot) return null;

    const addSubtask = () => {
        setFormData({
            ...formData,
            type: 'checklist',
            subtasks: [
                ...formData.subtasks,
                { id: generateId(), label: '', addedAt: new Date().toISOString().slice(0, 10) }
            ]
        });
    };

    const handleAddCustomEmoji = () => {
        if (customEmoji && customEmoji.length <= 2) {
            const newKey = `custom_${generateId()}`;
            CATEGORY_CONFIG[newKey] = { type: 'emoji', value: customEmoji, color: 'text-gray-900', bg: 'bg-yellow-100', label: '自訂' };
            setFormData({ ...formData, category: newKey });
            setCustomEmoji('');
        }
    }

    // Slice U — direction drives type. 減量/戒除 are always quantitative
    // (we count occurrences); 戒除 pins the limit at 0. Switching back to
    // 正向 restores the binary default so the type picker is meaningful again.
    const handleDirectionChange = (mode) => {
        if (mode === 'increase') {
            setFormData(f => ({ ...f, direction: 'increase', type: f.type === 'quantitative' && f.dailyTarget === 0 ? 'binary' : f.type }));
        } else if (mode === 'reduce') {
            setFormData(f => ({
                ...f,
                direction: 'decrease',
                type: 'quantitative',
                dailyTarget: (f.dailyTarget && f.dailyTarget > 0) ? f.dailyTarget : 1,
                unit: f.unit || '次',
            }));
        } else if (mode === 'avoid') {
            setFormData(f => ({
                ...f,
                direction: 'decrease',
                type: 'quantitative',
                dailyTarget: 0,
                unit: f.unit || '次',
            }));
        }
    };

    // Which direction card is active. decrease + dailyTarget 0 = 戒除; otherwise 減量.
    const directionMode = formData.direction === 'decrease'
        ? (formData.dailyTarget === 0 ? 'avoid' : 'reduce')
        : 'increase';
    const isDecrease = formData.direction === 'decrease';

    const toggleWeekDay = (dayIndex) => {
        const currentDays = formData.recurrence.weekDays || [];
        if (currentDays.includes(dayIndex)) {
            setFormData({ ...formData, recurrence: { ...formData.recurrence, weekDays: currentDays.filter(d => d !== dayIndex) } });
        } else {
            setFormData({ ...formData, recurrence: { ...formData.recurrence, weekDays: [...currentDays, dayIndex].sort() } });
        }
    };

    // Resolve through resolveIconKey so a template-derived task whose
    // formData.category is a HabitCategory name ('飲食') still surfaces the
    // right bg / color, and the legacy ' || {type:icon,value:Star,...}' fallback
    // (which would break MaterialIcon) goes away.
    const selectedConfig = CATEGORY_CONFIG[resolveIconKey(formData.category)];

    // If task is locked, show the locked alert instead of the form
    if (showLockedAlert && initialData?.isLocked) {
        return createPortal(
            <LockedTaskAlert
                expertName={initialData.expertName}
                onClose={() => {
                    setShowLockedAlert(false);
                    onClose();
                }}
            />,
            modalRoot
        );
    }

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:max-w-md h-[90dvh] md:h-auto md:max-h-[85dvh] md:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col animate-fade-in-up">

                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <button onClick={onClose}><X size={24} className="text-gray-500" /></button>
                        <h3 className="font-bold text-lg text-gray-800">{initialData ? t('taskForm.editTask') : t('taskForm.newTask')}</h3>
                    </div>
                    <button
                        onClick={() => onSave({
                            ...formData,
                            // Slice U — direction drives type for reverse habits.
                            // decrease is always quantitative; dailyTarget is the
                            // daily 上限 (0 = 戒除, 完全避免). 正向 leaves the
                            // user-picked type untouched.
                            ...(isDecrease
                                ? { direction: 'decrease', type: 'quantitative', dailyTarget: formData.dailyTarget ?? 0, unit: formData.unit || '次' }
                                : { direction: 'increase' }),
                            // 手動建立任務一律直接啟用、進每日視圖，不進候選池。
                            // 候選池只保留給「嚮往 → 焦點地圖」流程。
                            // 編輯既有任務不帶 status，保留原值。
                            ...(initialData ? {} : { status: 'active' }),
                        })}
                        className="text-emerald-600 font-bold text-sm px-4 py-2 bg-emerald-50 rounded-full hover:bg-emerald-100"
                    >
                        {t('common.save')}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">

                    {/* Title & Icon */}
                    <div className="flex items-center gap-3">
                        <div className={`${selectedConfig.bg} p-2 rounded-xl flex-shrink-0`}>
                            <IconRenderer category={formData.category} size={24} className={selectedConfig.type === 'emoji' ? 'text-3xl' : ''} />
                        </div>
                        <input
                            className="w-full text-2xl font-bold text-gray-800 placeholder-gray-300 focus:outline-none"
                            placeholder={t('taskForm.titlePlaceholder')}
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    {/* Icon Selector */}
                    <div className="relative group">
                        <label className="text-xs text-gray-400 block mb-2 font-bold uppercase">{t('taskForm.chooseIcon')}</label>
                        <div className="flex items-center">
                            <button onClick={() => scrollIcons('left')} className="hidden md:block p-1 text-gray-400 hover:text-gray-600 bg-white shadow-sm rounded-full absolute left-0 z-10"><ChevronLeft size={16} /></button>
                            <div ref={iconContainerRef} className="flex gap-3 overflow-x-auto no-scrollbar py-1 px-1 w-full scroll-smooth">
                                <div className="flex-shrink-0 min-w-[4.5rem] p-2 rounded-lg bg-gray-50 flex flex-col items-center justify-center border-2 border-dashed border-gray-300">
                                    <input
                                        className="w-8 h-8 text-xl text-center bg-transparent focus:outline-none"
                                        placeholder="😀" maxLength={2} value={customEmoji}
                                        onChange={e => setCustomEmoji(e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomEmoji(); } }}
                                    />
                                </div>
                                {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
                                    const isSelected = formData.category === key;
                                    // type === 'emoji' is the only legacy shape kept (custom-emoji
                                    // entries added at runtime via handleAddCustomEmoji). All
                                    // 'material' entries render through IconRenderer, which knows
                                    // how to translate either shape into a visible glyph.
                                    return (
                                        <div key={key} onClick={() => setFormData({ ...formData, category: key })} className={`flex flex-col items-center gap-1 cursor-pointer min-w-[3.5rem] p-2 rounded-lg transition-all flex-shrink-0 ${isSelected ? 'bg-emerald-50 border-2 border-emerald-500' : 'bg-gray-100 hover:bg-gray-200'}`}>
                                            <div className="w-8 h-8 flex items-center justify-center">
                                                <IconRenderer category={key} size={20} className={config.type === 'emoji' ? 'text-2xl' : ''} />
                                            </div>
                                            <span className="text-[10px] text-gray-500 font-medium">{config.label}</span>
                                        </div>
                                    )
                                })}
                            </div>
                            <button onClick={() => scrollIcons('right')} className="hidden md:block p-1 text-gray-400 hover:text-gray-600 bg-white shadow-sm rounded-full absolute right-0 z-10"><ChevronRight size={16} /></button>
                        </div>
                    </div>

                    {/* Slice U — Habit direction. Drives type for reverse habits. */}
                    <div className="pt-2">
                        <label className="text-xs text-gray-400 block mb-2 font-bold uppercase">{t('taskForm.habitDirection')}</label>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { id: 'increase', labelKey: 'taskForm.direction.increase', subKey: 'taskForm.direction.increaseSub', Icon: TrendingUp },
                                { id: 'reduce', labelKey: 'taskForm.direction.reduce', subKey: 'taskForm.direction.reduceSub', Icon: TrendingDown },
                                { id: 'avoid', labelKey: 'taskForm.direction.avoid', subKey: 'taskForm.direction.avoidSub', Icon: Ban },
                            ].map(({ id, labelKey, subKey, Icon }) => {
                                const active = directionMode === id;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => handleDirectionChange(id)}
                                        className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 transition-all hover:-translate-y-0.5 hover:shadow-sm ${active ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100'}`}
                                    >
                                        <Icon size={20} />
                                        <span className="text-sm font-bold">{t(labelKey)}</span>
                                        <span className="text-[10px] text-gray-400">{t(subKey)}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Decrease (減量/戒除) — direction drives type, so the
                        normal type picker is hidden. Show a 上限 input for 減量;
                        戒除 pins the limit at 0 and just states the goal. */}
                    {isDecrease && (
                        <div className="flex flex-col gap-3 bg-orange-50 p-4 rounded-xl border border-orange-100">
                            {directionMode === 'reduce' ? (
                                <>
                                    <div className="flex gap-3">
                                        <div className="flex-1">
                                            <label className="text-xs text-orange-600 block mb-1 font-bold">{t('taskForm.dailyCap')}</label>
                                            <input
                                                type="number"
                                                aria-label={t('taskForm.dailyCap')}
                                                min={1}
                                                className="w-full bg-white border border-orange-200 rounded-lg px-3 py-2 text-sm"
                                                value={formData.dailyTarget}
                                                onChange={e => setFormData({ ...formData, dailyTarget: Math.max(1, parseInt(e.target.value) || 1) })}
                                            />
                                        </div>
                                        <div className="w-24">
                                            <label className="text-xs text-orange-600 block mb-1 font-bold">{t('taskForm.unitLabel')}</label>
                                            <input
                                                type="text"
                                                placeholder={t('taskForm.unitPlaceholderTimes')}
                                                className="w-full bg-white border border-orange-200 rounded-lg px-3 py-2 text-sm"
                                                value={formData.unit}
                                                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <p className="text-[11px] text-orange-700/80">{t('taskForm.reduceHint')}</p>
                                </>
                            ) : (
                                <p className="text-[11px] text-orange-700/80">{t('taskForm.avoidHint')}</p>
                            )}
                        </div>
                    )}

                    {/* Type & Goal — only for 正向 habits (direction drives type otherwise) */}
                    {!isDecrease && (
                    <div className="pt-2">
                        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
                            {[
                                { id: 'binary', labelKey: 'taskForm.type.binary' },
                                { id: 'quantitative', labelKey: 'taskForm.type.quantitative' },
                                { id: 'checklist', labelKey: 'taskForm.type.checklist' }
                            ].map(type => (
                                <button key={type.id} onClick={() => setFormData({ ...formData, type: type.id })} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${formData.type === type.id ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                    {t(type.labelKey)}
                                </button>
                            ))}
                        </div>

                        {formData.type === 'quantitative' && (
                            <div className="flex flex-col gap-3 bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <label className="text-xs text-blue-600 block mb-1 font-bold">{t('taskForm.targetValue')}</label>
                                        <input type="number" className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm" value={formData.dailyTarget} onChange={e => setFormData({ ...formData, dailyTarget: parseInt(e.target.value) || 0 })} />
                                    </div>
                                    <div className="w-24">
                                        <label className="text-xs text-blue-600 block mb-1 font-bold">{t('taskForm.unitLabel')}</label>
                                        <input type="text" placeholder="cc" className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-blue-600 block mb-1 font-bold">{t('taskForm.stepValueLabel')}</label>
                                    <input type="number" className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm" value={formData.stepValue} onChange={e => setFormData({ ...formData, stepValue: parseInt(e.target.value) || 0 })} />
                                </div>
                            </div>
                        )}
                    </div>
                    )}

                    {/* Subtask editor — supports rename, add, soft/hard delete */}
                    {(formData.type === 'checklist' || formData.subtasks.length > 0) && (
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">{t('taskForm.subtasksCount', { n: formData.subtasks.length })}</label>
                            </div>
                            <div className="space-y-2">
                                {formData.subtasks.map((sub, idx) => (
                                    <SubtaskEditorRow
                                        key={sub.id}
                                        subtask={sub}
                                        hasHistory={Boolean(initialData?.history && Object.values(initialData.history).some(h => h && typeof h === 'object' && h.subtaskCompletions && sub.id in h.subtaskCompletions))}
                                        onRename={(newLabel) =>
                                            setFormData(f => ({
                                                ...f,
                                                subtasks: f.subtasks.map((s, i) => i === idx ? { ...s, label: newLabel } : s),
                                            }))
                                        }
                                        onHide={() =>
                                            setFormData(f => ({
                                                ...f,
                                                subtasks: f.subtasks.map((s, i) =>
                                                    i === idx ? { ...s, removedAt: new Date().toISOString().slice(0, 10) } : s
                                                ),
                                            }))
                                        }
                                        onPermanentDelete={async () => {
                                            if (initialData?.id) {
                                                const res = await fetch(`/api/tasks/${initialData.id}/subtasks/${sub.id}?mode=permanent`, { method: 'DELETE' });
                                                if (!res.ok) {
                                                    alert(t('taskForm.deleteFailed'));
                                                    return;
                                                }
                                            }
                                            setFormData(f => ({
                                                ...f,
                                                subtasks: f.subtasks.filter((_, i) => i !== idx),
                                            }));
                                        }}
                                    />
                                ))}
                                <button
                                    type="button"
                                    onClick={addSubtask}
                                    className="w-full px-3 py-2 rounded-xl text-sm font-medium text-center bg-gray-50 border border-dashed border-gray-300 text-gray-600 hover:bg-gray-100"
                                >
                                    {t('taskForm.addSubtask')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Advanced Settings Toggle */}
                    <div className="border-t border-gray-100 pt-4">
                        <button
                            onClick={() => setActiveTab(activeTab === 'advance' ? 'basic' : 'advance')}
                            className="flex items-center justify-between w-full text-sm font-bold text-gray-600 mb-3"
                        >
                            <span className="flex items-center gap-2"><Clock size={16} /> {t('taskForm.advancedSettings')}</span>
                            {activeTab === 'advance' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        {activeTab === 'advance' && (
                            <div className="space-y-4 animate-fade-in-down">

                                {/* SECTION 1: Date & Time */}
                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <label className="text-xs text-gray-500 block mb-2 font-bold flex items-center gap-1"><Calendar size={12} /> {t('taskForm.timeAndFrequency')}</label>

                                    <div className="flex gap-3 mb-4">
                                        {/* Hide date picker in template mode - date is determined by plan start date + phase */}
                                        {!templateMode && (
                                            <div className="flex-1">
                                                <label className="text-[10px] text-gray-400 block mb-1">{t('taskForm.startDate')}</label>
                                                <input
                                                    type="date"
                                                    className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm"
                                                    value={formData.date}
                                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                                />
                                            </div>
                                        )}
                                        <div className={templateMode ? "w-full" : "flex-1"}>
                                            <label className="text-[10px] text-gray-400 block mb-1">{t('taskForm.time')}</label>
                                            <input
                                                type="time"
                                                className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm"
                                                value={formData.time}
                                                onChange={e => setFormData({ ...formData, time: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-200 my-3"></div>

                                    <label className="text-[10px] text-gray-400 block mb-1">{t('taskForm.repeatFrequency')}</label>
                                    <div className="flex gap-2 mb-3">
                                        {['once', 'daily', 'weekly', 'monthly'].map(freq => (
                                            <button
                                                key={freq}
                                                onClick={() => setFormData({ ...formData, recurrence: { ...formData.recurrence, type: freq } })}
                                                className={`flex-1 py-1.5 text-xs font-bold rounded border ${formData.recurrence.type === freq ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-white text-gray-500 border-gray-200'}`}
                                            >
                                                {t(`taskForm.freq.${freq}`)}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Weekly Options (Specific Days vs Period Count) */}
                                    {formData.recurrence.type === 'weekly' && (
                                        <div className="bg-white p-3 rounded border border-gray-200 mb-3">
                                            <div className="flex gap-4 mb-3 border-b border-gray-100 pb-2">
                                                <label className="text-xs flex items-center gap-1 cursor-pointer">
                                                    <input
                                                        type="radio" name="weekMode"
                                                        checked={formData.recurrence.mode !== 'period_count'}
                                                        onChange={() => setFormData({ ...formData, recurrence: { ...formData.recurrence, mode: 'specific_days' } })}
                                                    /> {t('taskForm.specificWeekdays')}
                                                </label>
                                                <label className="text-xs flex items-center gap-1 cursor-pointer">
                                                    <input
                                                        type="radio" name="weekMode"
                                                        checked={formData.recurrence.mode === 'period_count'}
                                                        onChange={() => setFormData({ ...formData, recurrence: { ...formData.recurrence, mode: 'period_count' } })}
                                                    /> {t('taskForm.flexibleFrequencyWeekly')}
                                                </label>
                                            </div>

                                            {formData.recurrence.mode !== 'period_count' ? (
                                                <div>
                                                    <label className="text-[10px] text-gray-400 block mb-1">{t('taskForm.repeatOn')}</label>
                                                    <div className="flex justify-between">
                                                        {t('taskForm.weekDays').map((d, i) => (
                                                            <button
                                                                key={i}
                                                                onClick={() => toggleWeekDay(i)}
                                                                className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center border transition-all ${(formData.recurrence.weekDays || []).includes(i) ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-400 border-gray-200'}`}
                                                            >
                                                                {d}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-gray-600">{t('taskForm.weeklyCompletePrefix')}</span>
                                                        <input
                                                            type="number" className="w-16 border border-gray-300 rounded px-2 py-1 text-center"
                                                            value={formData.recurrence.periodTarget}
                                                            onChange={e => setFormData({ ...formData, recurrence: { ...formData.recurrence, periodTarget: parseInt(e.target.value) || 0 } })}
                                                        />
                                                        <span className="text-sm text-gray-600">{t('taskForm.timesSuffix')}</span>
                                                    </div>
                                                    <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.recurrence.dailyLimit !== false}
                                                            onChange={e => setFormData({ ...formData, recurrence: { ...formData.recurrence, dailyLimit: e.target.checked } })}
                                                        />
                                                        {t('taskForm.dailyLimitOnce')}
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Monthly Options */}
                                    {formData.recurrence.type === 'monthly' && (
                                        <div className="bg-white p-3 rounded border border-gray-200 mb-3">
                                            <div className="flex gap-4 mb-3 border-b border-gray-100 pb-2">
                                                <label className="text-xs flex items-center gap-1 cursor-pointer">
                                                    <input
                                                        type="radio" name="monthMode"
                                                        checked={formData.recurrence.mode !== 'period_count'}
                                                        onChange={() => setFormData({ ...formData, recurrence: { ...formData.recurrence, mode: 'specific_days' } })}
                                                    /> {t('taskForm.specificDate')}
                                                </label>
                                                <label className="text-xs flex items-center gap-1 cursor-pointer">
                                                    <input
                                                        type="radio" name="monthMode"
                                                        checked={formData.recurrence.mode === 'period_count'}
                                                        onChange={() => setFormData({ ...formData, recurrence: { ...formData.recurrence, mode: 'period_count' } })}
                                                    /> {t('taskForm.flexibleFrequency')}
                                                </label>
                                            </div>

                                            {formData.recurrence.mode !== 'period_count' ? (
                                                <div className="flex flex-col gap-2">
                                                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                                        <input
                                                            type="radio" name="monthType"
                                                            checked={formData.recurrence.monthType === 'date'}
                                                            onChange={() => setFormData({ ...formData, recurrence: { ...formData.recurrence, monthType: 'date' } })}
                                                        />
                                                        {t('taskForm.monthlyOnDate', { d: new Date(formData.date).getDate() })}
                                                    </label>
                                                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                                        <input
                                                            type="radio" name="monthType"
                                                            checked={formData.recurrence.monthType === 'day'}
                                                            onChange={() => setFormData({ ...formData, recurrence: { ...formData.recurrence, monthType: 'day' } })}
                                                        />
                                                        {t('taskForm.monthlyNthWeekday', { n: dateInfo.weekNum, day: t('taskForm.weekDays')[new Date(formData.date).getDay()] })}
                                                    </label>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-gray-600">{t('taskForm.monthlyCompletePrefix')}</span>
                                                        <input
                                                            type="number" className="w-16 border border-gray-300 rounded px-2 py-1 text-center"
                                                            value={formData.recurrence.periodTarget}
                                                            onChange={e => setFormData({ ...formData, recurrence: { ...formData.recurrence, periodTarget: parseInt(e.target.value) || 0 } })}
                                                        />
                                                        <span className="text-sm text-gray-600">{t('taskForm.timesSuffix')}</span>
                                                    </div>
                                                    <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.recurrence.dailyLimit !== false}
                                                            onChange={e => setFormData({ ...formData, recurrence: { ...formData.recurrence, dailyLimit: e.target.checked } })}
                                                        />
                                                        {t('taskForm.dailyLimitOnce')}
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {formData.recurrence.type !== 'once' && (
                                        <div className="pt-2">
                                            <div className="flex gap-2 items-center mb-2">
                                                <span className="text-xs text-gray-500">{t('taskForm.endCondition')}</span>
                                                <select
                                                    className="bg-white border border-gray-200 text-xs rounded px-2 py-1 outline-none"
                                                    value={formData.recurrence.endType}
                                                    onChange={e => setFormData({ ...formData, recurrence: { ...formData.recurrence, endType: e.target.value } })}
                                                >
                                                    <option value="never">{t('taskForm.endNever')}</option>
                                                    <option value="count">{t('taskForm.endAfterCount')}</option>
                                                    {!templateMode && <option value="date">{t('taskForm.endUntilDate')}</option>}
                                                </select>
                                            </div>
                                            {formData.recurrence.endType === 'count' && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500">{t('taskForm.repeatPrefix')}</span>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        className="w-16 bg-white border border-gray-200 rounded px-2 py-1 text-sm text-center"
                                                        value={formData.recurrence.endCount || 30}
                                                        onChange={e => setFormData({ ...formData, recurrence: { ...formData.recurrence, endCount: parseInt(e.target.value) || 1 } })}
                                                    />
                                                    <span className="text-xs text-gray-500">{t('taskForm.timesThenStop')}</span>
                                                </div>
                                            )}
                                            {formData.recurrence.endType === 'date' && (
                                                <input type="date" className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm" value={formData.recurrence.endDate} onChange={e => setFormData({ ...formData, recurrence: { ...formData.recurrence, endDate: e.target.value } })} />
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* SECTION 2: Reminder (Independent) */}
                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs text-gray-500 font-bold flex items-center gap-1"><Bell size={12} /> {t('taskForm.reminder')}</label>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={formData.reminder.enabled} onChange={e => setFormData({ ...formData, reminder: { ...formData.reminder, enabled: e.target.checked } })} />
                                            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                        </label>
                                    </div>

                                    {formData.reminder.enabled && (
                                        <div className="space-y-2">
                                            <select
                                                className="w-full bg-white border border-gray-200 text-sm rounded-lg px-3 py-2 outline-none"
                                                value={formData.reminder.offset}
                                                onChange={e => setFormData({ ...formData, reminder: { ...formData.reminder, offset: parseInt(e.target.value) || 0 } })}
                                            >
                                                <option value="0">{t('taskForm.onTime', { time: formData.time })}</option>
                                                <option value="10">{t('taskForm.minutesBefore', { n: 10 })}</option>
                                                <option value="30">{t('taskForm.minutesBefore', { n: 30 })}</option>
                                                <option value="60">{t('taskForm.hoursBefore', { n: 1 })}</option>
                                                <option value="1440">{t('taskForm.daysBefore', { n: 1 })}</option>
                                            </select>
                                            <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                                <Check size={10} /> {t('taskForm.reminderAutoCancel')}
                                            </p>
                                        </div>
                                    )}
                                </div>

                            </div>
                        )}
                    </div>

                    {/* Details */}
                    <div>
                        <label className="text-xs text-gray-400 block mb-1 font-bold uppercase">{t('taskForm.notes')}</label>
                        <textarea
                            className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm text-gray-600 focus:ring-1 focus:ring-emerald-500 resize-none"
                            placeholder={t('taskForm.notesPlaceholder')} rows={3}
                            value={formData.details}
                            onChange={e => setFormData({ ...formData, details: e.target.value })}
                        />
                    </div>

                    {/* Anchor (cue) */}
                    <div className="mt-4">
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            {t('taskForm.anchor')} <span className="text-xs font-medium text-gray-400">{t('taskForm.anchorHint')}</span>
                        </label>
                        <AnchorPicker
                            value={formData.cue || null}
                            onChange={(cue) => setFormData(f => ({ ...f, cue: cue || '' }))}
                            yourTasks={yourTasks}
                            excludeTaskId={initialData?.id}
                        />
                        {/* Note: "目前錨點：XXX [清除]" used to live here. As of
                            2026-05-23 the AnchorPicker itself surfaces a pinned
                            pill at the top — kept it in one place to avoid the
                            UI showing the selected anchor twice. */}
                    </div>

                    {/* Identity removed 2026-06-03 — identity is now declared
                        once at the aspiration level, not per habit. */}

                </div>

                {/* Footer */}
                {initialData && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-between items-center">
                        <span className="text-xs text-gray-400">ID: {initialData.id}</span>
                        <button onClick={() => onDelete(initialData.id)} className="text-red-500 flex items-center gap-1 text-sm font-bold hover:bg-red-50 px-3 py-1 rounded-lg transition-colors">
                            <Trash2 size={16} /> {t('taskForm.delete')}
                        </button>
                    </div>
                )}
            </div>
        </div>,
        modalRoot
    );
};

function SubtaskEditorRow({ subtask, hasHistory, onRename, onHide, onPermanentDelete }) {
    const { t } = useT();
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [mode, setMode] = useState('hide');

    const handleConfirm = () => {
        if (mode === 'hide') {
            onHide();
        } else {
            onPermanentDelete();
        }
        setConfirmOpen(false);
    };

    const isHidden = Boolean(subtask.removedAt);

    return (
        <div className={`p-3 rounded-xl border ${isHidden ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-gray-200'}`}>
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    value={subtask.label || ''}
                    onChange={(e) => onRename(e.target.value)}
                    disabled={isHidden}
                    className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder={t('taskForm.subtaskNamePlaceholder')}
                />
                {!isHidden && (
                    <button
                        type="button"
                        onClick={() => setConfirmOpen(prev => !prev)}
                        className="px-2 py-1.5 text-gray-400 hover:text-red-500"
                        aria-label={t('taskForm.deleteSubtask')}
                    >
                        ×
                    </button>
                )}
                {isHidden && (
                    <span className="text-xs text-gray-400">{t('taskForm.disabledSince', { date: subtask.removedAt })}</span>
                )}
            </div>

            {confirmOpen && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                    <p className="text-sm font-bold text-gray-800">{t('taskForm.confirmDeleteSubtask', { label: subtask.label || t('taskForm.unnamed') })}</p>
                    <label className="flex items-start gap-2 cursor-pointer">
                        <input type="radio" checked={mode === 'hide'} onChange={() => setMode('hide')} className="mt-0.5" />
                        <div>
                            <p className="text-sm text-gray-700">{t('taskForm.hideFromToday')}</p>
                            <p className="text-xs text-gray-500">{t('taskForm.keepPastRecords')}</p>
                        </div>
                    </label>
                    <label className={`flex items-start gap-2 ${hasHistory ? 'cursor-pointer' : 'opacity-50'}`}>
                        <input
                            type="radio"
                            checked={mode === 'permanent'}
                            onChange={() => hasHistory && setMode('permanent')}
                            disabled={!hasHistory}
                            className="mt-0.5"
                        />
                        <div>
                            <p className="text-sm text-gray-700">{t('taskForm.permanentDeleteAll')}</p>
                            <p className="text-xs text-gray-500">{hasHistory ? t('taskForm.permanentDeleteDetail') : t('taskForm.noHistoryDetail')}</p>
                        </div>
                    </label>
                    <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={() => setConfirmOpen(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">
                            {t('common.cancel')}
                        </button>
                        <button type="button" onClick={handleConfirm} className="px-3 py-1.5 text-sm bg-red-500 text-white font-medium rounded hover:bg-red-600">
                            {t('taskForm.confirmDelete')}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TaskFormModal;
