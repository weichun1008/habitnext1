/**
 * TaskStreakList tests — Slice I
 */
import { render, screen } from '@testing-library/react';
import TaskStreakList from '@/components/stats/TaskStreakList';

describe('TaskStreakList', () => {
    const sample = [
        { taskId: 'A', title: '每天喝足 2500cc 水', identity: '我是個照顧自己身體的人', currentStreak: 18, longestStreak: 18 },
        { taskId: 'B', title: '午餐前先喝一杯水', identity: null, currentStreak: 7, longestStreak: 12 },
    ];

    test('renders all task rows with title, current and longest', () => {
        render(<TaskStreakList topTaskStreaks={sample} />);
        expect(screen.getByText('每天喝足 2500cc 水')).toBeInTheDocument();
        expect(screen.getByText('午餐前先喝一杯水')).toBeInTheDocument();
        expect(screen.getByText('18')).toBeInTheDocument();
        expect(screen.getByText('7')).toBeInTheDocument();
        expect(screen.getByText('最長 12')).toBeInTheDocument();
    });

    // identity subtitle removed 2026-06-03 (identity moved to Aspiration); the
    // streak list now shows title + streak only.
    test('does not render a per-task identity subtitle', () => {
        render(<TaskStreakList topTaskStreaks={sample} />);
        expect(screen.queryByText('我是個照顧自己身體的人')).not.toBeInTheDocument();
    });

    test('renders nothing when list is empty', () => {
        const { container } = render(<TaskStreakList topTaskStreaks={[]} />);
        expect(container.firstChild).toBeNull();
    });
});
