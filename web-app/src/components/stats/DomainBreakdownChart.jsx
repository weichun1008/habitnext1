import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Cell, ResponsiveContainer, Tooltip } from 'recharts';

// DomainBreakdownChart — Slice I §6.2 widget
// Bar chart of completed tasks per HabitCategory over the last 30 days.
// Per spec §11.5: numbers only, no judgmental "最強 / 待加強" labels.
const DomainBreakdownChart = ({ breakdown }) => {
    if (!breakdown || breakdown.length === 0) {
        return null;
    }

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-700 mb-1">9 大健康面向分布</p>
            <p className="text-xs text-gray-400 mb-3">最近 30 天，完成次數</p>
            <ResponsiveContainer width="100%" height={220}>
                <BarChart data={breakdown} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#6b7280' }}
                        interval={0}
                        angle={-30}
                        textAnchor="end"
                        height={60}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} />
                    <Tooltip
                        cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                        formatter={(value) => [`${value} 次`, '完成']}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {breakdown.map((entry) => (
                            <Cell key={entry.name} fill={entry.color || '#94a3b8'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default DomainBreakdownChart;
