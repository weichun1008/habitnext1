import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, Clock, ChevronUp, ChevronDown, Trash2, Plus } from 'lucide-react';
import IconRenderer from './IconRenderer';
import { CATEGORY_CONFIG } from '@/lib/constants';
import { generateId, getTodayStr } from '@/lib/utils';

const TaskFormModal = ({ isOpen, onClose, onSave, onDelete, initialData }) => {
    const [formData, setFormData] = useState({
        title: '', details: '', type: 'binary', category: 'star', frequency: 'daily',
        date: getTodayStr(), dailyTarget: 10, unit: '次', stepValue: 1, subtasks: [],
        recurrence: { type: 'daily', interval: 1, endType: 'never', endDate: '', endCount: 10 },
        reminder: { type: 'none', time: '09:00', condition: 'none' }
    });

    const [customEmoji, setCustomEmoji] = useState('');
    const [activeTab, setActiveTab] = useState('basic');
    const iconContainerRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    ...initialData,
                    recurrence: { type: 'daily', interval: 1, endType: 'never', endDate: '', endCount: 10, ...(initialData.recurrence || {}) },
                    reminder: { type: 'none', time: '09:00', condition: 'none', ...(initialData.reminder || {}) },
                    stepValue: initialData.stepValue || 1,
                    subtasks: initialData.subtasks || []
                });
            } else {
                setFormData({
                    title: '', details: '', type: 'binary', category: 'star', frequency: 'daily',
                    date: getTodayStr(), dailyTarget: 10, unit: '次', stepValue: 1, subtasks: [],
                    recurrence: { type: 'daily', interval: 1, endType: 'never', endDate: '', endCount: 10 },
                    reminder: { type: 'none', time: '09:00', condition: 'none' }
                });
            }
            setActiveTab('basic');
        }
    }, [isOpen, initialData]);

    const scrollIcons = (direction) => {
        if (iconContainerRef.current) {
            iconContainerRef.current.scrollBy({ left: direction === 'left' ? -150 : 150, behavior: 'smooth' });
        }
    };

    if (!isOpen) return null;

    const handleSubtaskChange = (idx, field, value) => {
        const newSub = [...formData.subtasks];
        newSub[idx][field] = value;
        setFormData({ ...formData, subtasks: newSub });
    };

    const addSubtask = () => {
        setFormData({
            ...formData,
            type: 'checklist',
            subtasks: [...formData.subtasks, { id: generateId(), title: '', completed: false }]
        });
    };

    const removeSubtask = (idx) => {
        setFormData({ ...formData, subtasks: formData.subtasks.filter((_, i) => i !== idx) });
    };

    const handleAddCustomEmoji = () => {
        if (customEmoji && customEmoji.length <= 2) {
            const newKey = `custom_${generateId()}`;
            CATEGORY_CONFIG[newKey] = { type: 'emoji', value: customEmoji, color: 'text-gray-900', bg: 'bg-yellow-100', label: '自訂' };
            setFormData({ ...formData, category: newKey });
            setCustomEmoji('');
        }
    }

    const selectedConfig = CATEGORY_CONFIG[formData.category] || CATEGORY_CONFIG['star'];

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:max-w-md h-[90vh] md:h-auto md:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col animate-fade-in-up">

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
                                    const IconComp = config.type === 'icon' ? config.value : null;
                                    return (
                                        <div key={key} onClick={() => setFormData({ ...formData, category: key })} className={`flex flex-col items-center gap-1 cursor-pointer min-w-[3.5rem] p-2 rounded-lg transition-all flex-shrink-0 ${isSelected ? 'bg-emerald-50 border-2 border-emerald-500' : 'bg-gray-100 hover:bg-gray-200'}`}>
                                            <div className="w-8 h-8 flex items-center justify-center">
                                                {config.type === 'icon' ? <IconComp size={20} className={config.color} /> : <span className="text-2xl">{config.value}</span>}
                                            </div>
                                            <span className="text-[10px] text-gray-500 font-medium">{config.label}</span>
                                        </div>
                                    )
                                })}
                            </div>
                            <button onClick={() => scrollIcons('right')} className="hidden md:block p-1 text-gray-400 hover:text-gray-600 bg-white shadow-sm rounded-full absolute right-0 z-10"><ChevronRight size={16} /></button>
                        </div>
                    </div>

                    {/* Frequency Type */}
                    <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
                        {['daily', 'weekly', 'monthly'].map(freq => (
                            <button
                                key={freq}
                                onClick={() => setFormData({ ...formData, frequency: freq })}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${formData.frequency === freq ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:bg-gray-200'}`}
                            >
                                {freq === 'daily' ? '每日' : freq === 'weekly' ? '每週' : '每月'}
                            </button>
                        ))}
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
                                        <input type="number" className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm" value={formData.dailyTarget} onChange={e => setFormData({ ...formData, dailyTarget: parseInt(e.target.value) })} />
                                    </div>
                                    <div className="w-24">
                                        <label className="text-xs text-blue-600 block mb-1 font-bold">單位</label>
                                        <input type="text" placeholder="cc" className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-blue-600 block mb-1 font-bold">每次增量 (例如 +200)</label>
                                    <input type="number" className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-sm" value={formData.stepValue} onChange={e => setFormData({ ...formData, stepValue: parseInt(e.target.value) })} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Subtasks */}
                    {(formData.type === 'checklist' || formData.subtasks.length > 0) && (
                        <div className="space-y-3">
                            <label className="text-xs text-gray-400 font-bold uppercase">子任務清單</label>
                            {formData.subtasks.map((sub, idx) => (
                                <div key={sub.id} className="flex items-center gap-2">
                                    <input type="checkbox" disabled className="w-4 h-4 rounded border-gray-300" />
                                    <input
                                        className="flex-1 bg-gray-50 border-b border-transparent focus:border-emerald-500 focus:bg-white outline-none px-2 py-1 text-sm transition-colors"
                                        value={sub.title} placeholder="輸入項目..." autoFocus={idx === formData.subtasks.length - 1}
                                        onChange={e => handleSubtaskChange(idx, 'title', e.target.value)}
                                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
                                    />
                                    <button onClick={() => removeSubtask(idx)} className="text-gray-400 hover:text-red-500"><X size={16} /></button>
                                </div>
                            ))}
                            <button onClick={addSubtask} className="flex items-center gap-2 text-sm text-emerald-600 font-bold hover:text-emerald-700 mt-2">
                                <Plus size={16} /> 新增子任務
                            </button>
                        </div>
                    )}

                    {/* Advanced Settings */}
                    <div className="border-t border-gray-100 pt-4">
                        <button
                            onClick={() => setActiveTab(activeTab === 'advance' ? 'basic' : 'advance')}
                            className="flex items-center justify-between w-full text-sm font-bold text-gray-600 mb-3"
                        >
                            <span className="flex items-center gap-2"><Clock size={16} /> 提醒與重複設定</span>
                            {activeTab === 'advance' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        {activeTab === 'advance' && (
                            <div className="bg-gray-50 p-4 rounded-xl space-y-4 animate-fade-in-down">

                                {/* Reminder Settings (Smart) */}
                                <div>
                                    <label className="text-xs text-gray-500 block mb-2 font-bold">🔔 提醒設定</label>
                                    <div className="flex gap-2 mb-2">
                                        <button
                                            onClick={() => setFormData({ ...formData, reminder: { ...formData.reminder, type: 'fixed' } })}
                                            className={`flex-1 py-1.5 text-xs rounded border ${formData.reminder.type === 'fixed' ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-600 border-gray-200'}`}
                                        >
                                            固定時間
                                        </button>
                                        <button
                                            onClick={() => setFormData({ ...formData, reminder: { ...formData.reminder, type: 'smart' } })}
                                            className={`flex-1 py-1.5 text-xs rounded border ${formData.reminder.type === 'smart' ? 'bg-purple-500 text-white border-purple-500' : 'bg-white text-gray-600 border-gray-200'}`}
                                        >
                                            智慧提醒 (若未完成)
                                        </button>
                                        <button
                                            onClick={() => setFormData({ ...formData, reminder: { ...formData.reminder, type: 'none' } })}
                                            className={`flex-1 py-1.5 text-xs rounded border ${formData.reminder.type === 'none' ? 'bg-gray-500 text-white border-gray-500' : 'bg-white text-gray-600 border-gray-200'}`}
                                        >
                                            關閉
                                        </button>
                                    </div>
                                    {formData.reminder.type !== 'none' && (
                                        <div className="flex items-center gap-3 bg-white p-2 rounded border border-gray-200">
                                            <Clock size={16} className="text-gray-400" />
                                            <input
                                                type="time"
                                                className="outline-none text-sm text-gray-800 bg-transparent flex-1"
                                                value={formData.reminder.time}
                                                onChange={e => setFormData({ ...formData, reminder: { ...formData.reminder, time: e.target.value } })}
                                            />
                                            {formData.reminder.type === 'smart' && (
                                                <span className="text-[10px] text-purple-500 bg-purple-50 px-2 py-0.5 rounded">
                                                    僅在未完成時通知
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="border-t border-gray-200 my-2"></div>

                                {/* Recurrence Settings */}
                                <div>
                                    <label className="text-xs text-gray-500 block mb-2 font-bold">🔁 重複與結束</label>
                                    <div className="flex gap-2">
                                        <select
                                            className="bg-white border border-gray-200 text-sm rounded-lg px-3 py-2 flex-1 outline-none"
                                            value={formData.recurrence.type}
                                            onChange={e => setFormData({ ...formData, recurrence: { ...formData.recurrence, type: e.target.value } })}
                                        >
                                            <option value="daily">每天重複</option>
                                            <option value="weekly">每週重複</option>
                                            <option value="monthly">每月重複</option>
                                            <option value="once">不重複 (單次)</option>
                                        </select>
                                    </div>
                                </div>

                                {formData.recurrence.type !== 'once' && (
                                    <div className="pt-2">
                                        <div className="flex gap-2 mb-2">
                                            {['never', 'date'].map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => setFormData({ ...formData, recurrence: { ...formData.recurrence, endType: type } })}
                                                    className={`px-3 py-1 text-xs rounded border ${formData.recurrence.endType === type ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-600 border-gray-200'}`}
                                                >
                                                    {type === 'never' ? '永不停止' : '直到日期'}
                                                </button>
                                            ))}
                                        </div>
                                        {formData.recurrence.endType === 'date' && (
                                            <input type="date" className="w-full bg-white border border-gray-200 rounded px-3 py-2 text-sm" value={formData.recurrence.endDate} onChange={e => setFormData({ ...formData, recurrence: { ...formData.recurrence, endDate: e.target.value } })} />
                                        )}
                                    </div>
                                )}
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
        </div>
    );
};

export default TaskFormModal;
