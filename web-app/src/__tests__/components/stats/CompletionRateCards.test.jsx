/**
 * CompletionRateCards tests — Slice I
 */
import { render, screen } from '@testing-library/react';
import CompletionRateCards from '@/components/stats/CompletionRateCards';

describe('CompletionRateCards', () => {
    test('renders 7- and 30-day labels and rounded percentages', () => {
        render(<CompletionRateCards rate={{ last7: 0.78, last30: 0.6543 }} />);
        expect(screen.getByText(/最近 7 天/)).toBeInTheDocument();
        expect(screen.getByText(/最近 30 天/)).toBeInTheDocument();
        expect(screen.getByText('78')).toBeInTheDocument();
        expect(screen.getByText('65')).toBeInTheDocument();
    });

    test('handles missing rate as 0%', () => {
        render(<CompletionRateCards rate={undefined} />);
        const zeros = screen.getAllByText('0');
        expect(zeros.length).toBe(2);
    });
});
