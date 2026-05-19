const {
  USER_TYPE_PROFILES,
  GENERIC_IDENTITIES,
  IDENTITY_MAX_LENGTH,
  deriveDefaultIdentity,
} = require('../../lib/typeKeys');

describe('typeKeys', () => {
  it('exposes the 4 flower profiles with label + identity', () => {
    expect(Object.keys(USER_TYPE_PROFILES).sort()).toEqual(['daisy', 'orchid', 'rose', 'sunflower']);
    for (const profile of Object.values(USER_TYPE_PROFILES)) {
      expect(typeof profile.label).toBe('string');
      expect(typeof profile.identity).toBe('string');
    }
  });

  it('exposes 4 generic identities', () => {
    expect(GENERIC_IDENTITIES).toHaveLength(4);
    GENERIC_IDENTITIES.forEach(s => expect(typeof s).toBe('string'));
  });

  it('exposes a 40-character max length', () => {
    expect(IDENTITY_MAX_LENGTH).toBe(40);
  });
});

describe('deriveDefaultIdentity', () => {
  it('returns the type identity when typeKey matches a profile', () => {
    expect(deriveDefaultIdentity('rose')).toBe(USER_TYPE_PROFILES.rose.identity);
    expect(deriveDefaultIdentity('daisy')).toBe(USER_TYPE_PROFILES.daisy.identity);
  });

  it('returns null when typeKey is unknown / null / undefined / empty', () => {
    expect(deriveDefaultIdentity(null)).toBeNull();
    expect(deriveDefaultIdentity(undefined)).toBeNull();
    expect(deriveDefaultIdentity('')).toBeNull();
    expect(deriveDefaultIdentity('UNKNOWN')).toBeNull();
  });
});
