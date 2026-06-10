'use client';

import React, { useMemo } from 'react';
import {
    ResponsiveContainer,
    ScatterChart,
    CartesianGrid,
    XAxis,
    YAxis,
    ReferenceArea,
    Scatter,
    Tooltip,
} from 'recharts';

import { useT } from '@/lib/i18n';

// FocusMap — Slice D
// Renders the habit-impact × habit-ability scatter for a single GENESIS+IO
// domain. See spec:
//   docs/superpowers/specs/2026-05-23-slice-d-focus-map-design.md
//
// Props:
//   - habits: Array<{ id, name, impact, ability, color, description? }>
//   - onSelect: (habit) => void  — fired when a dot is tapped
//
// Visual contract:
//   - 5×5 integer grid
//   - golden-quadrant (impact ≥ 4 AND ability ≥ 4) gets emerald wash
//   - co-located habits get deterministic jitter so dots don't overlap

// ---- jitter ----------------------------------------------------------------
//
// Multiple habits often share the same integer cell. We spread them across a
// small ring inside the cell so the user can pick them apart visually but
// the underlying integer score remains correct in the tooltip.
//
// Deterministic (id-seeded) so the chart doesn't shimmer between renders.

const JITTER_RADIUS = 0.18;

function hashStringToFloat(s) {
    // Simple deterministic hash → [0, 1)
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 0xffffffff;
}

export function applyJitter(habits) {
    // Group habits by integer cell; spread same-cell habits around a small ring.
    const groups = new Map();
    for (const h of habits) {
        const key = `${h.impact},${h.ability}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(h);
    }

    const out = [];
    for (const [, list] of groups) {
        if (list.length === 1) {
            out.push({ ...list[0], x: list[0].impact, y: list[0].ability });
            continue;
        }
        // Place on a ring around the cell center; angle seeded by habit id
        // so order is stable across renders.
        const sorted = [...list].sort((a, b) => hashStringToFloat(a.id) - hashStringToFloat(b.id));
        sorted.forEach((h, i) => {
            const angle = (2 * Math.PI * i) / sorted.length;
            out.push({
                ...h,
                x: h.impact + JITTER_RADIUS * Math.cos(angle),
                y: h.ability + JITTER_RADIUS * Math.sin(angle),
            });
        });
    }
    return out;
}

// ---- custom dot shape ------------------------------------------------------
//
// recharts' default Scatter dot renders a uniform colored circle. We use a
// custom shape so each dot carries the habit color + a data-habit-id for
// testing / click handling.

const DotShape = (props) => {
    const { cx, cy, payload, onPointClick } = props;
    if (cx == null || cy == null) return null;
    return (
        <circle
            cx={cx}
            cy={cy}
            r={8}
            fill={payload.color || '#10B981'}
            stroke="#fff"
            strokeWidth={2}
            data-habit-id={payload.id}
            style={{ cursor: 'pointer' }}
            onClick={() => onPointClick?.(payload)}
        />
    );
};

// ---- main component --------------------------------------------------------

const FocusMap = ({ habits = [], onSelect }) => {
    const { t } = useT();
    const dots = useMemo(() => applyJitter(habits || []), [habits]);

    const handleDotClick = (point) => {
        // Look up the original habit (without jitter) so callers get the
        // canonical object back, not the {x, y} jittered version.
        const original = habits.find(h => h.id === point.id);
        if (original) onSelect?.(original);
    };

    return (
        <div className="w-full" data-testid="focus-map">
            {/* Accessible label for the golden quadrant region — ReferenceArea
                's aria-label doesn't bubble out to the DOM, so we surface a
                visually-hidden element so screen readers + tests can find it. */}
            <span className="sr-only" aria-label={t('explore.goldenQuadrantAria')}>
                {t('explore.goldenQuadrantLabel')}
            </span>
            <ResponsiveContainer width="100%" height={320}>
                <ScatterChart margin={{ top: 20, right: 20, bottom: 36, left: 0 }}>
                    <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
                    <XAxis
                        type="number"
                        dataKey="x"
                        domain={[0.5, 5.5]}
                        ticks={[1, 3, 5]}
                        tick={{ fontSize: 11, fill: '#9CA3AF' }}
                        label={{
                            value: t('explore.impactAxis'),
                            position: 'insideBottom',
                            offset: -10,
                            style: { fill: '#6B7280', fontSize: 12 },
                        }}
                    />
                    <YAxis
                        type="number"
                        dataKey="y"
                        domain={[0.5, 5.5]}
                        ticks={[1, 3, 5]}
                        tick={{ fontSize: 11, fill: '#9CA3AF' }}
                        label={{
                            value: t('explore.abilityAxis'),
                            angle: -90,
                            position: 'insideLeft',
                            offset: 16,
                            style: { fill: '#6B7280', fontSize: 12 },
                        }}
                    />
                    {/* Golden quadrant (impact ≥ 4 AND ability ≥ 4) */}
                    <ReferenceArea
                        x1={3.5} x2={5.5} y1={3.5} y2={5.5}
                        fill="#10B981" fillOpacity={0.08}
                        stroke="#10B981" strokeOpacity={0.2}
                        aria-label={t('explore.goldenQuadrantAria')}
                    />
                    <Tooltip
                        cursor={false}
                        wrapperStyle={{ outline: 'none' }}
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
                        formatter={(_v, _n, p) => p?.payload?.name}
                        labelFormatter={() => ''}
                    />
                    <Scatter
                        data={dots}
                        shape={(p) => <DotShape {...p} onPointClick={handleDotClick} />}
                    />
                </ScatterChart>
            </ResponsiveContainer>

            {/* Wrapper carrying data-testid for unit tests + an accessible
                 fallback list of dots when SVG is hidden (screen readers). */}
            <div data-testid="focus-map-dots" className="sr-only">
                {dots.map(d => (
                    <button
                        key={d.id}
                        data-habit-id={d.id}
                        onClick={() => handleDotClick(d)}
                    >
                        {t('explore.dotLabel', { name: d.name, impact: d.impact, ability: d.ability })}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default FocusMap;
