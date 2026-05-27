const {
  QUADRANTS,
  quadrantOf,
  recommendDefaults,
  sliderSeedFor,
} = require('../../lib/focusMap');

describe('QUADRANTS', () => {
  it('has 4 entries with required fields', () => {
    expect(Object.keys(QUADRANTS).sort()).toEqual(['background', 'big_fish', 'golden', 'skip']);
    for (const q of Object.values(QUADRANTS)) {
      expect(typeof q.label).toBe('string');
      expect(typeof q.advice).toBe('string');
      expect(['recommended', 'optional', 'park', 'skip']).toContain(q.rec);
    }
  });
});

describe('quadrantOf', () => {
  it('returns golden for impact>=4 AND ability>=4', () => {
    expect(quadrantOf(5, 5)).toBe('golden');
    expect(quadrantOf(4, 4)).toBe('golden');
    expect(quadrantOf(4, 5)).toBe('golden');
  });

  it('returns background for impact<=3 AND ability>=4', () => {
    expect(quadrantOf(3, 4)).toBe('background');
    expect(quadrantOf(1, 5)).toBe('background');
  });

  it('returns big_fish for impact>=4 AND ability<=3', () => {
    expect(quadrantOf(4, 3)).toBe('big_fish');
    expect(quadrantOf(5, 1)).toBe('big_fish');
  });

  it('returns skip for impact<=3 AND ability<=3', () => {
    expect(quadrantOf(3, 3)).toBe('skip');
    expect(quadrantOf(1, 1)).toBe('skip');
  });

  it('clamps non-numeric to 3 (defensive)', () => {
    expect(quadrantOf(null, null)).toBe('skip');
    expect(quadrantOf(undefined, undefined)).toBe('skip');
  });
});

describe('recommendDefaults', () => {
  it('returns Set of golden quadrant task ids, capped at 3', () => {
    const candidates = [
      { id: 't1', userImpact: 5, userAbility: 5 },
      { id: 't2', userImpact: 5, userAbility: 4 },
      { id: 't3', userImpact: 4, userAbility: 5 },
      { id: 't4', userImpact: 4, userAbility: 4 },
      { id: 't5', userImpact: 2, userAbility: 5 },
      { id: 't6', userImpact: 5, userAbility: 2 },
    ];
    const result = recommendDefaults(candidates);
    expect(result.size).toBe(3);
    // Top 3 by sum: t1(10), t2(9), t3(9)
    expect(result.has('t1')).toBe(true);
    expect(result.has('t5')).toBe(false); // background
    expect(result.has('t6')).toBe(false); // big_fish
  });

  it('returns empty Set when no golden candidates', () => {
    const candidates = [{ id: 't1', userImpact: 2, userAbility: 2 }];
    expect(recommendDefaults(candidates).size).toBe(0);
  });

  it('handles empty input', () => {
    expect(recommendDefaults([]).size).toBe(0);
    expect(recommendDefaults(null).size).toBe(0);
  });

  it('uses fallback impact/ability when user values are null', () => {
    const candidates = [
      { id: 't1', userImpact: null, userAbility: null, officialHabit: { impact: 5, ability: 5 } },
      { id: 't2', userImpact: 3, userAbility: 3, officialHabit: { impact: 5, ability: 5 } },
    ];
    const result = recommendDefaults(candidates);
    expect(result.has('t1')).toBe(true);  // golden via fallback
    expect(result.has('t2')).toBe(false); // skip via user override
  });
});

describe('sliderSeedFor', () => {
  it('prefers userImpact/userAbility over fallback', () => {
    const c = { userImpact: 2, userAbility: 4, officialHabit: { impact: 5, ability: 5 } };
    expect(sliderSeedFor(c)).toEqual({ impact: 2, ability: 4 });
  });

  it('falls back to officialHabit values', () => {
    const c = { userImpact: null, userAbility: null, officialHabit: { impact: 4, ability: 3 } };
    expect(sliderSeedFor(c)).toEqual({ impact: 4, ability: 3 });
  });

  it('defaults to 3/3 when no source available', () => {
    expect(sliderSeedFor({})).toEqual({ impact: 3, ability: 3 });
    expect(sliderSeedFor({ userImpact: null, officialHabit: null })).toEqual({ impact: 3, ability: 3 });
  });
});
