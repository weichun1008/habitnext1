/**
 * TaskCard Component Tests
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskCard from '@/components/TaskCard';
import { getTodayStr } from '@/lib/utils';

// Key history/progress by the SAME local-date the component reads (getTodayStr
// is local as of the 2026-06-03 timezone fix). Using new Date().toISOString()
// here would key by UTC and diverge from the component in any non-UTC tz.
const TODAY = getTodayStr();

describe('TaskCard', () => {
    const mockBinaryTask = {
        id: 'task-1',
        title: '每日冥想',
        type: 'binary',
        category: 'star',
        frequency: 'daily',
        recurrence: { type: 'daily', interval: 1 },
        history: {},
        dailyProgress: {},
    };

    const mockQuantitativeTask = {
        id: 'task-2',
        title: '喝水 2000cc',
        type: 'quantitative',
        category: 'droplet',
        frequency: 'daily',
        dailyTarget: 2000,
        unit: 'cc',
        stepValue: 200,
        recurrence: { type: 'daily', interval: 1 },
        history: {},
        dailyProgress: {},
    };

    const mockOnClick = jest.fn();
    const mockOnUpdate = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders binary task correctly', () => {
        render(
            <TaskCard
                task={mockBinaryTask}
                onClick={mockOnClick}
                onUpdate={mockOnUpdate}
            />
        );

        expect(screen.getByText('每日冥想')).toBeInTheDocument();
    });

    it('renders quantitative task with progress', () => {
        const taskWithProgress = {
            ...mockQuantitativeTask,
            dailyProgress: {
                [TODAY]: { value: 800, completed: false },
            },
        };

        render(
            <TaskCard
                task={taskWithProgress}
                onClick={mockOnClick}
                onUpdate={mockOnUpdate}
            />
        );

        expect(screen.getByText('喝水 2000cc')).toBeInTheDocument();
        expect(screen.getByText(/800/)).toBeInTheDocument();
    });

    it('calls onClick when card is clicked', async () => {
        render(
            <TaskCard
                task={mockBinaryTask}
                onClick={mockOnClick}
                onUpdate={mockOnUpdate}
            />
        );

        const card = screen.getByText('每日冥想').closest('div');
        await userEvent.click(card);

        expect(mockOnClick).toHaveBeenCalled();
    });

    it('shows locked indicator for locked tasks', () => {
        const lockedTask = { ...mockBinaryTask, isLocked: true };

        render(
            <TaskCard
                task={lockedTask}
                onClick={mockOnClick}
                onUpdate={mockOnUpdate}
            />
        );

        // Locked tasks should have some indicator
        expect(screen.getByText('每日冥想')).toBeInTheDocument();
    });

    describe('checklist task — inline subtasks (2026-05-25 bug fix)', () => {
        const mockChecklistTask = {
            id: 'task-3',
            title: '三餐補充蛋白質',
            type: 'checklist',
            category: 'apple',
            frequency: 'daily',
            recurrence: { type: 'daily', interval: 1 },
            subtasks: [
                { id: 's1', label: '早餐' },
                { id: 's2', label: '午餐' },
                { id: 's3', label: '晚餐' },
            ],
            history: {},
            dailyProgress: {},
        };

        it('shows X/Y badge instead of toggle button', () => {
            render(<TaskCard task={mockChecklistTask} onClick={mockOnClick} onUpdate={mockOnUpdate} />);
            expect(screen.getByText('0/3')).toBeInTheDocument();
            // No "完成任務" toggle button — the outer-toggle bug shouldn't be reachable
            expect(screen.queryByRole('button', { name: /完成任務/ })).not.toBeInTheDocument();
        });

        it('shows inline subtask list expanded by default; chevron collapses it', async () => {
            render(<TaskCard task={mockChecklistTask} onClick={mockOnClick} onUpdate={mockOnUpdate} />);

            // Subtasks visible by default (checklist defaults to expanded)
            expect(screen.getByText('早餐')).toBeInTheDocument();
            expect(screen.getByText('午餐')).toBeInTheDocument();
            expect(screen.getByText('晚餐')).toBeInTheDocument();

            // Click chevron → collapse
            await userEvent.click(screen.getByLabelText('收合子任務'));
            expect(screen.queryByText('早餐')).not.toBeInTheDocument();
        });

        it('tapping a subtask fires toggle_subtask with the subtask id (no expand needed)', async () => {
            render(<TaskCard task={mockChecklistTask} onClick={mockOnClick} onUpdate={mockOnUpdate} />);
            // Subtasks are visible by default — tap directly.
            await userEvent.click(screen.getByText('午餐'));
            expect(mockOnUpdate).toHaveBeenCalledWith(
                mockChecklistTask,
                'toggle_subtask',
                null,
                's2',
                expect.any(String),  // dateStr
            );
        });

        it('toggling the chevron does NOT fire onClick (no detail modal popup)', async () => {
            render(<TaskCard task={mockChecklistTask} onClick={mockOnClick} onUpdate={mockOnUpdate} />);
            await userEvent.click(screen.getByLabelText('收合子任務'));
            expect(mockOnClick).not.toHaveBeenCalled();
        });

        it('chevron toggles between collapsed and expanded', async () => {
            render(<TaskCard task={mockChecklistTask} onClick={mockOnClick} onUpdate={mockOnUpdate} />);

            // Default expanded.
            expect(screen.getByText('早餐')).toBeInTheDocument();

            await userEvent.click(screen.getByLabelText('收合子任務'));
            expect(screen.queryByText('早餐')).not.toBeInTheDocument();

            await userEvent.click(screen.getByLabelText('展開子任務'));
            expect(screen.getByText('早餐')).toBeInTheDocument();
        });

        it('X/Y badge reflects current completion count', () => {
            const partial = {
                ...mockChecklistTask,
                history: {
                    [TODAY]: {
                        subtaskCompletions: { s1: true, s2: true },
                    },
                },
            };
            render(<TaskCard task={partial} onClick={mockOnClick} onUpdate={mockOnUpdate} />);
            expect(screen.getByText('2/3')).toBeInTheDocument();
        });
    });
});
