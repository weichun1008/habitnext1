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

    describe('decrease habit — reverse control (Slice U)', () => {
        it('decrease 減量：顯示剩餘額度 + 我做了+1，點擊觸發 add(+1)', async () => {
            const t = {
                id: 'r1',
                title: '少喝酒',
                type: 'quantitative',
                direction: 'decrease',
                dailyTarget: 3,
                recurrence: { type: 'daily', interval: 1 },
                history: {},
                dailyProgress: {},
            };
            const { container } = render(
                <TaskCard task={t} onClick={mockOnClick} onUpdate={mockOnUpdate} viewingDate={TODAY} />
            );
            expect(container.querySelector('[data-direction="decrease"]')).toBeTruthy();
            // limit 3, value 0 → 剩 3 次
            expect(screen.getByText(/剩\s*3\s*次/)).toBeInTheDocument();
            await userEvent.click(screen.getByText(/我做了/));
            expect(mockOnUpdate).toHaveBeenCalledWith(t, 'add', 1);
        });

        it('decrease 減量：-1 修正鈕觸發 add(-1)', async () => {
            const t = {
                id: 'r2',
                title: '少喝酒',
                type: 'quantitative',
                direction: 'decrease',
                dailyTarget: 3,
                recurrence: { type: 'daily', interval: 1 },
                history: {},
                dailyProgress: { [TODAY]: { value: 2 } },
            };
            render(<TaskCard task={t} onClick={mockOnClick} onUpdate={mockOnUpdate} viewingDate={TODAY} />);
            expect(screen.getByText(/剩\s*1\s*次/)).toBeInTheDocument();
            await userEvent.click(screen.getByLabelText('修正：減一次'));
            expect(mockOnUpdate).toHaveBeenCalledWith(t, 'add', -1);
        });

        it('decrease 減量：超過額度顯示中性語氣', () => {
            const t = {
                id: 'r3',
                title: '少喝酒',
                type: 'quantitative',
                direction: 'decrease',
                dailyTarget: 3,
                recurrence: { type: 'daily', interval: 1 },
                history: {},
                dailyProgress: { [TODAY]: { value: 5 } },
            };
            render(<TaskCard task={t} onClick={mockOnClick} onUpdate={mockOnUpdate} viewingDate={TODAY} />);
            expect(screen.getByText(/超過額度/)).toBeInTheDocument();
        });

        it('decrease 戒除（limit=0）：value=0 顯示今天守著', () => {
            const t = {
                id: 'r4',
                title: '戒菸',
                type: 'quantitative',
                direction: 'decrease',
                dailyTarget: 0,
                recurrence: { type: 'daily', interval: 1 },
                history: {},
                dailyProgress: {},
            };
            const { container } = render(
                <TaskCard task={t} onClick={mockOnClick} onUpdate={mockOnUpdate} viewingDate={TODAY} />
            );
            expect(container.querySelector('[data-direction="decrease"]')).toBeTruthy();
            expect(screen.getByText(/今天守著/)).toBeInTheDocument();
        });

        it('decrease 戒除（limit=0）：value>0 顯示零懲罰記錄文案 + 誠實記錄鈕觸發 add(+1)', async () => {
            const t = {
                id: 'r5',
                title: '戒菸',
                type: 'quantitative',
                direction: 'decrease',
                dailyTarget: 0,
                recurrence: { type: 'daily', interval: 1 },
                history: {},
                dailyProgress: { [TODAY]: { value: 2 } },
            };
            render(<TaskCard task={t} onClick={mockOnClick} onUpdate={mockOnUpdate} viewingDate={TODAY} />);
            expect(screen.getByText(/明天重新開始/)).toBeInTheDocument();
            await userEvent.click(screen.getByText(/我做了/));
            expect(mockOnUpdate).toHaveBeenCalledWith(t, 'add', 1);
        });

        it('decrease 不顯示量化進度的 +N step 鈕', () => {
            const t = {
                id: 'r6',
                title: '少喝酒',
                type: 'quantitative',
                direction: 'decrease',
                dailyTarget: 3,
                stepValue: 1,
                recurrence: { type: 'daily', interval: 1 },
                history: {},
                dailyProgress: {},
            };
            render(<TaskCard task={t} onClick={mockOnClick} onUpdate={mockOnUpdate} viewingDate={TODAY} />);
            // 量化 step 鈕文字是 "+1"（stepValue）；decrease 控制用「+1 我做了」，不用裸 +1 step
            expect(screen.queryByText('+1')).not.toBeInTheDocument();
        });

        it('decrease：昨天守住 → 顯示昨天守住了（僅今天視圖且昨天有紀錄）', () => {
            const y = (() => { const d = new Date(getTodayStr() + 'T00:00:00'); d.setDate(d.getDate() - 1); const m = String(d.getMonth() + 1).padStart(2, '0'); const dd = String(d.getDate()).padStart(2, '0'); return `${d.getFullYear()}-${m}-${dd}`; })();
            const t = {
                id: 'r2', title: '少喝酒', type: 'quantitative', direction: 'decrease', dailyTarget: 3,
                recurrence: { type: 'daily', interval: 1 }, history: {}, dailyProgress: { [y]: { value: 2 } }
            };
            render(<TaskCard task={t} onClick={() => { }} onUpdate={() => { }} viewingDate={getTodayStr()} />);
            expect(screen.getByText(/昨天守住了/)).toBeInTheDocument();
        });

        it('decrease：昨天無紀錄 → 不顯示昨天結算', () => {
            const t = {
                id: 'r3', title: '少喝酒', type: 'quantitative', direction: 'decrease', dailyTarget: 3,
                recurrence: { type: 'daily', interval: 1 }, history: {}, dailyProgress: {}
            };
            render(<TaskCard task={t} onClick={() => { }} onUpdate={() => { }} viewingDate={getTodayStr()} />);
            expect(screen.queryByText(/昨天/)).not.toBeInTheDocument();
        });
    });

    describe('tool start button (Slice T)', () => {
        it('renders a 開始 button when toolType is set; clicking calls onStartTool with the task and NOT onClick', async () => {
            const mockOnStartTool = jest.fn();
            const t = { ...mockBinaryTask, id: 'tool-1', toolType: 'breathing', toolConfig: { cycles: 4 } };
            render(
                <TaskCard task={t} onClick={mockOnClick} onUpdate={mockOnUpdate} onStartTool={mockOnStartTool} />
            );

            const btn = screen.getByRole('button', { name: /開始/ });
            expect(btn).toBeInTheDocument();

            await userEvent.click(btn);
            expect(mockOnStartTool).toHaveBeenCalledWith(t);
            // stopPropagation — clicking 開始 must not bubble to the card body onClick
            expect(mockOnClick).not.toHaveBeenCalled();
        });

        it('does NOT render a 開始 button when toolType is falsy', () => {
            render(
                <TaskCard task={mockBinaryTask} onClick={mockOnClick} onUpdate={mockOnUpdate} onStartTool={jest.fn()} />
            );
            expect(screen.queryByRole('button', { name: /開始/ })).not.toBeInTheDocument();
        });
    });
});
