import React from 'react';
import { Calendar, Award, Plus, X } from 'lucide-react';

const AppHeader = ({ onViewChange, currentView, onOpenAddFlow, onOpenBadges }) => {
    const weekDays = ['一', '二', '三', '四', '五', '六', '日'];

    return (
        <div className="bg-white sticky top-0 z-30 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => onViewChange('daily')}>
                    <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden border border-gray-100">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Avatar" className="w-full h-full" />
                    </div>
                    <span className="font-bold text-gray-800 text-sm md:text-base">火焰阿淳 🔥</span>
                </div>

                {currentView === 'daily' ? (
                    <div className="flex items-center gap-2">
                        <Calendar size={18} className="text-gray-600" />
                        <span className="font-bold text-gray-800 text-sm md:text-base">11/28 (五)</span>
                    </div>
                ) : (
                    <span className="font-bold text-emerald-600">
                        {currentView === 'manage' ? '任務管理' : currentView === 'dashboard_detail' ? '洞察報告' : '成就中心'}
                    </span>
                )}

                <div className="flex gap-2">
                    {currentView === 'daily' && (
                        <>
                            <button onClick={onOpenBadges} className="w-8 h-8 bg-gray-100 text-yellow-600 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors">
                                <Award size={20} />
                            </button>
                            <button onClick={onOpenAddFlow} className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center hover:bg-emerald-100 transition-colors">
                                <Plus size={20} />
                            </button>
                        </>
                    )}
                    {(currentView !== 'daily' && currentView !== 'dashboard_detail') && (
                        <button onClick={() => onViewChange('daily')} className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center hover:bg-emerald-100 transition-colors">
                            <Calendar size={20} />
                        </button>
                    )}
                    {currentView === 'dashboard_detail' && (
                        <button onClick={() => onViewChange('daily')} className="w-8 h-8 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors">
                            <X size={20} />
                        </button>
                    )}
                    {currentView === 'manage' && (
                        <button onClick={onOpenAddFlow} className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center text-white hover:bg-gray-700 transition-colors">
                            <Plus size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Week Strip */}
            {currentView === 'daily' && (
                <div className="flex justify-between items-center px-2 md:px-6 pb-0 overflow-x-auto no-scrollbar">
                    {weekDays.map((day, index) => {
                        const isSelected = index === 4;
                        return (
                            <div key={index} className={`flex flex-col items-center justify-center py-2 px-3 md:px-6 cursor-pointer relative min-w-[3rem] ${isSelected ? 'text-emerald-600 font-bold' : 'text-gray-400 font-medium'}`}>
                                <span className="text-sm">{day}</span>
                                {isSelected && <div className="absolute bottom-0 w-full h-[3px] bg-emerald-500 rounded-t-full"></div>}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AppHeader;
