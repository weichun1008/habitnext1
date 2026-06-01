'use client';

import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { DIMENSIONS, scoreEvidence, dimDisplay, TONE_CLASSES } from '@/lib/evidenceStrength';
import EvidenceRubricModal from './EvidenceRubricModal';

// 逐項評分面板：頂部等級、4 面向（mini 訊號格 + 等級標籤）、總分、評分標準連結。
export default function EvidenceScorePanel({ evidence }) {
  const [rubricOpen, setRubricOpen] = useState(false);
  const score = scoreEvidence(evidence);
  if (!score) return null;
  const tone = TONE_CLASSES[score.tier];

  return (
    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3" data-testid="evidence-score-panel">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-extrabold text-gray-700">證據力評分</span>
        <span className={`text-[11px] font-bold ${tone.text}`}>{score.tierLabel}</span>
      </div>

      <div className="space-y-1.5">
        {DIMENSIONS.map((dim) => {
          const d = dimDisplay(dim.key, evidence[dim.key]);
          const t = TONE_CLASSES[d.tone];
          return (
            <div key={dim.key} className="flex items-center justify-between gap-2">
              <span className="text-[11.5px] text-gray-600">{dim.label}</span>
              <span className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500">{d.label}</span>
                <span className="inline-flex items-end gap-[2px] h-[11px]" aria-hidden="true">
                  {[4, 7, 11].map((h, i) => (
                    <span
                      key={i}
                      style={{ height: h }}
                      className={`w-[3px] rounded-[1px] ${t.bar} ${i < d.filled ? 'opacity-100' : 'opacity-25'}`}
                    />
                  ))}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed border-gray-200">
        <span className="text-[11px] text-gray-500">總分</span>
        <span className={`text-xs font-extrabold ${tone.text}`}>{score.total} / 9 → 證據力 {score.tierLabel}</span>
      </div>

      <button
        type="button"
        onClick={() => setRubricOpen(true)}
        className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 hover:text-emerald-800 mt-2 transition-colors"
      >
        了解我們怎麼評分 <ArrowRight size={11} />
      </button>

      <EvidenceRubricModal isOpen={rubricOpen} onClose={() => setRubricOpen(false)} />
    </div>
  );
}
