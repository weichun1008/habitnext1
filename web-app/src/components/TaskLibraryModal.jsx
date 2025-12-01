import React from 'react';
import { Target, X, Edit2, Plus } from 'lucide-react';
import IconRenderer from './IconRenderer';
import { OFFICIAL_TASKS, CATEGORY_CONFIG } from '@/lib/constants';

const TaskLibraryModal = ({ isOpen, onClose, onSelectTask, onOpenCustomForm }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end md:items-center justify-center">
            <div className="bg-white w-full md:max-w-xl h-[90vh] md:h-auto md:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col animate-fade-in-up">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2"><Target size={20} className="text-emerald-500" /> 官方任務清單庫</h3>
                    <button onClick={onClose}><X size={24} className="text-gray-500 hover:text-gray-800" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <button onClick={onOpenCustomForm} className="w-full bg-gray-800 text-white text-base font-bold py-3 rounded-xl shadow-lg hover:bg-gray-700 transition-colors flex items-center justify-center gap-2 mb-6">
                        <Edit2 size={20} /> 手動建立新任務
                    </button>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">推薦模板</p>
                    <div className="space-y-3">
                        {OFFICIAL_TASKS.map(task => {
                            const config = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG['star'];
                            return (
                                <div key={task.id} className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className={`${config.bg} p-2 rounded-xl flex-shrink-0`}>
                                                <IconRenderer category={task.category} size={18} className={config.type === 'emoji' ? 'text-2xl' : ''} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-gray-800">{task.title}</h4>
                                                <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{task.details}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => onSelectTask(task)} className="flex items-center gap-1 text-sm text-white bg-emerald-500 px-3 py-1.5 rounded-full font-bold hover:bg-emerald-600 transition-colors flex-shrink-0">
                                            <Plus size={16} /> 新增
                                        </button>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                                        <p className="text-xs text-gray-600"><span className="font-bold text-emerald-600">💡科學依據:</span> {task.science}</p>
                                        <p className="text-xs text-gray-600"><span className="font-bold text-gray-600">🛠️工具:</span> {task.tool} ({task.recommend})</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TaskLibraryModal;
