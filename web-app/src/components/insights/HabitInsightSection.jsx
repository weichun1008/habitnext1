'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { BookOpen, ChevronDown, ChevronUp, ExternalLink, Loader } from 'lucide-react';
import EvidenceBadge from './EvidenceBadge';
import EvidenceScorePanel from './EvidenceScorePanel';

// HabitInsightSection — Slice N user-facing surface for "為什麼這個習慣重要".
//
// First-layer UX (2026-05-27 redesign): each insight is a single-line
// collapsed card showing only the punchy `takeaway` quote (or the title
// as fallback when no takeaway exists). Detail / summary / sources are
// deferred to the expanded state so the habit accordion's add-flow stays
// visually quiet. This trades the previous "always show summary +
// takeaway + sources at first layer" approach for a one-tap progressive
// disclosure that respects the takeaway's role as the behavioural hook.
//
// react-markdown is dynamic-imported so the renderer chunk only loads
// when an insight is expanded — keeps the daily / dashboard First Load JS
// flat for users who never tap into the science layer.

const ReactMarkdown = dynamic(() => import('react-markdown'), {
    ssr: false,
    loading: () => <span className="text-xs text-gray-400">載入中…</span>,
});

function sourceTypeLabel(type) {
    if (type === 'pubmed') return 'PubMed';
    if (type === 'journal') return '期刊';
    if (type === 'book') return '書籍';
    return '來源';
}

// Single insight card. Layered disclosure:
//   - Layer 1 (closed): takeaway-as-headline only (or title fallback)
//   - Layer 2 (click headline): title + summary + sources + tags
//   - Layer 3 (click "研究細節"): markdown detail
//
// Sources are part of layer 2 because their primary value is trust signal
// — once the user has chosen to "expand" they want to see where this
// claim comes from. Putting sources behind layer 3 would feel buried.
function InsightCard({ insight }) {
    const [expanded, setExpanded] = useState(false);
    const [detailOpen, setDetailOpen] = useState(false);
    const [scoreOpen, setScoreOpen] = useState(false);
    const sources = Array.isArray(insight.sources) ? insight.sources : [];
    const tags = Array.isArray(insight.tags) ? insight.tags : [];

    // Headline is whatever's punchiest: takeaway if author wrote one,
    // otherwise fall back to title. We mark takeaway with quote marks
    // so the user reads it as a hook line, not a category label.
    const hasTakeaway = Boolean(insight.takeaway && insight.takeaway.trim());
    const headline = hasTakeaway ? insight.takeaway : insight.title;

    return (
        <article className={`border rounded-xl bg-white transition-all ${expanded ? 'border-emerald-200 shadow-sm' : 'border-gray-200 hover:border-emerald-200'}`}>
            {/* Layer 1: badge（獨立）+ headline row */}
            <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        {insight.evidence && (
                            <div className="mb-1.5">
                                <EvidenceBadge
                                    evidence={insight.evidence}
                                    active={scoreOpen}
                                    onClick={(e) => { e.stopPropagation(); setScoreOpen(v => !v); }}
                                />
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => setExpanded(v => !v)}
                            aria-expanded={expanded}
                            className="w-full text-left"
                        >
                            <p
                                className={`text-sm leading-snug ${
                                    hasTakeaway ? 'text-emerald-900 font-medium' : 'text-gray-800 font-bold'
                                }`}
                            >
                                {hasTakeaway ? `「${headline}」` : headline}
                            </p>
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => setExpanded(v => !v)}
                        aria-label={expanded ? '收合' : '展開'}
                        className="text-gray-400 flex-shrink-0 mt-0.5"
                    >
                        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                </div>

                {/* 證據力評分面板 — 由 badge 切換，獨立於卡片展開狀態 */}
                {scoreOpen && insight.evidence && (
                    <div className="mt-2">
                        <EvidenceScorePanel evidence={insight.evidence} />
                    </div>
                )}
            </div>

            {/* Layer 2: title + summary + sources + tags */}
            {expanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-gray-100 pt-3">
                    {/* Title only shown when takeaway was the headline — avoids
                        duplicate when fallback already used the title. */}
                    {hasTakeaway && (
                        <h5 className="font-bold text-sm text-gray-800 leading-snug">
                            {insight.title}
                        </h5>
                    )}

                    <p className="text-xs text-gray-600 leading-relaxed">
                        {insight.summary}
                    </p>

                    {/* Layer 3 toggle — markdown detail */}
                    <button
                        type="button"
                        onClick={() => setDetailOpen(v => !v)}
                        aria-expanded={detailOpen}
                        className="text-xs font-medium text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                    >
                        {detailOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        {detailOpen ? '收起研究細節' : '看研究細節'}
                    </button>
                    {detailOpen && (
                        <div className="prose prose-sm max-w-none text-gray-700 prose-headings:text-gray-800 prose-strong:text-gray-900 prose-strong:font-bold prose-li:my-0.5 prose-p:my-2 prose-ul:my-2 leading-relaxed text-xs">
                            <ReactMarkdown>{insight.detail || ''}</ReactMarkdown>
                        </div>
                    )}

                    {/* Sources — visible at layer 2 so the trust signal
                        appears with the rest of the body context. */}
                    {sources.length > 0 && (
                        <div className="space-y-1 pt-2 border-t border-gray-100">
                            {sources.map((s, i) => (
                                <div key={i} className="text-[11px] text-gray-500 leading-snug flex items-start gap-1.5">
                                    <span className="text-gray-400 flex-shrink-0">📑</span>
                                    <span className="min-w-0 flex-1">
                                        {s.url ? (
                                            <a
                                                href={s.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-emerald-700 hover:underline inline-flex items-center gap-0.5 break-all"
                                            >
                                                {s.label || sourceTypeLabel(s.type)}
                                                <ExternalLink size={10} className="flex-shrink-0" />
                                            </a>
                                        ) : (
                                            <span>{s.label || sourceTypeLabel(s.type)}</span>
                                        )}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Tags — bottom, smaller, layer 2. */}
                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {tags.map(t => (
                                <span
                                    key={t}
                                    className="px-2 py-0.5 rounded-full text-[10px] bg-gray-100 text-gray-600"
                                >
                                    #{t}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </article>
    );
}

export default function HabitInsightSection({ habitId, className = '' }) {
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!habitId) {
            setInsights([]);
            setLoading(false);
            return;
        }
        let cancelled = false;
        setLoading(true);
        setError(null);
        // Default status filter is 'published' on the server — drafts /
        // archived rows never reach the user-facing surface.
        fetch(`/api/habits/${encodeURIComponent(habitId)}/insights`, { cache: 'no-store' })
            .then(r => (r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`))))
            .then(data => {
                if (cancelled) return;
                setInsights(Array.isArray(data) ? data : []);
            })
            .catch(err => {
                console.warn('[HabitInsightSection] fetch failed:', err);
                if (!cancelled) {
                    setError(err.message || 'fetch failed');
                    setInsights([]);
                }
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => { cancelled = true; };
    }, [habitId]);

    // Silent absence: no insights → no section. Same goes for fetch errors
    // — we'd rather hide than show "couldn't load" noise to end-users.
    if (loading) {
        return (
            <div className={`py-3 flex items-center gap-2 text-xs text-gray-400 ${className}`}>
                <Loader size={12} className="animate-spin" />
                載入科學佐證…
            </div>
        );
    }
    if (error || insights.length === 0) return null;

    return (
        <section
            className={`space-y-2 ${className}`}
            aria-label="科學佐證"
            data-testid="habit-insight-section"
        >
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen size={12} className="text-emerald-500" />
                為什麼這個習慣重要
                {insights.length > 1 && (
                    <span className="text-gray-400 normal-case font-medium">· {insights.length}</span>
                )}
            </h4>
            <div className="space-y-2">
                {insights.map(ins => (
                    <InsightCard key={ins.id} insight={ins} />
                ))}
            </div>
        </section>
    );
}
