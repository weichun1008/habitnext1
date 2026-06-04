"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Save, Loader } from 'lucide-react';

const COLOR_OPTIONS = ['#ec4899', '#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'];

export default function PlanFamiliesPage() {
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState(null);

  useEffect(() => { fetchFamilies(); }, []);

  const fetchFamilies = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/plan-families');
      if (res.ok) setFamilies(await res.json());
    } catch (e) { console.error('fetch families failed', e); }
    finally { setLoading(false); }
  };

  const updateField = (slug, field, value) => {
    setFamilies(fs => fs.map(f => f.slug === slug ? { ...f, [field]: value } : f));
  };

  const save = async (fam) => {
    setSavingSlug(fam.slug);
    try {
      const res = await fetch(`/api/admin/plan-families/${fam.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: fam.title, intro: fam.intro, icon: fam.icon, color: fam.color,
          quizPendingCopy: fam.quizPendingCopy, order: Number(fam.order) || 0, isActive: fam.isActive,
        }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); alert(b.error || '儲存失敗'); }
    } catch (e) { console.error(e); alert('發生錯誤'); }
    finally { setSavingSlug(null); }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href="/admin/dashboard/templates" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-4">
        <ChevronLeft size={16} /> 返回計畫管理
      </Link>
      <h1 className="text-2xl font-bold text-white mb-1">計畫家族</h1>
      <p className="text-sm text-gray-400 mb-6">探索計畫第一層的三大分類。固定 3 個、僅編輯顯示內容（成員由習慣分類自動判定）。</p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader className="animate-spin text-emerald-500" /></div>
      ) : (
        <div className="space-y-4">
          {families.map(fam => (
            <div key={fam.slug} className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-gray-700 text-gray-300">{fam.slug}</span>
                <label className="flex items-center gap-2 text-xs text-gray-300">
                  <input type="checkbox" checked={fam.isActive} onChange={e => updateField(fam.slug, 'isActive', e.target.checked)} />
                  顯示於探索計畫
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="admin-label">顯示名稱</label>
                  <input className="admin-input" value={fam.title || ''} onChange={e => updateField(fam.slug, 'title', e.target.value)} /></div>
                <div><label className="admin-label">排序（小在前）</label>
                  <input type="number" className="admin-input" value={fam.order ?? 0} onChange={e => updateField(fam.slug, 'order', e.target.value)} /></div>
                <div className="col-span-2"><label className="admin-label">介紹文</label>
                  <textarea rows={2} className="admin-input" value={fam.intro || ''} onChange={e => updateField(fam.slug, 'intro', e.target.value)} /></div>
                <div><label className="admin-label">Lucide 圖示名稱</label>
                  <input className="admin-input" placeholder="Flower2 / Moon / LayoutGrid" value={fam.icon || ''} onChange={e => updateField(fam.slug, 'icon', e.target.value)} /></div>
                <div><label className="admin-label">顏色</label>
                  <div className="flex items-center gap-2">
                    <input className="admin-input flex-1" value={fam.color || ''} onChange={e => updateField(fam.slug, 'color', e.target.value)} />
                    <div className="flex gap-1">
                      {COLOR_OPTIONS.map(c => (
                        <button key={c} type="button" onClick={() => updateField(fam.slug, 'color', c)}
                          className="w-6 h-6 rounded-full border border-gray-600" style={{ backgroundColor: c }} aria-label={c} />
                      ))}
                    </div>
                  </div></div>
                <div className="col-span-2"><label className="admin-label">未完成分型測驗提示（可留空）</label>
                  <textarea rows={2} className="admin-input" value={fam.quizPendingCopy || ''} onChange={e => updateField(fam.slug, 'quizPendingCopy', e.target.value)} /></div>
              </div>
              <div className="flex justify-end mt-3">
                <button onClick={() => save(fam)} disabled={savingSlug === fam.slug}
                  className="admin-btn admin-btn-primary flex items-center gap-2">
                  {savingSlug === fam.slug ? <Loader size={16} className="animate-spin" /> : <Save size={16} />} 儲存
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
