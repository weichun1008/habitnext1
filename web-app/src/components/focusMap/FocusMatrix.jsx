'use client';

import React, { useState } from 'react';
import { useT } from '@/lib/i18n';

// FocusMatrix — 2×2 焦點地圖矩陣。Y=影響力(上高)、X=執行度(右易)。
// 每個 point 是帶編號的彩點；桌機 hover、手機點選顯示習慣名稱浮層；下方圖例對應編號↔名稱。
// Props:
//   points: Array<{ id, n, title, impact(1-5), ability(1-5), quadrant, color }>
const CELLS = [
  { key: 'big_fish',   labelKey: 'focusMap.quadrants.big_fish.label',   cls: 'top-0 left-0 bg-violet-50',  txt: 'text-violet-600' },
  { key: 'golden',     labelKey: 'focusMap.quadrants.golden.label',     cls: 'top-0 left-1/2 bg-orange-50', txt: 'text-orange-600' },
  { key: 'skip',       labelKey: 'focusMap.matrix.skipShort',           cls: 'top-1/2 left-0 bg-slate-50',  txt: 'text-slate-400' },
  { key: 'background', labelKey: 'focusMap.quadrants.background.label', cls: 'top-1/2 left-1/2 bg-cyan-50', txt: 'text-cyan-600' },
];

// (ability,impact) → 百分比座標（含同點水平微錯位）
function layout(points) {
  const seen = {};
  return points.map(p => {
    const x = ((p.ability - 1) / 4) * 82 + 9;
    const y = ((p.impact - 1) / 4) * 82 + 9;
    const ck = `${Math.round(x)}_${Math.round(y)}`;
    const k = (seen[ck] = (seen[ck] || 0) + 1);
    return { ...p, x: x + (k - 1) * 10, y };
  });
}

const FocusMatrix = ({ points = [] }) => {
  const { t } = useT();
  const [active, setActive] = useState(null); // 目前顯示名稱的 dot id
  const laid = layout(points);
  const tip = active != null ? laid.find(p => p.id === active) : null;

  return (
    <div>
      <div className="relative w-full" style={{ aspectRatio: '1 / 1' }}>
        {/* 矩陣本體（圓角、cell 底色） */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden border border-gray-200">
          {CELLS.map(c => (
            <div key={c.key} className={`absolute w-1/2 h-1/2 p-1.5 ${c.cls}`}>
              <span className={`text-[9px] font-extrabold ${c.txt}`}>{t(c.labelKey)}</span>
            </div>
          ))}
        </div>
        {laid.map(p => (
          <div
            key={p.id}
            data-dot-id={p.id}
            role="button"
            tabIndex={0}
            aria-label={p.title}
            onMouseEnter={() => setActive(p.id)}
            onMouseLeave={() => setActive(cur => (cur === p.id ? null : cur))}
            onClick={() => setActive(cur => (cur === p.id ? null : p.id))}
            className="absolute w-7 h-7 rounded-full border-2 border-white text-white text-[11px] font-extrabold flex items-center justify-center cursor-pointer shadow-md"
            style={{ left: `${p.x}%`, bottom: `${p.y}%`, transform: 'translate(-50%,50%)', background: p.color }}
          >
            {p.n}
          </div>
        ))}
        {/* 浮層（畫在矩陣外層，避免被 overflow-hidden 裁掉） */}
        {tip && (
          <div
            data-testid="dot-tip"
            className="absolute z-10 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold whitespace-nowrap shadow-lg pointer-events-none"
            style={{ left: `${tip.x}%`, bottom: `${tip.y}%`, transform: 'translate(-50%,-135%)' }}
          >
            {tip.n}. {tip.title}
          </div>
        )}
        <span className="absolute -left-1 top-1/2 -rotate-90 origin-left -translate-y-1/2 text-[10px] font-bold text-gray-400 whitespace-nowrap">{t('focusMap.matrix.impactAxis')}</span>
      </div>
      <p className="text-center text-[10px] font-bold text-gray-400 mt-1.5">{t('focusMap.matrix.abilityAxis')}</p>
      {/* 圖例 */}
      <div className="grid grid-cols-2 gap-x-2.5 gap-y-1 mt-2">
        {laid.map(p => (
          <div key={p.id} className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
            <span className="w-[18px] h-[18px] rounded-full text-white text-[10px] font-extrabold flex items-center justify-center flex-shrink-0" style={{ background: p.color }}>{p.n}</span>
            <span className="truncate">{p.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FocusMatrix;
