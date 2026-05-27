'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Loader, Sparkles } from 'lucide-react';
import MiniMap from './focusMap/MiniMap';
import QuadrantSection from './focusMap/QuadrantSection';
import { quadrantOf, recommendDefaults, sliderSeedFor } from '@/lib/focusMap';

// FocusMapModal — Slice L Step 2.
// Renders all candidate tasks across the 4 quadrants, with sliders + checkbox
// per row. Drag a slider → the row animates into its new quadrant. The CTA
// at the bottom runs PATCH /api/tasks/batch-rate with one of three actions
// per task: activate / keep_candidate / archive.
//
// Props:
//   isOpen: bool
//   userId: string
//   onClose(): close without changes
//   onActivated(count): called after batch-rate completes — parent refreshes tasks
const FocusMapModal = ({ isOpen, userId, onClose, onActivated }) => {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    // ratings: Map<taskId, { impact, ability, checked }>
    const [ratings, setRatings] = useState(new Map());

    useEffect(() => {
        if (!isOpen || !userId) return;
        let cancelled = false;
        setLoading(true);
        (async () => {
            try {
                const res = await fetch(`/api/tasks/candidates?userId=${userId}`);
                if (cancelled) return;
                if (res.ok) {
                    const data = await res.json();
                    if (cancelled) return;
                    setCandidates(Array.isArray(data) ? data : []);
                    // Seed ratings from sliderSeedFor + recommendDefaults
                    const next = new Map();
                    const recs = recommendDefaults(data);
                    for (const c of data) {
                        const seed = sliderSeedFor(c);
                        next.set(c.id, { impact: seed.impact, ability: seed.ability, checked: recs.has(c.id) });
                    }
                    setRatings(next);
                }
            } catch (e) {
                if (!cancelled) console.error('Candidates fetch error', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [isOpen, userId]);

    // Group candidates by current (live) quadrant.
    const grouped = useMemo(() => {
        const out = { golden: [], background: [], big_fish: [], skip: [] };
        for (const c of candidates) {
            const r = ratings.get(c.id);
            const q = quadrantOf(r?.impact ?? 3, r?.ability ?? 3);
            out[q].push(c);
        }
        return out;
    }, [candidates, ratings]);

    // Effective ratings for MiniMap — same source but in candidate shape so
    // sliderSeedFor can read live values via userImpact/userAbility overrides.
    const liveCandidates = useMemo(() => {
        return candidates.map(c => {
            const r = ratings.get(c.id);
            return { ...c, userImpact: r?.impact, userAbility: r?.ability };
        });
    }, [candidates, ratings]);

    const checkedCount = useMemo(() => {
        let n = 0;
        for (const r of ratings.values()) if (r.checked) n++;
        return n;
    }, [ratings]);

    const handleUpdate = (taskId, partial) => {
        setRatings(prev => {
            const next = new Map(prev);
            const cur = next.get(taskId) || { impact: 3, ability: 3, checked: false };
            next.set(taskId, { ...cur, ...partial });
            return next;
        });
    };

    const handleActivate = async () => {
        // Skip quadrant confirm — one click delete all
        if (grouped.skip.length > 0) {
            const ok = window.confirm(`「跳過」象限有 ${grouped.skip.length} 個習慣將被刪除，確定嗎？`);
            if (!ok) return;
        }

        setSubmitting(true);
        try {
            const payload = candidates.map(c => {
                const r = ratings.get(c.id) || { impact: 3, ability: 3, checked: false };
                const q = quadrantOf(r.impact, r.ability);
                let action;
                if (r.checked) action = 'activate';
                else if (q === 'skip') action = 'archive';
                else action = 'keep_candidate';
                return { taskId: c.id, userImpact: r.impact, userAbility: r.ability, action };
            });
            const res = await fetch('/api/tasks/batch-rate', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ratings: payload }),
            });
            if (res.ok) {
                const json = await res.json();
                onActivated?.(json.counts?.activate || 0);
            } else {
                alert('批次評分失敗，請稍後再試');
            }
        } catch (e) {
            console.error('Batch rate submit error', e);
            alert('發生錯誤');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="bg-white w-full max-w-xl h-[90dvh] md:max-h-[90dvh] rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-start bg-white flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <MiniMap candidates={liveCandidates} sliderSeedFor={sliderSeedFor} />
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-1">
                                <Sparkles size={16} className="text-amber-500" /> 焦點地圖
                            </h2>
                            <p className="text-[11px] text-gray-500 mt-0.5">依 Fogg 框架挑出黃金行為</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={22} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    {loading ? (
                        <div className="flex justify-center py-12"><Loader className="animate-spin text-emerald-500" /></div>
                    ) : candidates.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-8">沒有候選習慣可評分</p>
                    ) : (
                        <>
                            <QuadrantSection quadrantKey="golden"     candidates={grouped.golden}     ratings={ratings} onUpdate={handleUpdate} />
                            <QuadrantSection quadrantKey="background" candidates={grouped.background} ratings={ratings} onUpdate={handleUpdate} />
                            <QuadrantSection quadrantKey="big_fish"   candidates={grouped.big_fish}   ratings={ratings} onUpdate={handleUpdate} />
                            <QuadrantSection quadrantKey="skip"       candidates={grouped.skip}       ratings={ratings} onUpdate={handleUpdate} />
                        </>
                    )}
                </div>

                {/* CTA */}
                <div className="px-6 py-4 border-t border-gray-100 bg-white flex-shrink-0">
                    <button
                        type="button"
                        onClick={handleActivate}
                        disabled={submitting || candidates.length === 0}
                        className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-bold transition-colors"
                    >
                        {submitting ? '處理中…' : `啟用勾選的 ${checkedCount} 個` + (grouped.skip.length > 0 ? ` · 刪除 ${grouped.skip.length} 個跳過` : '')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FocusMapModal;
