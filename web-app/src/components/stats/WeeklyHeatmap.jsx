'use client';

import React from 'react';
import { useT } from '@/lib/i18n';

// WeeklyHeatmap — Slice I §6.2 widget
// 12 weeks × 7 days, GitHub contribution-style grid.
// Color buckets per spec §4.4: 0 / 1 / 2-3 / 4+ → 4 shades.

const bucketClass = (count) => {
    if (count <= 0) return 'bg-gray-100';
    if (count === 1) return 'bg-emerald-200';
    if (count <= 3) return 'bg-emerald-400';
    return 'bg-emerald-600';
};

const WeeklyHeatmap = ({ heatmap }) => {
    const { t } = useT();
    if (!heatmap || heatmap.length === 0) return null;

    // heatmap is 84 entries oldest→newest. Render as 12 columns × 7 rows.
    // Each column is a week (oldest week leftmost).
    const columns = [];
    for (let c = 0; c < 12; c++) {
        columns.push(heatmap.slice(c * 7, (c + 1) * 7));
    }

    return (
        <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
            <p className="text-sm font-medium text-gray-700 mb-1">{t('stats.heatmap.title')}</p>
            <p className="text-xs text-gray-400 mb-3">{t('stats.heatmap.subtitle')}</p>
            <div className="flex gap-1 overflow-x-auto pb-1">
                {columns.map((week, ci) => (
                    <div key={ci} className="flex flex-col gap-1">
                        {week.map((day) => (
                            <div
                                key={day.date}
                                className={`w-3 h-3 rounded-sm ${bucketClass(day.count)}`}
                                title={t('stats.heatmap.dayTitle', { date: day.date, n: day.count })}
                            />
                        ))}
                    </div>
                ))}
            </div>
            {/* Legend */}
            <div className="flex items-center gap-1 mt-3 text-xs text-gray-400">
                <span>{t('stats.heatmap.less')}</span>
                <span className="w-3 h-3 rounded-sm bg-gray-100" />
                <span className="w-3 h-3 rounded-sm bg-emerald-200" />
                <span className="w-3 h-3 rounded-sm bg-emerald-400" />
                <span className="w-3 h-3 rounded-sm bg-emerald-600" />
                <span>{t('stats.heatmap.more')}</span>
            </div>
        </div>
    );
};

export default WeeklyHeatmap;
