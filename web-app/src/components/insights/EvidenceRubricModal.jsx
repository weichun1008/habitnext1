'use client';

import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { DIMENSIONS, THRESHOLDS } from '@/lib/evidenceStrength';

// 「我們怎麼評分」說明 modal。內容由 lib 的 DIMENSIONS/THRESHOLDS 動態產生，
// 與實際算分同源（不寫死兩份）。點遮罩或 Esc 關閉。
export default function EvidenceRubricModal({ isOpen, onClose }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-2xl max-h-[85dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h3 className="font-bold text-gray-800">我們怎麼評證據力</h3>
          <button onClick={onClose} aria-label="關閉" className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            每則科學佐證從 4 個面向評分、加總分為三個等級。分數衡量「證據有多可信」，
            不代表「習慣有多好」——嚴謹研究即使結論是效果有限，證據力仍然高。
          </p>
          {DIMENSIONS.map((dim) => (
            <div key={dim.key}>
              <h4 className="font-bold text-gray-800 text-sm mb-1">{dim.label}</h4>
              <ul className="space-y-0.5">
                {dim.levels.map((l) => (
                  <li key={l.value} className="text-xs text-gray-600 flex justify-between">
                    <span>{l.label}</span>
                    <span className="text-gray-400">{l.points} 分</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="pt-3 border-t border-gray-100 text-xs text-gray-600">
            <p>總分 0–9 分對應等級：</p>
            <p className="mt-1 font-medium">
              強（{THRESHOLDS.strong}–9）· 中（{THRESHOLDS.moderate}–{THRESHOLDS.strong - 1}）· 初步（0–{THRESHOLDS.moderate - 1}）
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
