'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, Edit3, Loader, ChevronRight, ChevronLeft } from 'lucide-react';
import {
    GENESIS_DOMAINS,
    findDuplicateAspiration,
    getPersonalisedPresets,
} from '@/lib/aspirations';
import IdentityPicker from './explore/IdentityPicker';
import PRESET_ASPIRATIONS from '../../prisma/seed/preset-aspirations.json';
import IconRenderer from './IconRenderer';
import { CATEGORY_CONFIG, domainToIconKey } from '@/lib/constants';
import { useT } from '@/lib/i18n';
import { translateDomain } from '@/lib/i18n/dataLabels';

// Hex tints for inline gradient cards (CATEGORY_CONFIG.color stores Tailwind class names,
// not hex, so we maintain a separate domain→hex map for CSS-in-JS usage).
const DOMAIN_HEX = {
    '基因與腸道': '#a855f7',
    '環境':       '#eab308',
    '飲食':       '#ef4444',
    '運動':       '#f97316',
    '壓力與睡眠': '#6366f1',
    '社交互動':   '#f43f5e',
    '心靈':       '#22c55e',
    '認知與智慧': '#d97706',
    '職涯與平衡': '#64748b',
};

// AspirationPicker — Slice K, Step 1 of the new-add flow.
// Spec: docs/superpowers/specs/2026-05-23-slice-K-aspiration-system-design.md §3.2
//
// Surface picks the user can make:
//   1. A personalised preset (only when typeKey / sleepTypeKey is set)
//   2. An aspiration the user already owns (skip re-creating → reuse)
//   3. A preset from the catalogue, grouped by GENESIS+IO domain
//   4. A custom free-text aspiration + manually chosen domain
//
// On pick → POST /api/aspirations (or reuse if duplicate exists) → calls
// onSelectAspiration(aspirationRow). Parent transitions to Step 2.
//
// CUSTOM_TEXT_MAX = 80 keeps the data shape predictable without imposing
// linguistic policy. Long enough for full Chinese sentences, short enough
// to render cleanly on a button.
const CUSTOM_TEXT_MAX = 80;

// Compact title + footnote button used across the 3 list sections.
function AspirationButton({ text, footnote, onClick, disabled, loading }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`relative w-full text-left px-3 py-2.5 rounded-xl border transition-all whitespace-normal ${
                disabled
                    ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white border-gray-200 text-gray-800 hover:border-emerald-300 hover:shadow-sm'
            }`}
        >
            <span className="text-sm font-medium leading-snug">{text}</span>
            {footnote && (
                <span className="block text-[11px] text-gray-400 mt-0.5">{footnote}</span>
            )}
            {loading && (
                <Loader size={14} className="absolute top-2.5 right-2.5 animate-spin text-emerald-500" />
            )}
        </button>
    );
}

export default function AspirationPicker({
    isOpen,
    onClose,
    userId,
    userTypeKey = null,
    userSleepTypeKey = null,
    onSelectAspiration,
}) {
    const { t } = useT();
    const [existing, setExisting] = useState([]);
    const [loadingExisting, setLoadingExisting] = useState(false);
    const [submittingText, setSubmittingText] = useState(null); // which option is mid-POST
    const [customMode, setCustomMode] = useState(false);
    const [customText, setCustomText] = useState('');
    const [customDomain, setCustomDomain] = useState('');
    const [error, setError] = useState(null);
    // 2026-06-03 — identity now lives on the aspiration, chosen once here.
    // step 'pick' = the three lists; step 'identity' = the identity sub-view
    // shown after the user selects a NEW aspiration (reuse-existing skips it).
    const [step, setStep] = useState('pick');
    const [pendingAspiration, setPendingAspiration] = useState(null); // { text, domain, source }
    const [identityChoice, setIdentityChoice] = useState('');
    const [activeTab, setActiveTab] = useState(null);

    // Personalised presets — guarded by typeKey/sleepTypeKey heuristic. Empty
    // list collapses the whole section (don't render an empty heading).
    // Declared before the reset-useEffect so it can be used as a dep there.
    const personalised = useMemo(
        () => getPersonalisedPresets(PRESET_ASPIRATIONS, { typeKey: userTypeKey, sleepTypeKey: userSleepTypeKey }),
        [userTypeKey, userSleepTypeKey],
    );

    // Reset transient state every time the modal opens.
    useEffect(() => {
        if (!isOpen) return;
        setCustomMode(false);
        setCustomText('');
        setCustomDomain('');
        setError(null);
        setSubmittingText(null);
        setStep('pick');
        setPendingAspiration(null);
        setIdentityChoice('');
        const firstPersonalisedDomain = personalised[0]?.domain || GENESIS_DOMAINS[0];
        setActiveTab(firstPersonalisedDomain);
        if (!userId) return;
        setLoadingExisting(true);
        fetch(`/api/aspirations?userId=${encodeURIComponent(userId)}&status=active`, { cache: 'no-store' })
            .then(r => (r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`))))
            .then(setExisting)
            .catch(err => {
                console.error('[AspirationPicker] fetch existing failed:', err);
                setExisting([]);
            })
            .finally(() => setLoadingExisting(false));
    }, [isOpen, userId, personalised]);

    // Group presets by GENESIS+IO domain in the canonical order.
    const presetsByDomain = useMemo(() => {
        const map = new Map(GENESIS_DOMAINS.map(d => [d, []]));
        for (const p of PRESET_ASPIRATIONS) {
            if (map.has(p.domain)) map.get(p.domain).push(p);
        }
        return map;
    }, []);

    if (!isOpen) return null;

    // Entry path for all three pick types (personalised / preset / custom).
    // If the user already has this exact aspiration → reuse immediately (no
    // identity prompt; it's already set). Otherwise stash it and advance to
    // the identity sub-step so the user declares the identity once.
    const beginPick = ({ text, domain, source }) => {
        const trimmed = (text || '').trim();
        if (!trimmed) {
            setError(t('aspirations.errors.textRequired'));
            return;
        }
        // Reuse existing — skip the POST and the identity step entirely.
        // (Spec §11.3 — "提示『你已有這個嚮往』+ 改成導向使用既有的".)
        const dup = findDuplicateAspiration(existing, trimmed);
        if (dup) {
            onSelectAspiration?.(dup);
            return;
        }
        setError(null);
        setPendingAspiration({ text: trimmed, domain: domain || null, source });
        setIdentityChoice('');
        setStep('identity');
    };

    // Final commit — POSTs the stashed aspiration plus the chosen identity
    // (which may be empty: identity is optional). Called by the identity
    // sub-step's 確認 / 跳過 buttons.
    const commitAspiration = async () => {
        if (!pendingAspiration) return;
        const { text, domain, source } = pendingAspiration;
        try {
            setSubmittingText(text);
            setError(null);
            const res = await fetch('/api/aspirations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    text,
                    domain,
                    source,
                    identity: identityChoice || null,
                }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || `status ${res.status}`);
            }
            const created = await res.json();
            onSelectAspiration?.(created);
        } catch (err) {
            console.error('[AspirationPicker] POST failed:', err);
            setError(t('aspirations.errors.createFailed'));
        } finally {
            setSubmittingText(null);
        }
    };

    const pickExisting = (a) => onSelectAspiration?.(a);

    const submitCustom = () => {
        if (!customDomain) {
            setError(t('aspirations.errors.domainRequired'));
            return;
        }
        beginPick({ text: customText, domain: customDomain, source: 'user' });
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="aspiration-picker-title"
            className="fixed inset-0 z-[9999] bg-black bg-opacity-50 flex items-end md:items-center justify-center"
        >
            <div className="bg-white w-full md:max-w-md h-[85dvh] md:h-auto md:max-h-[85dvh] md:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col animate-fade-in-up">
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-start gap-3 bg-white rounded-t-2xl">
                    <div className="flex items-start gap-2 min-w-0">
                        {step === 'identity' && (
                            <button
                                type="button"
                                onClick={() => { setStep('pick'); setError(null); }}
                                aria-label={t('common.back')}
                                className="p-1 -ml-1 text-gray-500 hover:text-gray-800 flex-shrink-0"
                            >
                                <ChevronLeft size={20} />
                            </button>
                        )}
                        <div className="min-w-0">
                            <h3 id="aspiration-picker-title" className="font-bold text-lg text-gray-800 flex items-center gap-1.5">
                                <Sparkles size={18} className="text-emerald-500" />
                                {step === 'identity' ? t('aspirations.identityTitle') : t('aspirations.pickTitle')}
                            </h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                                {step === 'identity'
                                    ? t('aspirations.identitySubtitle')
                                    : t('aspirations.pickSubtitle')}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label={t('aspirations.close')}
                        className="p-1 -m-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Identity sub-step — shown after a NEW aspiration is selected. */}
                {step === 'identity' ? (
                    <>
                        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                            {error && (
                                <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
                                    {error}
                                </div>
                            )}
                            <div className="px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                                <p className="text-[11px] text-emerald-600 mb-0.5">{t('aspirations.yourAspiration')}</p>
                                <p className="text-sm font-bold text-emerald-900 leading-snug">{pendingAspiration?.text}</p>
                            </div>
                            <IdentityPicker
                                value={identityChoice}
                                onChange={(s) => setIdentityChoice(s || '')}
                                userTypeKey={userTypeKey}
                            />
                        </div>
                        <div className="px-5 py-3 border-t border-gray-100 flex gap-3 bg-white">
                            <button
                                type="button"
                                onClick={commitAspiration}
                                disabled={Boolean(submittingText)}
                                className="flex-1 py-3 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            >
                                {t('aspirations.skip')}
                            </button>
                            <button
                                type="button"
                                onClick={commitAspiration}
                                disabled={Boolean(submittingText)}
                                className="flex-1 py-3 rounded-xl text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-1 transition-colors"
                            >
                                {submittingText ? <Loader size={14} className="animate-spin" /> : <ChevronRight size={14} />}
                                {identityChoice ? t('aspirations.confirmIdentityContinue') : t('aspirations.skipIdentityContinue')}
                            </button>
                        </div>
                    </>
                ) : (
                <>
                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {error && (
                        <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700 mb-3">
                            {error}
                        </div>
                    )}

                    {/* 領域 icon tab（橫向可滑） */}
                    <div role="tablist" className="flex gap-2 overflow-x-auto px-1 pb-2 -mx-1 no-scrollbar border-b border-gray-100">
                        {GENESIS_DOMAINS.map(domain => {
                            const cfg = CATEGORY_CONFIG[domainToIconKey(domain)];
                            const on = activeTab === domain;
                            return (
                                <button
                                    key={domain}
                                    role="tab"
                                    aria-selected={on}
                                    aria-label={translateDomain(domain, t)}
                                    onClick={() => { setActiveTab(domain); setCustomMode(false); }}
                                    className={`flex-shrink-0 flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl transition-colors ${on ? '' : 'opacity-60'}`}
                                >
                                    <span className={`w-9 h-9 rounded-full flex items-center justify-center ${on ? (cfg?.bg || 'bg-emerald-100') : 'bg-gray-100'}`}>
                                        <IconRenderer category={domain} size={18} />
                                    </span>
                                    <span className={`text-[10px] font-bold whitespace-nowrap ${on ? 'text-gray-700' : 'text-gray-400'}`}>{translateDomain(domain, t)}</span>
                                </button>
                            );
                        })}
                    </div>

                    {activeTab && (() => {
                        const tint = DOMAIN_HEX[activeTab] || '#10b981';
                        const recSet = new Set(personalised.filter(p => p.domain === activeTab).map(p => p.text));
                        const domainPresets = presetsByDomain.get(activeTab) || [];
                        const ordered = [...domainPresets].sort((a, b) => (recSet.has(b.text) ? 1 : 0) - (recSet.has(a.text) ? 1 : 0));
                        const existingInDomain = existing.filter(a => a.domain === activeTab);
                        return (
                            <div className="space-y-2.5 mt-3">
                                {existingInDomain.map(a => (
                                    <button key={a.id} type="button" onClick={() => pickExisting(a)}
                                        className="w-full text-left rounded-2xl p-3.5 border border-emerald-200 bg-emerald-50/60 hover:shadow-sm transition-all">
                                        <span className="text-[10px] font-bold text-emerald-600">{t('aspirations.existingBadge')}</span>
                                        <p className="text-sm font-bold text-gray-800 mt-0.5">{a.text}</p>
                                    </button>
                                ))}
                                {ordered.map(p => (
                                    <button key={p.text} type="button" onClick={() => beginPick({ text: p.text, domain: activeTab, source: 'preset' })}
                                        disabled={submittingText === p.text}
                                        className="relative w-full text-left overflow-hidden rounded-2xl p-3.5 hover:-translate-y-0.5 hover:shadow-md transition-all"
                                        style={{ background: `linear-gradient(135deg, ${tint}14, ${tint}26)`, border: `1px solid ${tint}33` }}>
                                        <span className="absolute -right-2 -bottom-3 opacity-10" aria-hidden><IconRenderer category={activeTab} size={62} /></span>
                                        {recSet.has(p.text) && (
                                            <span className="absolute top-2.5 right-3 bg-amber-100 text-amber-700 text-[9px] font-bold rounded-full px-2 py-0.5 z-10">{t('aspirations.recommendedForYou')}</span>
                                        )}
                                        <p className="relative text-sm font-bold text-gray-800 leading-snug pr-12">{p.text}</p>
                                    </button>
                                ))}
                                {!customMode ? (
                                    <button type="button" onClick={() => { setCustomMode(true); setCustomDomain(activeTab); }}
                                        className="w-full rounded-2xl border border-dashed border-emerald-300 bg-emerald-50/50 p-3 text-sm font-bold text-emerald-700 hover:bg-emerald-50 transition-colors">
                                        {t('aspirations.writeYourOwn')}
                                    </button>
                                ) : (
                                    <div className="rounded-2xl border border-emerald-200 p-3 space-y-2">
                                        <input type="text" autoFocus value={customText} maxLength={CUSTOM_TEXT_MAX}
                                            onChange={e => setCustomText(e.target.value)} placeholder={t('aspirations.customPlaceholder')}
                                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                                        <div className="flex gap-2">
                                            <button type="button" onClick={() => { setCustomMode(false); setCustomText(''); }}
                                                className="flex-1 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm font-bold">{t('common.cancel')}</button>
                                            <button type="button" onClick={submitCustom} disabled={!customText.trim()}
                                                className="flex-1 py-2 rounded-lg bg-emerald-500 text-white text-sm font-bold disabled:opacity-50">{t('common.next')}</button>
                                        </div>
                                    </div>
                                )}
                                {error && <p className="text-xs text-red-500">{error}</p>}
                            </div>
                        );
                    })()}
                </div>
                </>
                )}
            </div>
        </div>
    );
}
