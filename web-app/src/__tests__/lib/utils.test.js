/**
 * Tests for src/lib/utils.js — only the bits we changed in PR C.
 */

const { isCompletedOnDate } = require('../../lib/utils');

const checklistTask = (overrides = {}) => ({
    type: 'checklist',
    dailyTarget: 3,
    history: {},
    ...overrides,
});

describe('isCompletedOnDate — checklist tasks', () => {
    test('returns false when no history entry for the date', () => {
        const task = checklistTask({ history: {} });
        expect(isCompletedOnDate(task, '2026-05-22')).toBe(false);
    });

    test('returns false when value < dailyTarget (regression: was incorrectly true)', () => {
        const task = checklistTask({
            dailyTarget: 3,
            history: {
                '2026-05-22': { completed: false, value: 1, subtaskCompletions: { a: true } },
            },
        });
        expect(isCompletedOnDate(task, '2026-05-22')).toBe(false);
    });

    test('returns true when value == dailyTarget', () => {
        const task = checklistTask({
            dailyTarget: 3,
            history: {
                '2026-05-22': { completed: true, value: 3, subtaskCompletions: { a: true, b: true, c: true } },
            },
        });
        expect(isCompletedOnDate(task, '2026-05-22')).toBe(true);
    });

    test('returns true when value > dailyTarget', () => {
        const task = checklistTask({
            dailyTarget: 1,
            history: {
                '2026-05-22': { completed: true, value: 5, subtaskCompletions: { a: true } },
            },
        });
        expect(isCompletedOnDate(task, '2026-05-22')).toBe(true);
    });

    test('handles legacy number-only history entry', () => {
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
