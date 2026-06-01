const { layoutCity } = require('@/lib/journeyWorld');
const cityData = {
  city: '台北', total: 70, tier: 'metropolis',
  domains: [
    { domain: '運動', count: 70, flagshipLevel: 3, buildingCount: 14 },
    { domain: '飲食', count: 12, flagshipLevel: 2, buildingCount: 2 },
  ],
  otherCount: 6, pins: [],
};
describe('layoutCity', () => {
  const a = layoutCity(cityData);
  it('確定性：兩次呼叫相同', () => expect(layoutCity(cityData)).toEqual(a));
  it('每個 domain 出一個 flagship', () => {
    const flags = a.filter((n) => n.kind === 'flagship');
    expect(flags.length).toBe(2);
    expect(flags.find((f) => f.domain === '運動').level).toBe(3);
  });
  it('building 數量 = 各 domain buildingCount 總和', () => {
    const builds = a.filter((n) => n.kind === 'building');
    expect(builds.length).toBe(14 + 2);
  });
  it('generic 房子數 = floor(otherCount/5)', () => {
    expect(a.filter((n) => n.kind === 'generic').length).toBe(Math.floor(6 / 5));
  });
  it('每個節點有 x,y,scale 數字', () => {
    a.forEach((n) => { expect(typeof n.x).toBe('number'); expect(typeof n.y).toBe('number'); expect(typeof n.scale).toBe('number'); });
  });
});
