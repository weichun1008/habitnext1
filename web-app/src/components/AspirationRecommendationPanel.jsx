'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Sparkles, Leaf, Loader, ChevronRight, Plus, Check, Target } from 'lucide-react';

// AspirationRecommendationPanel — Slice K, Step 2 of the new-add flow.
// Spec: docs/superpowers/specs/2026-05-23-slice-K-aspiration-system-design.md §3.3
//
// Renders inside / over the AspirationPicker modal as a slide-in panel
// (visually mirrors TemplateDetailPanel from Slice J, but the content is
// recommendations rather than a single template's phases).
//
// Caller responsibility:
//   - Mount when `aspiration` is non-null (parent owns the transition).
//   - Pass `onBack` to return to the picker.
//   - Pass `onPickTemplate` / `onPickHabit` to enter the existing join flows;
//     these handlers should write an AspirationHabit row (POST
//     /api/aspirations/:id/habits with the resulting taskId) after the
//     template/habit-side flow commits.
//   - Pass `onSkip` for the "跳過 — 自己探索" path; opens TemplateExplorer
//     / TaskLibraryModal at the parent's discretion.

function SectionEmpty({ children }) {
    return (
        <p className="text-sm text-gray-400 italic py-2">{children}</p>
    );
}

function TemplateCard({ template, onPick, picking }) {
    const phases = template?.tasks?.phases;
    const totalDays = Array.isArray(phases)
        ? phases.reduce((acc, ph) => acc + (Number(ph.days) || 0), 0)
        : 0;
    const totalTasks = Array.isArray(phases)
        ? phases.reduce((acc, ph) => acc + (Array.isArray(ph.tasks) ? ph.tasks.length : 0), 0)
        : 0;
    return (
        <button
            type="button"
            onClick={onPick}
            disabled={picking}
            className="w-full text-left p-3 rounded-xl border border-gray-200 bg-white hover:border-emerald-300 hover:shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <h5 className="font-bold text-sm text-gray-800 leading-snug">
                        {template.name}
                    </h5>
                    {template.description && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                            {template.description}
                        </p>
                    )}
                    <p className="text-[11px] text-gray-400 mt-1.5">
                        {totalDays > 0 ? `${totalDays} 天 · ${totalTasks} 個任務` : '自訂結構'}
                        {template.expert?.name && <> · {template.expert.name}</>}
                    </p>
                </div>
                {picking ? (
                    <Loader size={14} className="animate-spin text-emerald-500 mt-1" />
                ) : (
                    <ChevronRight size={16} className="text-gray-400 flex-shrink-0 mt-1" />
                )}
            </div>
        </button>
    );
}

function HabitCard({ habit, onPick, onAddCandidate, picking, addedAsCandidate }) {
    // Difficulties keys are pre-sorted by the enum order, but the seed habit
    // shape uses string keys so just look at which are enabled.
    const enabledLevels = ['beginner', 'intermediate', 'challenge'].filter(
        k => habit.difficulties?.[k]?.enabled,
    );
    const levelLabels = enabledLevels.map(k => {
        if (k === 'beginner') return '入門';
        if (k === 'intermediate') return '進階';
        return '挑戰';
    });

    // Once user added this habit to candidate pool in this panel session,
    // both CTAs lock to "已加入" read-only. Prevents the same habit getting
    // dropped into both 'active' and 'candidate' status from two clicks.
    const locked = addedAsCandidate || picking;

    return (
        <div className={`p-3 rounded-xl border transition-all ${
            addedAsCandidate
                ? 'border-emerald-200 bg-emerald-50/40'
                : 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-sm'
        }`}>
            <div className="min-w-0">
                <h5 className="font-bold text-sm text-gray-800 leading-snug">
                    {habit.name}
                </h5>
                {habit.description && (
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                        {habit.description}
                    </p>
                )}
                {levelLabels.length > 0 && (
                    <p className="text-[11px] text-gray-400 mt-1.5">
                        {levelLabels.join(' · ')}
                    </p>
                )}
            </div>

            {/* Two CTAs: candidate (defer-decision) + direct-add (commit now) */}
            <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                    type="button"
                    onClick={onAddCandidate}
                    disabled={locked}
                    className={`flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors disabled:cursor-not-allowed ${
                        addedAsCandidate
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-white border border-gray-200 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50'
                    }`}
                >
                    {addedAsCandidate ? (
                        <><Check size={14} /> 已加入候選</>
                    ) : (
                        <><Plus size={14} /> 加入候選</>
                    )}
                </button>
                <button
                    type="button"
                    onClick={onPick}
                    disabled={locked}
                    className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-500 text-white hover:bg-emerald-600"
                >
                    {picking ? (
                        <Loader size={14} className="animate-spin" />
                    ) : (
                        <>直接加入 <ChevronRight size={14} /></>
                    )}
                </button>
            </div>
        </div>
    );
}

export default function AspirationRecommendationPanel({
    aspiration,
    onBack,
    onPickTemplate,
    onPickHabit,
    onAddHabitAsCandidate,
    onOpenFocusMap,
    onSkipToTemplates,
    onSkipToHabits,
}) {
    const [data, setData] = useState(null); // { templates, habits }
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // pickingId is the id of the template or habit currently being committed
    // — disables sibling cards so a double-tap doesn't fire two onPick calls.
    const [pickingId, setPickingId] = useState(null);
    // Habit ids the user has added to the candidate pool in THIS panel
    // session. Once added the buttons lock; the sticky bottom CTA shows
    // the running count + a path into FocusMapModal.
    const [candidateAddedIds, setCandidateAddedIds] = useState(() => new Set());

    useEffect(() => {
        if (!aspiration?.id) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        fetch(`/api/aspirations/${aspiration.id}/recommendations`, { cache: 'no-store' })
            .then(r => (r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`))))
            .then(payload => {
                if (cancelled) return;
                setData({
                    templates: Array.isArray(payload.templates) ? payload.templates : [],
                    habits: Array.isArray(payload.habits) ? payload.habits : [],
                });
            })
            .catch(err => {
                console.error('[AspirationRecommendationPanel] fetch failed:', err);
                if (!cancelled) setError('取得推薦失敗，請再試一次');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [aspiration?.id]);

    if (!aspiration) return null;

    const handlePickTemplate = async (template) => {
        if (pickingId) return;
        setPickingId(`tpl-${template.id}`);
        try {
            await onPickTemplate?.(template, aspiration);
        } finally {
            setPickingId(null);
        }
    };

    const handlePickHabit = async (habit) => {
        if (pickingId) return;
        setPickingId(`habit-${habit.id}`);
        try {
            await onPickHabit?.(habit, aspiration);
        } finally {
            setPickingId(null);
        }
    };

    const handleAddCandidate = async (habit) => {
        if (pickingId || candidateAddedIds.has(habit.id)) return;
        setPickingId(`habit-${habit.id}`);
        try {
            await onAddHabitAsCandidate?.(habit, aspiration);
            setCandidateAddedIds(prev => {
                const next = new Set(prev);
                next.add(habit.id);
                return next;
            });
        } finally {
            setPickingId(null);
        }
    };

    const candidateCount = candidateAddedIds.size;

    const templates = data?.templates || [];
    const habits = data?.habits || [];
    const isEmptyResults = !loading && !error && templates.length === 0 && habits.length === 0;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="aspiration-rec-title"
            // Same envelope as AspirationPicker so the panel visually "replaces"
            // the picker rather than stacking another modal on top. Parent
            // mounts this conditionally on aspiration != null.
            className="fixed inset-0 z-[10000] bg-black bg-opacity-50 flex items-end md:items-center justify-center"
        >
            <div className="bg-white w-full md:max-w-md h-[85dvh] md:h-auto md:max-h-[85dvh] md:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col animate-fade-in-up">
                {/* Header: back arrow + the aspiration text */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-start gap-3 bg-white rounded-t-2xl">
                    <button
                        type="button"
                        onClick={onBack}
                        aria-label="返回"
                        className="p-1 -m-1 text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5"
                    >
                        <ArrowLeft size={22} />
                    </button>
                    <div className="min-w-0 flex-1">
                        <h3 id="aspiration-rec-title" className="font-bold text-base text-gray-800 leading-snug break-words">
                            {aspiration.text}
                        </h3>
                        {aspiration.domain && (
                            <p className="text-[11px] text-gray-400 mt-0.5">{aspiration.domain}</p>
                        )}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
                    {loading && (
                        <div className="flex items-center justify-center py-10 text-gray-400">
                            <Loader size={20} className="animate-spin mr-2" /> 載入推薦中…
                        </div>
                    )}
                    {error && (
                        <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* Templates */}
                    {!loading && !error && (
                        <section>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <Sparkles size={12} className="text-emerald-500" /> 適合的計畫
                            </h4>
                            {templates.length === 0 ? (
                                <SectionEmpty>沒有對應的計畫</SectionEmpty>
                            ) : (
                                <div className="space-y-2">
                                    {templates.map(t => (
                                        <TemplateCard
                                            key={t.id}
                                            template={t}
                                            picking={pickingId === `tpl-${t.id}`}
                                            onPick={() => handlePickTemplate(t)}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* Habits */}
                    {!loading && !error && (
                        <section>
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <Leaf size={12} className="text-emerald-500" /> 適合的習慣
                            </h4>
                            {habits.length === 0 ? (
                                <SectionEmpty>沒有對應的習慣</SectionEmpty>
                            ) : (
                                <div className="space-y-2">
                                    {habits.map(h => (
                                        <HabitCard
                                            key={h.id}
                                            habit={h}
                                            picking={pickingId === `habit-${h.id}`}
                                            addedAsCandidate={candidateAddedIds.has(h.id)}
                                            onPick={() => handlePickHabit(h)}
                                            onAddCandidate={() => handleAddCandidate(h)}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* Skip / manual explore — always available */}
                    {!loading && (
                        <section className="border-t border-gray-100 pt-4">
                            <p className="text-xs text-gray-500 mb-2">
                                {isEmptyResults
                                    ? '這個嚮往目前還沒有對應的計畫 / 習慣，去自己找看看：'
                                    : '或者，跳過嚮往直接探索：'}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={onSkipToTemplates}
                                    className="flex-1 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:border-gray-300 hover:shadow-sm"
                                >
                                    探索計畫
                                </button>
                                <button
                                    type="button"
                                    onClick={onSkipToHabits}
                                    className="flex-1 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:border-gray-300 hover:shadow-sm"
                                >
                                    探索習慣
                                </button>
                            </div>
                        </section>
                    )}
                </div>

                {/* Sticky bottom CTA — appears once user has added ≥ 1 habit
                    to candidate pool this session. Gives a clear path into
                    FocusMapModal without waiting for the dashboard banner
                    (which only fires at 5+). */}
                {candidateCount > 0 && (
                    <div className="border-t border-gray-100 bg-gradient-to-br from-amber-50 to-orange-50 px-5 py-3 flex items-center justify-between gap-3 flex-shrink-0 rounded-b-2xl">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-amber-700 flex items-center gap-1">
                                <Target size={12} /> 已加入 {candidateCount} 個候選
                            </p>
                            <p className="text-[11px] text-gray-500 mt-0.5">
                                繼續加入或開始評分挑出黃金行為
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onOpenFocusMap}
                            disabled={!onOpenFocusMap}
                            className="flex-shrink-0 px-3 py-2 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            開始評分 →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
