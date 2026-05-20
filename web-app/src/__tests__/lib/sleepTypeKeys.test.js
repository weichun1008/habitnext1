const {
  SLEEP_TYPE_PROFILES,
  deriveSleepTypeFromCategory,
  deriveSleepDefaultIdentity,
} = require('../../lib/sleepTypeKeys');

describe('SLEEP_TYPE_PROFILES', () => {
  it('has 4 sleep types with required fields', () => {
    expect(Object.keys(SLEEP_TYPE_PROFILES).sort()).toEqual(['hormone', 'metabolic', 'rhythm', 'stress']);
    for (const p of Object.values(SLEEP_TYPE_PROFILES)) {
      expect(typeof p.label).toBe('string');
      expect(typeof p.categorySlug).toBe('string');
      expect(p.categorySlug.startsWith('sleep_')).toBe(true);
      expect(typeof p.iconName).toBe('string');
      expect(typeof p.identity).toBe('string');
    }
  });

  it('uses sleep-specific identities', () => {
    expect(SLEEP_TYPE_PROFILES.stress.identity).toBe('我是個照顧大腦放鬆的人');
    expect(SLEEP_TYPE_PROFILES.rhythm.identity).toBe('我是個尊重生理節律的人');
    expect(SLEEP_TYPE_PROFILES.metabolic.identity).toBe('我是個照顧代謝健康的人');
    expect(SLEEP_TYPE_PROFILES.hormone.identity).toBe('我是個照顧週期身體的人');
  });
});

describe('deriveSleepTypeFromCategory', () => {
  it('extracts sleep type from sleep_<key> category strings', () => {
    expect(deriveSleepTypeFromCategory('sleep_stress')).toBe('stress');
    expect(deriveSleepTypeFromCategory('sleep_rhythm')).toBe('rhythm');
  });

  it('returns null for unknown / non-sleep categories', () => {
    expect(deriveSleepTypeFromCategory('daisy')).toBeNull();
    expect(deriveSleepTypeFromCategory('sleep_unknown')).toBeNull();
    expect(deriveSleepTypeFromCategory('')).toBeNull();
    expect(deriveSleepTypeFromCategory(null)).toBeNull();
    expect(deriveSleepTypeFromCategory(undefined)).toBeNull();
  });
});

describe('deriveSleepDefaultIdentity', () => {
  it('returns the type identity when sleepTypeKey matches', () => {
    expect(deriveSleepDefaultIdentity('stress')).toBe('我是個照顧大腦放鬆的人');
    expect(deriveSleepDefaultIdentity('hormone')).toBe('我是個照顧週期身體的人');
  });

  it('returns null for unknown / null', () => {
    expect(deriveSleepDefaultIdentity(null)).toBeNull();
    expect(deriveSleepDefaultIdentity(undefined)).toBeNull();
    expect(deriveSleepDefaultIdentity('UNKNOWN')).toBeNull();
  });
});
