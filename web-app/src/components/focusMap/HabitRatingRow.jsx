'use client';

import React from 'react';
import { Check, AlertTriangle } from 'lucide-react';

// HabitRatingRow — one row inside a QuadrantSection.
// Renders: checkbox, name + icon, two sliders, warning text when user
// checks a non-golden row.
//
// Props:
//   candidate: { id, title, officialHabit?: { icon, name } }
//   impact, ability: current slider values (1-5)
//   checked: bool
//   quadrant: 'golden' | 'background' | 'big_fish' | 'skip'
//   onSliderChange(axis, value): axis is 'impact' | 'ability'
//   onToggleChecked(checked): bool
const WARNING_BY_QUADRANT = {
    big_fish: 'Fogg：先建立基本技能再來；現在啟動很容易放棄',
    skip:     'Fogg：低影響+難執行 — 啟動會耗 willpower',
    background: null, // 'optional', no warning
    golden:    null,
};

const HabitRatingRow = ({ candidate, impact, ability, checked, quadrant, onSliderChange, onToggleChecked }) => {
    const icon = candidate.officialHabit?.icon || '⭐';
    const warning = checked && WARNING_BY_QUADRANT[quadrant];

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-3 mb-2">
            <div className="flex items-start gap-2">
                <button
                    type="button"
                    onClick={() => onToggleChecked(!checked)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        checked
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-gray-300 hover:border-emerald-400'
                    }`}
                    aria-pressed={checked}
                    aria-label={`${checked ? '取消勾選' : '勾選'} ${candidate.title}`}
                >
                    {checked && <Check size={12} strokeWidth={3} className="text-white" />}
                </button>
                <span className="text-base flex-shrink-0">{icon}</span>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{candidate.title}</p>
                </div>
            </div>

            {/* Sliders */}
            <div className="mt-2 ml-7">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-gray-500 w-10">影響</span>
                    <input
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={impact}
                        onChange={e => onSliderChange('impact', Number(e.target.value))}
                        className="flex-1 accent-emerald-500"
                        aria-label="影響度"
                    />
                    <span className="text-xs font-bold text-gray-700 w-4 text-right">{impact}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 w-10">執行</span>
                    <input
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={ability}
                        onChange={e => onSliderChange('ability', Number(e.target.value))}
                        className="flex-1 accent-blue-500"
                        aria-label="執行容易度"
                    />
                    <span className="text-xs font-bold text-gray-700 w-4 text-right">{ability}</span>
                </div>
            </div>

            {/* Warning if user checks a non-golden row */}
            {warning && (
                <div className="mt-2 ml-7 p-2 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-1.5">
                    <AlertTriangle size={11} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-700 leading-snug">{warning}</p>
                </div>
            )}
        </div>
    );
};

export default HabitRatingRow;
