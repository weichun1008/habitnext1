'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { BookOpen, ChevronDown, ChevronUp, ExternalLink, Loader, Quote } from 'lucide-react';

// HabitInsightSection — Slice N user-facing surface for "為什麼這個習慣重要".
//
// Pulls published insights for an OfficialHabit and lays them out as a
// list of expandable cards inside any parent (HabitListView accordion,
// TaskDetailModal). When no insights exist, renders nothing — silent
// absence is better than an "no science here yet" empty state that would
// undermine the habits that DO have evidence.
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

// Single insight card. Detail is collapsed by default — most users will
// only read summary + takeaway; the few who want the full study can opt
// in. Source links are always visible because they're the trust signal.
function InsightCard({ insight }) {
    const [expanded, setExpanded] = useState(false);
    const sources = Array.isArray(insight.sources) ? insight.sources : [];
    const tags = Array.isArray(insight.tags) ? insight.tags : [];

    return (
        <article className="border border-gray-200 rounded-xl bg-white">
            {/* Title + summary — always visible */}
            <div className="p-3 sm:p-4 space-y-1.5">
                <h5 className="font-bold text-sm text-gray-800 leading-snug">
                    {insight.title}
                </h5>
                <p className="text-xs text-gray-600 leading-relaxed">
                    {insight.summary}
                </p>
            </div>

            {/* Detail toggle */}
            <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                aria-expanded={expanded}
                className="w-full px-3 sm:px-4 py-2 flex items-center justify-between gap-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50/50 border-t border-gray-100"
            >
                <span>{expanded ? '收合詳細' : '展開詳細'}</span>
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {expanded && (
                <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3 border-t border-gray-100">
                    <div className="prose prose-sm max-w-none text-gray-700 prose-headings:text-gray-800 prose-strong:text-gray-900 prose-strong:font-bold prose-li:my-0.5 prose-p:my-2 prose-ul:my-2 leading-relaxed text-xs sm:text-sm">
                        <ReactMarkdown>{insight.detail || ''}</ReactMarkdown>
                    </div>

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

            {/* Takeaway pull-quote — sits between detail toggle and source
                links, always visible to reinforce the action even when
                user doesn't expand. */}
            {insight.takeaway && (
                <div className="px-3 sm:px-4 py-3 bg-emerald-50/40 border-t border-emerald-100 flex items-start gap-2">
                    <Quote size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs sm:text-sm text-emerald-900 font-medium leading-snug">
                        {insight.takeaway}
                    </p>
                </div>
            )}

            {/* Sources — always visible footer; clickable when URL present */}
            {sources.length > 0 && (
                <div className="px-3 sm:px-4 py-2.5 border-t border-gray-100 space-y-1">
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
            </h4>
            <div className="space-y-2">
                {insights.map(ins => (
                    <InsightCard key={ins.id} insight={ins} />
                ))}
            </div>
        </section>
    );
}
