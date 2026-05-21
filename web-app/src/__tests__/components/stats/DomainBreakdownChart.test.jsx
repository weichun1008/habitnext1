/**
 * DomainBreakdownChart tests — Slice I
 *
 * Recharts uses ResponsiveContainer which requires layout dimensions. We don't
 * assert on chart geometry — just on the section heading + empty-state behavior.
 */
import { render, screen } from '@testing-library/react';
import DomainBreakdownChart from '@/components/stats/DomainBreakdownChart';

describe('DomainBreakdownChart', () => {
    test('renders section heading when data is present', () => {
        render(<DomainBreakdownChart breakdown={[{ name: '飲食', color: '#0ea5e9', icon: 'Apple', order: 4, count: 5 }]} />);
        expect(screen.getByText('9 大健康面向分布')).toBeInTheDocument();
        expect(screen.getByText(/最近 30 天/)).toBeInTheDocument();
    });

    test('renders nothing when breakdown is empty', () => {
        const { container } = render(<DomainBreakdownChart breakdown={[]} />);
        expect(container.firstChild).toBeNull();
    });
});
