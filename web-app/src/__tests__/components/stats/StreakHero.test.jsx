/**
 * StreakHero tests — Slice I
 */
import { render, screen } from '@testing-library/react';
import StreakHero from '@/components/stats/StreakHero';

describe('StreakHero', () => {
    test('renders 0 streak with seed copy', () => {
        render(<StreakHero overall={{ currentStreak: 0, longestStreak: 0, todayCompleted: false }} />);
        expect(screen.getByText('0')).toBeInTheDocument();
        expect(screen.getByText(/從 1 開始/)).toBeInTheDocument();
    });

    test('renders streak with longest record', () => {
        render(<StreakHero overall={{ currentStreak: 12, longestStreak: 28, todayCompleted: true }} />);
        expect(screen.getByText('12')).toBeInTheDocument();
        expect(screen.getByText('28')).toBeInTheDocument();
    });

    test('renders 100 streak without broken layout', () => {
        render(<StreakHero overall={{ currentStreak: 100, longestStreak: 100, todayCompleted: true }} />);
        expect(screen.getAllByText('100').length).toBeGreaterThan(0);
    });

    test('nudges user when today not yet completed and streak is alive', () => {
        render(<StreakHero overall={{ currentStreak: 5, longestStreak: 5, todayCompleted: false }} />);
        expect(screen.getByText(/今天還沒打卡/)).toBeInTheDocument();
    });
});
