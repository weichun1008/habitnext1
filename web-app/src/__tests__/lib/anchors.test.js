const {
  LIFE_MOMENTS,
  CUE_ORDER,
  cueOrderFor,
} = require('../../lib/anchors');

describe('CUE_ORDER', () => {
  it('has an entry for every label in LIFE_MOMENTS (except the 3 "any" group)', () => {
    // 30 anchors total; 3 are in `any` group (anytime) and map to 99
    // via cueOrderFor's default branch. CUE_ORDER itself holds 27.
    const anyGroup = LIFE_MOMENTS.filter(m => m.timeOfDay === 'any').map(m => m.label);
    const timed = LIFE_MOMENTS.filter(m => m.timeOfDay !== 'any');
    for (const m of timed) {
      expect(CUE_ORDER[m.label]).toBeDefined();
      expect(typeof CUE_ORDER[m.label]).toBe('number');
    }
    for (const label of anyGroup) {
      expect(CUE_ORDER[label]).toBeUndefined();
    }
  });

  it('orders 起床後 before 早餐前 before 午餐前 before 睡前躺上床後', () => {
    expect(CUE_ORDER['起床後']).toBeLessThan(CUE_ORDER['吃完早餐後']);
    expect(CUE_ORDER['吃完早餐後']).toBeLessThan(CUE_ORDER['午餐前']);
    expect(CUE_ORDER['午餐前']).toBeLessThan(CUE_ORDER['睡前躺上床後']);
  });
});

describe('cueOrderFor', () => {
  it('returns the CUE_ORDER value for a known built-in anchor', () => {
    expect(cueOrderFor('起床後')).toBe(CUE_ORDER['起床後']);
    expect(cueOrderFor('午餐前')).toBe(CUE_ORDER['午餐前']);
  });

  it('returns 99 for custom cue strings (not in CUE_ORDER)', () => {
    expect(cueOrderFor('週末外出前')).toBe(99);
    expect(cueOrderFor('我自己的時刻')).toBe(99);
  });

  it('returns 99 for the 3 "anytime" built-in anchors', () => {
    // These intentionally aren't in CUE_ORDER so they fall through to the
    // anytime bucket alongside custom cues.
    expect(cueOrderFor('排隊／等候時')).toBe(99);
    expect(cueOrderFor('打開社群媒體前')).toBe(99);
    expect(cueOrderFor('感到壓力時')).toBe(99);
  });

  it('returns 100 for null / undefined / empty string', () => {
    expect(cueOrderFor(null)).toBe(100);
    expect(cueOrderFor(undefined)).toBe(100);
    expect(cueOrderFor('')).toBe(100);
  });
});
