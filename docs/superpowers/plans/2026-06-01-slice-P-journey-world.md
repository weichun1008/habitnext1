# Slice P — 旅程世界（建構你的城市）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在側邊欄新增「旅程」分頁，把使用者有座標的習慣完成累積渲染成一座會越蓋越美、玩不完的城市（唯讀、零 schema 變更、純 SVG、零地圖 API）。

**Architecture:** 兩個純函式 lib（`categoryToDomain` 正規化髒 category、`journeyWorld` 衍生等級/數量/確定性佈局）→ 一個唯讀聚合 API（座標不出後端）→ JourneyView 容器（世界第1層 / 城市第2層）+ 9 領域旗艦 SVG。所有等級/數量從既有 `TaskHistory` + `Task.category` 算出。

**Tech Stack:** Next.js 14 App Router · React 18 · Tailwind · lucide-react（無 emoji UI）· Prisma 5（只讀）· Jest + RTL · lib 用 CommonJS `module.exports`。

**Spec:** `docs/superpowers/specs/2026-06-01-slice-P-journey-world-design.md`
**視覺正典（lift SVG 形狀用）:** `docs/superpowers/notes/assets/2026-06-01-sliceP-domain-landmarks.html`、`...-build-your-city.html`、`...-endless-growth.html`

---

## 前置：worktree 已建立
分支 `feat/slice-P-journey-world`（off `origin/main` 含 Slice O）。worktree 尚未 `npm install` → 第一步先裝。

- [ ] **Step 0: 安裝相依**
Run（在 `web-app/`）: `npm install`，然後 `cp` 主庫 `.env.local`（若缺）。確認 `npx prisma generate` 成功、`npx jest` 綠。

---

## Task 1: `categoryToDomain` lib（髒值 → 9 domain）

**Files:**
- Create: `web-app/src/lib/categoryToDomain.js`
- Test: `web-app/src/__tests__/lib/categoryToDomain.test.js`

- [ ] **Step 1: 寫失敗測試**
```js
const { categoryToDomain, DOMAIN_NAMES } = require('@/lib/categoryToDomain');

describe('categoryToDomain', () => {
  it('9 個 domain 名原樣回傳', () => {
    DOMAIN_NAMES.forEach(d => expect(categoryToDomain(d)).toBe(d));
  });
  it('icon key 反查 domain', () => {
    expect(categoryToDomain('moon')).toBe('壓力與睡眠');
    expect(categoryToDomain('apple')).toBe('飲食');
    expect(categoryToDomain('dumbbell')).toBe('運動');
    expect(categoryToDomain('briefcase')).toBe('職涯與平衡');
    expect(categoryToDomain('sun')).toBe('環境');
    expect(categoryToDomain('users')).toBe('社交互動');
    expect(categoryToDomain('yoga')).toBe('心靈');
    expect(categoryToDomain('book')).toBe('認知與智慧');
    expect(categoryToDomain('pill')).toBe('基因與腸道');
  });
  it('emoji 盡力對應', () => {
    expect(categoryToDomain('🏃')).toBe('運動');
    expect(categoryToDomain('🧘')).toBe('心靈');
  });
  it('best-effort 額外 icon key', () => {
    expect(categoryToDomain('footprints')).toBe('運動');
    expect(categoryToDomain('droplet')).toBe('飲食');
  });
  it('未知 / 空 → other', () => {
    expect(categoryToDomain('star')).toBe('other');
    expect(categoryToDomain('')).toBe('other');
    expect(categoryToDomain(null)).toBe('other');
    expect(categoryToDomain(undefined)).toBe('other');
  });
});
```

- [ ] **Step 2: 跑測試確認失敗** — `npx jest categoryToDomain` → FAIL（module not found）。

- [ ] **Step 3: 實作**
```js
// 髒 Task.category（domain 名 / icon key / emoji）正規化成 9 大 GENESIS+IO domain，
// 對不到回 'other'。地圖聚合前每筆完成都先過這裡。
const DOMAIN_NAMES = [
  '基因與腸道', '環境', '飲食', '運動', '壓力與睡眠',
  '社交互動', '心靈', '認知與智慧', '職涯與平衡',
];

// DOMAIN_TO_ICON_KEY（constants.js）的反查；額外補幾個常見 icon key。
const ICON_TO_DOMAIN = {
  pill: '基因與腸道', sun: '環境', apple: '飲食', dumbbell: '運動',
  moon: '壓力與睡眠', users: '社交互動', yoga: '心靈',
  book: '認知與智慧', briefcase: '職涯與平衡',
  // best-effort 延伸
  footprints: '運動', droplet: '飲食',
};

const EMOJI_TO_DOMAIN = {
  '🏃': '運動', '💪': '運動', '🧘': '心靈',
  '🍽': '飲食', '🍱': '飲食', '🍎': '飲食',
  '😴': '壓力與睡眠', '🌙': '壓力與睡眠', '📖': '認知與智慧',
};

function categoryToDomain(category) {
  if (!category) return 'other';
  if (DOMAIN_NAMES.includes(category)) return category;
  if (ICON_TO_DOMAIN[category]) return ICON_TO_DOMAIN[category];
  if (EMOJI_TO_DOMAIN[category]) return EMOJI_TO_DOMAIN[category];
  return 'other';
}

module.exports = { categoryToDomain, DOMAIN_NAMES };
```

- [ ] **Step 4: 跑測試確認通過** — `npx jest categoryToDomain` → PASS。
- [ ] **Step 5: Commit** — `feat(lib): categoryToDomain — normalize dirty Task.category to 9 GENESIS+IO domains (Slice P)`

---

## Task 2: `journeyWorld` 衍生 lib（tier / flagship / 建築數 / 聚合）

**Files:**
- Create: `web-app/src/lib/journeyWorld.js`
- Test: `web-app/src/__tests__/lib/journeyWorld.test.js`

- [ ] **Step 1: 寫失敗測試**
```js
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
```

- [ ] **Step 2: 跑測試確認失敗** — `npx jest journeyWorld` → FAIL。

- [ ] **Step 3: 實作**
```js
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

// 確定性 hash（無 Math.random）
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
```

- [ ] **Step 4: 跑測試確認通過** — `npx jest journeyWorld` → PASS。
- [ ] **Step 5: Commit** — `feat(lib): journeyWorld — city tier/flagship/building-count + aggregateJourney (Slice P)`

---

## Task 3: `layoutCity` 確定性佈局（加進 journeyWorld.js）

**Files:**
- Modify: `web-app/src/lib/journeyWorld.js`
- Test: `web-app/src/__tests__/lib/journeyWorld.layout.test.js`

- [ ] **Step 1: 寫失敗測試**
```js
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
```

- [ ] **Step 2: 跑測試確認失敗** — `npx jest journeyWorld.layout` → FAIL（layoutCity undefined）。

- [ ] **Step 3: 實作（append 到 journeyWorld.js，並加進 exports）**
```js
// 確定性城市佈局：domain 各占一個扇區，flagship 錨在扇區內側，building 沿扇區外擴，
// generic 房子填中心附近。座標皆由 _hash seed 產生（同資料同佈局，禁用 Math.random）。
const VIEW_W = 320, VIEW_H = 240, CX = 160, CY = 134;

function _seededOffset(seedStr, radius) {
  const h = _hash(seedStr);
  const ang = (h % 360) * (Math.PI / 180);
  const r = radius * (0.55 + ((h >> 9) % 100) / 100 * 0.45); // 0.55..1.0 倍
  return { x: CX + Math.cos(ang) * r, y: CY + Math.sin(ang) * r * 0.62 }; // 0.62 壓扁成俯視
}

function layoutCity(cityData) {
  const nodes = [];
  if (!cityData) return nodes;
  const domains = cityData.domains || [];
  domains.forEach((d, di) => {
    // flagship：扇區角度由 domain index 平均分佈
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

module.exports.layoutCity = layoutCity;
module.exports.VIEW_W = VIEW_W;
module.exports.VIEW_H = VIEW_H;
```

- [ ] **Step 4: 跑測試確認通過** — `npx jest journeyWorld` → PASS（全部）。
- [ ] **Step 5: Commit** — `feat(lib): journeyWorld layoutCity — deterministic seeded city layout (Slice P)`

---

## Task 4: 聚合 API `/api/journey`

**Files:**
- Create: `web-app/src/app/api/journey/route.js`

- [ ] **Step 1: 實作**
```js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
const { categoryToDomain } = require('@/lib/categoryToDomain');
const { aggregateJourney } = require('@/lib/journeyWorld');

// GET /api/journey?userId= — 唯讀聚合。座標不出後端：只回傳 city/domain/date/title。
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    const histories = await prisma.taskHistory.findMany({
      where: { completed: true, city: { not: null }, task: { userId } },
      select: { date: true, city: true, task: { select: { category: true, title: true } } },
    });
    const rows = histories.map((h) => ({
      city: h.city,
      domain: categoryToDomain(h.task?.category),
      date: h.date,
      title: h.task?.title || '',
    }));
    return NextResponse.json(aggregateJourney(rows));
  } catch (error) {
    console.error('Journey API error:', error);
    return NextResponse.json({ error: 'Failed to load journey' }, { status: 500 });
  }
}
```

- [ ] **Step 2: 手動 smoke** — dev server 起後 `curl '.../api/journey?userId=<id>'` 回傳 `{homeCity, cities}`，且 **回應內無 lat/lng**（grep 確認）。
- [ ] **Step 3: Commit** — `feat(api): GET /api/journey — read-only city aggregation, no coords leaked (Slice P)`

---

## Task 5: 領域旗艦 + 通用建築 + pin SVG 元件

**Files:**
- Create: `web-app/src/components/journey/landmarks/DomainLandmark.jsx`（依 domain + level 派發）
- Create: `web-app/src/components/journey/landmarks/GenericBuilding.jsx`、`Tree.jsx`、`MemoryPin.jsx`
- Test: `web-app/src/__tests__/components/journey/DomainLandmark.test.jsx`

**視覺正典**：直接從 `docs/superpowers/notes/assets/2026-06-01-sliceP-domain-landmarks.html` 把 9 領域 × 3 階的 SVG `<g>` 內容搬進來（座標已調好）。色票用 `genesis-io.json` 各 domain color。

- [ ] **Step 1: 寫失敗測試**
```jsx
import { render } from '@testing-library/react';
import DomainLandmark from '@/components/journey/landmarks/DomainLandmark';
it('給 domain+level 渲染對應 SVG group（有 data-domain/data-level）', () => {
  const { container } = render(<svg><DomainLandmark domain="運動" level={3} x={0} y={0} /></svg>);
  const g = container.querySelector('[data-domain="運動"]');
  expect(g).toBeTruthy();
  expect(g.getAttribute('data-level')).toBe('3');
});
it('未知 domain → 不爆，渲染通用 fallback', () => {
  const { container } = render(<svg><DomainLandmark domain="other" level={1} x={0} y={0} /></svg>);
  expect(container.querySelector('svg')).toBeTruthy();
});
```

- [ ] **Step 2: 跑測試確認失敗。**

- [ ] **Step 3: 實作 DomainLandmark.jsx**
- 一個 `LANDMARKS` map：`{ [domain]: { color, stages: [L1jsx, L2jsx, L3jsx] } }`，每個 stage 是 SVG `<g>`（從 mockup lift）。
- `DomainLandmark({ domain, level, x, y, scale=1 })` → `<g data-domain data-level transform="translate(x,y) scale(scale)">{stages[level-1] || fallback}</g>`。
- level 0 不渲染（呼叫端不會傳 0）。
- GenericBuilding/Tree/MemoryPin：小 SVG，`styleIndex` 決定款式（GenericBuilding 4 款）。MemoryPin = coral 圓點白心。

- [ ] **Step 4: 跑測試確認通過。**
- [ ] **Step 5: Commit** — `feat(ui): journey landmark SVGs — 9 domain archetypes x3 + generic/tree/pin (Slice P)`

---

## Task 6: `CityScene` — 吃 layoutCity 畫整座城

**Files:**
- Create: `web-app/src/components/journey/CityScene.jsx`
- Test: `web-app/src/__tests__/components/journey/CityScene.test.jsx`

- [ ] **Step 1: 寫失敗測試**
```jsx
import { render } from '@testing-library/react';
import CityScene from '@/components/journey/CityScene';
const cityData = { city:'台北', total:70, tier:'metropolis',
  domains:[{domain:'運動',count:70,flagshipLevel:3,buildingCount:2}], otherCount:0, pins:[] };
it('渲染地面 + flagship + building 數量正確', () => {
  const { container } = render(<CityScene cityData={cityData} />);
  expect(container.querySelectorAll('[data-kind="flagship"]').length).toBe(1);
  expect(container.querySelectorAll('[data-kind="building"]').length).toBe(2);
});
```

- [ ] **Step 2: 跑測試確認失敗。**

- [ ] **Step 3: 實作**
- `import { layoutCity, VIEW_W, VIEW_H } from '@/lib/journeyWorld'`。
- `const nodes = layoutCity(cityData)`，依 `kind` 派發：flagship→`<DomainLandmark>`、building→`GenericBuilding`（用 domain color）、generic→`GenericBuilding`、pin（pins 也擺幾顆 MemoryPin）。
- 外層 `<svg viewBox="0 0 VIEW_W VIEW_H">` + 調性 A 漸層背景 + 中央廣場 + 河流（tier>=city 才畫）。
- 每個節點外層加 `data-kind` 屬性供測試。
- 依 `scale` 由大到小排序後再畫（遠的小的先畫，近的後畫，正確遮疊）。

- [ ] **Step 4: 跑測試確認通過。**
- [ ] **Step 5: Commit** — `feat(ui): CityScene — render deterministic city from layoutCity (Slice P)`

---

## Task 7: `CityInfoPanel` — 城市/領域/pin 資訊

**Files:**
- Create: `web-app/src/components/journey/CityInfoPanel.jsx`

- [ ] **Step 1: 實作（無複雜邏輯，輕測試或免測）**
- Props `{ cityData }`。
- 顯示：城市名 + 階級中文（`TIER_LABELS`：empty→空地、village→村莊、town→城鎮、city→都市、metropolis→大都會、megacity→巨型都會）+ 總完成數 + 「再 N 次升<下一階>」進度（用 CITY_TIERS 算下一門檻；megacity 無下一階則顯示已達頂）。
- 領域清單：每列 `<IconRenderer category={domain}/>` + domain 名 + 「旗艦 Lv{level}（中文階名）· {buildingCount} 棟」。
- 最近回憶 pins：date · title · domain（lucide `MapPin`，無 emoji）。

- [ ] **Step 2: Commit** — `feat(ui): CityInfoPanel — city tier/domains/recent pins (Slice P)`

---

## Task 8: `WorldOverview` — 第1層多城市

**Files:**
- Create: `web-app/src/components/journey/WorldOverview.jsx`

- [ ] **Step 1: 實作**
- Props `{ cities, onSelectCity }`。
- SVG 柔和海面，每城市一個圓（半徑 ∝ `Math.sqrt(total)`，主城市最大），label = 城市名 + 階級。
- 點圓 → `onSelectCity(city)`。
- `cities.length <= 1` 時不渲染（JourneyView 直接顯示第2層 + 頂部膠囊）。

- [ ] **Step 2: Commit** — `feat(ui): WorldOverview — layer-1 multi-city map (Slice P)`

---

## Task 9: `JourneyEmptyState`

**Files:**
- Create: `web-app/src/components/journey/JourneyEmptyState.jsx`

- [ ] **Step 1: 實作**
- Props `{ trackLocationOn, onOpenSettings }`。
- `trackLocationOn === false` → 空地 SVG（標「？」）+「打開『記錄完成地點』，開始建造屬於你的城市」+ 按鈕呼叫 `onOpenSettings`（開 ProfileModal，**不直接改設定**）。
- `trackLocationOn === true`（開了但無資料）→ 空地 + 城市名 placeholder +「完成第一個習慣，這裡會長出你的城市」。
- 語氣零懲罰（「會長出」而非「你還沒」）。lucide icon、無 emoji。

- [ ] **Step 2: Commit** — `feat(ui): JourneyEmptyState — opt-in / first-habit guidance (Slice P)`

---

## Task 10: `JourneyView` 容器（fetch + 兩層切換）

**Files:**
- Create: `web-app/src/components/journey/JourneyView.jsx`
- Test: `web-app/src/__tests__/components/journey/JourneyView.test.jsx`

- [ ] **Step 1: 寫失敗測試**
```jsx
import { render, screen } from '@testing-library/react';
import JourneyView from '@/components/journey/JourneyView';
it('無城市 → 空狀態', () => {
  render(<JourneyView data={{ homeCity:null, cities:[] }} trackLocationOn={false} loading={false} />);
  expect(screen.getByText(/記錄完成地點|建造/)).toBeInTheDocument();
});
it('單城市 → 直接顯示城市第2層', () => {
  const data = { homeCity:'台北', cities:[{ city:'台北', total:5, tier:'village', domains:[], otherCount:0, pins:[] }] };
  const { container } = render(<JourneyView data={data} trackLocationOn={true} loading={false} />);
  expect(container.querySelector('svg')).toBeTruthy();
});
```

- [ ] **Step 2: 跑測試確認失敗。**

- [ ] **Step 3: 實作**
- Props `{ data, trackLocationOn, loading, onOpenSettings }`（data 由 MainApp fetch 傳入；也可自取，但本 slice 由 MainApp 傳，便於 test）。
- `loading` → skeleton；`!cities.length` → `JourneyEmptyState`。
- `cities.length === 1` → 直接 `CityScene` + `CityInfoPanel`（無第1層）。
- 多城市 → state `selectedCity`（預設 homeCity）；頂部膠囊列切城市 + `WorldOverview`（可摺疊）+ 選中城市的 `CityScene`/`CityInfoPanel`。

- [ ] **Step 4: 跑測試確認通過。**
- [ ] **Step 5: Commit** — `feat(ui): JourneyView — container with empty/single/multi-city states (Slice P)`

---

## Task 11: 接進 MainApp + AppHeader（側邊欄「旅程」）

**Files:**
- Modify: `web-app/src/components/MainApp.jsx`
- Modify: `web-app/src/components/AppHeader.jsx`

- [ ] **Step 1: MainApp 接線**
- import `Map`(lucide)、`JourneyView`。
- sidebar `<nav>`（約 line 1050）在「統計」與「成就」之間插入「旅程」按鈕（`setCurrentView('journey')`，icon `Map`，同款 className）。
- 新增 state `journeyData/journeyLoading`，`fetchJourney(userId)` → `GET /api/journey?userId=`。在進入 journey view 時（或登入後）抓一次。
- render 區：`currentView === 'journey'` → `<JourneyView data={journeyData} trackLocationOn={!!user?.trackLocation} loading={journeyLoading} onOpenSettings={() => setIsProfileModalOpen(true)} />`。

- [ ] **Step 2: AppHeader 標題** — `journey` → 顯示「旅程」。

- [ ] **Step 3: 測試 + build** — `npx jest`（全綠）、`npm run build:local`（Compiled successfully）。
- [ ] **Step 4: Commit** — `feat(ui): wire Journey view into MainApp sidebar + AppHeader (Slice P)`

---

## Task 12: 瀏覽器 smoke + 部署驗證 + PR

- [ ] **Step 1: 本機 smoke**（dev server）— 用有座標資料的帳號進「旅程」：主城市顯示、領域旗艦等級正確、建築數 = floor(count/5)、城市階級正確、重新整理佈局不變；無資料帳號看到空狀態。
- [ ] **Step 2: 隱私抽查** — DevTools network 看 `/api/journey` 回應**無 lat/lng**；DOM 搜尋無座標。
- [ ] **Step 3: rebase 最新 origin/main**（並行 session 可能推進；勿搶主目錄 checkout）。解衝突後 `npx jest` + build 再綠一次。
- [ ] **Step 4: push feature branch + 開 PR**（`--force-with-lease` 若已推過）。
- [ ] **Step 5: code-reviewer agent 全 diff 終審 → 修 nit → merge → 確認 Vercel production 部署 Ready。**

---

## Self-Review（plan 對 spec）
- 範圍：零 schema 變更 ✓（無 prisma task）；只讀 ✓（API 僅 GET、無 mutation）。
- spec §3 衍生 → T1/T2/T3；§9 API → T4；§4 視覺 + §5 兩層 → T5–T10；§7 導覽 → T11；§6 空狀態 → T9；§10 測試散落各 lib/元件 task；§11 隱私 → T4 Step2 + T12 Step2。
- 型別一致：`categoryToDomain`→domain string；`aggregateJourney`→`{homeCity,cities[{city,total,tier,domains[{domain,count,flagshipLevel,buildingCount}],otherCount,pins}]}`；`layoutCity`→`[{kind,domain,level?,styleIndex?,x,y,scale}]`。各 task 引用一致。
- 可砍：個別習慣小招牌未列入（spec 標 nice-to-have）；如要做可在 T5/T6 追加。
