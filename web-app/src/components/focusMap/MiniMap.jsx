'use client';

import React from 'react';
import { quadrantOf } from '@/lib/focusMap';

// MiniMap — 80×80px focus-map preview. Each candidate becomes a tiny dot
// positioned by (ability=x, impact=y). The upper-right quadrant gets an
// amber tint to advertise 黃金行為.
//
// Props:
//   candidates: Array<{ id, userImpact, userAbility, officialHabit?: {impact, ability} }>
//   sliderSeedFor: function returning { impact, ability } per candidate
const MiniMap = ({ candidates, sliderSeedFor }) => {
    return (
        <div className="relative w-20 h-20 bg-gray-50 border border-gray-200 rounded-md flex-shrink-0">
            {/* Quadrant tint */}
            <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-amber-100/50 rounded-tr-md" />
            {/* Cross axes */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-300" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-300" />
            {/* Dots */}
            {candidates.map(c => {
                const seed = sliderSeedFor(c);
                // impact 1-5 → y (top=5 → 5%; bottom=1 → 95%)
                // ability 1-5 → x (left=1 → 5%; right=5 → 95%)
                const top  = `${5 + (5 - seed.impact) * 22.5}%`;
                const left = `${5 + (seed.ability - 1) * 22.5}%`;
                const q = quadrantOf(seed.impact, seed.ability);
                return (
                    <div
                        key={c.id}
                        className={`absolute w-2 h-2 rounded-full transition-all duration-200 ${q === 'golden' ? 'bg-amber-500' : 'bg-gray-400'}`}
                        style={{ top, left, transform: 'translate(-50%, -50%)' }}
                        aria-hidden
                    />
                );
            })}
            {/* Labels */}
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] text-gray-400">⬆影響</span>
            <span className="absolute -bottom-4 right-1 text-[9px] text-gray-400">易→</span>
        </div>
    );
};

export default MiniMap;
