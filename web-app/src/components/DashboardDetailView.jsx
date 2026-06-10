'use client';

import React from 'react';
import { Activity, MessageSquare } from 'lucide-react';
import { useT } from '@/lib/i18n';

const DashboardDetailView = ({ tasks }) => {
    const { t } = useT();
    // Mock Week Data Generation
    const weekData = [45, 60, 55, 80, 70, 90, 65]; // Percentages
    const tWeekDays = t('header.weekDays'); // Mon..Sun，可能是 string[] 也可能是 fallback string
    const weekDayLabels = Array.isArray(tWeekDays) ? tWeekDays : ['一', '二', '三', '四', '五', '六', '日'];

    return (
        <div className="p-4 md:p-8 w-full pb-24 animate-fade-in-up">
            <h2 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2">
                <Activity className="text-emerald-600" /> {t('dashboard.insightsTitle')}
            </h2>

            {/* Weekly Trend Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <h3 className="font-bold text-gray-700 mb-4">{t('dashboard.weeklyTrend')}</h3>
                <div className="flex items-end justify-between h-40 gap-2">
                    {weekDayLabels.map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                            <div className="w-full bg-gray-100 rounded-t-lg relative flex-1 overflow-hidden">
                                <div
                                    className={`absolute bottom-0 w-full rounded-t-lg transition-all duration-1000 ${weekData[i] > 80 ? 'bg-emerald-500' : 'bg-emerald-300'}`}
                                    style={{ height: `${weekData[i]}%` }}
                                ></div>
                            </div>
                            <span className="text-xs text-gray-400 font-bold">{d}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* AI Coach Insight */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-2xl border border-blue-100 relative">
                <div className="absolute top-4 right-4 bg-white p-2 rounded-full shadow-sm">
                    <MessageSquare size={20} className="text-blue-500" />
                </div>
                <h3 className="font-bold text-blue-900 mb-2">{t('dashboard.coachTitle')}</h3>
                <p className="text-sm text-blue-800 leading-relaxed">
                    {t('dashboard.coachQuote1')}<span className="font-bold">{t('dashboard.coachWater')}</span>{t('dashboard.coachQuote2')}<span className="font-bold">{t('dashboard.coachSleep')}</span>{t('dashboard.coachQuote3')}
                </p>
            </div>
        </div>
    );
}

export default DashboardDetailView;
