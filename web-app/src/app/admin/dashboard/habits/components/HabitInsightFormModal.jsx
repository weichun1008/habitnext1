"use client";

import React, { useState, useEffect } from 'react';
import { X, Save, Loader, Plus, Trash2 } from 'lucide-react';
import { DIMENSIONS, scoreEvidence } from '@/lib/evidenceStrength';

// HabitInsightFormModal — Slice N admin CRUD for a single insight row.
//
// One form covers create + edit; the difference is whether `initial` is
// passed. Submission POSTs to /api/admin/habits/:habitId/insights (create)
// or PATCHes /api/admin/habits/insights/:id (update); the parent decides
// the verb via the `mode` prop. Keeping the verb out of this component
// keeps the URL routing concerns where they belong (the list modal that
// knows habitId).
//
// `aiGenerated` and `sourcePrompt` are exposed read-only because they're
// audit-trail fields — values come from the AI draft endpoint when used
// (admin doesn't hand-toggle them).

const SOURCE_TYPES = [
    { key: 'pubmed', label: 'PubMed' },
    { key: 'journal', label: 'Journal' },
    { key: 'book', label: 'Book' },
    { key: 'other', label: 'Other' },
];

const EMPTY_FORM = {
    title: '',
    summary: '',
    detail: '',
    takeaway: '',
    sources: [],
    tags: '',  // comma-separated in the form, split into array on save
    status: 'draft',
    order: 0,
    // 預設「未評分」：新建 insight 不會誤顯示 badge。打開開關後才送 evidence。
    evidenceEnabled: false,
    evidence: { studyType: 2, scale: 1, causality: 1, replication: 1 }, // 開關打開後的起始值
};

function toFormShape(insight) {
    if (!insight) return { ...EMPTY_FORM };
    return {
        title: insight.title || '',
        summary: insight.summary || '',
        detail: insight.detail || '',
        takeaway: insight.takeaway || '',
        sources: Array.isArray(insight.sources) ? insight.sources : [],
        tags: Array.isArray(insight.tags) ? insight.tags.join(', ') : '',
        status: insight.status || 'draft',
        order: Number.isFinite(insight.order) ? insight.order : 0,
        evidenceEnabled: Boolean(insight && insight.evidence),
        evidence: (insight && insight.evidence) ? insight.evidence : { studyType: 2, scale: 1, causality: 1, replication: 1 },
    };
}

function toPayload(form) {
    return {
        title: form.title.trim(),
        summary: form.summary.trim(),
        detail: form.detail.trim(),
        takeaway: form.takeaway.trim() || null,
        sources: form.sources
            .filter(s => s && (s.label || s.url))
            .map(s => ({
                label: (s.label || '').trim(),
                url: (s.url || '').trim(),
                type: s.type || 'other',
            })),
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        status: form.status,
        order: Number.isFinite(form.order) ? form.order : 0,
        // 未啟用評分 → 送 null（後端 sanitizeEvidence(null)=null）→ 不顯示 badge。
        evidence: form.evidenceEnabled ? form.evidence : null,
    };
}

export default function HabitInsightFormModal({
    isOpen,
    onClose,
    habitId,
    habitName,
    initial = null, // null = create, non-null = edit
    onSaved,        // fired with the created/updated row
}) {
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setForm(toFormShape(initial));
            setError(null);
            setSaving(false);
        }
    }, [isOpen, initial]);

    if (!isOpen) return null;

    const isEdit = Boolean(initial?.id);

    const addSource = () => {
        setForm(f => ({ ...f, sources: [...f.sources, { label: '', url: '', type: 'pubmed' }] }));
    };
    const updateSource = (i, patch) => {
        setForm(f => ({
            ...f,
            sources: f.sources.map((s, j) => (j === i ? { ...s, ...patch } : s)),
        }));
    };
    const removeSource = (i) => {
        setForm(f => ({ ...f, sources: f.sources.filter((_, j) => j !== i) }));
    };

    const submit = async () => {
        // Front-end sanity check — server validates again but a friendly
        // local message is faster than a 400 round-trip.
        if (!form.title.trim() || !form.summary.trim() || !form.detail.trim()) {
            setError('標題 / 摘要 / 詳細 三個欄位都是必填');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const payload = toPayload(form);
            let res;
            if (isEdit) {
                res = await fetch(`/api/admin/habits/insights/${initial.id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            } else {
                res = await fetch(`/api/admin/habits/${habitId}/insights`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...payload, aiGenerated: false }),
                });
            }
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || `status ${res.status}`);
            }
            const row = await res.json();
            onSaved?.(row);
        } catch (err) {
            console.error('[HabitInsightFormModal] save failed:', err);
            setError(err.message || '儲存失敗');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
            <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-700 flex justify-between items-start gap-3">
                    <div>
                        <h2 className="text-xl font-bold text-white">
                            {isEdit ? '編輯科學佐證' : '新增科學佐證'}
                        </h2>
                        <p className="text-xs text-gray-400 mt-1">習慣：{habitName}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {error && (
                        <div className="px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-sm text-red-300">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="admin-label">標題（12–20 字）</label>
                        <input
                            type="text"
                            className="admin-input"
                            placeholder="例：添加糖與細胞老化的關聯"
                            value={form.title}
                            onChange={e => setForm({ ...form, title: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="admin-label">摘要（80–150 字，2–3 句，含關鍵數字）</label>
                        <textarea
                            className="admin-input"
                            rows={3}
                            placeholder="JAMA Network Open 2024 在 342 位中年女性發現..."
                            value={form.summary}
                            onChange={e => setForm({ ...form, summary: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="admin-label">詳細（300–800 字，markdown 支援）</label>
                        <textarea
                            className="admin-input font-mono text-xs"
                            rows={12}
                            placeholder="**研究設計**...&#10;**主要發現**...&#10;**限制**..."
                            value={form.detail}
                            onChange={e => setForm({ ...form, detail: e.target.value })}
                        />
                        <p className="text-[11px] text-gray-500 mt-1">
                            支援 markdown（**粗體**、- 列表、換行）。觀察性研究記得標明「相關性、不是因果」。
                        </p>
                    </div>

                    <div>
                        <label className="admin-label">Take-away（15–40 字，行動性結尾語）</label>
                        <input
                            type="text"
                            className="admin-input"
                            placeholder="不是戒糖，而是減少讓細胞提早老化的飲食訊號。"
                            value={form.takeaway}
                            onChange={e => setForm({ ...form, takeaway: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="admin-label">標籤（逗號分隔）</label>
                        <input
                            type="text"
                            className="admin-input"
                            placeholder="營養素, 抗老, 添加糖"
                            value={form.tags}
                            onChange={e => setForm({ ...form, tags: e.target.value })}
                        />
                        <p className="text-[11px] text-gray-500 mt-1">給 AI 報告抓取相關 insight 用。3–5 個最佳。</p>
                    </div>

                    {/* Sources */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="admin-label !mb-0">來源（可加多筆）</label>
                            <button
                                type="button"
                                onClick={addSource}
                                className="text-xs px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 flex items-center gap-1"
                            >
                                <Plus size={12} /> 加一筆
                            </button>
                        </div>
                        {form.sources.length === 0 ? (
                            <p className="text-xs text-gray-500 italic">尚無來源</p>
                        ) : (
                            <div className="space-y-2">
                                {form.sources.map((s, i) => (
                                    <div key={i} className="p-3 rounded-lg bg-gray-800/50 border border-gray-700 space-y-2">
                                        <div className="flex gap-2 items-start">
                                            <input
                                                type="text"
                                                className="admin-input flex-1"
                                                placeholder="標籤：JAMA Network Open 2024 — ..."
                                                value={s.label || ''}
                                                onChange={e => updateSource(i, { label: e.target.value })}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeSource(i)}
                                                className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                                                title="刪除來源"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                className="admin-input flex-1"
                                                placeholder="URL（可留空）"
                                                value={s.url || ''}
                                                onChange={e => updateSource(i, { url: e.target.value })}
                                            />
                                            <select
                                                className="admin-input admin-select w-28"
                                                value={s.type || 'other'}
                                                onChange={e => updateSource(i, { type: e.target.value })}
                                            >
                                                {SOURCE_TYPES.map(t => (
                                                    <option key={t.key} value={t.key}>{t.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 證據力評分 — 開關啟用後才送 evidence；未啟用 = 不顯示 badge */}
                    <div className="pt-2 border-t border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                            <label className="admin-label !mb-0 flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={form.evidenceEnabled}
                                    onChange={e => setForm(f => ({ ...f, evidenceEnabled: e.target.checked }))}
                                />
                                啟用證據力評分
                            </label>
                            {form.evidenceEnabled && (() => {
                                const s = scoreEvidence(form.evidence);
                                return (
                                    <span className="text-xs font-bold text-emerald-300">
                                        {s ? `${s.total} / 9 → 證據力 ${s.tierLabel}` : '未完整'}
                                    </span>
                                );
                            })()}
                        </div>
                        {form.evidenceEnabled ? (
                            <>
                                <div className="grid grid-cols-2 gap-3">
                                    {DIMENSIONS.map((dim) => (
                                        <div key={dim.key}>
                                            <label className="text-[11px] text-gray-400 block mb-1">{dim.label}</label>
                                            <select
                                                className="admin-input admin-select w-full"
                                                value={form.evidence[dim.key]}
                                                onChange={e => setForm(f => ({
                                                    ...f,
                                                    evidence: { ...f.evidence, [dim.key]: Number(e.target.value) },
                                                }))}
                                            >
                                                {dim.levels.map(l => (
                                                    <option key={l.value} value={l.value}>{l.label}（{l.points}）</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[11px] text-gray-500 mt-1">分數衡量「證據有多硬」，非「習慣多好」。</p>
                            </>
                        ) : (
                            <p className="text-[11px] text-gray-500">未啟用 — 這則 insight 不會顯示證據力 badge。</p>
                        )}
                    </div>

                    {/* Status + Order — sit side-by-side, both used by admin */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="admin-label">狀態</label>
                            <select
                                className="admin-input admin-select"
                                value={form.status}
                                onChange={e => setForm({ ...form, status: e.target.value })}
                            >
                                <option value="draft">草稿（user 看不到）</option>
                                <option value="published">已發佈（user 可見）</option>
                                <option value="archived">已封存（user 看不到）</option>
                            </select>
                        </div>
                        <div>
                            <label className="admin-label">顯示順序</label>
                            <input
                                type="number"
                                className="admin-input"
                                value={form.order}
                                onChange={e => setForm({ ...form, order: Number(e.target.value) || 0 })}
                            />
                            <p className="text-[11px] text-gray-500 mt-1">數字越小排越前。</p>
                        </div>
                    </div>

                    {/* Audit fields (edit mode only, read-only) */}
                    {isEdit && (
                        <div className="grid grid-cols-2 gap-4 text-xs text-gray-400 pt-2 border-t border-gray-700">
                            <div>
                                <span className="text-gray-500">AI 草擬：</span> {initial.aiGenerated ? '是' : '否'}
                            </div>
                            <div>
                                <span className="text-gray-500">建立於：</span>{' '}
                                {initial.createdAt ? new Date(initial.createdAt).toLocaleString('zh-TW') : '—'}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="admin-button-secondary"
                    >
                        取消
                    </button>
                    <button
                        onClick={submit}
                        disabled={saving}
                        className="admin-button-primary flex items-center gap-2"
                    >
                        {saving ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                        {isEdit ? '儲存' : '建立'}
                    </button>
                </div>
            </div>
        </div>
    );
}
