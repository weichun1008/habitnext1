'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Sparkles, Users, Calendar, ListChecks } from 'lucide-react';
import AuthorBadge from './templates/AuthorBadge';
import { useT } from '@/lib/i18n';
import { localizeContent } from '@/lib/i18n/content';

// TemplateDetailPanel — Slice J
// Renders a slide-in detail view for a Template inside the TemplateExplorer.
// Reads from `template.tasks.phases[]` (v2.0 structure) and falls back
// gracefully when phases are absent (legacy v1.0 templates).
//
// See spec: docs/superpowers/specs/2026-05-21-slice-j-template-detail-design.md

const computeSummary = (template) => {
    const phases = template?.tasks?.phases;
    if (!Array.isArray(phases) || phases.length === 0) {
        return { phaseCount: 0, totalDays: 0, totalTasks: 0, hasPhases: false };
    }
    let totalDays = 0;
    let totalTasks = 0;
    for (const ph of phases) {
        totalDays += Number(ph.days) || 0;
        totalTasks += Array.isArray(ph.tasks) ? ph.tasks.length : 0;
    }
    return {
        phaseCount: phases.length,
        totalDays,
        totalTasks,
        hasPhases: true,
    };
};

const PhaseBlock = ({ phase, index }) => {
    const { t, locale } = useT();
    const tasks = Array.isArray(phase?.tasks) ? phase.tasks : [];
    return (
        <section className="mt-6 first:mt-0">
            <div className="flex items-baseline justify-between mb-3 pb-2 border-b border-gray-200">
                <h4 className="text-sm font-bold text-gray-800">
                    {phase.name ? localizeContent(phase.name, locale) : `Phase ${index + 1}`}
                </h4>
                {phase.days > 0 && (
                    <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                        {t('templates.daysCount', { n: phase.days })}
                    </span>
                )}
            </div>
            {tasks.length === 0 ? (
                <p className="text-xs text-gray-400 italic">{t('templates.noTasksYet')}</p>
            ) : (
                <ol className="space-y-2">
                    {tasks.map((task, i) => (
                        <li
                            key={i}
                            className="flex items-start gap-2 text-sm text-gray-700"
                        >
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center mt-0.5">
                                {i + 1}
                            </span>
                            <span className="leading-snug line-clamp-2">{localizeContent(task.title, locale) || t('templates.untitled')}</span>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
};

const TemplateDetailPanel = ({
    template,
    isRecommended = false,
    onBack,
    onJoin,
    joining = false,
    category = null,  // { name, color, icon } — resolved from PlanCategory by caller; falsy = hide chip
}) => {
    const { t, locale } = useT();
    // Slide-in animation: start translated, then transition to 0 on mount.
    const [shown, setShown] = useState(false);
    useEffect(() => {
        // Defer one frame so the initial render commits with translate-x-full
        // before flipping to translate-x-0. Otherwise the transition is missed.
        const id = requestAnimationFrame(() => setShown(true));
        return () => cancelAnimationFrame(id);
    }, []);

    if (!template) return null;

    const summary = computeSummary(template);
    const phases = template?.tasks?.phases || [];

    const handleBack = () => {
        setShown(false);
        // Allow slide-out animation to play before unmounting.
        setTimeout(() => onBack?.(), 200);
    };

    return (
        <div
            className={`absolute inset-0 bg-white z-10 flex flex-col transition-transform duration-200 ease-out ${
                shown ? 'translate-x-0' : 'translate-x-full'
            }`}
            role="dialog"
            aria-label={t('templates.detailAria', { name: template.name })}
        >
            {/* Header bar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
                <button
                    onClick={handleBack}
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
                    aria-label={t('common.back')}
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="flex-1 min-w-0">
                    <h2 className="text-base font-bold text-gray-800 truncate">
                        {localizeContent(template.name, locale)}
                    </h2>
                    <div className="mt-0.5">
                        <AuthorBadge template={template} />
                    </div>
                </div>
                {isRecommended && (
                    <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0">
                        <Sparkles size={12} />
                        {t('templates.recommendedForYou')}
                    </span>
                )}
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-4 pb-24">
                {/* Category chip — color + emoji read from PlanCategory via parent */}
                {category && (
                    <div className="mb-3">
                        <span
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
                            style={{
                                backgroundColor: `${category.color}1f`,
                                color: category.color,
                                borderColor: `${category.color}55`,
                            }}
                        >
                            {category.icon && <span className="text-sm leading-none">{category.icon}</span>}
                            {category.name}
                        </span>
                    </div>
                )}

                {/* Expert pill */}
                {template.expert && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-4 flex-wrap">
                        <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                            {template.expert.title || t('templates.expertFallback')}
                        </span>
                        {template.expert.name && <span>by {template.expert.name}</span>}
                    </div>
                )}

                {/* Description */}
                {template.description && (
                    <p className="text-sm text-gray-700 leading-relaxed mb-5 whitespace-pre-line">
                        {localizeContent(template.description, locale)}
                    </p>
                )}

                {/* Summary row */}
                <div className="grid grid-cols-3 gap-2 mb-5 text-center">
                    <div className="bg-gray-50 rounded-xl p-3">
                        <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                            <ListChecks size={14} />
                        </div>
                        <p className="text-lg font-bold text-gray-800 leading-none">
                            {summary.totalTasks}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">{t('templates.tasksUnit')}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                        <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                            <Calendar size={14} />
                        </div>
                        <p className="text-lg font-bold text-gray-800 leading-none">
                            {summary.totalDays}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">{t('templates.daysUnit')}</p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                        <div className="flex items-center justify-center gap-1 text-gray-400 mb-1">
                            <Users size={14} />
                        </div>
                        <p className="text-lg font-bold text-gray-800 leading-none">
                            {template._count?.assignments ?? 0}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-1">{t('templates.joinedUnit')}</p>
                    </div>
                </div>

                {/* Phase blocks */}
                {summary.hasPhases ? (
                    <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                            {t('templates.phaseCount', { n: summary.phaseCount })}
                        </h3>
                        {phases.map((phase, i) => (
                            <PhaseBlock key={phase.id || i} phase={phase} index={i} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center">
                        <p className="text-sm text-amber-700">
                            {t('templates.legacyStructure')}
                        </p>
                        <p className="text-xs text-amber-600 mt-1">
                            {t('templates.legacyStructureHint')}
                        </p>
                    </div>
                )}
            </div>

            {/* Sticky bottom CTA */}
            <div className="flex-shrink-0 border-t border-gray-100 bg-white p-4">
                <button
                    onClick={() => onJoin?.(template)}
                    disabled={joining}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white py-3 rounded-xl text-sm font-bold transition-colors"
                >
                    {joining ? t('templates.joining') : t('templates.joinPlan')}
                </button>
            </div>
        </div>
    );
};

export default TemplateDetailPanel;
