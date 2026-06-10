'use client';

import React from 'react';
import * as Icons from 'lucide-react';
import { QUADRANTS } from '@/lib/focusMap';
import { useT } from '@/lib/i18n';

// QuadrantSection — 一個象限卡：圖示 + 白話名稱 + 說明 + 習慣加入切換清單。
// Props:
//   quadrantKey: 'golden' | 'background' | 'big_fish' | 'skip'
//   items: Array<{ id, n, title }>
//   addedSet: Set<id>（已加入）
//   onToggle(id): 切換加入
const QuadrantSection = ({ quadrantKey, items, addedSet, onToggle }) => {
  const { t } = useT();
  if (!items || items.length === 0) return null;
  const meta = QUADRANTS[quadrantKey];
  const Icon = Icons[meta.iconKey] || Icons.Circle;
  const isSkip = quadrantKey === 'skip';

  return (
    <section className="mb-2.5 rounded-2xl border p-3" style={{ background: `${meta.color}0f`, borderColor: `${meta.color}40` }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-7 h-7 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
          <Icon size={15} style={{ color: meta.color }} />
        </span>
        <div className="min-w-0">
          <b className="text-[13.5px]" style={{ color: meta.color }}>{t(meta.labelKey)}</b>
          <p className="text-[10px] text-gray-500 leading-snug">{t(meta.adviceKey)}</p>
        </div>
        <span className="ml-auto text-[11px] font-bold text-gray-400">{items.length}</span>
      </div>
      {items.map(it => {
        const on = addedSet.has(it.id);
        return (
          <div key={it.id} className="flex items-center justify-between gap-2 bg-white border border-gray-200 rounded-xl px-2.5 py-2 mb-1.5">
            <span className="flex items-center gap-1.5 text-[13px] font-bold text-gray-700 min-w-0">
              <span className="inline-flex w-4 h-4 rounded-full text-white text-[9px] items-center justify-center flex-shrink-0" style={{ background: meta.color }}>{it.n}</span>
              <span className="truncate">{it.title}</span>
            </span>
            <button type="button" onClick={() => onToggle(it.id)}
              className={`inline-flex items-center gap-1 text-[11px] font-extrabold rounded-lg px-2.5 py-1.5 border transition-colors flex-shrink-0 ${
                on ? 'bg-emerald-500 text-white border-emerald-500'
                   : isSkip ? 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                            : 'bg-white text-emerald-600 border-emerald-200 hover:border-emerald-400'}`}>
              {on ? <><Icons.Check size={12} /> {t('focusMap.added')}</> : isSkip ? <><Icons.Plus size={12} /> {t('focusMap.addAnyway')}</> : <><Icons.Plus size={12} /> {t('focusMap.add')}</>}
            </button>
          </div>
        );
      })}
    </section>
  );
};

export default QuadrantSection;
