/**
 * WeeklyHeatmap tests — Slice I
 */
import { render } from '@testing-library/react';
import WeeklyHeatmap from '@/components/stats/WeeklyHeatmap';

const makeHeatmap = (count) =>
    Array.from({ length: 84 }, (_, i) => ({
        date: `2026-02-${String(27 + i).padStart(2, '0')}`,  // dummy, only date string matters as a key
        count,
    }));

describe('WeeklyHeatmap', () => {
    test('renders exactly 84 day cells when given a full 12-week dataset', () => {
        const { container } = render(<WeeklyHeatmap heatmap={makeHeatmap(0)} />);
        // 84 inner cells (w-3 h-3) — exclude legend swatches which carry no title
        const dayCells = container.querySelectorAll('[title]');
        expect(dayCells.length).toBe(84);
    });

    test('uses 4 distinct color buckets based on count', () => {
        // Build 84 unique dates and assign counts in 4 blocks of 21.
        const counts = [
            ...Array(21).fill(0),
            ...Array(21).fill(1),
            ...Array(21).fill(3),
            ...Array(21).fill(5),
        ];
        const mixed = counts.map((count, i) => ({
            date: `2026-${String(Math.floor(i / 30) + 3).padStart(2, '0')}-${String((i % 30) + 1).padStart(2, '0')}`,
            count,
        }));
        const { container } = render(<WeeklyHeatmap heatmap={mixed} />);
        expect(container.querySelectorAll('.bg-gray-100').length).toBeGreaterThanOrEqual(21);
        expect(container.querySelectorAll('.bg-emerald-200').length).toBeGreaterThanOrEqual(21);
        expect(container.querySelectorAll('.bg-emerald-400').length).toBeGreaterThanOrEqual(21);
        expect(container.querySelectorAll('.bg-emerald-600').length).toBeGreaterThanOrEqual(21);
    });

    test('renders nothing when heatmap is empty', () => {
        const { container } = render(<WeeklyHeatmap heatmap={[]} />);
        expect(container.firstChild).toBeNull();
    });
});
