'use client';

import React, { useState } from 'react';
import { X, Layers, Loader } from 'lucide-react';

// SaveAsPlanModal — 把目前嚮往的習慣集存成計畫。
// Props: isOpen, userId, aspirationId, defaultName, previewPlan({version,phases}), onClose(), onSaved(result)
const SaveAsPlanModal = ({ isOpen, userId, aspirationId, defaultName, previewPlan, onClose, onSaved }) => {
  const [name, setName] = useState(defaultName || '');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  if (!isOpen) return null;
  const phases = previewPlan?.phases || [];

  const submit = async (visibility) => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/plans/from-aspiration', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aspirationId, userId, name: name.trim(), description: description.trim(), visibility }),
      });
      if (res.ok) { const json = await res.json(); onSaved?.(json); }
      else { alert('建立計畫失敗，請稍後再試'); }
    } catch (e) { console.error('save plan error', e); alert('發生錯誤'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full max-w-xl h-[88dvh] md:max-h-[88dvh] rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-1.5"><Layers size={16} className="text-emerald-500" /> 存成計畫</h2>
          <button onClick={onClose} className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} className="text-gray-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <label className="block text-xs font-bold text-gray-500 mb-1">計畫名稱</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold mb-3 focus:border-emerald-400 outline-none" />
          <label className="block text-xs font-bold text-gray-500 mb-1">描述（選填）</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-4 focus:border-emerald-400 outline-none" />
          <p className="text-xs font-bold text-gray-500 mb-2">階段預覽（共 {phases.length} 階段）</p>
          {phases.map((ph, i) => (
            <div key={ph.id || i} className="rounded-xl border border-gray-200 p-3 mb-2">
              <div className="flex items-center justify-between mb-1.5">
                <b className="text-[13px] text-gray-800">{ph.name}</b>
                <span className="text-[11px] text-gray-400 font-bold">{ph.days} 天 · {ph.tasks?.length || 0} 個習慣</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(ph.tasks || []).map((t, k) => (
                  <span key={k} className="text-[11px] font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">{t.title}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex gap-2.5 flex-shrink-0">
          <button type="button" onClick={() => submit('private')} disabled={submitting || !name.trim()}
            className="flex-none bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl px-4 py-3 font-extrabold text-sm transition-colors disabled:opacity-50">
            存為私人
          </button>
          <button type="button" onClick={() => submit('public')} disabled={submitting || !name.trim()}
            className="flex-1 bg-gradient-to-r from-emerald-400 to-emerald-600 text-white rounded-xl py-3 font-extrabold transition-transform hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-1.5">
            {submitting ? <Loader size={16} className="animate-spin" /> : null} 申請公開分享
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveAsPlanModal;
