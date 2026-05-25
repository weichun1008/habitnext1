/**
 * Tests for src/lib/utils.js — checklist completion + date helpers.
 *
 * Contract (post-2026-05-25 v3): checklist task is "completed" for a date iff
 * ALL visible subtasks on that date have completions[id] === true. dailyTarget
 * is ignored for checklist tasks — it's degenerate for this task type. The
 * legacy number/bool history shape still honors dailyTarget, since those rows
 * pre-date subtask-level tracking.
 */

const { isCompletedOnDate } = require('../../lib/utils');

const checklistTask = (overrides = {}) => ({
    type: 'checklist',
    dailyTarget: 3,
    subtasks: [
        { id: 'a', label: 'A' },
        { id: 'b', label: 'B' },
        { id: 'c', label: 'C' },
    ],
    history: {},
    ...overrides,
});

describe('isCompletedOnDate — checklist tasks', () => {
    test('returns false when no history entry for the date', () => {
        const task = checklistTask({ history: {} });
        expect(isCompletedOnDate(task, '2026-05-22')).toBe(false);
    });

    test('returns false when only some subtasks are checked (the bug)', () => {
        // User-reported regression: 1 of 3 lit the whole task because
        // dailyTarget happened to be 1.
        const task = checklistTask({
            dailyTarget: 1,
            history: {
                '2026-05-22': {
                    completed: false,
                    value: 1,
                    subtaskCompletions: { a: true },
                },
            },
        });
        expect(isCompletedOnDate(task, '2026-05-22')).toBe(false);
    });

    test('returns true only when every visible subtask is checked', () => {
        const task = checklistTask({
            history: {
                '2026-05-22': {
                    completed: true,
                    value: 3,
                    subtaskCompletions: { a: true, b: true, c: true },
                },
            },
        });
        expect(isCompletedOnDate(task, '2026-05-22')).toBe(true);
    });

    test('ignores dailyTarget — only the all-checked rule matters', () => {
        // Even with dailyTarget set very high (or very low), completion is
        // pinned to the visible-subtask set.
        const allChecked = checklistTask({
            dailyTarget: 999,
            history: {
                '2026-05-22': { subtaskCompletions: { a: true, b: true, c: true } },
            },
        });
        expect(isCompletedOnDate(allChecked, '2026-05-22')).toBe(true);

        const partialLowTarget = checklistTask({
            dailyTarget: 1,
            history: {
                '2026-05-22': { subtaskCompletions: { a: true, b: true } },
            },
        });
        expect(isCompletedOnDate(partialLowTarget, '2026-05-22')).toBe(false);
    });

    test('returns false when subtasks list is empty (degenerate task)', () => {
        const task = checklistTask({
            subtasks: [],
            history: { '2026-05-22': { subtaskCompletions: {} } },
        });
        expect(isCompletedOnDate(task, '2026-05-22')).toBe(false);
    });

    test('respects subtask addedAt — items not yet added are not required', () => {
        const task = checklistTask({
            subtasks: [
                { id: 'a', label: 'A', addedAt: '2026-05-22' },
                // 'b' was added later, so on 2026-05-22 only 'a' counts.
                { id: 'b', label: 'B', addedAt: '2026-06-01' },
            ],
            history: {
                '2026-05-22': { subtaskCompletions: { a: true } },
            },
        });
        expect(isCompletedOnDate(task, '2026-05-22')).toBe(true);
    });

    test('respects subtask removedAt — retired items are not required after removal date', () => {
        const task = checklistTask({
            subtasks: [
                { id: 'a', label: 'A' },
                // 'b' was retired before 2026-05-22.
                { id: 'b', label: 'B', removedAt: '2026-05-20' },
            ],
            history: {
                '2026-05-22': { subtaskCompletions: { a: true } },
            },
        });
        expect(isCompletedOnDate(task, '2026-05-22')).toBe(true);
    });

    test('handles legacy number-only history entry (pre-Slice-F shape)', () => {
        const task = checklistTask({
            dailyTarget: 3,
            history: { '2026-05-22': 2 },
        });
        expect(isCompletedOnDate(task, '2026-05-22')).toBe(false);

        const taskMet = checklistTask({
            dailyTarget: 3,
            history: { '2026-05-22': 3 },
        });
        expect(isCompletedOnDate(taskMet, '2026-05-22')).toBe(true);
    });
});

describe('isCompletedOnDate — quantitative tasks', () => {
    test('still works for quantitative tasks (unchanged path)', () => {
        const task = {
            type: 'quantitative',
            dailyTarget: 2000,
            dailyProgress: { '2026-05-22': { value: 1500 } },
        };
        expect(isCompletedOnDate(task, '2026-05-22')).toBe(false);

        const taskMet = {
            type: 'quantitative',
            dailyTarget: 2000,
            dailyProgress: { '2026-05-22': { value: 2500 } },
        };
        expect(isCompletedOnDate(taskMet, '2026-05-22')).toBe(true);
    });
});

describe('isCompletedOnDate — binary tasks', () => {
    test('still works for binary tasks (unchanged path)', () => {
        const task = {
            type: 'binary',
            history: { '2026-05-22': true },
        };
        expect(isCompletedOnDate(task, '2026-05-22')).toBe(true);

        const taskNone = { type: 'binary', history: {} };
        expect(isCompletedOnDate(taskNone, '2026-05-22')).toBe(false);
    });
});
