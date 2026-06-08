'use client';

import React from 'react';
import { Target, Dumbbell } from 'lucide-react';

// RatingStep — 單一習慣、單一維度的評分畫面（拖曳刻度，選值不自動前進）。
// Props:
//   phase: 'impact' | 'ability'
//   habitTitle: string
//   index, total: number（0-based index）
//   value: 1-5
//   onChange(value): 拖動刻度
//   onPrev(), onNext(): 導覽（onNext 由「下一個」按鈕觸發，不自動）
const THEME = {
  impact:  { grad: 'linear-gradient(135deg,#a78bfa,#7c3aed)', solid: '#8b5cf6', soft: '#f5f3ff', bd: '#ddd6fe', text: '#7c3aed', Icon: Target,
             title: '第一步 · 影響力', q: '這個習慣對你想要的改變，影響有多大？', sub: '想它跟你的目標關聯多強，先別管做不做得到。',
             lo: '沒感覺', hi: '很有感', labels: { 1: '沒什麼感覺', 2: '影響不大', 3: '普通', 4: '蠻有感', 5: '非常關鍵' } },
  ability: { grad: 'linear-gradient(135deg,#fbbf24,#f97316)', solid: '#f59e0b', soft: '#fff7ed', bd: '#fed7aa', text: '#ea580c', Icon: Dumbbell,
             title: '第二步 · 執行度', q: '對你來說，這個習慣有多容易做到？', sub: '純評估難易，影響大不大這步先不管。',
             lo: '很難', hi: '很容易', labels: { 1: '很難做到', 2: '有點難', 3: '普通', 4: '算容易', 5: '非常容易' } },
};

const RatingStep = ({ phase, habitTitle, index, total, value, onChange, onPrev, onNext }) => {
  const t = THEME[phase];
  const Icon = t.Icon;
  const v = typeof value === 'number' ? value : 3;
  const isImpact = phase === 'impact';
  const isLast = !isImpact && index === total - 1;
  const showPrev = !(isImpact && index === 0);
  // 進度：影響力佔前半、執行度佔後半
  const done = isImpact ? index : total + index;
  const pct = Math.round((done / (total * 2)) * 100);

  return (
    <div className="flex flex-col h-full">
      <div className="px-1 pt-1">
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: t.grad }} />
        </div>
        <p className="text-[11px] font-extrabold mt-2" style={{ color: t.text }}>
          {t.title}　<span className="text-gray-300">{index + 1}/{total}</span>
        </p>
      </div>

      <div className="flex-1 flex flex-col px-1 pt-4">
        <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-3" style={{ background: t.soft }}>
          <Icon size={22} style={{ color: t.text }} />
        </div>
        <h3 className="text-lg font-extrabold leading-snug text-gray-800">{t.q}</h3>
        <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{t.sub}</p>
        <span className="self-start inline-flex items-center gap-1.5 mt-4 px-3.5 py-2 rounded-full text-sm font-extrabold border"
          style={{ background: t.soft, borderColor: t.bd, color: t.text }}>
          <Icon size={14} /> {habitTitle}
        </span>

        <div className="mt-auto">
          <div className="text-center text-3xl font-black leading-none mt-2" style={{ color: t.text }}>
            {v}
            <span className="block text-[13px] text-gray-500 font-bold mt-1.5">{t.labels[v]}</span>
          </div>
          <div className="px-1.5 mt-3">
            <input
              type="range" min={1} max={5} step={1} value={v}
              onChange={e => onChange(Number(e.target.value))}
              aria-label={isImpact ? '影響力' : '執行度'}
              className="fm-range w-full"
              style={{ '--c': t.solid, background: t.grad }}
            />
            <div className="flex justify-between px-3 text-[11px] font-extrabold text-gray-300">
              {[1, 2, 3, 4, 5].map(n => <span key={n}>{n}</span>)}
            </div>
            <div className="flex justify-between mt-1.5 text-[11px] font-bold text-gray-400">
              <span>{t.lo}</span><span>{t.hi}</span>
            </div>
          </div>
          <div className="flex gap-2.5 mt-5">
            {showPrev && (
              <button type="button" onClick={onPrev}
                className="flex-none bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl px-4 py-3.5 font-extrabold text-sm transition-colors">
                ‹ 上一個
              </button>
            )}
            <button type="button" onClick={onNext}
              className="flex-1 text-white rounded-xl py-3.5 font-extrabold text-[15px] transition-transform hover:-translate-y-0.5"
              style={{ background: t.grad }}>
              {isLast ? '看焦點地圖 ›' : '下一個 ›'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RatingStep;
