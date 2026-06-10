"use client";

import React, { useState } from 'react';
import { Edit3, X } from 'lucide-react';
import { LIFE_MOMENTS_GROUPED, CUSTOM_ANCHOR_MAX_LENGTH } from '@/lib/anchors';
import { useT } from '@/lib/i18n';
import { translateCue, translateTimeOfDay } from '@/lib/i18n/dataLabels';

function AnchorButton({ label, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected ? 'true' : 'false'}
      className={`px-3 py-2 rounded-xl text-sm font-medium text-center transition-all ${
        selected
          ? 'bg-emerald-500 text-white border border-emerald-500 shadow-sm'
          : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      {label}
    </button>
  );
}

// AnchorPicker
//
// History note: prior versions included a "你的習慣" section that surfaced the
// user's existing single-action tasks as candidate anchors. Removed 2026-05-23
// — it produced duplicates whenever the same official habit was added more
// than once, and the "chain new habit off old habit" pattern proved too
// complex to teach during onboarding. The `yourTasks` and `excludeTaskId`
// props are accepted but ignored for backwards compatibility with existing
// callers; safe to remove from the signature once no caller relies on them.
//
// UX rules (this iteration):
//   1. When a value is selected, surface a pinned "目前錨點：XXX [×]" pill at
//      the TOP of the picker. Previously the selected indicator only lived
//      inline on a button somewhere in the long list — easy to miss.
//   2. Clicking the same selected button toggles off (onChange('')), so the
//      user can clear without scrolling to find a "clear" affordance.
//   3. The pill renders even when `value` is a custom string that doesn't
//      match any preset — so the user always knows what's stored.
export default function AnchorPicker({ value, onChange, yourTasks: _yourTasks, excludeTaskId: _excludeTaskId }) {
  const { t } = useT();
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState('');

  const submitCustom = () => {
    const trimmed = customText.trim();
    if (trimmed) {
      onChange(trimmed);
    }
    setCustomMode(false);
    setCustomText('');
  };

  const handleCustomKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitCustom();
    }
    if (e.key === 'Escape') {
      setCustomMode(false);
      setCustomText('');
    }
  };

  // Toggle helper: clicking the already-selected option clears it.
  const select = (label) => onChange(value === label ? '' : label);

  return (
    <div className="space-y-4">
      {/* Selected pill — always at top when a value is set */}
      {value && (
        <div
          data-testid="anchor-selected-pill"
          className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200"
        >
          <span className="text-sm text-emerald-800">
            {t('explore.currentAnchor')}<span className="font-bold">{translateCue(value, t)}</span>
          </span>
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label={t('explore.clearAnchor')}
            className="text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded-full p-1 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Life moments — primary entry */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          {t('explore.lifeMoments')}
        </p>
        <div className="space-y-3">
          {LIFE_MOMENTS_GROUPED.map(group => (
            <div key={group.key}>
              <p className="text-[10px] font-semibold text-gray-500 mb-1.5">{translateTimeOfDay(group.key, t)}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {group.items.map(m => (
                  <AnchorButton
                    key={m.id}
                    label={t(`data.anchors.${m.id}`)}
                    selected={value === m.label}
                    onClick={() => select(m.label)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Custom escape hatch */}
        <div className="mt-4">
          {!customMode ? (
            <button
              type="button"
              onClick={() => setCustomMode(true)}
              className="w-full px-3 py-2 rounded-xl text-sm font-medium text-center bg-gray-50 border border-dashed border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center gap-1"
            >
              <Edit3 size={14} /> {t('explore.customAnchorCta')}
            </button>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                autoFocus
                maxLength={CUSTOM_ANCHOR_MAX_LENGTH}
                value={customText}
                onChange={(e) => setCustomText(e.target.value.slice(0, CUSTOM_ANCHOR_MAX_LENGTH))}
                onKeyDown={handleCustomKey}
                placeholder={t('explore.customAnchorPlaceholder', { n: CUSTOM_ANCHOR_MAX_LENGTH })}
                className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={submitCustom}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors"
              >
                {t('explore.add')}
              </button>
              <button
                type="button"
                onClick={() => { setCustomMode(false); setCustomText(''); }}
                className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
