"use client";

import React, { useState } from 'react';
import { Edit3, Sparkles } from 'lucide-react';
import {
  USER_TYPE_PROFILES,
  GENERIC_IDENTITIES,
  IDENTITY_MAX_LENGTH,
  deriveDefaultIdentity,
} from '@/lib/typeKeys';

function IdentityButton({ label, selected, recommended, onClick }) {
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
          <Sparkles size={10} /> 推薦
        </span>
      )}
      {label}
    </button>
  );
}

export default function IdentityPicker({ value, onChange, userTypeKey = null }) {
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

  return (
    <div className="space-y-3">
      {recommended && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            為你挑選的身分（{USER_TYPE_PROFILES[userTypeKey]?.label}）
          </p>
          <IdentityButton
            label={recommended}
            selected={value === recommended}
            recommended
            onClick={() => onChange(recommended)}
          />
        </div>
      )}

      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          或自選
        </p>
        <div className="space-y-2">
          {GENERIC_IDENTITIES.map(s => (
            <IdentityButton
              key={s}
              label={s}
              selected={value === s}
              recommended={false}
              onClick={() => onChange(s)}
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
            <Edit3 size={14} /> 自訂身分
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
              placeholder={`輸入自訂身分（最多 ${IDENTITY_MAX_LENGTH} 字）`}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={submitCustom}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors"
            >
              加入
            </button>
            <button
              type="button"
              onClick={() => { setCustomMode(false); setCustomText(''); }}
              className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
