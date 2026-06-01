const { CITIES, nearestCity, searchCities } = require('../../lib/cities');

describe('CITIES', () => {
  it('is a non-empty array of {name, lat, lng, country}', () => {
    expect(Array.isArray(CITIES)).toBe(true);
    expect(CITIES.length).toBeGreaterThan(30);
    for (const c of CITIES) {
      expect(typeof c.name).toBe('string');
      expect(typeof c.lat).toBe('number');
      expect(typeof c.lng).toBe('number');
      expect(typeof c.country).toBe('string');
    }
  });
  it('includes 台北 and 東京', () => {
    const names = CITIES.map(c => c.name);
    expect(names).toContain('台北');
    expect(names).toContain('東京');
  });
});

describe('nearestCity', () => {
  it('maps coords near Taipei 101 to 台北', () => {
    expect(nearestCity(25.034, 121.564)).toBe('台北');
  });
  it('maps coords near Tokyo Station to 東京', () => {
    expect(nearestCity(35.681, 139.767)).toBe('東京');
  });
  it('returns the closest city even for in-between coords (never null for valid input)', () => {
    const r = nearestCity(24.0, 121.0);
    expect(typeof r).toBe('string');
    expect(r.length).toBeGreaterThan(0);
  });
  it('returns null for invalid input', () => {
    expect(nearestCity(null, null)).toBeNull();
    expect(nearestCity(undefined, 121)).toBeNull();
    expect(nearestCity('a', 'b')).toBeNull();
  });
});

describe('searchCities', () => {
  it('matches by substring', () => {
    expect(searchCities('台').some(c => c.name === '台北')).toBe(true);
    expect(searchCities('東京').some(c => c.name === '東京')).toBe(true);
  });
  it('returns [] for empty query', () => {
    expect(searchCities('')).toEqual([]);
    expect(searchCities(null)).toEqual([]);
  });
  it('caps results at 20', () => {
    expect(searchCities('a').length).toBeLessThanOrEqual(20);
  });
});
