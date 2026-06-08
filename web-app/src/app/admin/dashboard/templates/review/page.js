"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Check, X, Loader } from 'lucide-react';

export default function PlanReviewPage() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/templates');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setPending(list.filter(t => t.authorType === 'user' && t.reviewStatus === 'pending'));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const decide = async (id, decision) => {
    let reason;
    if (decision === 'reject') { reason = window.prompt('退回原因（選填）') || ''; }
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/plans/${id}/review`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason }),
      });
      if (res.ok) await load(); else alert('審核失敗');
    } catch (e) { console.error(e); alert('發生錯誤'); }
    finally { setBusyId(null); }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href="/admin/dashboard/templates" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-4">
        <ChevronLeft size={16} /> 返回計畫管理
      </Link>
      <h1 className="text-2xl font-bold text-white mb-1">社群計畫審核</h1>
      <p className="text-sm text-gray-400 mb-6">使用者送出的公開計畫，核准後才會出現在探索計畫的「社群計畫」分區。</p>
      {loading ? (
        <div className="flex justify-center py-12"><Loader className="animate-spin text-emerald-500" /></div>
      ) : pending.length === 0 ? (
        <p className="text-sm text-gray-500 italic">目前沒有待審計畫。</p>
      ) : (
        <div className="space-y-3">
          {pending.map(t => {
            const phases = t.tasks?.phases || [];
            const taskCount = phases.reduce((s, p) => s + (Array.isArray(p.tasks) ? p.tasks.length : 0), 0);
            return (
              <div key={t.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-white">{t.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">by {t.authorName || '使用者'} · {phases.length} 階段 · {taskCount} 個習慣</p>
                    {t.description && <p className="text-xs text-gray-500 mt-1">{t.description}</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => decide(t.id, 'approve')} disabled={busyId === t.id}
                      className="admin-btn admin-btn-primary flex items-center gap-1"><Check size={14} /> 核准</button>
                    <button onClick={() => decide(t.id, 'reject')} disabled={busyId === t.id}
                      className="admin-btn admin-btn-secondary flex items-center gap-1"><X size={14} /> 退回</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
