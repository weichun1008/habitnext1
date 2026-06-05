'use client';

import React from 'react';
import { X, Sparkles, BookOpen, Search } from 'lucide-react';

// ＋ 新增的三選一入口。手機 bottom-sheet、桌機置中。從嚮往開始為置頂 hero（主推）。
export default function AddFlowChooser({ isOpen, onClose, onAspiration, onExplore, onLibrary }) {
  if (!isOpen) return null;
  const pick = (fn) => () => { onClose?.(); fn?.(); };
  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-end md:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white w-full md:max-w-md md:rounded-2xl rounded-t-2xl shadow-2xl p-5 animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">想新增什麼？</h3>
          <button onClick={onClose} aria-label="關閉" className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <button
          type="button"
          onClick={pick(onAspiration)}
          className="relative w-full text-left overflow-hidden rounded-2xl p-4 mb-3 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-200 hover:shadow-emerald-300 hover:-translate-y-0.5 transition-all"
        >
          <Sparkles size={62} className="absolute -right-2 -bottom-3 opacity-20" />
          <div className="relative">
            <p className="font-extrabold text-base">從嚮往開始</p>
            <p className="text-xs opacity-90 mt-1 leading-relaxed">不知從何下手？從你想成為的樣子出發，我們幫你配習慣。</p>
          </div>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={pick(onExplore)} className="border border-gray-200 rounded-xl p-3 text-center hover:border-emerald-300 hover:shadow-sm transition-all">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-1.5"><BookOpen size={18} /></div>
            <p className="text-xs font-bold text-gray-700">探索計畫</p>
          </button>
          <button type="button" onClick={pick(onLibrary)} className="border border-gray-200 rounded-xl p-3 text-center hover:border-emerald-300 hover:shadow-sm transition-all">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-1.5"><Search size={18} /></div>
            <p className="text-xs font-bold text-gray-700">瀏覽習慣庫</p>
          </button>
        </div>
      </div>
    </div>
  );
}
