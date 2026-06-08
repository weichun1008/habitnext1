'use client';

import React, { useState } from 'react';
import { FlaskConical, ChevronRight } from 'lucide-react';
import { DURATION_OPTIONS, HABIT_FORMATION_SCIENCE } from '@/lib/focusMap';

// DurationSheet — 確認加入前選擇養成期間。背後科學採漸進揭露（與 HabitInsight 同語彙）。
// Props:
//   value: number | null（目前選的天數，null=不設限）
//   onPick(value), onConfirm(), onClose()
const keyOf = (v) => (v === null ? 'none' : String(v));

const DurationSheet = ({ value, onPick, onConfirm, onClose }) => {
  const [showSci, setShowSci] = useState(false);

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end justify-center" onClick={onClose}>
      <div className="bg-white w-full max-w-xl rounded-t-3xl p-5 pb-7 max-h-[80dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-extrabold text-gray-800 mb-3">想養成多久？</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {DURATION_OPTIONS.map(o => {
            const sel = value === o.value;
            return (
              <button key={keyOf(o.value)} type="button" onClick={() => onPick(o.value)}
                className={`relative rounded-2xl border-[1.5px] p-3 text-center font-extrabold text-sm transition-colors ${sel ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-700 hover:border-emerald-300'}`}>
                {o.recommended && <span className="absolute -top-2 right-2 bg-amber-500 text-white text-[8px] font-extrabold rounded-full px-1.5 py-0.5">推薦</span>}
                {o.label}
                <span className="block font-medium text-[10px] text-gray-400 mt-0.5">{o.sub}</span>
              </button>
            );
          })}
        </div>

        <button type="button" onClick={() => setShowSci(s => !s)}
          aria-label="查看背後科學"
          className="inline-flex items-center gap-1 mt-3 text-xs font-bold text-emerald-600">
          <FlaskConical size={13} /> 為什麼建議 66 天？查看背後科學 {showSci ? '▾' : '›'}
        </button>
        {showSci && (
          <div className="mt-2.5 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-[11.5px] leading-relaxed text-emerald-800">
            {HABIT_FORMATION_SCIENCE.summary}
            <span className="inline-flex items-center gap-0.5 mt-1 font-bold text-emerald-600 cursor-pointer">查看完整來源與說明 <ChevronRight size={12} /></span>
          </div>
        )}

        <button type="button" onClick={onConfirm}
          className="w-full mt-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl py-3.5 font-extrabold transition-colors">
          確認加入
        </button>
      </div>
    </div>
  );
};

export default DurationSheet;
