const { visibleSubtasks, computeChecklistValue } = require('../../lib/subtasks');

describe('visibleSubtasks', () => {
  const subA = { id: 'a', label: '早餐', addedAt: '2026-05-10' };
  const subB = { id: 'b', label: '午餐', addedAt: '2026-05-10' };
  const subC = { id: 'c', label: '晚餐', addedAt: '2026-05-15', removedAt: '2026-05-20' };
  const subD = { id: 'd', label: '宵夜', addedAt: '2026-05-12', removedAt: '2026-05-14' };
  const task = { subtasks: [subA, subB, subC, subD] };

  it('returns empty array when subtasks missing', () => {
    expect(visibleSubtasks({}, '2026-05-10')).toEqual([]);
    expect(visibleSubtasks({ subtasks: null }, '2026-05-10')).toEqual([]);
    expect(visibleSubtasks({ subtasks: [] }, '2026-05-10')).toEqual([]);
  });

  it('excludes subtasks added after the date', () => {
    expect(visibleSubtasks(task, '2026-05-09')).toEqual([]);
    expect(visibleSubtasks(task, '2026-05-10')).toEqual([subA, subB]);
    expect(visibleSubtasks(task, '2026-05-13')).toEqual([subA, subB, subD]);
  });

  it('excludes subtasks removed on or before the date', () => {
    expect(visibleSubtasks(task, '2026-05-13').some(s => s.id === 'd')).toBe(true);
    expect(visibleSubtasks(task, '2026-05-14').some(s => s.id === 'd')).toBe(false);
    expect(visibleSubtasks(task, '2026-05-15').some(s => s.id === 'd')).toBe(false);
  });

  it('preserves subtask object order from task.subtasks array', () => {
    const result = visibleSubtasks(task, '2026-05-16');
    expect(result.map(s => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('treats missing addedAt as always-added (legacy data safety)', () => {
    const legacy = { subtasks: [{ id: 'legacy', label: '舊資料' }] };
    expect(visibleSubtasks(legacy, '2026-05-10').length).toBe(1);
  });
});

describe('computeChecklistValue', () => {
  it('returns 0 for null/undefined/non-object', () => {
    expect(computeChecklistValue(null)).toBe(0);
    expect(computeChecklistValue(undefined)).toBe(0);
    expect(computeChecklistValue('foo')).toBe(0);
    expect(computeChecklistValue(0)).toBe(0);
  });

  it('returns 0 for empty object', () => {
    expect(computeChecklistValue({})).toBe(0);
  });

  it('counts strictly-true values', () => {
    expect(computeChecklistValue({ a: true })).toBe(1);
    expect(computeChecklistValue({ a: true, b: true, c: true })).toBe(3);
  });

  it('ignores false / falsy / truthy-but-not-true values', () => {
    expect(computeChecklistValue({ a: true, b: false })).toBe(1);
    expect(computeChecklistValue({ a: true, b: null, c: 'true', d: 1 })).toBe(1);
  });
});
