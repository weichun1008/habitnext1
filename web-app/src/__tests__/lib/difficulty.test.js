const { defaultDifficultyTier, resolveDifficulty } = require('../../lib/difficulty');

describe('defaultDifficultyTier', () => {
  it('maps ability 1-3 to beginner', () => {
    expect(defaultDifficultyTier(1)).toBe('beginner');
    expect(defaultDifficultyTier(3)).toBe('beginner');
  });
  it('maps 4 to intermediate, 5 to challenge', () => {
    expect(defaultDifficultyTier(4)).toBe('intermediate');
    expect(defaultDifficultyTier(5)).toBe('challenge');
  });
  it('defaults non-number to beginner', () => {
    expect(defaultDifficultyTier(null)).toBe('beginner');
    expect(defaultDifficultyTier(undefined)).toBe('beginner');
  });
});

describe('resolveDifficulty', () => {
  const habit = (d) => ({ difficulties: d });

  it('uses desired tier when enabled', () => {
    const h = habit({ beginner: { enabled: true, dailyTarget: 1 }, intermediate: { enabled: true, dailyTarget: 2 } });
    const r = resolveDifficulty(h, 4);
    expect(r.tier).toBe('intermediate');
    expect(r.config.dailyTarget).toBe(2);
  });

  it('clamps down to highest enabled tier <= desired', () => {
    const h = habit({ beginner: { enabled: true, dailyTarget: 1 } });
    const r = resolveDifficulty(h, 5);
    expect(r.tier).toBe('beginner');
  });

  it('falls up to lowest enabled when none <= desired', () => {
    const h = habit({ challenge: { enabled: true, dailyTarget: 9 } });
    const r = resolveDifficulty(h, 1);
    expect(r.tier).toBe('challenge');
    expect(r.config.dailyTarget).toBe(9);
  });

  it('handles missing difficulties', () => {
    expect(resolveDifficulty({}, 3)).toEqual({ tier: 'beginner', config: {} });
    expect(resolveDifficulty(null, 3)).toEqual({ tier: 'beginner', config: {} });
  });
});
