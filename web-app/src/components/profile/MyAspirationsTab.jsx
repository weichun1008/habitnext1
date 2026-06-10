'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Loader, Check, Archive, Trash2, Pencil, X } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { translateDomain } from '@/lib/i18n/dataLabels';

// identity is now an aspiration-level field (2026-06-03). Cap matches the
// per-habit IdentityPicker's old limit so the data shape stays consistent.
const IDENTITY_MAX = 40;

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

function formatRelativeDate(iso, t) {
    if (!iso) return '';
    const then = new Date(iso);
    if (Number.isNaN(then.getTime())) return '';
    const ms = Date.now() - then.getTime();
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    if (days < 1) return t('aspirations.time.today');
    if (days < 30) return t('aspirations.time.daysAgo', { n: days });
    if (days < 365) return t('aspirations.time.monthsAgo', { n: Math.floor(days / 30) });
    return t('aspirations.time.yearsAgo', { n: Math.floor(days / 365) });
}

function statusBadge(status, t) {
    if (status === 'achieved') {
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">{t('aspirations.status.achieved')}</span>;
    }
    if (status === 'archived') {
        return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{t('aspirations.status.archived')}</span>;
    }
    return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">{t('aspirations.status.active')}</span>;
}

export default function MyAspirationsTab({ userId }) {
    const { t } = useT();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pendingId, setPendingId] = useState(null); // aspirationId of in-flight PATCH/DELETE
    // identity inline edit (2026-06-03)
    const [editingId, setEditingId] = useState(null);   // aspirationId being edited
    const [editingText, setEditingText] = useState('');

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
            setError(t('aspirations.errors.fetchFailed'));
        } finally {
            setLoading(false);
        }
    }, [userId, t]);

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
            setError(t('aspirations.errors.updateFailed'));
        } finally {
            setPendingId(null);
        }
    };

    const beginEditIdentity = (a) => {
        setEditingId(a.id);
        setEditingText(a.identity || '');
        setError(null);
    };

    const cancelEditIdentity = () => {
        setEditingId(null);
        setEditingText('');
    };

    const saveIdentity = async (id) => {
        setPendingId(id);
        setError(null);
        try {
            const res = await fetch(`/api/aspirations/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identity: editingText.trim() }),
            });
            if (!res.ok) throw new Error(`status ${res.status}`);
            setEditingId(null);
            setEditingText('');
            await load();
        } catch (err) {
            console.error('[MyAspirationsTab] save identity failed:', err);
            setError(t('aspirations.errors.updateIdentityFailed'));
        } finally {
            setPendingId(null);
        }
    };

    const deleteRow = async (id, text) => {
        if (!confirm(t('aspirations.deleteConfirm', { text }))) return;
        setPendingId(id);
        setError(null);
        try {
            const res = await fetch(`/api/aspirations/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(`status ${res.status}`);
            await load();
        } catch (err) {
            console.error('[MyAspirationsTab] delete failed:', err);
            setError(t('aspirations.errors.deleteFailed'));
        } finally {
            setPendingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-10 text-gray-400">
                <Loader size={18} className="animate-spin mr-2" /> {t('aspirations.loading')}
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
                {t('aspirations.empty')}
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
                                {/* Identity — the daily-view group header. Inline-editable. */}
                                {editingId === a.id ? (
                                    <div className="mt-1.5 flex items-center gap-1.5">
                                        <input
                                            type="text"
                                            autoFocus
                                            maxLength={IDENTITY_MAX}
                                            value={editingText}
                                            onChange={(e) => setEditingText(e.target.value.slice(0, IDENTITY_MAX))}
                                            placeholder={t('aspirations.identityEditPlaceholder', { n: IDENTITY_MAX })}
                                            className="flex-1 min-w-0 px-2 py-1 border border-emerald-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') saveIdentity(a.id);
                                                if (e.key === 'Escape') cancelEditIdentity();
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => saveIdentity(a.id)}
                                            disabled={isPending}
                                            className="p-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50"
                                            aria-label={t('aspirations.saveIdentity')}
                                        >
                                            <Check size={14} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={cancelEditIdentity}
                                            disabled={isPending}
                                            className="p-1 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-50"
                                            aria-label={t('common.cancel')}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => beginEditIdentity(a)}
                                        className="mt-1 flex items-center gap-1 text-left group"
                                    >
                                        {a.identity ? (
                                            <span className="text-xs font-medium text-emerald-700">{a.identity}</span>
                                        ) : (
                                            <span className="text-xs text-gray-400">{t('aspirations.setIdentity')}</span>
                                        )}
                                        <Pencil size={11} className="text-gray-300 group-hover:text-gray-500" />
                                    </button>
                                )}
                                <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1.5 flex-wrap">
                                    {statusBadge(a.status, t)}
                                    <span>{a.domain ? translateDomain(a.domain, t) : t('aspirations.uncategorized')}</span>
                                    <span>·</span>
                                    <span>{t('aspirations.linkedTasks', { n: habitCount })}</span>
                                    <span>·</span>
                                    <span>{formatRelativeDate(a.createdAt, t)}</span>
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
                                    <Check size={12} /> {t('aspirations.markAchieved')}
                                </button>
                            )}
                            {a.status !== 'archived' && (
                                <button
                                    type="button"
                                    onClick={() => patchStatus(a.id, { status: 'archived' })}
                                    disabled={isPending}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                                >
                                    <Archive size={12} /> {t('aspirations.archive')}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => deleteRow(a.id, a.text)}
                                disabled={isPending}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                            >
                                <Trash2 size={12} /> {t('aspirations.delete')}
                            </button>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}
