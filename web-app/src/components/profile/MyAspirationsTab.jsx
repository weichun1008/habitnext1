'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Loader, Check, Archive, Trash2 } from 'lucide-react';

// MyAspirationsTab — Slice K Task 8.
// Spec: docs/superpowers/specs/2026-05-23-slice-K-aspiration-system-design.md §7
//
// Renders inside ProfileModal as the "我的嚮往" tab. Lists the user's
// non-archived aspirations (active + achieved) — archived rows are hidden
// in v1; spec §7 reserves a filter toggle for v2.
//
// Row actions:
//   - 標記達成   active  → PATCH { status: 'achieved', achievedAt: now }
//   - 封存       active  → PATCH { status: 'archived' }
//                achieved
//   - 刪除       any     → DELETE (with confirm), cascades AspirationHabit
//                          but NOT the underlying Task rows.
//
// v1 explicitly does NOT support editing text/domain. Spec §7: "改 = 刪除
// 重建". So no edit action is shown — keep the contract narrow.

function formatRelativeDate(iso) {
    if (!iso) return '';
    const then = new Date(iso);
    if (Number.isNaN(then.getTime())) return '';
    const ms = Date.now() - then.getTime();
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    if (days < 1) return '今天';
    if (days < 30) return `${days} 天前`;
    if (days < 365) return `${Math.floor(days / 30)} 個月前`;
    return `${Math.floor(days / 365)} 年前`;
}

function statusBadge(status) {
    if (status === 'achieved') {
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">已達成</span>;
    }
    if (status === 'archived') {
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">已封存</span>;
    }
    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">進行中</span>;
}

export default function MyAspirationsTab({ userId }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pendingId, setPendingId] = useState(null); // aspirationId of in-flight PATCH/DELETE

    const load = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        setError(null);
        try {
            // status=all returns active + achieved + archived; we hide
            // archived on the client so v2's filter toggle can flip a flag.
            const res = await fetch(`/api/aspirations?userId=${encodeURIComponent(userId)}&status=all`, { cache: 'no-store' });
            if (!res.ok) throw new Error(`status ${res.status}`);
            const data = await res.json();
            setRows(Array.isArray(data) ? data.filter(a => a.status !== 'archived') : []);
        } catch (err) {
            console.error('[MyAspirationsTab] fetch failed:', err);
            setError('取得嚮往失敗');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => { load(); }, [load]);

    const patchStatus = async (id, patch) => {
        setPendingId(id);
        setError(null);
        try {
            const res = await fetch(`/api/aspirations/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(patch),
            });
            if (!res.ok) throw new Error(`status ${res.status}`);
            await load();
        } catch (err) {
            console.error('[MyAspirationsTab] patch failed:', err);
            setError('更新嚮往失敗');
        } finally {
            setPendingId(null);
        }
    };

    const deleteRow = async (id, text) => {
        if (!confirm(`確定要刪除「${text}」？掛在此嚮往的任務不會被刪除，但會從此嚮往脫鉤。`)) return;
        setPendingId(id);
        setError(null);
        try {
            const res = await fetch(`/api/aspirations/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(`status ${res.status}`);
            await load();
        } catch (err) {
            console.error('[MyAspirationsTab] delete failed:', err);
            setError('刪除嚮往失敗');
        } finally {
            setPendingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10 text-gray-400">
                <Loader size={18} className="animate-spin mr-2" /> 載入中…
            </div>
        );
    }

    if (error) {
        return (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
                {error}
            </div>
        );
    }

    if (rows.length === 0) {
        return (
            <div className="text-center py-10 text-gray-400 text-sm">
                還沒有嚮往。從首頁的 [+] 開始新增。
            </div>
        );
    }

    return (
        <ul className="space-y-3" data-testid="my-aspirations-list">
            {rows.map(a => {
                const habitCount = a?._count?.habits ?? 0;
                const isPending = pendingId === a.id;
                return (
                    <li
                        key={a.id}
                        className="border border-gray-100 rounded-xl p-3 bg-white"
                        data-testid={`aspiration-row-${a.id}`}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-gray-800 leading-snug break-words">
                                    {a.text}
                                </p>
                                <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1.5 flex-wrap">
                                    {statusBadge(a.status)}
                                    <span>{a.domain || '未分類'}</span>
                                    <span>·</span>
                                    <span>掛 {habitCount} 個任務</span>
                                    <span>·</span>
                                    <span>{formatRelativeDate(a.createdAt)}</span>
                                </p>
                            </div>
                            {isPending && <Loader size={14} className="animate-spin text-emerald-500 mt-1 flex-shrink-0" />}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {a.status === 'active' && (
                                <button
                                    type="button"
                                    onClick={() => patchStatus(a.id, { status: 'achieved', achievedAt: new Date().toISOString() })}
                                    disabled={isPending}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                                >
                                    <Check size={12} /> 標記達成
                                </button>
                            )}
                            {a.status !== 'archived' && (
                                <button
                                    type="button"
                                    onClick={() => patchStatus(a.id, { status: 'archived' })}
                                    disabled={isPending}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                                >
                                    <Archive size={12} /> 封存
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => deleteRow(a.id, a.text)}
                                disabled={isPending}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                            >
                                <Trash2 size={12} /> 刪除
                            </button>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
