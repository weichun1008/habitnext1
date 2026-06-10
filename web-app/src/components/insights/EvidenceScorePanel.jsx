'use client';

import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { DIMENSIONS, scoreEvidence, dimDisplay, levelLabelKey, TIER_META, TONE_CLASSES } from '@/lib/evidenceStrength';
import EvidenceRubricModal from './EvidenceRubricModal';
import { useT } from '@/lib/i18n';

// 逐項評分面板：頂部等級、4 面向（mini 訊號格 + 等級標籤）、總分、評分標準連結。
export default function EvidenceScorePanel({ evidence }) {
  const { t } = useT();
  const [rubricOpen, setRubricOpen] = useState(false);
  const score = scoreEvidence(evidence);
  if (!score) return null;
  const tone = TONE_CLASSES[score.tier];
  const tierLabel = t(TIER_META[score.tier].labelKey);

  return (
    <div className="bg-gray-50 border border-gray-100 rounded-lg p-3" data-testid="evidence-score-panel">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-extrabold text-gray-700">{t('evidence.panel.title')}</span>
        <span className={`text-[11px] font-bold ${tone.text}`}>{tierLabel}</span>
      </div>

      <div className="space-y-1.5">
        {DIMENSIONS.map((dim) => {
          const d = dimDisplay(dim.key, evidence[dim.key]);
          const tc = TONE_CLASSES[d.tone];
          return (
            <div key={dim.key} className="flex items-center justify-between gap-2">
              <span className="text-[11.5px] text-gray-600">{t(dim.labelKey)}</span>
              <span className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500">{t(levelLabelKey(dim.key, evidence[dim.key])) || d.label}</span>
                <span className="inline-flex items-end" style={{ gap: 2, height: 11 }} aria-hidden="true">
                  {[5, 8, 11].map((h, i) => (
                    <span
                      key={i}
                      style={{ width: 3, height: h, borderRadius: 1, display: 'block' }}
                      className={i < d.filled ? tc.bar : tc.track}
                    />
                  ))}
                </span>
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-dashed border-gray-200">
        <span className="text-[11px] text-gray-500">{t('evidence.panel.total')}</span>
        <span className={`text-xs font-extrabold ${tone.text}`}>{t('evidence.panel.totalValue', { total: score.total, tier: tierLabel })}</span>
      </div>

      <button
        type="button"
        onClick={() => setRubricOpen(true)}
        className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 hover:text-emerald-800 mt-2 transition-colors"
      >
        {t('evidence.panel.howScored')} <ArrowRight size={11} />
      </button>

      <EvidenceRubricModal isOpen={rubricOpen} onClose={() => setRubricOpen(false)} />
    </div>
  );
}
