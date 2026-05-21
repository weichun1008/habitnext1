'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import StreakHero from './stats/StreakHero';
import CompletionRateCards from './stats/CompletionRateCards';
import DomainBreakdownChart from './stats/DomainBreakdownChart';
import WeeklyHeatmap from './stats/WeeklyHeatmap';
import TaskStreakList from './stats/TaskStreakList';

// StatsView — Slice I parent component
// Fetches /api/stats once per mount and fans out to 5 sub-widgets.
// See spec: docs/superpowers/specs/2026-05-21-slice-i-stats-streak-design.md

const todayString = () => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
};

const isEmpty = (stats) => {
    if (!stats) return true;
    const noStreak = (stats.overall?.currentStreak ?? 0) === 0
        && (stats.overall?.longestStreak ?? 0) === 0;
    const emptyHeatmap = !stats.heatmap || stats.heatmap.every(d => d.count === 0);
    return noStreak && emptyHeatmap;
};

// Inline header with explicit 返回 button. Both desktop sidebar and the
// AppHeader Calendar icon also navigate, but users reported those weren't
// intuitive — this gives a clear in-page back affordance.
const Header = ({ onBack }) => (
    <div className="flex items-center gap-3 mb-1 px-1">
        {onBack && (
            <button
                onClick={onBack}
                className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
                aria-label="返回"
            >
                <ArrowLeft size={20} />
            </button>
        )}
        <h2 className="text-xl font-bold text-gray-800">統計</h2>
    </div>
);

const StatsView = ({ userId, onBack }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const today = todayString();
                const res = await fetch(`/api/stats?userId=${encodeURIComponent(userId)}&today=${today}`);
                if (!res.ok) throw new Error(`Server returned ${res.status}`);
                const data = await res.json();
                if (!cancelled) setStats(data);
            } catch (err) {
                if (!cancelled) setError(err.message || 'Failed to load stats');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        if (userId) load();
        return () => { cancelled = true; };
    }, [userId]);

    // All three return branches share the same outer container (max-w-md
    // mobile-app width, padding) so empty / loading / error states don't
    // break the layout.
    if (loading) {
        return (
            <div className="p-4 space-y-4 w-full">
                <Header onBack={onBack} />
                <div className="text-center text-gray-400 py-12">載入中…</div>
            </div>
        );
    }
    if (error) {
        return (
            <div className="p-4 space-y-4 w-full">
                <Header onBack={onBack} />
                <div className="text-center text-gray-500 py-12">
                    <p>統計暫時無法載入：{error}</p>
                </div>
            </div>
        );
    }
    if (isEmpty(stats)) {
        return (
            <div className="p-4 space-y-4 w-full">
                <Header onBack={onBack} />
                <div className="text-center text-gray-500 py-12">
                    <p className="text-base">打完第一個卡再回來看 📊</p>
                    <p className="text-xs text-gray-400 mt-2">統計需要至少一天的紀錄才有故事</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4 w-full">
            <Header onBack={onBack} />
            <StreakHero overall={stats.overall} />
            <CompletionRateCards rate={stats.completionRate} />
            <DomainBreakdownChart breakdown={stats.domainBreakdown} />
            <WeeklyHeatmap heatmap={stats.heatmap} />
            <TaskStreakList topTaskStreaks={stats.topTaskStreaks} />
        </div>
    );
};

export default StatsView;
