// 旅程世界衍生：把已 resolve domain 的完成清單算成城市/領域結構。純函式、可調參數集中於頂部。
const { DOMAIN_NAMES } = require('@/lib/categoryToDomain');

const CITY_TIERS = [
  { tier: 'empty',      min: 0 },
  { tier: 'village',    min: 1 },
  { tier: 'town',       min: 10 },
  { tier: 'city',       min: 30 },
  { tier: 'metropolis', min: 80 },
  { tier: 'megacity',   min: 200 },
];
const FLAGSHIP_L2 = 10, FLAGSHIP_L3 = 30;
const BUILDING_EVERY = 5;
const PIN_LIMIT = 12;
const BUILDING_STYLES = 4;

function cityTier(total) {
  let t = 'empty';
  for (const row of CITY_TIERS) if (total >= row.min) t = row.tier;
  return t;
}
function flagshipLevel(count) {
  if (count >= FLAGSHIP_L3) return 3;
  if (count >= FLAGSHIP_L2) return 2;
  if (count >= 1) return 1;
  return 0;
}
function buildingCount(count) { return Math.floor(count / BUILDING_EVERY); }

function _hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0);
}
function buildingStyleIndex(domain, n) { return _hash(`${domain}#${n}`) % BUILDING_STYLES; }

function aggregateJourney(rows) {
  if (!rows || rows.length === 0) return { homeCity: null, cities: [] };
  const byCity = new Map();
  for (const r of rows) {
    if (!byCity.has(r.city)) byCity.set(r.city, { city: r.city, total: 0, domainCounts: {}, otherCount: 0, pins: [] });
    const c = byCity.get(r.city);
    c.total += 1;
    if (r.domain === 'other') c.otherCount += 1;
    else c.domainCounts[r.domain] = (c.domainCounts[r.domain] || 0) + 1;
    c.pins.push({ date: r.date, domain: r.domain, title: r.title });
  }
  const cities = [...byCity.values()].map((c) => {
    const domains = DOMAIN_NAMES
      .filter((d) => c.domainCounts[d] > 0)
      .map((d) => ({
        domain: d, count: c.domainCounts[d],
        flagshipLevel: flagshipLevel(c.domainCounts[d]),
        buildingCount: buildingCount(c.domainCounts[d]),
      }))
      .sort((a, b) => b.count - a.count);
    const pins = [...c.pins].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, PIN_LIMIT);
    return { city: c.city, total: c.total, tier: cityTier(c.total), domains, otherCount: c.otherCount, pins };
  }).sort((a, b) => b.total - a.total);
  return { homeCity: cities[0]?.city ?? null, cities };
}

module.exports = { cityTier, flagshipLevel, buildingCount, buildingStyleIndex, aggregateJourney };
