import React from 'react';
import { Activity, MessageSquare } from 'lucide-react';

const DashboardDetailView = ({ tasks }) => {
    // Mock Week Data Generation
    const weekData = [45, 60, 55, 80, 70, 90, 65]; // Percentages

    return (
        <div className="p-4 md:p-8 w-full pb-24 animate-fade-in-up">
            <h2 className="text-2xl font-black text-gray-800 mb-6 flex items-center gap-2">
                <Activity className="text-emerald-600" /> 健康洞察報告
            </h2>

            {/* Weekly Trend Chart */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
                <h3 className="font-bold text-gray-700 mb-4">本週完成率趨勢</h3>
                <div className="flex items-end justify-between h-40 gap-2">
                    {['一', '二', '三', '四', '五', '六', '日'].map((d, i) => (
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
                <h3 className="font-bold text-blue-900 mb-2">💡 健康教練點評</h3>
                <p className="text-sm text-blue-800 leading-relaxed">
                    「你這週在 <span className="font-bold">飲水</span> 方面表現非常穩定，連續三天達標！不過 <span className="font-bold">睡眠</span> 時間似乎有些不規律。建議今晚試著設定一個 10:30 的『睡前儀式』提醒，這能幫助你提升 20% 的深層睡眠品質喔。」
                </p>
            </div>
        </div>
    );
}

export default DashboardDetailView;
