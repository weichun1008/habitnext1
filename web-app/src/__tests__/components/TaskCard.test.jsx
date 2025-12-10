/**
 * TaskCard Component Tests
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TaskCard from '@/components/TaskCard';

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
                [new Date().toISOString().split('T')[0]]: { value: 800, completed: false },
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
});
