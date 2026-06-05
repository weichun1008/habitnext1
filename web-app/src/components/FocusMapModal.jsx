'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X } from 'lucide-react';
import RatingStep from './focusMap/RatingStep';
import FocusMatrix from './focusMap/FocusMatrix';
import QuadrantSection from './focusMap/QuadrantSection';
import DurationSheet from './focusMap/DurationSheet';
import { quadrantOf, recommendDefaults, sliderSeedFor, buildBatchPayload, QUADRANTS } from '@/lib/focusMap';

// FocusMapModal — 引導式三階段：影響力 → 執行度 → 焦點地圖（+ 養成期間）。
// Props: isOpen, userId, onClose(), onActivated(count)
const ORDER = ['golden', 'big_fish', 'background', 'skip'];

const FocusMapModal = ({ isOpen, userId, onClose, onActivated }) => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [phase, setPhase] = useState('impact'); // 'impact' | 'ability' | 'map'
  const [idx, setIdx] = useState(0);
  const [ratings, setRatings] = useState(new Map()); // Map<id,{impact,ability}>
  const [added, setAdded] = useState(new Set());
  const [showDur, setShowDur] = useState(false);
  const [duration, setDuration] = useState(66);

  useEffect(() => {
    if (!isOpen || !userId) return;
    let cancelled = false;
    setLoading(true);
    setPhase('impact'); setIdx(0); setShowDur(false); setDuration(66);
    (async () => {
      try {
        const res = await fetch(`/api/tasks/candidates?userId=${userId}`);
        if (cancelled || !res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const list = Array.isArray(data) ? data : [];
        setCandidates(list);
        const next = new Map();
        for (const c of list) {
          const seed = sliderSeedFor(c);
          next.set(c.id, { impact: seed.impact, ability: seed.ability });
        }
        setRatings(next);
      } catch (e) {
        if (!cancelled) console.error('Candidates fetch error', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, userId]);

  const total = candidates.length;
  const curId = candidates[idx]?.id;
  const curRating = curId ? ratings.get(curId) : null;

  const setAxis = (axis, value) => {
    if (!curId) return;
    setRatings(prev => {
      const next = new Map(prev);
      const cur = next.get(curId) || { impact: 3, ability: 3 };
      next.set(curId, { ...cur, [axis]: value });
      return next;
    });
  };

  const goNext = () => {
    if (idx < total - 1) { setIdx(idx + 1); return; }
    if (phase === 'impact') { setPhase('ability'); setIdx(0); return; }
    // 進入 map：依使用者剛評定的分數預選 golden 前 3
    const live = candidates.map(c => ({ ...c, userImpact: ratings.get(c.id)?.impact, userAbility: ratings.get(c.id)?.ability }));
    setAdded(recommendDefaults(live));
    setPhase('map');
  };
  const goPrev = () => {
    if (idx > 0) { setIdx(idx - 1); return; }
    if (phase === 'ability') { setPhase('impact'); setIdx(total - 1); }
  };

  const toggleAdd = (id) => setAdded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // map 階段：分群 + 矩陣點
  const groups = useMemo(() => {
    const out = { golden: [], big_fish: [], background: [], skip: [] };
    candidates.forEach((c, i) => {
      const r = ratings.get(c.id) || { impact: 3, ability: 3 };
      const q = quadrantOf(r.impact, r.ability);
      out[q].push({ id: c.id, n: i + 1, title: c.title });
    });
    return out;
  }, [candidates, ratings]);

  const points = useMemo(() => candidates.map((c, i) => {
    const r = ratings.get(c.id) || { impact: 3, ability: 3 };
    const q = quadrantOf(r.impact, r.ability);
    return { id: c.id, n: i + 1, title: c.title, impact: r.impact, ability: r.ability, quadrant: q, color: QUADRANTS[q].color };
  }), [candidates, ratings]);

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const payload = buildBatchPayload(candidates, ratings, added, duration);
      const res = await fetch('/api/tasks/batch-rate', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ratings: payload }),
      });
      if (res.ok) {
        const json = await res.json();
        onActivated?.(json.counts?.activate || 0);
      } else {
        alert('批次評分失敗，請稍後再試');
      }
    } catch (e) {
      console.error('Batch rate submit error', e);
      alert('發生錯誤');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full max-w-xl h-[90dvh] md:max-h-[90dvh] rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
          <h2 className="text-base font-bold text-gray-800">焦點地圖</h2>
          <button onClick={onClose} className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-center text-sm text-gray-400 py-12">載入中…</p>
          ) : candidates.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-12">沒有候選習慣可評分</p>
          ) : phase !== 'map' ? (
            <RatingStep
              phase={phase}
              habitTitle={candidates[idx]?.title || ''}
              index={idx}
              total={total}
              value={phase === 'impact' ? curRating?.impact : curRating?.ability}
              onChange={(v) => setAxis(phase === 'impact' ? 'impact' : 'ability', v)}
              onPrev={goPrev}
              onNext={goNext}
            />
          ) : (
            <>
              <h2 className="text-lg font-extrabold text-gray-800">你的焦點地圖</h2>
              <p className="text-xs text-gray-500 mt-1 mb-3">依「影響力 × 執行度」分四區，幫你決定先做哪些。</p>
              <FocusMatrix points={points} />
              <div className="mt-3">
                {ORDER.map(qk => (
                  <QuadrantSection key={qk} quadrantKey={qk} items={groups[qk]} addedSet={added} onToggle={toggleAdd} />
                ))}
              </div>
            </>
          )}
        </div>

        {phase === 'map' && candidates.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 flex-shrink-0">
            <button type="button" onClick={() => setShowDur(true)} disabled={submitting}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-600 disabled:opacity-50 text-white font-extrabold transition-transform hover:-translate-y-0.5">
              {submitting ? '處理中…' : `加入 ${added.size} 個習慣 ›`}
            </button>
          </div>
        )}

        {showDur && (
          <DurationSheet
            value={duration}
            onPick={setDuration}
            onClose={() => setShowDur(false)}
            onConfirm={handleConfirm}
          />
        )}
      </div>
    </div>
  );
};

export default FocusMapModal;
