"use client";

import React, { useState } from 'react';
import { Edit3 } from 'lucide-react';
import { LIFE_MOMENTS_GROUPED, CUSTOM_ANCHOR_MAX_LENGTH } from '@/lib/anchors';

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

// A task is anchor-suitable when it represents a discrete moment, not an
// accumulating target. Quantitative habits (e.g. "drink 2000cc") and
// multi-step checklists don't make sense as anchors. Treat missing type as
// suitable for backwards compatibility.
function isAnchorSuitable(task) {
  if (!task) return false;
  if (task.isLocked) return false;
  return !task.type || task.type === 'binary';
}

export default function AnchorPicker({ value, onChange, yourTasks = [], excludeTaskId = null }) {
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState('');

  const activeYourTasks = (yourTasks || []).filter(
    t => isAnchorSuitable(t) && t.id !== excludeTaskId
  );

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
    <div className="space-y-5">
      {/* Life moments first — always available, primary entry */}
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
          生活時刻
        </p>
        <div className="space-y-3">
          {LIFE_MOMENTS_GROUPED.map(group => (
            <div key={group.key}>
              <p className="text-[10px] font-semibold text-gray-500 mb-1.5">{group.title}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {group.items.map(m => (
                  <AnchorButton
                    key={m.id}
                    label={m.label}
                    selected={value === m.label}
                    onClick={() => onChange(m.label)}
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
              <Edit3 size={14} /> 都不是？輸入自訂錨點
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
                placeholder="輸入自訂錨點 (最多 30 字)"
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

      {/* Your existing single-action habits — secondary, for users who've already
          established a routine to chain off of. Quantitative goals are filtered out
          because they're targets, not discrete moments. */}
      {activeYourTasks.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            你的習慣 ({activeYourTasks.length} 個)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {activeYourTasks.map(t => (
              <AnchorButton
                key={t.id}
                label={t.title}
                selected={value === t.title}
                onClick={() => onChange(t.title)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
