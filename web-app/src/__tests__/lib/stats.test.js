// Unit tests for src/lib/stats.js — Slice I stats aggregation
// Pure functions, no Prisma. See spec §8.1.

const { computeStats } = require('../../lib/stats');

// Fixture helpers
const h = (taskId, date, completed) => ({ taskId, date, completed });
const t = (id, title, category, identity = null) => ({ id, title, category, identity });
const c = (name, color, order) => ({ name, color, icon: 'Dna', order });

describe('computeStats', () => {
  const today = '2026-05-21';

  test('empty input yields zeros and empty arrays, no throw', () => {
    const s = computeStats([], [], [], today);
    expect(s.overall.currentStreak).toBe(0);
    expect(s.overall.longestStreak).toBe(0);
    expect(s.overall.todayCompleted).toBe(false);
    expect(s.completionRate.last7).toBe(0);
    expect(s.completionRate.last30).toBe(0);
    expect(s.domainBreakdown).toEqual([]);
    expect(s.heatmap).toHaveLength(84);
    expect(s.heatmap.every(d => d.count === 0)).toBe(true);
    expect(s.topTaskStreaks).toEqual([]);
  });

  test('5 consecutive completed days ending today → currentStreak = 5', () => {
    const tasks = [t('A', 'Drink water', '飲食')];
    const history = ['2026-05-17','2026-05-18','2026-05-19','2026-05-20','2026-05-21']
      .map(d => h('A', d, true));
    const s = computeStats(history, tasks, [c('飲食','#0ea5e9',4)], today);
    expect(s.overall.currentStreak).toBe(5);
    expect(s.overall.todayCompleted).toBe(true);
  });

  test('5 consecutive days ending YESTERDAY, today empty → currentStreak still 5 (grace)', () => {
    const tasks = [t('A', 'Drink water', '飲食')];
    const history = ['2026-05-16','2026-05-17','2026-05-18','2026-05-19','2026-05-20']
      .map(d => h('A', d, true));
    const s = computeStats(history, tasks, [c('飲食','#0ea5e9',4)], today);
    expect(s.overall.currentStreak).toBe(5);
    expect(s.overall.todayCompleted).toBe(false);
  });

  test('streak broken by gap before today → currentStreak resets to 1', () => {
    const tasks = [t('A', 'X', '飲食')];
    const history = [
      h('A', '2026-05-15', true),  // gap on 16-19
      h('A', '2026-05-20', false), // explicit miss
      h('A', '2026-05-21', true),
    ];
    const s = computeStats(history, tasks, [c('飲食','#0ea5e9',4)], today);
    expect(s.overall.currentStreak).toBe(1);
  });

  test('completionRate.last7 approximation: 5 tasks × 7 days = 35 expected, 21 completed → 0.6', () => {
    const tasks = ['A','B','C','D','E'].map(id => t(id, id, '飲食'));
    const dates = ['2026-05-15','2026-05-16','2026-05-17','2026-05-18','2026-05-19','2026-05-20','2026-05-21'];
    const history = [];
    let nCompleted = 21;
    for (const taskId of ['A','B','C','D','E']) {
      for (const d of dates) {
        if (nCompleted > 0) { history.push(h(taskId, d, true)); nCompleted--; }
        else history.push(h(taskId, d, false));
      }
    }
    const s = computeStats(history, tasks, [c('飲食','#0ea5e9',4)], today);
    expect(Math.round(s.completionRate.last7 * 100)).toBe(60);
  });

  test('per-task topStreaks sorted by currentStreak desc, then longestStreak desc', () => {
    const tasks = [
      t('A', 'Long current', '飲食'),
      t('B', 'Short current high longest', '飲食'),
      t('C', 'Same current as A but lower longest', '飲食'),
    ];
    const history = [
      // A: current=3, longest=3
      ...['2026-05-19','2026-05-20','2026-05-21'].map(d => h('A', d, true)),
      // B: current=1, longest=5
      h('B', '2026-05-21', true),
      ...['2026-04-01','2026-04-02','2026-04-03','2026-04-04','2026-04-05'].map(d => h('B', d, true)),
      // C: current=3, longest=3
      ...['2026-05-19','2026-05-20','2026-05-21'].map(d => h('C', d, true)),
    ];
    const s = computeStats(history, tasks, [c('飲食','#0ea5e9',4)], today);
    // A and C tied on currentStreak=3 and longestStreak=3 — secondary tie-break is title asc
    // ('Long current' < 'Same current as A but lower longest'), then B (current=1)
    expect(s.topTaskStreaks.map(x => x.taskId)).toEqual(['A', 'C', 'B']);
  });

  test('domainBreakdown follows HabitCategory.order, only counts last 30 days', () => {
    const tasks = [t('A', 'X', '飲食'), t('B', 'Y', '運動')];
    const history = [
      h('A', '2026-05-21', true),     // in window
      h('A', '2026-05-20', true),     // in window
      h('B', '2026-05-19', true),     // in window
      h('A', '2026-01-01', true),     // outside 30d → ignored
    ];
    const categories = [c('運動','#22c55e',5), c('飲食','#0ea5e9',4)];
    const s = computeStats(history, tasks, categories, today);
    expect(s.domainBreakdown.map(d => d.name)).toEqual(['飲食', '運動']);
    expect(s.domainBreakdown.find(d => d.name === '飲食').count).toBe(2);
    expect(s.domainBreakdown.find(d => d.name === '運動').count).toBe(1);
  });

  test('orphan history rows (task deleted) still feed overall stats but not topTaskStreaks', () => {
    const tasks = [];
    const history = [h('A', '2026-05-21', true)];
    const s = computeStats(history, tasks, [], today);
    expect(s.overall.currentStreak).toBe(1);
    expect(s.topTaskStreaks).toEqual([]);
  });

  test('heatmap covers exactly the last 84 days and counts completed rows per date', () => {
    const tasks = [t('A', 'X', '飲食'), t('B', 'Y', '飲食')];
    const history = [
      h('A', '2026-05-21', true),
      h('B', '2026-05-21', true),
      h('A', '2026-05-20', true),
      h('B', '2026-05-20', false), // not counted
    ];
    const s = computeStats(history, tasks, [c('飲食','#0ea5e9',4)], today);
    expect(s.heatmap).toHaveLength(84);
    expect(s.heatmap[s.heatmap.length - 1]).toEqual({ date: '2026-05-21', count: 2 });
    expect(s.heatmap[s.heatmap.length - 2]).toEqual({ date: '2026-05-20', count: 1 });
    // earliest date should be 83 days before today
    expect(s.heatmap[0].date).toBe('2026-02-27');
  });
});
