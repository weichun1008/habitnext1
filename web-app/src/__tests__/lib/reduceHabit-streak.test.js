const { keptStreak } = require('../../lib/reduceHabit');

describe('keptStreak', () => {
  it('counts consecutive kept days up to today (quit, limit 0; no entry = kept)', () => {
    const dp = { '2026-06-03': { value: 2 } }; // over on 06-03
    expect(keptStreak({ limit: 0, dailyProgress: dp, history: {}, todayStr: '2026-06-06', startStr: '2026-06-01' })).toBe(3); // 06,05,04
  });

  it('stops at first over-limit day (today over → 0)', () => {
    const dp = { '2026-06-06': { value: 1 } };
    expect(keptStreak({ limit: 0, dailyProgress: dp, todayStr: '2026-06-06', startStr: '2026-06-01' })).toBe(0);
  });

  it('reduce: value within limit counts as kept', () => {
    const dp = { '2026-06-06': { value: 1 }, '2026-06-05': { value: 1 }, '2026-06-04': { value: 3 } };
    expect(keptStreak({ limit: 1, dailyProgress: dp, todayStr: '2026-06-06', startStr: '2026-06-01' })).toBe(2);
  });

  it('does not count before startStr', () => {
    expect(keptStreak({ limit: 0, dailyProgress: {}, todayStr: '2026-06-06', startStr: '2026-06-05' })).toBe(2); // 06,05
  });

  it('reads history fallback', () => {
    const h = { '2026-06-04': 5 }; // over
    expect(keptStreak({ limit: 0, dailyProgress: {}, history: h, todayStr: '2026-06-06', startStr: '2026-06-01' })).toBe(2);
  });

  it('returns 0 on empty/missing today', () => {
    expect(keptStreak({})).toBe(0);
    expect(keptStreak({ limit: 0, todayStr: undefined, startStr: '2026-06-01' })).toBe(0);
  });
});
