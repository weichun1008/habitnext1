/**
 * TaskFormModal — Slice U habit-direction tests.
 *
 * Focus: the 習慣方向 selector (正向 / 減量 / 戒除) and the submit payload
 * contract. 減量/戒除 are reverse habits: direction:'decrease',
 * type:'quantitative', dailyTarget = the daily limit (0 for 戒除).
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskFormModal from '@/components/TaskFormModal';

describe('TaskFormModal — habit direction (Slice U)', () => {
    const baseProps = {
        isOpen: true,
        onClose: jest.fn(),
        onDelete: jest.fn(),
        defaultDate: '2026-06-08',
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the three direction options', () => {
        render(<TaskFormModal {...baseProps} onSave={jest.fn()} />);
        expect(screen.getByText('習慣方向')).toBeInTheDocument();
        expect(screen.getByText('正向')).toBeInTheDocument();
        expect(screen.getByText('減量')).toBeInTheDocument();
        expect(screen.getByText('戒除')).toBeInTheDocument();
    });

    it('defaults to 正向 and submits direction:"increase" with the picked type', () => {
        const onSave = jest.fn();
        render(<TaskFormModal {...baseProps} onSave={onSave} />);

        fireEvent.click(screen.getByText('儲存'));

        expect(onSave).toHaveBeenCalledTimes(1);
        const payload = onSave.mock.calls[0][0];
        expect(payload.direction).toBe('increase');
        expect(payload.type).toBe('binary');
    });

    it('減量 → submit payload has direction:"decrease", type:"quantitative", dailyTarget = entered limit', () => {
        const onSave = jest.fn();
        render(<TaskFormModal {...baseProps} onSave={onSave} />);

        fireEvent.click(screen.getByText('減量'));

        // The 每日上限 input appears once 減量 is selected.
        const limitInput = screen.getByLabelText('每日上限');
        fireEvent.change(limitInput, { target: { value: '3' } });

        fireEvent.click(screen.getByText('儲存'));

        const payload = onSave.mock.calls[0][0];
        expect(payload.direction).toBe('decrease');
        expect(payload.type).toBe('quantitative');
        expect(payload.dailyTarget).toBe(3);
        expect(payload.unit).toBe('次');
    });

    it('戒除 → submit payload has direction:"decrease", type:"quantitative", dailyTarget 0', () => {
        const onSave = jest.fn();
        render(<TaskFormModal {...baseProps} onSave={onSave} />);

        fireEvent.click(screen.getByText('戒除'));
        fireEvent.click(screen.getByText('儲存'));

        const payload = onSave.mock.calls[0][0];
        expect(payload.direction).toBe('decrease');
        expect(payload.type).toBe('quantitative');
        expect(payload.dailyTarget).toBe(0);
    });

    it('hides the type picker for reverse habits and restores it for 正向', () => {
        render(<TaskFormModal {...baseProps} onSave={jest.fn()} />);

        // 正向 default: type picker visible.
        expect(screen.getByText('一般 (達成/未達成)')).toBeInTheDocument();

        fireEvent.click(screen.getByText('減量'));
        expect(screen.queryByText('一般 (達成/未達成)')).not.toBeInTheDocument();

        fireEvent.click(screen.getByText('正向'));
        expect(screen.getByText('一般 (達成/未達成)')).toBeInTheDocument();
    });

    it('loads existing direction into the form on edit', () => {
        const onSave = jest.fn();
        render(
            <TaskFormModal
                {...baseProps}
                onSave={onSave}
                initialData={{
                    id: 'task-x',
                    title: '少喝手搖',
                    type: 'quantitative',
                    category: 'star',
                    frequency: 'daily',
                    direction: 'decrease',
                    dailyTarget: 2,
                    unit: '次',
                    recurrence: {},
                    reminder: {},
                    subtasks: [],
                }}
            />
        );

        // 減量 card should be active → the 每日上限 input is present, prefilled.
        const limitInput = screen.getByLabelText('每日上限');
        expect(limitInput).toHaveValue(2);

        fireEvent.click(screen.getByText('儲存'));
        const payload = onSave.mock.calls[0][0];
        expect(payload.direction).toBe('decrease');
        expect(payload.dailyTarget).toBe(2);
    });
});
