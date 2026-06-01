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

function nextTierProgress(total) {
  const tier = cityTier(total);
  const idx = CITY_TIERS.findIndex((row) => row.tier === tier);
  const next = CITY_TIERS[idx + 1];
  if (!next) return { tier, nextTier: null, remaining: 0 };
  return { tier, nextTier: next.tier, remaining: next.min - total };
}

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

// 確定性城市佈局：domain 各占一個扇區，flagship 錨在扇區內側，building 沿扇區外擴，
// generic 房子填中心附近。座標皆由 _hash seed 產生（同資料同佈局，禁用 Math.random）。
const VIEW_W = 320, VIEW_H = 240, CX = 160, CY = 134;

function _seededOffset(seedStr, radius) {
  const h = _hash(seedStr);
  const ang = (h % 360) * (Math.PI / 180);
  const r = radius * (0.55 + ((h >> 9) % 100) / 100 * 0.45);
  return { x: CX + Math.cos(ang) * r, y: CY + Math.sin(ang) * r * 0.62 };
}

function layoutCity(cityData) {
  const nodes = [];
  if (!cityData) return nodes;
  const domains = cityData.domains || [];
  domains.forEach((d, di) => {
    const baseAng = (di / Math.max(1, domains.length)) * Math.PI * 2;
    const fx = CX + Math.cos(baseAng) * 64, fy = CY + Math.sin(baseAng) * 64 * 0.62;
    nodes.push({ kind: 'flagship', domain: d.domain, level: d.flagshipLevel, x: fx, y: fy, scale: 1 });
    for (let b = 0; b < d.buildingCount; b++) {
      const off = _seededOffset(`${cityData.city}|${d.domain}|b${b}`, 96);
      nodes.push({ kind: 'building', domain: d.domain, styleIndex: buildingStyleIndex(d.domain, b), x: off.x, y: off.y, scale: 0.7 });
    }
  });
  const generic = Math.floor((cityData.otherCount || 0) / BUILDING_EVERY);
  for (let g = 0; g < generic; g++) {
    const off = _seededOffset(`${cityData.city}|generic|${g}`, 70);
    nodes.push({ kind: 'generic', domain: 'other', styleIndex: buildingStyleIndex('other', g), x: off.x, y: off.y, scale: 0.65 });
  }
  return nodes;
}

module.exports = { cityTier, flagshipLevel, buildingCount, buildingStyleIndex, aggregateJourney, layoutCity, nextTierProgress, VIEW_W, VIEW_H };
