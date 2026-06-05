"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ChevronLeft, Save, Loader, FileText } from 'lucide-react';
import { sectionIdFor } from '@/lib/templateRecommendation';

const COLOR_OPTIONS = ['#ec4899', '#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#06b6d4'];

export default function PlanFamiliesPage() {
  const [families, setFamilies] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState(null);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      // 家族顯示設定 + 全部計畫（用來把旗下計畫包進各家族）
      const [famRes, tplRes] = await Promise.all([
        fetch('/api/admin/plan-families'),
        fetch('/api/admin/templates'),
      ]);
      if (famRes.ok) setFamilies(await famRes.json());
      if (tplRes.ok) setTemplates(await tplRes.json());
    } catch (e) { console.error('fetch families/templates failed', e); }
    finally { setLoading(false); }
  };

  // 依 sectionIdFor 把計畫分到家族（成員由計畫分類決定，與探索計畫一致）
  const byFamily = useMemo(() => {
    const map = { flower: [], sleep: [], other: [] };
    for (const t of templates) {
      const fid = sectionIdFor(t);
      (map[fid] || (map[fid] = [])).push(t);
    }
    return map;
  }, [templates]);

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

              {/* 旗下計畫（唯讀 — 歸屬由計畫的「分類」自動判定） */}
              {(() => {
                const plans = byFamily[fam.slug] || [];
                return (
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={14} className="text-gray-400" />
                      <span className="text-xs font-bold text-gray-300">旗下計畫</span>
                      <span className="text-xs text-gray-500">{plans.length}</span>
                    </div>
                    {plans.length === 0 ? (
                      <p className="text-xs text-gray-500 italic">尚無計畫（建立計畫時選對應分類即會歸入此家族）</p>
                    ) : (
                      <div className="space-y-1.5">
                        {plans.map(t => (
                          <div key={t.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gray-900/40 border border-gray-700/60">
                            <span className="text-sm text-gray-200 truncate">{t.name}</span>
                            <span className="flex items-center gap-2 flex-shrink-0">
                              <span className="text-[10px] font-mono text-gray-400">{t.category}</span>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${t.isPublic ? 'bg-emerald-500/15 text-emerald-300' : 'bg-gray-600/40 text-gray-400'}`}>
                                {t.isPublic ? '公開' : '未公開'}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
