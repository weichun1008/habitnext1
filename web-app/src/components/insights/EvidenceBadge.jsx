'use client';

import React from 'react';
import { scoreEvidence, TIER_META, TONE_CLASSES } from '@/lib/evidenceStrength';
import { useT } from '@/lib/i18n';

// 訊號格 badge。無評分 → null。點擊呼叫 onClick（卡片內會先 stopPropagation）。
// active 時加一圈內框，表示對應的評分面板已展開。
export default function EvidenceBadge({ evidence, onClick, active = false }) {
  const { t } = useT();
  const score = scoreEvidence(evidence);
  if (!score) return null;
  const tone = TONE_CLASSES[score.tier];
  const filled = TIER_META[score.tier].filled;
  const tierLabel = t(TIER_META[score.tier].labelKey);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('evidence.badge.aria', { tier: tierLabel })}
      aria-expanded={active}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap transition-all hover:brightness-95 hover:shadow-sm ${tone.bg} ${tone.text} ${active ? 'ring-1 ring-inset ring-gray-400/40' : ''}`}
    >
      {/* 訊號格：寬高用 inline style（不依賴 Tailwind 任意值生成）；
          已填滿用實心 tone.bar、未填滿用可見的 tone.track 軌道。 */}
      <span className="inline-flex items-end" style={{ gap: 2, height: 12 }} aria-hidden="true">
        {[6, 9, 12].map((h, i) => (
          <span
            key={i}
            style={{ width: 3, height: h, borderRadius: 1, display: 'block' }}
            className={i < filled ? tone.bar : tone.track}
          />
        ))}
      </span>
      {t('evidence.badge.label', { tier: tierLabel })}
    </button>
  );
}
