'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, Edit3, Loader, ChevronRight } from 'lucide-react';
import {
    GENESIS_DOMAINS,
    findDuplicateAspiration,
    getPersonalisedPresets,
} from '@/lib/aspirations';
import PRESET_ASPIRATIONS from '../../prisma/seed/preset-aspirations.json';

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
    const [existing, setExisting] = useState([]);
    const [loadingExisting, setLoadingExisting] = useState(false);
    const [submittingText, setSubmittingText] = useState(null); // which option is mid-POST
    const [customMode, setCustomMode] = useState(false);
    const [customText, setCustomText] = useState('');
    const [customDomain, setCustomDomain] = useState('');
    const [error, setError] = useState(null);

    // Reset transient state every time the modal opens.
    useEffect(() => {
        if (!isOpen) return;
        setCustomMode(false);
        setCustomText('');
        setCustomDomain('');
        setError(null);
        setSubmittingText(null);
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
    }, [isOpen, userId]);

    // Personalised presets — guarded by typeKey/sleepTypeKey heuristic. Empty
    // list collapses the whole section (don't render an empty heading).
    const personalised = useMemo(
        () => getPersonalisedPresets(PRESET_ASPIRATIONS, { typeKey: userTypeKey, sleepTypeKey: userSleepTypeKey }),
        [userTypeKey, userSleepTypeKey],
    );

    // Group presets by GENESIS+IO domain in the canonical order.
    const presetsByDomain = useMemo(() => {
        const map = new Map(GENESIS_DOMAINS.map(d => [d, []]));
        for (const p of PRESET_ASPIRATIONS) {
            if (map.has(p.domain)) map.get(p.domain).push(p);
        }
        return map;
    }, []);

    if (!isOpen) return null;

    // Core commit path. Handles duplicate-detect / POST / parent-callback.
    // The `text` + `domain` triple plus `source` covers all three pick types
    // (personalised, preset, custom). Existing rows skip the POST entirely.
    const pickAspiration = async ({ text, domain, source }) => {
        const trimmed = (text || '').trim();
        if (!trimmed) {
            setError('請輸入嚮往內容');
            return;
        }
        // If the user already has this exact aspiration, reuse it. Prevents
        // ghost duplicates from accumulating when the same preset is picked
        // twice. (Spec §11.3 — "提示『你已有這個嚮往』+ 改成導向使用既有的".)
        const dup = findDuplicateAspiration(existing, trimmed);
        if (dup) {
            onSelectAspiration?.(dup);
            return;
        }
        try {
            setSubmittingText(trimmed);
            setError(null);
            const res = await fetch('/api/aspirations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, text: trimmed, domain: domain || null, source }),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || `status ${res.status}`);
            }
            const created = await res.json();
            onSelectAspiration?.(created);
        } catch (err) {
            console.error('[AspirationPicker] POST failed:', err);
            setError('新增嚮往失敗，請再試一次');
        } finally {
            setSubmittingText(null);
        }
    };

    const pickExisting = (a) => onSelectAspiration?.(a);

    const submitCustom = () => {
        if (!customDomain) {
            setError('請選一個生活面向');
            return;
        }
        pickAspiration({ text: customText, domain: customDomain, source: 'user' });
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
                    <div>
                        <h3 id="aspiration-picker-title" className="font-bold text-lg text-gray-800 flex items-center gap-1.5">
                            <Sparkles size={18} className="text-emerald-500" />
                            你想要什麼？
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            從這裡開始，我們會推薦合適的計畫與習慣
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="關閉"
                        className="p-1 -m-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
                    {error && (
                        <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    {/* 1. Personalised */}
                    {personalised.length > 0 && (
                        <section>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                為你推薦
                            </h4>
                            <div className="space-y-2">
                                {personalised.map((p, i) => (
                                    <AspirationButton
                                        key={`personalised-${i}`}
                                        text={p.text}
                                        footnote={p.domain}
                                        loading={submittingText === p.text.trim()}
                                        disabled={submittingText && submittingText !== p.text.trim()}
                                        onClick={() => pickAspiration({ ...p, source: 'preset' })}
                                    />
                                ))}
                            </div>
                        </section>
                    )}

                    {/* 2. Existing aspirations */}
                    {!loadingExisting && existing.length > 0 && (
                        <section>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                                你已有的嚮往（{existing.length}）
                            </h4>
                            <div className="space-y-2">
                                {existing.map(a => {
                                    const habitCount = a?._count?.habits ?? 0;
                                    return (
                                        <AspirationButton
                                            key={a.id}
                                            text={a.text}
                                            footnote={`${a.domain || '未分類'} · 掛 ${habitCount} 個任務`}
                                            disabled={Boolean(submittingText)}
                                            onClick={() => pickExisting(a)}
                                        />
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {/* 3. Preset catalogue grouped by domain */}
                    <section>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                            從 {PRESET_ASPIRATIONS.length} 個生活面向開始
                        </h4>
                        <div className="space-y-4">
                            {Array.from(presetsByDomain.entries()).map(([domain, items]) => {
                                if (items.length === 0) return null;
                                return (
                                    <div key={domain}>
                                        <p className="text-[11px] font-semibold text-gray-500 mb-1.5">
                                            {domain}
                                        </p>
                                        <div className="space-y-2">
                                            {items.map((p, i) => (
                                                <AspirationButton
                                                    key={`${domain}-${i}`}
                                                    text={p.text}
                                                    loading={submittingText === p.text.trim()}
                                                    disabled={submittingText && submittingText !== p.text.trim()}
                                                    onClick={() => pickAspiration({ ...p, source: 'preset' })}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* 4. Custom */}
                    <section>
                        {!customMode ? (
                            <button
                                type="button"
                                onClick={() => { setCustomMode(true); setError(null); }}
                                disabled={Boolean(submittingText)}
                                className="w-full px-3 py-2.5 rounded-xl text-sm font-medium text-center bg-gray-50 border border-dashed border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                                <Edit3 size={14} /> 都不是？自訂嚮往
                            </button>
                        ) : (
                            <div className="space-y-2 p-3 rounded-xl bg-gray-50 border border-gray-200">
                                <input
                                    type="text"
                                    autoFocus
                                    maxLength={CUSTOM_TEXT_MAX}
                                    value={customText}
                                    onChange={(e) => setCustomText(e.target.value.slice(0, CUSTOM_TEXT_MAX))}
                                    placeholder={`你想要什麼？（最多 ${CUSTOM_TEXT_MAX} 字）`}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
                                />
                                <select
                                    value={customDomain}
                                    onChange={(e) => setCustomDomain(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                                >
                                    <option value="">選一個生活面向…</option>
                                    {GENESIS_DOMAINS.map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={submitCustom}
                                        disabled={!customText.trim() || !customDomain || Boolean(submittingText)}
                                        className="flex-1 px-3 py-2 rounded-lg bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                                    >
                                        {submittingText === customText.trim() ? <Loader size={14} className="animate-spin" /> : <ChevronRight size={14} />}
                                        繼續
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setCustomMode(false); setCustomText(''); setCustomDomain(''); setError(null); }}
                                        disabled={Boolean(submittingText)}
                                        className="px-3 py-2 rounded-lg bg-white border border-gray-200 text-gray-600 text-sm hover:bg-gray-100 disabled:opacity-50"
                                    >
                                        取消
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
