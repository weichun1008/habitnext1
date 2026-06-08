"use client";

import React, { useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Check, X, ChevronRight, Loader } from 'lucide-react';
import IconRenderer from '../IconRenderer';
import HabitInsightSection from '../insights/HabitInsightSection';
import { CATEGORY_CONFIG, resolveIconKey } from '@/lib/constants';

// NOTE (2026-05-25, Slice K Task 11): the 「清單 ｜ 焦點地圖」view-mode
// toggle was removed here. Spec v2 reframed the add-flow around the
// aspiration picker, and FocusMap (impact × ability) is no longer in the
// user's main path. The FocusMap component itself is kept (admin / debug
// tool); OfficialHabit.impact / ability data + tests stay valid. Only the
// HabitListView toggle was wrong-placed for v2's UX.

const DIFFICULTY_OPTIONS = [
  { key: 'beginner',     label: '入門', color: 'emerald' },
  { key: 'intermediate', label: '進階', color: 'amber' },
  { key: 'challenge',    label: '挑戰', color: 'red' },
];

function getDefaultDifficulty(habit) {
  const diffs = habit.difficulties || {};
  if (diffs.beginner?.enabled) return 'beginner';
  if (diffs.intermediate?.enabled) return 'intermediate';
  if (diffs.challenge?.enabled) return 'challenge';
  return 'beginner';
}

function getEnabledDifficulties(habit) {
  const diffs = habit.difficulties || {};
  return DIFFICULTY_OPTIONS.filter(d => diffs[d.key]?.enabled);
}

function summarizeCadence(r) {
  if (!r) return '';
  if (r.type === 'daily') {
    return r.periodTarget > 1 ? `每日 ${r.periodTarget} 次` : '每日';
  }
  if (r.type === 'weekly') {
    const days = r.weekDays || [];
    if (days.length === 3 && [1, 3, 5].every(d => days.includes(d))) return '週 3 (一三五)';
    if (days.length === 5 && [1, 2, 3, 4, 5].every(d => days.includes(d))) return '週 5 (週間)';
    if (days.length === 7) return '每日';
    const n = r.periodTarget || days.length || 1;
    return `每週 ${n} 次`;
  }
  if (r.type === 'monthly') {
    const i = r.interval || 1;
    if (i === 12) return '每年';
    if (i === 6) return '每半年';
    if (i === 3) return '每季';
    if (i === 1) return '每月';
    return `每 ${i} 個月`;
  }
  return '';
}

function summarizeDifficulty(config) {
  if (!config) return '';
  const cadence = summarizeCadence(config.recurrence);
  if (config.type === 'quantitative') {
    return `${config.dailyTarget}${config.unit || ''} · ${cadence}`;
  }
  return cadence;
}

export default function HabitListView({
  habits,
  selectedDifficulty,
  setSelectedDifficulty,
  onSelectHabit,
  emptyText,
  // Optional aspiration-recommendation mode: when onAddCandidate is provided,
  // the expanded body shows two CTAs (加入候選 toggle + 直接加入) instead of the
  // single 加入此習慣 button. Keeps the SAME expandable / difficulty / evidence
  // shell so the recommendation panel matches 探索習慣 exactly.
  onAddCandidate,
  onRemoveCandidate,
  candidateAddedIds,
  pickingId,
}) {
  const [expandedId, setExpandedId] = useState(null);

  if (habits.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        {emptyText || '這個面向目前還沒有推薦習慣'}
      </div>
    );
  }

  const toggleExpand = (habitId) => {
    setExpandedId(prev => prev === habitId ? null : habitId);
  };

  return (
    <div className="space-y-3">
      {habits.map(habit => {
        const enabledDiffs = getEnabledDifficulties(habit);
        const currentDiff = selectedDifficulty[habit.id] || getDefaultDifficulty(habit);
        // Read admin-set per-habit icon first; fall back to the domain default
        // only when the habit has no explicit icon. This mirrors the admin
        // grid (habits/page.js:280) and HabitLibraryModal.
        const iconKey = resolveIconKey(habit.icon || habit.category);
        const config = CATEGORY_CONFIG[iconKey];
        const isExpanded = expandedId === habit.id;

        return (
          <div
            key={habit.id}
            className={`bg-white border rounded-xl shadow-sm transition-all ${
              isExpanded ? 'border-emerald-200 shadow-md' : 'border-gray-100 hover:shadow-md'
            }`}
          >
            {/* Header — click to expand/collapse */}
            <button
              type="button"
              onClick={() => toggleExpand(habit.id)}
              className="w-full text-left p-4 flex items-start justify-between gap-3"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`${config.bg} p-2 rounded-xl flex-shrink-0`}>
                  <IconRenderer category={iconKey} size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-800">{habit.name}</h4>
                  {habit.description && !isExpanded && (
                    <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{habit.description}</p>
                  )}
                </div>
              </div>
              <div className="flex-shrink-0 text-gray-400">
                {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
            </button>

            {/* Expanded body — full description, scientific brief, 3-tier
                comparison, add button. Insight section silently no-ops when
                the habit has no published insights, so it doesn't take vertical
                space for habits that haven't been authored yet. */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                {habit.description && (
                  <p className="text-sm text-gray-600 leading-relaxed">{habit.description}</p>
                )}

                <HabitInsightSection habitId={habit.id} />

                <div>
                  <p className="text-xs text-gray-500 mb-2">選擇難度：</p>
                  <div className="grid grid-cols-3 gap-2">
                    {enabledDiffs.map(diff => {
                      const isSelected = currentDiff === diff.key;
                      const diffConfig = habit.difficulties[diff.key];
                      const summary = summarizeDifficulty(diffConfig);
                      return (
                        <button
                          key={diff.key}
                          onClick={() => setSelectedDifficulty(prev => ({ ...prev, [habit.id]: diff.key }))}
                          className="flex flex-col items-center gap-0.5 px-2 py-2.5 rounded-lg transition-colors"
                          style={isSelected ? {
                            backgroundColor: diff.color === 'emerald' ? '#10b981' : diff.color === 'amber' ? '#f59e0b' : '#ef4444',
                            color: 'white'
                          } : {
                            backgroundColor: diff.color === 'emerald' ? '#ECFDF5' : diff.color === 'amber' ? '#FEF3C7' : '#FEE2E2',
                            color: diff.color === 'emerald' ? '#047857' : diff.color === 'amber' ? '#B45309' : '#B91C1C',
                          }}
                        >
                          <span className="text-xs font-bold">{diffConfig?.label || diff.label}</span>
                          {summary && (
                            <span className="text-[10px] leading-tight opacity-90 text-center">{summary}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {onAddCandidate ? (() => {
                  const addedAsCandidate = candidateAddedIds?.has(habit.id);
                  const picking = pickingId === `habit-${habit.id}`;
                  return (
                    <div className="grid grid-cols-2 gap-2">
                      {addedAsCandidate ? (
                        <button
                          type="button"
                          onClick={() => onRemoveCandidate?.(habit)}
                          disabled={picking}
                          aria-label="取消候選"
                          className="group flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-100 text-emerald-700 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <span className="flex items-center gap-1 group-hover:hidden"><Check size={15} /> 已加入候選</span>
                          <span className="hidden items-center gap-1 group-hover:flex"><X size={15} /> 取消候選</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onAddCandidate(habit, currentDiff)}
                          disabled={picking}
                          className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:cursor-not-allowed bg-white border border-gray-200 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50"
                        >
                          <Plus size={15} /> 加入候選
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectHabit(habit, currentDiff)}
                        disabled={picking || addedAsCandidate}
                        className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-emerald-500 text-white hover:bg-emerald-600"
                      >
                        {picking ? <Loader size={15} className="animate-spin" /> : <>直接加入 <ChevronRight size={15} /></>}
                      </button>
                    </div>
                  );
                })() : (
                  <button
                    onClick={() => onSelectHabit(habit, currentDiff)}
                    className="w-full flex items-center justify-center gap-1 text-sm text-white bg-emerald-500 px-3 py-2.5 rounded-xl font-bold hover:bg-emerald-600 transition-colors"
                  >
                    <Plus size={16} /> 加入此習慣
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
