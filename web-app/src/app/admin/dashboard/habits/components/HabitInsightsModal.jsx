"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { X, Plus, Edit2, Trash2, Loader, ChevronUp, ChevronDown } from 'lucide-react';
import HabitInsightFormModal from './HabitInsightFormModal';

// HabitInsightsModal — Slice N admin list view + entry to the per-row form.
//
// Lists ALL insights (draft + published + archived) for a habit so admins
// see the full picture, not just the user-visible ones. Sorted by order
// then by createdAt desc, matching the GET /api/habits/:id/insights
// endpoint's response ordering.

const STATUS_BADGE = {
    draft:     { label: '草稿',  cls: 'bg-gray-500/15 text-gray-300' },
    published: { label: '已發佈', cls: 'bg-emerald-500/15 text-emerald-300' },
    archived:  { label: '已封存', cls: 'bg-amber-500/15 text-amber-300' },
};

export default function HabitInsightsModal({ isOpen, onClose, habit }) {
    const habitId = habit?.id;
    const habitName = habit?.name;

    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null); // null = create, row = edit

    const load = useCallback(async () => {
        if (!habitId) return;
        setLoading(true);
        setError(null);
        try {
            // status=all gives admins the full picture (drafts visible).
            const res = await fetch(`/api/habits/${habitId}/insights?status=all`, { cache: 'no-store' });
            if (!res.ok) throw new Error(`status ${res.status}`);
            const data = await res.json();
            setRows(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('[HabitInsightsModal] fetch failed:', err);
            setError('取得 insight 失敗');
        } finally {
            setLoading(false);
        }
    }, [habitId]);

    useEffect(() => {
        if (isOpen) load();
    }, [isOpen, load]);

    if (!isOpen) return null;

    const handleAdd = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const handleEdit = (row) => {
        setEditing(row);
        setFormOpen(true);
    };
    const handleSaved = () => {
        setFormOpen(false);
        setEditing(null);
        load();
    };

    const handleDelete = async (row) => {
        if (!confirm(`確定要刪除「${row.title}」？此動作無法復原。`)) return;
        try {
            const res = await fetch(`/api/admin/habits/insights/${row.id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(`status ${res.status}`);
            load();
        } catch (err) {
            console.error('[HabitInsightsModal] delete failed:', err);
            alert('刪除失敗');
        }
    };

    // Inline status flip — fast path for the common publish / archive case
    // without opening the form modal.
    const setStatus = async (row, status) => {
        try {
            const res = await fetch(`/api/admin/habits/insights/${row.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error(`status ${res.status}`);
            load();
        } catch (err) {
            console.error('[HabitInsightsModal] status flip failed:', err);
            alert('狀態切換失敗');
        }
    };

    // Inline reorder — neighbour-swap so admins can nudge order without
    // re-typing the number. Bounded by list length.
    const moveOrder = async (row, direction) => {
        const sorted = [...rows].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        const idx = sorted.findIndex(r => r.id === row.id);
        const neighbour = sorted[idx + direction];
        if (!neighbour) return; // already at edge
        try {
            await Promise.all([
                fetch(`/api/admin/habits/insights/${row.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ order: neighbour.order ?? 0 }),
                }),
                fetch(`/api/admin/habits/insights/${neighbour.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ order: row.order ?? 0 }),
                }),
            ]);
            load();
        } catch (err) {
            console.error('[HabitInsightsModal] reorder failed:', err);
            alert('排序失敗');
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-start gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-white">科學佐證</h2>
                        <p className="text-xs text-gray-400 mt-1">習慣：{habitName}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleAdd}
                            className="admin-button-primary flex items-center gap-2 text-sm"
                        >
                            <Plus size={14} /> 新增
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-white">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading && (
                        <div className="flex items-center justify-center py-12 text-gray-400">
                            <Loader size={20} className="animate-spin mr-2" /> 載入中…
                        </div>
                    )}
                    {error && !loading && (
                        <div className="px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-sm text-red-300">
                            {error}
                        </div>
                    )}
                    {!loading && !error && rows.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                            <p className="mb-1">這個習慣還沒有任何科學佐證</p>
                            <p className="text-xs text-gray-500">點右上「新增」開始</p>
                        </div>
                    )}
                    {!loading && !error && rows.length > 0 && (
                        <ul className="space-y-3">
                            {rows.map((row, i) => {
                                const badge = STATUS_BADGE[row.status] || STATUS_BADGE.draft;
                                return (
                                    <li
                                        key={row.id}
                                        className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-colors"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${badge.cls}`}>
                                                        {badge.label}
                                                    </span>
                                                    <span className="text-[10px] text-gray-500">
                                                        #{row.order ?? 0}
                                                    </span>
                                                    {row.aiGenerated && (
                                                        <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/15 text-purple-300">
                                                            AI
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="font-bold text-white leading-snug">{row.title}</h3>
                                                <p className="text-xs text-gray-400 mt-1 line-clamp-2">{row.summary}</p>
                                                <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-500">
                                                    <span>{(row.sources || []).length} 來源</span>
                                                    <span>·</span>
                                                    <span>{(row.tags || []).length} 標籤</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                {/* Reorder up / down */}
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => moveOrder(row, -1)}
                                                        disabled={i === 0}
                                                        className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                                        title="往上"
                                                    >
                                                        <ChevronUp size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => moveOrder(row, 1)}
                                                        disabled={i === rows.length - 1}
                                                        className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                                        title="往下"
                                                    >
                                                        <ChevronDown size={14} />
                                                    </button>
                                                </div>
                                                <div className="flex gap-1">
                                                    {/* Quick publish / archive toggle */}
                                                    {row.status !== 'published' && (
                                                        <button
                                                            onClick={() => setStatus(row, 'published')}
                                                            className="px-2 py-1 text-[10px] rounded bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                                                            title="發佈（user 可見）"
                                                        >
                                                            發佈
                                                        </button>
                                                    )}
                                                    {row.status !== 'archived' && (
                                                        <button
                                                            onClick={() => setStatus(row, 'archived')}
                                                            className="px-2 py-1 text-[10px] rounded bg-amber-500/15 text-amber-300 hover:bg-amber-500/25"
                                                            title="封存（user 看不到）"
                                                        >
                                                            封存
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex gap-1 mt-1">
                                                    <button
                                                        onClick={() => handleEdit(row)}
                                                        className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                                                        title="編輯"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(row)}
                                                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                                        title="刪除"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>

            {/* Form modal layered on top */}
            <HabitInsightFormModal
                isOpen={formOpen}
                onClose={() => { setFormOpen(false); setEditing(null); }}
                habitId={habitId}
                habitName={habitName}
                initial={editing}
                onSaved={handleSaved}
            />
        </div>
    );
}
