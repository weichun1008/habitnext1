'use client';

import React from 'react';
import HabitRatingRow from './HabitRatingRow';
import { QUADRANTS } from '@/lib/focusMap';

// QuadrantSection — header (label + advice) + list of HabitRatingRow.
// Props:
//   quadrantKey: 'golden' | 'background' | 'big_fish' | 'skip'
//   candidates: rows in this quadrant
//   ratings: Map<taskId, { impact, ability, checked }>
//   onUpdate(taskId, partial): merge partial into ratings[taskId]
const QuadrantSection = ({ quadrantKey, candidates, ratings, onUpdate }) => {
    if (!candidates || candidates.length === 0) return null;
    const meta = QUADRANTS[quadrantKey];
    const accent = quadrantKey === 'golden'
        ? 'bg-amber-50 border-amber-200'
        : 'bg-gray-50 border-gray-200';

    return (
        <section className={`mb-4 p-3 rounded-xl border ${accent}`}>
            <div className="mb-2">
                <h3 className="text-sm font-bold text-gray-800">{meta.label}</h3>
                <p className="text-[11px] text-gray-600 mt-0.5">{meta.advice}</p>
            </div>
            {candidates.map(c => {
                const r = ratings.get(c.id) || { impact: 3, ability: 3, checked: false };
                return (
                    <HabitRatingRow
                        key={c.id}
                        candidate={c}
                        impact={r.impact}
                        ability={r.ability}
                        checked={r.checked}
                        quadrant={quadrantKey}
                        onSliderChange={(axis, value) => onUpdate(c.id, { [axis]: value })}
                        onToggleChecked={(checked) => onUpdate(c.id, { checked })}
                    />
                );
            })}
        </section>
    );
};

export default QuadrantSection;
