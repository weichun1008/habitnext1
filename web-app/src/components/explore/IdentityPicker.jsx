"use client";

import React, { useState } from 'react';
import { Edit3, Sparkles, X } from 'lucide-react';
import {
  USER_TYPE_PROFILES,
  GENERIC_IDENTITIES,
  IDENTITY_MAX_LENGTH,
  deriveDefaultIdentity,
} from '@/lib/typeKeys';
import { useT } from '@/lib/i18n';

function IdentityButton({ label, selected, recommended, onClick }) {
  const { t } = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected ? 'true' : 'false'}
      className={`relative w-full px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all ${
        selected
          ? 'bg-emerald-500 text-white border border-emerald-500 shadow-sm'
          : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      {recommended && (
        <span className="absolute -top-1.5 -right-1.5 bg-amber-100 text-amber-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
          <Sparkles size={10} /> {t('explore.recommended')}
        </span>
      )}
      {label}
    </button>
  );
}

// IdentityPicker
//
// UX rules (same shape as AnchorPicker, applied 2026-05-23):
//   1. Pinned "目前身分：XXX [×]" pill at the top whenever value is set —
//      previously the only "selected" cue was the green button somewhere down
//      the list, with no indicator for custom-typed identities at all.
//   2. Clicking the same selected option toggles it off.
//   3. The pill renders for custom values too.
export default function IdentityPicker({ value, onChange, userTypeKey = null }) {
  const { t } = useT();
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState('');

  const recommended = deriveDefaultIdentity(userTypeKey);

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

  const select = (s) => onChange(value === s ? '' : s);

  return (
    <div className="space-y-3">
      {/* Selected pill */}
      {value && (
        <div
          data-testid="identity-selected-pill"
          className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200"
        >
          <span className="text-sm text-emerald-800">
            {t('explore.currentIdentity')}<span className="font-bold">{value}</span>
          </span>
          <button
            type="button"
            onClick={() => onChange('')}
            aria-label={t('explore.clearIdentity')}
            className="text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 rounded-full p-1 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {recommended && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            {t('explore.recommendedIdentityFor', { type: USER_TYPE_PROFILES[userTypeKey] ? t(`explore.userTypes.${userTypeKey}`) : '' })}
          </p>
          <IdentityButton
            label={recommended}
            selected={value === recommended}
            recommended
            onClick={() => select(recommended)}
          />
        </div>
      )}

      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          {t('explore.orChooseYourOwn')}
        </p>
        <div className="space-y-2">
          {GENERIC_IDENTITIES.map(s => (
            <IdentityButton
              key={s}
              label={s}
              selected={value === s}
              recommended={false}
              onClick={() => select(s)}
            />
          ))}
        </div>
      </div>

      <div>
        {!customMode ? (
          <button
            type="button"
            onClick={() => setCustomMode(true)}
            className="w-full px-3 py-2 rounded-xl text-sm font-medium text-center bg-gray-50 border border-dashed border-gray-300 text-gray-600 hover:bg-gray-100 flex items-center justify-center gap-1"
          >
            <Edit3 size={14} /> {t('explore.customIdentityCta')}
          </button>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              autoFocus
              maxLength={IDENTITY_MAX_LENGTH}
              value={customText}
              onChange={(e) => setCustomText(e.target.value.slice(0, IDENTITY_MAX_LENGTH))}
              onKeyDown={handleCustomKey}
              placeholder={t('explore.customIdentityPlaceholder', { n: IDENTITY_MAX_LENGTH })}
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
  );
}
