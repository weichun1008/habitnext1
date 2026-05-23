"use client";

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { Plus, ChevronDown, ChevronUp, List as ListIcon, Crosshair } from 'lucide-react';
import IconRenderer from '../IconRenderer';
import { CATEGORY_CONFIG } from '@/lib/constants';

// FocusMap is dynamically imported — keeps recharts off this view's First
// Load JS, kicks in only when the user actually flips to the map view.
const FocusMap = dynamic(() => import('./FocusMap'), {
    ssr: false,
    loading: () => (
        <div className="text-center py-12 text-gray-400">載入地圖…</div>
    ),
});

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
}) {
  const [expandedId, setExpandedId] = useState(null);
  // 'list' (default) shows the existing accordion; 'map' swaps in FocusMap.
  // Toggle state lives here so flipping doesn't lose the expanded habit.
  const [viewMode, setViewMode] = useState('list');

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

  // Build the data slice the map needs from the existing habits prop.
  // HabitCategory.color isn't on the habit object; default to a neutral
  // emerald so dots are always visible even before per-domain colors flow.
  const mapHabits = habits.map(h => ({
    id: h.id,
    name: h.name,
    impact: typeof h.impact === 'number' ? h.impact : 3,
    ability: typeof h.ability === 'number' ? h.ability : 3,
    color: '#10B981',
  }));

  const handleMapSelect = (mapHabit) => {
    // Tap a dot → switch back to list view with that habit auto-expanded,
    // so the user lands on the same accordion row + difficulty picker
    // they would have used in list mode.
    setExpandedId(mapHabit.id);
    setViewMode('list');
  };

  return (
    <>
      {/* View-mode toggle — chip switcher. Order: 清單 (default) | 焦點地圖. */}
      <div className="flex items-center gap-1 mb-3 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setViewMode('list')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
            viewMode === 'list' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
          aria-pressed={viewMode === 'list'}
        >
          <ListIcon size={14} />
          清單
        </button>
        <button
          type="button"
          onClick={() => setViewMode('map')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
            viewMode === 'map' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
          aria-pressed={viewMode === 'map'}
        >
          <Crosshair size={14} />
          焦點地圖
        </button>
      </div>

      {viewMode === 'map' ? (
        <div>
          <FocusMap habits={mapHabits} onSelect={handleMapSelect} />
          <p className="text-xs text-gray-500 mt-2 px-1 leading-relaxed">
            點選右上角（高影響 × 高容易）的習慣開始，最容易看到效果。
          </p>
        </div>
      ) : (
        <ListBody
          habits={habits}
          expandedId={expandedId}
          toggleExpand={toggleExpand}
          selectedDifficulty={selectedDifficulty}
          setSelectedDifficulty={setSelectedDifficulty}
          onSelectHabit={onSelectHabit}
        />
      )}
    </>
  );
}

// ListBody — the existing accordion rendering, factored out so the view-mode
// toggle stays at the same DOM level above both list + map.
function ListBody({
  habits,
  expandedId,
  toggleExpand,
  selectedDifficulty,
  setSelectedDifficulty,
  onSelectHabit,
}) {
  return (
    <div className="space-y-3">
      {habits.map(habit => {
        const enabledDiffs = getEnabledDifficulties(habit);
        const currentDiff = selectedDifficulty[habit.id] || getDefaultDifficulty(habit);
        const config = CATEGORY_CONFIG[habit.category] || CATEGORY_CONFIG['star'];
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
                  <IconRenderer category={habit.category} size={18} />
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

            {/* Expanded body — full description, 3-tier comparison, add button */}
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3">
                {habit.description && (
                  <p className="text-sm text-gray-600 leading-relaxed">{habit.description}</p>
                )}

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

                <button
                  onClick={() => onSelectHabit(habit, currentDiff)}
                  className="w-full flex items-center justify-center gap-1 text-sm text-white bg-emerald-500 px-3 py-2.5 rounded-xl font-bold hover:bg-emerald-600 transition-colors"
                >
                  <Plus size={16} /> 加入此習慣
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
