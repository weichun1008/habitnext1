/**
 * FocusMap tests — Slice D
 *
 * Recharts renders into SVG inside a ResponsiveContainer; jsdom doesn't
 * report layout dimensions so the ResponsiveContainer collapses to 0×0.
 * We work around this by stubbing ResponsiveContainer to render its child
 * at a fixed size (see __mocks__ note in jest.setup.js or inline mock here).
 */

// Force recharts ResponsiveContainer to render at a fixed size so jsdom
// doesn't collapse it to 0×0 (which causes the chart to render nothing).
jest.mock('recharts', () => {
    const Original = jest.requireActual('recharts');
    return {
        ...Original,
        ResponsiveContainer: ({ children }) => (
            <div style={{ width: 400, height: 400 }}>{children}</div>
        ),
    };
});

import { render, screen, fireEvent } from '@testing-library/react';
import FocusMap from '../../components/explore/FocusMap';

const fixtures = [
    { id: 'a', name: '高影響高能力 — 黃金行為', impact: 5, ability: 5, color: '#10B981' },
    { id: 'b', name: '中庸',                    impact: 3, ability: 3, color: '#3B82F6' },
    { id: 'c', name: '低影響低能力',            impact: 1, ability: 1, color: '#EF4444' },
    { id: 'd', name: '同格疊點 A',              impact: 5, ability: 5, color: '#10B981' },
    { id: 'e', name: '同格疊點 B',              impact: 5, ability: 5, color: '#10B981' },
];

describe('FocusMap', () => {
    test('renders one dot per habit', () => {
        const { container } = render(<FocusMap habits={fixtures} onSelect={() => {}} />);
        // FocusMap renders each habit dot inside a <g data-testid="focus-map-dots">
        const layer = container.querySelector('[data-testid="focus-map-dots"]');
        expect(layer).toBeTruthy();
        const dots = layer.querySelectorAll('[data-habit-id]');
        expect(dots.length).toBe(fixtures.length);
    });

    test('renders the golden-quadrant aria label', () => {
        render(<FocusMap habits={fixtures} onSelect={() => {}} />);
        expect(screen.getByLabelText(/黃金行為/)).toBeInTheDocument();
    });

    test('clicking a dot fires onSelect with that habit', () => {
        const onSelect = jest.fn();
        const { container } = render(<FocusMap habits={fixtures} onSelect={onSelect} />);
        const dot = container.querySelector('[data-habit-id="b"]');
        expect(dot).toBeTruthy();
        fireEvent.click(dot);
        expect(onSelect).toHaveBeenCalledTimes(1);
        expect(onSelect).toHaveBeenCalledWith(fixtures[1]);
    });

    test('applyJitter spreads co-located habits around the cell center', () => {
        // applyJitter is exported for direct testing — recharts rendering in
        // jsdom doesn't compute SVG layout so we test the algorithm directly.
        const { applyJitter } = require('../../components/explore/FocusMap');
        const colocated = [
            { id: 'x', name: 'X', impact: 5, ability: 5, color: '#000' },
            { id: 'y', name: 'Y', impact: 5, ability: 5, color: '#000' },
            { id: 'z', name: 'Z', impact: 5, ability: 5, color: '#000' },
        ];
        const jittered = applyJitter(colocated);
        expect(jittered).toHaveLength(3);
        // No two dots should land on exactly the same (x, y).
        const seen = new Set();
        for (const p of jittered) {
            const key = `${p.x.toFixed(4)},${p.y.toFixed(4)}`;
            expect(seen.has(key)).toBe(false);
            seen.add(key);
        }
        for (const p of jittered) {
            expect(Math.abs(p.x - 5)).toBeLessThanOrEqual(0.25);
            expect(Math.abs(p.y - 5)).toBeLessThanOrEqual(0.25);
        }
    });

    test('applyJitter leaves single-occupant cells untouched', () => {
        const { applyJitter } = require('../../components/explore/FocusMap');
        const lone = [{ id: 'a', name: 'A', impact: 4, ability: 2, color: '#000' }];
        const jittered = applyJitter(lone);
        expect(jittered[0].x).toBe(4);
        expect(jittered[0].y).toBe(2);
    });

    test('renders gracefully when habits is empty', () => {
        const { container } = render(<FocusMap habits={[]} onSelect={() => {}} />);
        // Should still render the chart frame; just no dot circles.
        const layer = container.querySelector('[data-testid="focus-map-dots"]');
        expect(layer).toBeTruthy();
        const dots = layer.querySelectorAll('[data-habit-id]');
        expect(dots.length).toBe(0);
    });
});
