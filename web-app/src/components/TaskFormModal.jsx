import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronLeft, ChevronRight, Clock, ChevronUp, ChevronDown, Trash2, Plus, Calendar, Check, Bell } from 'lucide-react';
import IconRenderer from './IconRenderer';
import LockedTaskAlert from './LockedTaskAlert';
import AnchorPicker from './explore/AnchorPicker';
import IdentityPicker from './explore/IdentityPicker';
import { CATEGORY_CONFIG, resolveIconKey } from '@/lib/constants';
import { generateId, getTodayStr, getNthWeekday } from '@/lib/utils';

const TaskFormModal = ({ isOpen, onClose, onSave, onDelete, initialData, defaultDate, templateMode = false, yourTasks = [], userTypeKey = null }) => {
    const [mounted, setMounted] = useState(false);
    const [showLockedAlert, setShowLockedAlert] = useState(false);

    // Ensure we only render on client and when body is available
    useEffect(() => {
        setMounted(true);
    }, []);

    const [formData, setFormData] = useState({
        title: '', details: '', cue: '', identity: '', type: 'binary', category: 'star', frequency: 'daily',
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
                    cue: initialData.cue || '',
                    identity: initialData.identity || '',
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
                    title: '', details: '', cue: '', identity: '', type: 'binary', category: 'star', frequency: 'daily',
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
                        <h3 className="font-bold text-lg text-gray-800">{initialData ? '編輯任務' : '新增任務'}</h3>
                    </div>
                    <button onClick={() => onSave(formData)} className="text-emerald-600 font-bold text-sm px-4 py-2 bg-emerald-50 rounded-full hover:bg-emerald-100">
                        儲存
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
                            placeholder="任務名稱 (例如: 喝水)"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    {/* Icon Selector */}
                    <div className="relative group">
                        <label className="text-xs text-gray-400 block mb-2 font-bold uppercase">選擇圖示</label>
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

                    {/* Type & Goal */}
                    <div className="pt-2">
                        <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar">
                            {[
                                { id: 'binary', label: '一般 (達成/未達成)' },
                                { id: 'quantitative', label: '計量 (步數/cc)' },
                                { id: 'checklist', label: '清單 (子任務)' }
                            ].map(type => (
                                <button key={type.id} onClick={() => setFormData({ ...formData, type: type.id })} className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${formData.type === type.id ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                    {type.label}
                                </button>
                            ))}
                        </div>

                        {formData.type === 'quantitative' && (
                            <div className="flex flex-col gap-3 bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <label className="text-xs text-blue-600 block mb-1 font-bold">目標數值</label>
                                        <input type="number" className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm" value={formData.dailyTarget} onChange={e => setFormData({ ...formData, dailyTarget: parseInt(e.target.value) || 0 })} />
                                    </div>
                                    <div className="w-24">
                                        <label className="text-xs text-blue-600 block mb-1 font-bold">單位</label>
                                        <input type="text" placeholder="cc" className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-blue-600 block mb-1 font-bold">每次增量 (例如 +200)</label>
                                    <input type="number" className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm" value={formData.stepValue} onChange={e => setFormData({ ...formData, stepValue: parseInt(e.target.value) || 0 })} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Subtask editor — supports rename, add, soft/hard delete */}
                    {(formData.type === 'checklist' || formData.subtasks.length > 0) && (
                        <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">子任務 ({formData.subtasks.length})</label>
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
                                                    alert('刪除失敗');
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
                                    + 加入子任務
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
                            <span className="flex items-center gap-2"><Clock size={16} /> 日期、重複與提醒設定</span>
                            {activeTab === 'advance' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        {activeTab === 'advance' && (
                            <div className="space-y-4 animate-fade-in-down">

                                {/* SECTION 1: Date & Time */}
                                <div className="bg-gray-50 p-4 rounded-xl">
                                    <label className="text-xs text-gray-500 block mb-2 font-bold flex items-center gap-1"><Calendar size={12} /> 時間與頻率</label>

                                    <div className="flex gap-3 mb-4">
                                        {/* Hide date picker in template mode - date is determined by plan start date + phase */}
                                        {!templateMode && (
                                            <div className="flex-1">
                                                <label className="text-[10px] text-gray-400 block mb-1">開始日期</label>
                                                <input
                                                    type="date"
                                                    className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm"
                                                    value={formData.date}
                                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                                />
                                            </div>
                                        )}
                                        <div className={templateMode ? "w-full" : "flex-1"}>
                                            <label className="text-[10px] text-gray-400 block mb-1">時間</label>
                                            <input
                                                type="time"
                                                className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm"
                                                value={formData.time}
                                                onChange={e => setFormData({ ...formData, time: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-200 my-3"></div>

                                    <label className="text-[10px] text-gray-400 block mb-1">重複頻率</label>
                                    <div className="flex gap-2 mb-3">
                                        {['once', 'daily', 'weekly', 'monthly'].map(freq => (
                                            <button
                                                key={freq}
                                                onClick={() => setFormData({ ...formData, recurrence: { ...formData.recurrence, type: freq } })}
                                                className={`flex-1 py-1.5 text-xs font-bold rounded border ${formData.recurrence.type === freq ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-white text-gray-500 border-gray-200'}`}
                                            >
                                                {freq === 'once' ? '不重複' : freq === 'daily' ? '每天' : freq === 'weekly' ? '每週' : '每月'}
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
                                                    /> 固定星期
                                                </label>
                                                <label className="text-xs flex items-center gap-1 cursor-pointer">
                                                    <input
                                                        type="radio" name="weekMode"
                                                        checked={formData.recurrence.mode === 'period_count'}
                                                        onChange={() => setFormData({ ...formData, recurrence: { ...formData.recurrence, mode: 'period_count' } })}
                                                    /> 彈性頻率 (週期目標)
                                                </label>
                                            </div>

                                            {formData.recurrence.mode !== 'period_count' ? (
                                                <div>
                                                    <label className="text-[10px] text-gray-400 block mb-1">重複於：</label>
                                                    <div className="flex justify-between">
                                                        {['日', '一', '二', '三', '四', '五', '六'].map((d, i) => (
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
                                                        <span className="text-sm text-gray-600">每週完成</span>
                                                        <input
                                                            type="number" className="w-16 border border-gray-300 rounded px-2 py-1 text-center"
                                                            value={formData.recurrence.periodTarget}
                                                            onChange={e => setFormData({ ...formData, recurrence: { ...formData.recurrence, periodTarget: parseInt(e.target.value) || 0 } })}
                                                        />
                                                        <span className="text-sm text-gray-600">次</span>
                                                    </div>
                                                    <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.recurrence.dailyLimit !== false}
                                                            onChange={e => setFormData({ ...formData, recurrence: { ...formData.recurrence, dailyLimit: e.target.checked } })}
                                                        />
                                                        每日限完成 1 次
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
                                                    /> 固定日期
                                                </label>
                                                <label className="text-xs flex items-center gap-1 cursor-pointer">
                                                    <input
                                                        type="radio" name="monthMode"
                                                        checked={formData.recurrence.mode === 'period_count'}
                                                        onChange={() => setFormData({ ...formData, recurrence: { ...formData.recurrence, mode: 'period_count' } })}
                                                    /> 彈性頻率
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
                                                        每月 {new Date(formData.date).getDate()} 日
                                                    </label>
                                                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                                        <input
                                                            type="radio" name="monthType"
                                                            checked={formData.recurrence.monthType === 'day'}
                                                            onChange={() => setFormData({ ...formData, recurrence: { ...formData.recurrence, monthType: 'day' } })}
                                                        />
                                                        {dateInfo.desc}
                                                    </label>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-gray-600">每月完成</span>
                                                        <input
                                                            type="number" className="w-16 border border-gray-300 rounded px-2 py-1 text-center"
                                                            value={formData.recurrence.periodTarget}
                                                            onChange={e => setFormData({ ...formData, recurrence: { ...formData.recurrence, periodTarget: parseInt(e.target.value) || 0 } })}
                                                        />
                                                        <span className="text-sm text-gray-600">次</span>
                                                    </div>
                                                    <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={formData.recurrence.dailyLimit !== false}
                                                            onChange={e => setFormData({ ...formData, recurrence: { ...formData.recurrence, dailyLimit: e.target.checked } })}
                                                        />
                                                        每日限完成 1 次
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {formData.recurrence.type !== 'once' && (
                                        <div className="pt-2">
                                            <div className="flex gap-2 items-center mb-2">
                                                <span className="text-xs text-gray-500">停止條件:</span>
                                                <select
                                                    className="bg-white border border-gray-200 text-xs rounded px-2 py-1 outline-none"
                                                    value={formData.recurrence.endType}
                                                    onChange={e => setFormData({ ...formData, recurrence: { ...formData.recurrence, endType: e.target.value } })}
                                                >
                                                    <option value="never">永不停止</option>
                                                    <option value="count">重複幾次後</option>
                                                    {!templateMode && <option value="date">直到日期</option>}
                                                </select>
                                            </div>
                                            {formData.recurrence.endType === 'count' && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-500">重複</span>
                                                    <input
                                                        type="number"
                                                        min={1}
                                                        className="w-16 bg-white border border-gray-200 rounded px-2 py-1 text-sm text-center"
                                                        value={formData.recurrence.endCount || 30}
                                                        onChange={e => setFormData({ ...formData, recurrence: { ...formData.recurrence, endCount: parseInt(e.target.value) || 1 } })}
                                                    />
                                                    <span className="text-xs text-gray-500">次後終止</span>
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
                                        <label className="text-xs text-gray-500 font-bold flex items-center gap-1"><Bell size={12} /> 提醒通知</label>
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
                                                <option value="0">準時 ({formData.time})</option>
                                                <option value="10">10 分鐘前</option>
                                                <option value="30">30 分鐘前</option>
                                                <option value="60">1 小時前</option>
                                                <option value="1440">1 天前</option>
                                            </select>
                                            <p className="text-[10px] text-gray-400 flex items-center gap-1">
                                                <Check size={10} /> 若任務提早完成，系統將自動取消提醒
                                            </p>
                                        </div>
                                    )}
                                </div>

                            </div>
                        )}
                    </div>

                    {/* Details */}
                    <div>
                        <label className="text-xs text-gray-400 block mb-1 font-bold uppercase">備註說明</label>
                        <textarea
                            className="w-full bg-gray-50 border-none rounded-xl p-3 text-sm text-gray-600 focus:ring-1 focus:ring-emerald-500 resize-none"
                            placeholder="寫點什麼..." rows={3}
                            value={formData.details}
                            onChange={e => setFormData({ ...formData, details: e.target.value })}
                        />
                    </div>

                    {/* Anchor (cue) */}
                    <div className="mt-4">
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            錨點 <span className="text-xs font-medium text-gray-400">(選填，做習慣前的提示)</span>
                        </label>
                        <AnchorPicker
                            value={formData.cue || null}
                            onChange={(cue) => setFormData(f => ({ ...f, cue: cue || '' }))}
                            yourTasks={yourTasks}
                            excludeTaskId={initialData?.id}
                        />
                        {formData.cue && (
                            <p className="text-xs text-gray-500 mt-2">
                                目前錨點：<span className="font-medium text-gray-700">{formData.cue}</span>
                                <button
                                    type="button"
                                    onClick={() => setFormData(f => ({ ...f, cue: '' }))}
                                    className="ml-2 text-xs text-emerald-600 hover:underline"
                                >
                                    清除
                                </button>
                            </p>
                        )}
                    </div>

                    {/* Identity */}
                    <div className="mt-4">
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            身分認同 <span className="text-xs font-medium text-gray-400">(可跳過)</span>
                        </label>
                        <IdentityPicker
                            value={formData.identity || null}
                            onChange={(s) => setFormData(f => ({ ...f, identity: s || '' }))}
                            userTypeKey={userTypeKey}
                        />
                    </div>

                </div>

                {/* Footer */}
                {initialData && (
                    <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex justify-between items-center">
                        <span className="text-xs text-gray-400">ID: {initialData.id}</span>
                        <button onClick={() => onDelete(initialData.id)} className="text-red-500 flex items-center gap-1 text-sm font-bold hover:bg-red-50 px-3 py-1 rounded-lg transition-colors">
                            <Trash2 size={16} /> 刪除
                        </button>
                    </div>
                )}
            </div>
        </div>,
        modalRoot
    );
};

function SubtaskEditorRow({ subtask, hasHistory, onRename, onHide, onPermanentDelete }) {
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
                    placeholder="子任務名稱"
                />
                {!isHidden && (
                    <button
                        type="button"
                        onClick={() => setConfirmOpen(prev => !prev)}
                        className="px-2 py-1.5 text-gray-400 hover:text-red-500"
                        aria-label="刪除子任務"
                    >
                        ×
                    </button>
                )}
                {isHidden && (
                    <span className="text-xs text-gray-400">已停用 ({subtask.removedAt})</span>
                )}
            </div>

            {confirmOpen && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                    <p className="text-sm font-bold text-gray-800">刪除「{subtask.label || '未命名'}」？</p>
                    <label className="flex items-start gap-2 cursor-pointer">
                        <input type="radio" checked={mode === 'hide'} onChange={() => setMode('hide')} className="mt-0.5" />
                        <div>
                            <p className="text-sm text-gray-700">從今天起不再出現</p>
                            <p className="text-xs text-gray-500">過去的完成紀錄保留</p>
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
                            <p className="text-sm text-gray-700">永久刪除，包含所有過去紀錄</p>
                            <p className="text-xs text-gray-500">{hasHistory ? '清乾淨，過去的勾選紀錄一起消失' : '無歷史紀錄，不需要這選項'}</p>
                        </div>
                    </label>
                    <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={() => setConfirmOpen(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded">
                            取消
                        </button>
                        <button type="button" onClick={handleConfirm} className="px-3 py-1.5 text-sm bg-red-500 text-white font-medium rounded hover:bg-red-600">
                            確認刪除
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default TaskFormModal;
