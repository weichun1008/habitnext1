const {
  QUADRANTS,
  DURATION_OPTIONS,
  HABIT_FORMATION_SCIENCE,
  quadrantOf,
  recommendDefaults,
  sliderSeedFor,
  buildBatchPayload,
} = require('../../lib/focusMap');

describe('QUADRANTS', () => {
  it('has 4 entries with required fields', () => {
    expect(Object.keys(QUADRANTS).sort()).toEqual(['background', 'big_fish', 'golden', 'skip']);
    for (const q of Object.values(QUADRANTS)) {
      expect(typeof q.label).toBe('string');
      expect(typeof q.advice).toBe('string');
      expect(typeof q.iconKey).toBe('string');
      expect(typeof q.color).toBe('string');
      expect(['recommended', 'optional', 'park', 'skip']).toContain(q.rec);
    }
  });

  it('contains no "Fogg" wording anywhere', () => {
    const blob = JSON.stringify(QUADRANTS);
    expect(blob.toLowerCase()).not.toContain('fogg');
  });

  it('uses plain Chinese labels (no emoji prefix)', () => {
    expect(QUADRANTS.golden.label).toBe('值得優先做');
    expect(QUADRANTS.big_fish.label).toBe('值得挑戰');
    expect(QUADRANTS.background.label).toBe('順手加碼');
    expect(QUADRANTS.skip.label).toBe('建議先跳過');
  });
});

describe('DURATION_OPTIONS', () => {
  it('has 4 options with exactly one recommended (66 days)', () => {
    expect(DURATION_OPTIONS).toHaveLength(4);
    const rec = DURATION_OPTIONS.filter(o => o.recommended);
    expect(rec).toHaveLength(1);
    expect(rec[0].value).toBe(66);
  });

  it('includes an unlimited option with value null', () => {
    const unlimited = DURATION_OPTIONS.find(o => o.value === null);
    expect(unlimited).toBeTruthy();
    expect(unlimited.label).toContain('不設限');
  });

  it('values are 21 / 66 / 90 / null', () => {
    expect(DURATION_OPTIONS.map(o => o.value)).toEqual([21, 66, 90, null]);
  });
});

describe('HABIT_FORMATION_SCIENCE', () => {
  it('exposes the 66-day median fact without inventing precision', () => {
    expect(HABIT_FORMATION_SCIENCE.medianDays).toBe(66);
    expect(HABIT_FORMATION_SCIENCE.rangeDays).toEqual([18, 254]);
    expect(typeof HABIT_FORMATION_SCIENCE.summary).toBe('string');
  });
});

describe('buildBatchPayload', () => {
  const candidates = [
    { id: 'a' }, { id: 'b' }, { id: 'c' },
  ];
  const ratings = new Map([
    ['a', { impact: 5, ability: 5 }], // golden
    ['b', { impact: 5, ability: 2 }], // big_fish
    ['c', { impact: 2, ability: 2 }], // skip
  ]);

  it('marks added ids as activate with targetDays, archives the rest (clears the pool)', () => {
    const added = new Set(['a', 'b']);
    const payload = buildBatchPayload(candidates, ratings, added, 66);
    const byId = Object.fromEntries(payload.map(p => [p.taskId, p]));
    expect(byId.a).toEqual({ taskId: 'a', userImpact: 5, userAbility: 5, action: 'activate', targetDays: 66 });
    expect(byId.b).toEqual({ taskId: 'b', userImpact: 5, userAbility: 2, action: 'activate', targetDays: 66 });
    expect(byId.c).toEqual({ taskId: 'c', userImpact: 2, userAbility: 2, action: 'archive' });
  });

  it('passes targetDays: null (不設限) through for activated tasks', () => {
    const payload = buildBatchPayload(candidates, new Map([['a', { impact: 5, ability: 5 }]]), new Set(['a']), null);
    expect(payload[0]).toEqual({ taskId: 'a', userImpact: 5, userAbility: 5, action: 'activate', targetDays: null });
  });

  it('archives every un-added candidate so the pool is cleared after a session', () => {
    const payload = buildBatchPayload(candidates, ratings, new Set(), 66);
    expect(payload.every(p => p.action === 'archive')).toBe(true);
  });

  it('defaults missing ratings to 3/3 and archives when not added', () => {
    const payload = buildBatchPayload([{ id: 'z' }], new Map(), new Set(), 66);
    expect(payload[0]).toMatchObject({ taskId: 'z', userImpact: 3, userAbility: 3, action: 'archive' });
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
