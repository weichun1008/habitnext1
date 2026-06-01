const {
  cityTier, flagshipLevel, buildingCount, buildingStyleIndex, aggregateJourney,
} = require('@/lib/journeyWorld');

describe('cityTier', () => {
  it('邊界', () => {
    expect(cityTier(0)).toBe('empty');
    expect(cityTier(1)).toBe('village');
    expect(cityTier(9)).toBe('village');
    expect(cityTier(10)).toBe('town');
    expect(cityTier(29)).toBe('town');
    expect(cityTier(30)).toBe('city');
    expect(cityTier(79)).toBe('city');
    expect(cityTier(80)).toBe('metropolis');
    expect(cityTier(199)).toBe('metropolis');
    expect(cityTier(200)).toBe('megacity');
  });
});
describe('flagshipLevel 封頂 3', () => {
  it('邊界', () => {
    expect(flagshipLevel(0)).toBe(0);
    expect(flagshipLevel(1)).toBe(1);
    expect(flagshipLevel(9)).toBe(1);
    expect(flagshipLevel(10)).toBe(2);
    expect(flagshipLevel(29)).toBe(2);
    expect(flagshipLevel(30)).toBe(3);
    expect(flagshipLevel(999)).toBe(3);
  });
});
describe('buildingCount 不封頂', () => {
  it('每 5 次 +1', () => {
    expect(buildingCount(0)).toBe(0);
    expect(buildingCount(4)).toBe(0);
    expect(buildingCount(5)).toBe(1);
    expect(buildingCount(70)).toBe(14);
  });
});
describe('buildingStyleIndex 確定性', () => {
  it('同輸入同輸出、落在 0..3', () => {
    const a = buildingStyleIndex('運動', 3);
    expect(buildingStyleIndex('運動', 3)).toBe(a);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThanOrEqual(3);
  });
});
describe('aggregateJourney', () => {
  const rows = [
    { city: '台北', domain: '運動', date: '2026-06-01', title: '跑步' },
    { city: '台北', domain: '運動', date: '2026-06-02', title: '跑步' },
    { city: '台北', domain: '飲食', date: '2026-06-02', title: '記錄午餐' },
    { city: '台北', domain: 'other',  date: '2026-06-03', title: '雜項' },
    { city: '東京', domain: '心靈', date: '2026-05-20', title: '冥想' },
  ];
  const out = aggregateJourney(rows);
  it('homeCity = 完成最多的城市', () => expect(out.homeCity).toBe('台北'));
  it('城市依 total 由大到小', () => {
    expect(out.cities[0].city).toBe('台北');
    expect(out.cities[0].total).toBe(4);
    expect(out.cities[1].city).toBe('東京');
  });
  it('domains 不含 other，other 折進 otherCount', () => {
    const tp = out.cities[0];
    expect(tp.domains.find(d => d.domain === 'other')).toBeUndefined();
    expect(tp.otherCount).toBe(1);
    const sport = tp.domains.find(d => d.domain === '運動');
    expect(sport.count).toBe(2);
    expect(sport.flagshipLevel).toBe(1);
  });
  it('pins 帶 date/domain/title，無座標', () => {
    const pin = out.cities[0].pins[0];
    expect(pin).toHaveProperty('date');
    expect(pin).toHaveProperty('domain');
    expect(pin).toHaveProperty('title');
    expect(pin).not.toHaveProperty('lat');
  });
  it('空輸入 → homeCity null、cities []', () => {
    expect(aggregateJourney([])).toEqual({ homeCity: null, cities: [] });
  });
});
