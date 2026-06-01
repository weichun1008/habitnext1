'use client';

import React from 'react';
import { scoreEvidence, TIER_META, TONE_CLASSES } from '@/lib/evidenceStrength';

// 訊號格 badge。無評分 → null。點擊呼叫 onClick（卡片內會先 stopPropagation）。
// active 時加一圈內框，表示對應的評分面板已展開。
export default function EvidenceBadge({ evidence, onClick, active = false }) {
  const score = scoreEvidence(evidence);
  if (!score) return null;
  const tone = TONE_CLASSES[score.tier];
  const filled = TIER_META[score.tier].filled;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`證據力 ${score.tierLabel}，點擊查看評分`}
      aria-expanded={active}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold whitespace-nowrap transition-all hover:brightness-95 hover:shadow-sm ${tone.bg} ${tone.text} ${active ? 'ring-1 ring-inset ring-gray-400/40' : ''}`}
    >
      <span className="inline-flex items-end gap-[2px] h-3" aria-hidden="true">
        {[5, 8, 12].map((h, i) => (
          <span
            key={i}
            style={{ height: h }}
            className={`w-[3px] rounded-[1px] ${tone.bar} ${i < filled ? 'opacity-100' : 'opacity-25'}`}
          />
        ))}
      </span>
      證據力 {score.tierLabel}
    </button>
  );
}
