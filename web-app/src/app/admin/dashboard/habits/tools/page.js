"use client";

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Wrench, Wind, Timer, Music, Package } from 'lucide-react';
import { describeTool } from '@/lib/tools';
import { describeMusic } from '@/lib/musicTool';

const VIRTUAL_TYPES = [
    { key: 'breathing', label: '呼吸', Icon: Wind },
    { key: 'timer', label: '番茄鐘・計時', Icon: Timer },
    { key: 'music', label: '睡眠音樂', Icon: Music },
];

function paramSummary(toolType, params) {
    if (!toolType) return '—';
    const config = params || {};
    if (toolType === 'music') {
        return describeMusic(config) || '音樂';
    }
    return describeTool(toolType, config) || '—';
}

export default function HabitToolsPage() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch('/api/admin/habits/tools');
                if (!res.ok) throw new Error('讀取失敗');
                const json = await res.json();
                if (!cancelled) setData(json);
            } catch (e) {
                if (!cancelled) setError(e.message || '讀取失敗');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    const habits = data?.habits ?? [];
    const typeTotals = data?.typeTotals ?? { breathing: 0, timer: 0, music: 0 };
    const totals = data?.totals ?? { habitsWithTool: 0, tasksUsingTool: 0 };

    const physicalHabits = habits.filter(h => Array.isArray(h.physical) && h.physical.length > 0);

    return (
        <div className="p-6">
            {/* Header */}
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <div className="flex items-center gap-4">
                    <a
                        href="/admin/dashboard/habits"
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={20} />
                    </a>
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Wrench size={22} /> 習慣工具總覽
                        </h1>
                        <p className="text-gray-400 text-sm">
                            唯讀檢視：哪些習慣綁定了工具、以及有多少使用者任務正在使用各工具。
                        </p>
                    </div>
                </div>
                <a
                    href="/admin/dashboard/habits"
                    className="admin-btn admin-btn-secondary flex items-center gap-2"
                >
                    <ArrowLeft size={16} /> 返回習慣庫
                </a>
            </div>

            {loading ? (
                <div className="admin-card text-center py-16 text-gray-400">載入中...</div>
            ) : error ? (
                <div className="admin-card text-center py-16 text-red-400">{error}</div>
            ) : (
                <>
                    {/* Summary cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
                        <div className="admin-card hover:border-emerald-500/40 hover:-translate-y-0.5 transition-all">
                            <div className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                                <Wrench size={16} /> 有工具的習慣
                            </div>
                            <div className="text-3xl font-bold text-white">{totals.habitsWithTool}</div>
                        </div>
                        <div className="admin-card hover:border-emerald-500/40 hover:-translate-y-0.5 transition-all">
                            <div className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                                <Package size={16} /> 使用工具的任務
                            </div>
                            <div className="text-3xl font-bold text-white">{totals.tasksUsingTool}</div>
                        </div>
                        {VIRTUAL_TYPES.map(({ key, label, Icon }) => (
                            <div
                                key={key}
                                className="admin-card hover:border-emerald-500/40 hover:-translate-y-0.5 transition-all"
                            >
                                <div className="text-gray-400 text-sm mb-1 flex items-center gap-2">
                                    <Icon size={16} /> {label}
                                </div>
                                <div className="text-3xl font-bold text-white">{typeTotals[key] ?? 0}</div>
                                <div className="text-xs text-gray-500 mt-1">任務數</div>
                            </div>
                        ))}
                    </div>

                    {/* Virtual tool sections */}
                    {VIRTUAL_TYPES.map(({ key, label, Icon }) => {
                        const rows = habits.filter(h => h.toolType === key);
                        return (
                            <div key={key} className="admin-card mb-6">
                                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                    <Icon size={18} /> {label}
                                    <span className="text-sm text-gray-500 font-normal">（{rows.length}）</span>
                                </h2>
                                {rows.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500 text-sm">
                                        尚無習慣使用此工具
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="text-gray-400 border-b border-white/10">
                                                    <th className="py-2 pr-4 font-medium">習慣名稱</th>
                                                    <th className="py-2 pr-4 font-medium">參數摘要</th>
                                                    <th className="py-2 pr-4 font-medium whitespace-nowrap">使用任務數</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {rows.map(h => (
                                                    <tr key={h.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                        <td className="py-3 pr-4 text-white">
                                                            <div className="font-medium">{h.name}</div>
                                                            <div className="text-xs text-gray-500">{h.category}</div>
                                                        </td>
                                                        <td className="py-3 pr-4 text-gray-300">
                                                            {paramSummary(h.toolType, h.params)}
                                                        </td>
                                                        <td className="py-3 pr-4 text-white font-semibold">{h.taskCount}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}

                    {/* Physical tools section */}
                    <div className="admin-card mb-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Package size={18} /> 實體工具
                            <span className="text-sm text-gray-500 font-normal">（{physicalHabits.length}）</span>
                        </h2>
                        {physicalHabits.length === 0 ? (
                            <div className="text-center py-8 text-gray-500 text-sm">
                                尚無習慣綁定實體工具
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {physicalHabits.map(h => (
                                    <div
                                        key={h.id}
                                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-white/5 rounded-xl border border-white/10 hover:border-emerald-500/30 transition-colors"
                                    >
                                        <div>
                                            <div className="font-medium text-white">{h.name}</div>
                                            <div className="text-xs text-gray-500">{h.category}</div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {h.physical.map((p, i) => {
                                                const chip = (
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-gray-200 text-xs border border-white/10">
                                                        <Package size={12} /> {p?.name || '工具'}
                                                    </span>
                                                );
                                                return p?.url ? (
                                                    <a
                                                        key={i}
                                                        href={p.url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="hover:opacity-80 transition-opacity"
                                                    >
                                                        {chip}
                                                    </a>
                                                ) : (
                                                    <React.Fragment key={i}>{chip}</React.Fragment>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
