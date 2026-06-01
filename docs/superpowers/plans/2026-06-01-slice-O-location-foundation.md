# Slice O — 座標基礎 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** opt-in 記錄習慣完成時的城市級座標（存 TaskHistory），顯示在卡片 + TaskDetailModal — Journey World 的資料地基，也是 anchor 升級為 context cue。

**Architecture:** TaskHistory 加 lat/lng/city + User 加 trackLocation。離線城市清單 lib（最近鄰居比對、零 API）+ geolocation 快取 helper。完成習慣（toggle）時若 opt-in → 快取座標 → nearestCity → 帶進既有 historyUpdate upsert。卡片 / detail 用新 LocationChip 顯示，點開可改城市。

**Tech Stack:** Prisma 5 + Vercel Postgres、Next.js 14 App Router、React 18、Tailwind、Jest。

**Spec:** [`docs/superpowers/specs/2026-06-01-slice-O-location-foundation-design.md`](../specs/2026-06-01-slice-O-location-foundation-design.md)

**Worktree:** 在 `habitnext1-sliceO`（branch `feat/slice-O-location-foundation`）。所有路徑相對 worktree 根。

---

## Open Questions Resolved（spec §10）

1. **geolocation 精度**：`enableHighAccuracy: false`、`timeout: 8000`、`maximumAge` 交給我們自己的 15min 快取層
2. **LocationChip「最近城市」**：當前座標 nearestCity 的前 3 名 + 使用者近期出現過的 city（從 task.history distinct）
3. **Profile 開關首次開啟**：立即觸發一次 `getCurrentPosition` 讓瀏覽器跳權限窗；失敗不擋開關（只是之後完成時沒座標）
4. **city 手動覆寫**：手動改了該筆 history 就以手動為準（v1 簡化：之後完成是「不同日」=不同 row，不會覆蓋已改的；同日重複完成才覆寫，可接受）
5. **cofit webview 無權限**：getCurrentPosition reject → 靜默 fallback，使用者可手動點 chip 補

---

## File Structure

### Created
| Path | Responsibility |
|---|---|
| `web-app/src/lib/cities.js` | 離線城市中心點清單 + `nearestCity(lat,lng)` + `searchCities(q)` |
| `web-app/src/__tests__/lib/cities.test.js` | TDD |
| `web-app/src/lib/geolocation.js` | `getCachedPosition({maxAgeMs})` — 包 navigator.geolocation + 15min module 快取 |
| `web-app/src/__tests__/lib/geolocation.test.js` | TDD（mock navigator）|
| `web-app/src/components/taskCard/LocationChip.jsx` | 「📍城市」chip + 城市選擇 popover |

### Modified
| Path | Change |
|---|---|
| `web-app/prisma/schema.prisma` | TaskHistory + lat/lng/city；User + trackLocation |
| `web-app/src/app/api/tasks/[id]/route.js` | historyUpdate upsert 接受 lat/lng/city |
| `web-app/src/app/api/user/profile/route.js` | PUT 接受 trackLocation |
| `web-app/src/components/MainApp.jsx` | fetchTasks 加 locationByDate map；handleUpdateProgress 完成時抓座標 |
| `web-app/src/components/TaskCard.jsx` | 完成卡片渲染 LocationChip |
| `web-app/src/components/TaskDetailModal.jsx` | 該日完成顯示地點 |
| `web-app/src/components/ProfileModal.jsx` | 「記錄完成地點 📍」opt-in 開關 |

---

## Task 1: Schema — TaskHistory 座標 + User.trackLocation

**Files:** Modify `web-app/prisma/schema.prisma`

- [ ] **Step 1: 改 TaskHistory + User**

TaskHistory（找到 `subtaskCompletions Json?` 後面、`@@unique` 前面）加：

```prisma
model TaskHistory {
  id                 String  @id @default(cuid())
  taskId             String
  task               Task    @relation(fields: [taskId], references: [id], onDelete: Cascade)
  date               String // YYYY-MM-DD
  completed          Boolean @default(false)
  value              Int     @default(0)
  subtaskCompletions Json?
  // ★ Slice O — 「在哪完成」城市級座標（opt-in）。只存數字 + 離線比對城市名。
  lat                Float?
  lng                Float?
  city               String?

  @@unique([taskId, date])
}
```

User（找到 `identities String[]` 後面）加：

```prisma
  identities   String[]     @default([])
  trackLocation Boolean     @default(false)  // ★ Slice O — opt-in 記錄完成地點
```

- [ ] **Step 2: Push schema**

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO/web-app" && set -a && source .env.local && set +a && npx prisma db push --accept-data-loss
```

Expected: `Your database is now in sync with your Prisma schema.`（全 nullable/default，既有 row 不受影響）

- [ ] **Step 3: 重生 client**

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO/web-app" && npx prisma generate
```

- [ ] **Step 4: 驗證**

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO/web-app" && set -a && source .env.local && set +a && node -e "
const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient();
(async()=>{ const u=await p.user.findFirst({select:{trackLocation:true}}); console.log('User.trackLocation:',u); const h=await p.taskHistory.findFirst({select:{city:true,lat:true}}); console.log('TaskHistory loc cols:',h); await p.\$disconnect(); })();
"
```

Expected: `User.trackLocation: { trackLocation: false }`、`TaskHistory loc cols: { city: null, lat: null }`（或無 row 時 null）

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/prisma/schema.prisma && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(db): Slice O — TaskHistory.lat/lng/city + User.trackLocation"
```

---

## Task 2: `lib/cities.js` + TDD

**Files:** Create `web-app/src/lib/cities.js` + `web-app/src/__tests__/lib/cities.test.js`

### Step 1: 寫失敗測試

建立 `web-app/src/__tests__/lib/cities.test.js`：

```js
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
    const r = nearestCity(24.0, 121.0); // central Taiwan
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
  it('matches by substring (case-insensitive on country code)', () => {
    expect(searchCities('台').some(c => c.name === '台北')).toBe(true);
    expect(searchCities('tokyo').length === 0 || searchCities('東京').some(c => c.name === '東京')).toBe(true);
  });
  it('returns [] for empty query', () => {
    expect(searchCities('')).toEqual([]);
    expect(searchCities(null)).toEqual([]);
  });
  it('caps results at 20', () => {
    expect(searchCities('a').length).toBeLessThanOrEqual(20);
  });
});
```

### Step 2: Run → fail

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO/web-app" && npx jest src/__tests__/lib/cities.test.js
```

Expected: `Cannot find module '../../lib/cities'`.

### Step 3: 實作 `lib/cities.js`

建立 `web-app/src/lib/cities.js`（curated v1 清單，可擴充）：

```js
// src/lib/cities.js
// Offline city-centroid list for Slice O. Zero map API — we only store
// lat/lng numbers and resolve the nearest city by haversine distance.
// v1 list: all 22 Taiwan counties/cities + major Asian + major global.
// Extensible — add rows as needed; nearestCity always returns the closest.

const CITIES = [
  // 台灣 (22)
  { name: '台北', lat: 25.033, lng: 121.565, country: 'TW' },
  { name: '新北', lat: 25.012, lng: 121.465, country: 'TW' },
  { name: '基隆', lat: 25.128, lng: 121.741, country: 'TW' },
  { name: '桃園', lat: 24.993, lng: 121.301, country: 'TW' },
  { name: '新竹', lat: 24.804, lng: 120.972, country: 'TW' },
  { name: '苗栗', lat: 24.560, lng: 120.821, country: 'TW' },
  { name: '台中', lat: 24.147, lng: 120.674, country: 'TW' },
  { name: '彰化', lat: 24.052, lng: 120.516, country: 'TW' },
  { name: '南投', lat: 23.902, lng: 120.685, country: 'TW' },
  { name: '雲林', lat: 23.709, lng: 120.431, country: 'TW' },
  { name: '嘉義', lat: 23.480, lng: 120.449, country: 'TW' },
  { name: '台南', lat: 22.999, lng: 120.227, country: 'TW' },
  { name: '高雄', lat: 22.627, lng: 120.302, country: 'TW' },
  { name: '屏東', lat: 22.552, lng: 120.549, country: 'TW' },
  { name: '宜蘭', lat: 24.702, lng: 121.738, country: 'TW' },
  { name: '花蓮', lat: 23.991, lng: 121.601, country: 'TW' },
  { name: '台東', lat: 22.758, lng: 121.144, country: 'TW' },
  { name: '澎湖', lat: 23.571, lng: 119.579, country: 'TW' },
  { name: '金門', lat: 24.436, lng: 118.317, country: 'TW' },
  { name: '連江', lat: 26.160, lng: 119.951, country: 'TW' },
  // 主要亞洲
  { name: '東京', lat: 35.681, lng: 139.767, country: 'JP' },
  { name: '大阪', lat: 34.694, lng: 135.502, country: 'JP' },
  { name: '京都', lat: 35.012, lng: 135.768, country: 'JP' },
  { name: '札幌', lat: 43.062, lng: 141.354, country: 'JP' },
  { name: '福岡', lat: 33.590, lng: 130.402, country: 'JP' },
  { name: '沖繩', lat: 26.212, lng: 127.681, country: 'JP' },
  { name: '首爾', lat: 37.567, lng: 126.978, country: 'KR' },
  { name: '釜山', lat: 35.180, lng: 129.076, country: 'KR' },
  { name: '香港', lat: 22.320, lng: 114.169, country: 'HK' },
  { name: '澳門', lat: 22.199, lng: 113.544, country: 'MO' },
  { name: '上海', lat: 31.230, lng: 121.474, country: 'CN' },
  { name: '北京', lat: 39.904, lng: 116.407, country: 'CN' },
  { name: '新加坡', lat: 1.352, lng: 103.820, country: 'SG' },
  { name: '曼谷', lat: 13.756, lng: 100.502, country: 'TH' },
  { name: '吉隆坡', lat: 3.139, lng: 101.687, country: 'MY' },
  { name: '胡志明市', lat: 10.823, lng: 106.630, country: 'VN' },
  { name: '馬尼拉', lat: 14.600, lng: 120.984, country: 'PH' },
  { name: '峇里島', lat: -8.409, lng: 115.189, country: 'ID' },
  // 主要全球
  { name: '紐約', lat: 40.713, lng: -74.006, country: 'US' },
  { name: '舊金山', lat: 37.775, lng: -122.419, country: 'US' },
  { name: '洛杉磯', lat: 34.052, lng: -118.244, country: 'US' },
  { name: '西雅圖', lat: 47.606, lng: -122.332, country: 'US' },
  { name: '溫哥華', lat: 49.283, lng: -123.121, country: 'CA' },
  { name: '倫敦', lat: 51.507, lng: -0.128, country: 'GB' },
  { name: '巴黎', lat: 48.857, lng: 2.352, country: 'FR' },
  { name: '柏林', lat: 52.520, lng: 13.405, country: 'DE' },
  { name: '雪梨', lat: -33.869, lng: 151.209, country: 'AU' },
  { name: '墨爾本', lat: -37.814, lng: 144.963, country: 'AU' },
  { name: '杜拜', lat: 25.205, lng: 55.271, country: 'AE' },
];

function _toRad(d) { return (d * Math.PI) / 180; }

// Haversine distance in km between two lat/lng points.
function _haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = _toRad(lat2 - lat1);
  const dLng = _toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(_toRad(lat1)) * Math.cos(_toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Nearest city name to the given coords, or null for invalid input.
function nearestCity(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
    return null;
  }
  let best = null;
  let bestD = Infinity;
  for (const c of CITIES) {
    const d = _haversineKm(lat, lng, c.lat, c.lng);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best ? best.name : null;
}

// Substring search over name + country, capped at 20.
function searchCities(q) {
  if (!q || typeof q !== 'string') return [];
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return CITIES
    .filter(c => c.name.toLowerCase().includes(needle) || c.country.toLowerCase().includes(needle))
    .slice(0, 20);
}

module.exports = { CITIES, nearestCity, searchCities };
```

### Step 4: Run → pass

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO/web-app" && npx jest src/__tests__/lib/cities.test.js
```

Expected: all pass (~11 assertions across 9 tests).

### Step 5: Commit

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/lib/cities.js web-app/src/__tests__/lib/cities.test.js && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(lib): cities.js — 47 offline city centroids + nearestCity + searchCities + TDD"
```

---

## Task 3: `lib/geolocation.js` + TDD

**Files:** Create `web-app/src/lib/geolocation.js` + `web-app/src/__tests__/lib/geolocation.test.js`

### Step 1: 寫失敗測試

建立 `web-app/src/__tests__/lib/geolocation.test.js`：

```js
const { getCachedPosition, _resetCacheForTest } = require('../../lib/geolocation');

describe('getCachedPosition', () => {
  beforeEach(() => { _resetCacheForTest(); });

  it('resolves {lat,lng} when navigator.geolocation grants', async () => {
    global.navigator = {
      geolocation: {
        getCurrentPosition: (ok) => ok({ coords: { latitude: 25.03, longitude: 121.56 } }),
      },
    };
    const pos = await getCachedPosition({ maxAgeMs: 1000, now: 1000 });
    expect(pos).toEqual({ lat: 25.03, lng: 121.56 });
  });

  it('returns cached value within maxAgeMs without calling geolocation again', async () => {
    let calls = 0;
    global.navigator = {
      geolocation: {
        getCurrentPosition: (ok) => { calls++; ok({ coords: { latitude: 1, longitude: 2 } }); },
      },
    };
    await getCachedPosition({ maxAgeMs: 10000, now: 1000 });
    const pos2 = await getCachedPosition({ maxAgeMs: 10000, now: 5000 }); // within window
    expect(pos2).toEqual({ lat: 1, lng: 2 });
    expect(calls).toBe(1);
  });

  it('refetches when cache is older than maxAgeMs', async () => {
    let calls = 0;
    global.navigator = {
      geolocation: {
        getCurrentPosition: (ok) => { calls++; ok({ coords: { latitude: calls, longitude: calls } }); },
      },
    };
    await getCachedPosition({ maxAgeMs: 1000, now: 1000 });
    await getCachedPosition({ maxAgeMs: 1000, now: 5000 }); // stale → refetch
    expect(calls).toBe(2);
  });

  it('resolves null when permission denied / error', async () => {
    global.navigator = {
      geolocation: {
        getCurrentPosition: (_ok, err) => err({ code: 1, message: 'denied' }),
      },
    };
    const pos = await getCachedPosition({ maxAgeMs: 1000, now: 1000 });
    expect(pos).toBeNull();
  });

  it('resolves null when geolocation unavailable', async () => {
    global.navigator = {};
    const pos = await getCachedPosition({ maxAgeMs: 1000, now: 1000 });
    expect(pos).toBeNull();
  });
});
```

### Step 2: Run → fail

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO/web-app" && npx jest src/__tests__/lib/geolocation.test.js
```

Expected: `Cannot find module '../../lib/geolocation'`.

### Step 3: 實作 `lib/geolocation.js`

建立 `web-app/src/lib/geolocation.js`：

```js
// src/lib/geolocation.js
// One-shot, opt-in geolocation with a module-level cache. We deliberately do
// NOT do background tracking — getCachedPosition is called at habit-completion
// time. The cache avoids hammering the permission/GPS layer on every tick.
//
// Returns { lat, lng } on success, or null (permission denied, unavailable,
// timeout). Never throws — callers treat null as "no location this time".
//
// `now` and `_resetCacheForTest` exist for deterministic unit tests.

let _cache = null;      // { lat, lng, ts }

function _resetCacheForTest() { _cache = null; }

function getCachedPosition({ maxAgeMs = 15 * 60 * 1000, now } = {}) {
  const t = typeof now === 'number' ? now : Date.now();

  // Fresh cache hit
  if (_cache && (t - _cache.ts) <= maxAgeMs) {
    return Promise.resolve({ lat: _cache.lat, lng: _cache.lng });
  }

  const geo = (typeof navigator !== 'undefined' && navigator.geolocation) || null;
  if (!geo) return Promise.resolve(null);

  return new Promise((resolve) => {
    geo.getCurrentPosition(
      (p) => {
        const lat = p?.coords?.latitude;
        const lng = p?.coords?.longitude;
        if (typeof lat === 'number' && typeof lng === 'number') {
          _cache = { lat, lng, ts: t };
          resolve({ lat, lng });
        } else {
          resolve(null);
        }
      },
      () => resolve(null),                       // denied / error → null, no throw
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
    );
  });
}

module.exports = { getCachedPosition, _resetCacheForTest };
```

### Step 4: Run → pass

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO/web-app" && npx jest src/__tests__/lib/geolocation.test.js
```

Expected: 5 tests pass.

### Step 5: Full suite

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO/web-app" && npx jest 2>&1 | tail -3
```

Expected: all green (existing + cities + geolocation).

### Step 6: Commit

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/lib/geolocation.js web-app/src/__tests__/lib/geolocation.test.js && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(lib): geolocation.js — getCachedPosition opt-in one-shot + 15min cache + TDD"
```

---

## Task 4: API — historyUpdate 接受 lat/lng/city

**Files:** Modify `web-app/src/app/api/tasks/[id]/route.js`

- [ ] **Step 1: 擴充 upsert**

找到 historyUpdate 區塊（約第 41-65 行）。把：

```js
        if (historyUpdate) {
            const { date, completed, value, subtaskCompletions } = historyUpdate;

            await prisma.taskHistory.upsert({
                where: { taskId_date: { taskId: id, date: date } },
                update: {
                    completed,
                    value,
                    subtaskCompletions: subtaskCompletions ?? null
                },
                create: {
                    taskId: id,
                    date,
                    completed,
                    value,
                    subtaskCompletions: subtaskCompletions ?? null
                }
            });
        }
```

改成（加 lat/lng/city — 只在有提供時寫入，避免把既有座標清掉）：

```js
        if (historyUpdate) {
            const { date, completed, value, subtaskCompletions, lat, lng, city } = historyUpdate;

            // Slice O — only write location fields when provided. A normal
            // completion without location (feature off / denied) leaves any
            // existing coords untouched.
            const locWrite = {};
            if (lat !== undefined) locWrite.lat = lat;
            if (lng !== undefined) locWrite.lng = lng;
            if (city !== undefined) locWrite.city = city;

            await prisma.taskHistory.upsert({
                where: { taskId_date: { taskId: id, date: date } },
                update: {
                    completed,
                    value,
                    subtaskCompletions: subtaskCompletions ?? null,
                    ...locWrite,
                },
                create: {
                    taskId: id,
                    date,
                    completed,
                    value,
                    subtaskCompletions: subtaskCompletions ?? null,
                    ...locWrite,
                }
            });
        }
```

- [ ] **Step 2: 確認 GET 回傳 history 含座標**

同檔案的 GET（refetch with history）— Prisma `include: { history: true }` 自動包含新欄位，不需改。確認 GET handler 用 `include: { history: true }`：

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO/web-app" && grep -n "history: true" src/app/api/tasks/route.js src/app/api/tasks/\[id\]/route.js
```

Expected: 兩處都有（list + detail refetch）。

- [ ] **Step 3: 全 jest**

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO/web-app" && npx jest 2>&1 | tail -3
```

Expected: all green.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/app/api/tasks/\[id\]/route.js && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(api): tasks/[id] historyUpdate accepts lat/lng/city (Slice O)"
```

---

## Task 5: API — profile PUT 接受 trackLocation

**Files:** Modify `web-app/src/app/api/user/profile/route.js`

- [ ] **Step 1: 接受 trackLocation**

找到 `const { userId, nickname, phone, avatar, oldPassword, newPassword } = body;`，加 `trackLocation`：

```js
const { userId, nickname, phone, avatar, oldPassword, newPassword, trackLocation } = body;
```

找到 build update data 區（`const updateData = {};` 之後、其他 if 之間）加：

```js
        // Slice O — opt-in location tracking flag
        if (trackLocation !== undefined) {
            updateData.trackLocation = !!trackLocation;
        }
```

- [ ] **Step 2: Smoke（Prisma 直接驗證 round-trip）**

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO/web-app" && set -a && source .env.local && set +a && node -e "
const {PrismaClient}=require('@prisma/client'); const bcrypt=require('bcryptjs'); const p=new PrismaClient();
(async()=>{
  const u=await p.user.upsert({where:{phone:'0900000022'},update:{},create:{nickname:'locSmoke',phone:'0900000022',countryCode:'+886',password:await bcrypt.hash('x',10)}});
  await p.user.update({where:{id:u.id},data:{trackLocation:true}});
  const after=await p.user.findUnique({where:{id:u.id},select:{trackLocation:true}});
  console.log('trackLocation after update:',after);
  await p.user.delete({where:{id:u.id}});
  console.log('cleaned');
  await p.\$disconnect();
})();
"
```

Expected: `trackLocation after update: { trackLocation: true }` then `cleaned`.

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/app/api/user/profile/route.js && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(api): user/profile PUT accepts trackLocation (Slice O)"
```

---

## Task 6: MainApp — 完成時抓座標 + fetchTasks locationByDate

**Files:** Modify `web-app/src/components/MainApp.jsx`

### Step 1: Imports

最上方加：

```jsx
import { getCachedPosition } from '@/lib/geolocation';
import { nearestCity } from '@/lib/cities';
```

### Step 2: fetchTasks transformer 加 locationByDate

找到 `fetchTasks` 內 `const historyMap = {}; const dailyProgressMap = {};` 附近。在 forEach 內、history 處理裡加 locationMap。把 transformer 區改成（加一個 locationMap）：

```jsx
const formattedTasks = data.map(t => {
    const historyMap = {};
    const dailyProgressMap = {};
    const locationByDate = {};   // ★ Slice O — { 'yyyy-mm-dd': '台北' }

    if (t.history) {
        t.history.forEach(h => {
            // ... existing historyMap / dailyProgressMap logic unchanged ...
            if (h.city) locationByDate[h.date] = h.city;   // ★ Slice O
        });
    }
    return { ...t, history: historyMap, dailyProgress: dailyProgressMap, locationByDate };
});
```

（保留既有 historyMap/dailyProgressMap 寫法，只在 forEach 末尾加 `if (h.city) locationByDate[h.date] = h.city;`，return 物件加 `locationByDate`。）

### Step 3: handleUpdateProgress — 完成時帶座標

`handleUpdateProgress` 內，在組好 `historyUpdate` 之後、`await fetch(...)` 之前，加一段「若是完成動作 + 開啟定位 → 取座標」。

找到 API Call 區：

```jsx
        // API Call
        try {
            if (updatedTask) {
                await fetch(`/api/tasks/${task.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...updatedTask,
                        historyUpdate
                    })
                });
            }
```

改成（completion 時補座標 + 樂觀更新 locationByDate）：

```jsx
        // Slice O — capture city on a completion (not un-completion) when the
        // user has opted in. Best-effort: failure / denial just skips location.
        if (historyUpdate && historyUpdate.completed && user?.trackLocation) {
            try {
                const pos = await getCachedPosition({ maxAgeMs: 15 * 60 * 1000 });
                if (pos) {
                    const city = nearestCity(pos.lat, pos.lng);
                    if (city) {
                        historyUpdate.lat = pos.lat;
                        historyUpdate.lng = pos.lng;
                        historyUpdate.city = city;
                        // optimistic: reflect on the task's locationByDate
                        setTasks(prev => prev.map(t => t.id === task.id
                            ? { ...t, locationByDate: { ...(t.locationByDate || {}), [dateStr]: city } }
                            : t));
                    }
                }
            } catch (e) {
                console.warn('[Slice O] location capture skipped', e);
            }
        }

        // API Call
        try {
            if (updatedTask) {
                await fetch(`/api/tasks/${task.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...updatedTask,
                        historyUpdate
                    })
                });
            }
```

### Step 4: 全 jest + build

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO/web-app" && npx jest 2>&1 | tail -3 && npm run build:local 2>&1 | grep -E "Compiled|error" | head -3
```

Expected: green + `✓ Compiled successfully`.

### Step 5: Commit

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/MainApp.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): MainApp — capture city on completion (opt-in) + locationByDate map (Slice O)"
```

---

## Task 7: ProfileModal — 「記錄完成地點 📍」opt-in 開關

**Files:** Modify `web-app/src/components/ProfileModal.jsx`

### Step 1: 讀現有結構

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO/web-app" && grep -n "trackLocation\|/api/user/profile\|activeTab\|個人資料" src/components/ProfileModal.jsx | head
```

了解 profile 表單怎麼 PUT、tab 結構（Slice K 加了「我的嚮往」tab）。

### Step 2: 加開關 UI + 儲存

在「個人資料」tab 的表單區（暱稱 / avatar 附近）加一個 toggle row：

```jsx
{/* Slice O — opt-in location tracking */}
<div className="flex items-start justify-between gap-3 py-3 border-t border-gray-100">
    <div className="flex-1">
        <p className="text-sm font-bold text-gray-800">記錄完成地點 📍</p>
        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
            僅在你完成習慣時記錄城市、只存座標數字、不會背景追蹤你的位置。可隨時關閉。
        </p>
    </div>
    <button
        type="button"
        onClick={handleToggleTrackLocation}
        aria-pressed={trackLocation}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 mt-0.5 ${trackLocation ? 'bg-emerald-500' : 'bg-gray-300'}`}
    >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${trackLocation ? 'translate-x-5' : ''}`} />
    </button>
</div>
```

加 state + handler（near 其他 useState）。`trackLocation` 初始從 `user?.trackLocation`：

```jsx
const [trackLocation, setTrackLocation] = useState(!!user?.trackLocation);

const handleToggleTrackLocation = async () => {
    const next = !trackLocation;
    setTrackLocation(next);
    // Persist
    try {
        await fetch('/api/user/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: user.id, trackLocation: next }),
        });
        // Update local user + localStorage so MainApp sees it immediately
        onUserUpdate?.({ ...user, trackLocation: next });
        // First enable → trigger one permission prompt (best-effort, non-blocking)
        if (next && typeof navigator !== 'undefined' && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(() => {}, () => {}, { enableHighAccuracy: false, timeout: 8000 });
        }
    } catch (e) {
        console.error('toggle trackLocation failed', e);
        setTrackLocation(!next); // revert on error
    }
};
```

注意：`onUserUpdate` 是 ProfileModal 既有把 user 更新回 MainApp 的 prop（Slice 之前 avatar 更新用過）。確認其名稱（Step 1 grep）；若不同，用實際的 callback。若沒有，MainApp 需傳一個 `onUserUpdate={(u)=>{ setUser(u); localStorage.setItem('habit_user', JSON.stringify(u)); }}`。

### Step 3: MainApp 確認傳 onUserUpdate（若缺）

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO/web-app" && grep -n "ProfileModal" src/components/MainApp.jsx
```

確認 `<ProfileModal>` 有把 user 更新回傳的 callback；沒有就加：

```jsx
<ProfileModal
    // ... existing props
    onUserUpdate={(u) => { setUser(u); localStorage.setItem('habit_user', JSON.stringify(u)); }}
/>
```

### Step 4: jest + build

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO/web-app" && npx jest 2>&1 | tail -3 && npm run build:local 2>&1 | grep -E "Compiled|error" | head -3
```

Expected: green + compiled.

### Step 5: Commit

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/ProfileModal.jsx web-app/src/components/MainApp.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): ProfileModal — 記錄完成地點 opt-in toggle + persist + permission prompt (Slice O)"
```

---

## Task 8: LocationChip component

**Files:** Create `web-app/src/components/taskCard/LocationChip.jsx`

### Step 1: 建立元件

```jsx
'use client';

import React, { useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import { searchCities } from '@/lib/cities';

// LocationChip — Slice O. Shows "📍城市" on a completed card. Tapping opens a
// small popover to correct the city (recent cities + offline search). When the
// task has no city yet (completed without location), it can render a subtle
// "加地點" affordance instead.
//
// Props:
//   city: string | null          — current city for this date
//   recentCities: string[]       — quick-pick chips (caller supplies)
//   onPick(cityName): void       — persist the chosen/changed city
const LocationChip = ({ city, recentCities = [], onPick }) => {
    const [open, setOpen] = useState(false);
    const [q, setQ] = useState('');

    const results = q.trim() ? searchCities(q) : [];

    const pick = (name) => {
        onPick?.(name);
        setOpen(false);
        setQ('');
    };

    return (
        <div className="relative inline-block">
            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 hover:text-emerald-700"
            >
                <MapPin size={11} />
                {city || '加地點'}
            </button>

            {open && (
                <div
                    className="absolute z-30 mt-1 left-0 w-52 bg-white border border-gray-200 rounded-xl shadow-lg p-2"
                    onClick={(e) => e.stopPropagation()}
                >
                    {recentCities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                            {recentCities.map(rc => (
                                <button
                                    key={rc}
                                    type="button"
                                    onClick={() => pick(rc)}
                                    className="text-[11px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                >
                                    {rc}
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="flex items-center gap-1 border border-gray-200 rounded-lg px-2 py-1">
                        <Search size={12} className="text-gray-400" />
                        <input
                            autoFocus
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="搜尋城市"
                            className="flex-1 text-[12px] outline-none"
                        />
                    </div>
                    {results.length > 0 && (
                        <div className="mt-1 max-h-40 overflow-y-auto">
                            {results.map(c => (
                                <button
                                    key={`${c.name}-${c.country}`}
                                    type="button"
                                    onClick={() => pick(c.name)}
                                    className="w-full text-left text-[12px] px-2 py-1.5 rounded-lg hover:bg-gray-50"
                                >
                                    {c.name} <span className="text-gray-400">· {c.country}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default LocationChip;
```

### Step 2: build

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO/web-app" && npm run build:local 2>&1 | grep -E "Compiled|error" | head -3
```

Expected: `✓ Compiled successfully`.

### Step 3: Commit

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/taskCard/LocationChip.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): LocationChip — 📍city chip + recent + offline search popover (Slice O)"
```

---

## Task 9: TaskCard — 完成卡片渲染 LocationChip

**Files:** Modify `web-app/src/components/TaskCard.jsx`

### Step 1: Import + prop

最上方加：

```jsx
import LocationChip from './taskCard/LocationChip';
```

`TaskCard` signature 加 `onPickLocation`（由 MainApp 傳，持久化城市變更）：

```jsx
const TaskCard = ({ task, onClick, onUpdate = () => { }, viewingDate, onAfterAction, onPickLocation }) => {
```

### Step 2: 完成時顯示 chip

在 card body 內、`{task.cue && (...)}` 那段附近（標題下方），加完成時的地點 chip。只在 `isCompleted` 且當天時顯示：

```jsx
{isCompleted && (
    <div className="mt-0.5" onClick={(e) => e.stopPropagation()}>
        <LocationChip
            city={task.locationByDate?.[dateStr] || null}
            recentCities={Object.values(task.locationByDate || {}).slice(-3)}
            onPick={(cityName) => onPickLocation?.(task, dateStr, cityName)}
        />
    </div>
)}
```

### Step 3: MainApp 傳 onPickLocation + 實作持久化

`web-app/src/components/MainApp.jsx` — `<TaskCard>` 加 prop：

```jsx
onPickLocation={handlePickLocation}
```

並加 handler（near handleUpdateProgress）：

```jsx
// Slice O — manual city correction from a card's LocationChip.
const handlePickLocation = async (task, dateStr, cityName) => {
    // optimistic
    setTasks(prev => prev.map(t => t.id === task.id
        ? { ...t, locationByDate: { ...(t.locationByDate || {}), [dateStr]: cityName } }
        : t));
    try {
        await fetch(`/api/tasks/${task.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...task,
                historyUpdate: { date: dateStr, completed: true, value: 1, city: cityName },
            }),
        });
    } catch (e) {
        console.error('pick location failed', e);
    }
};
```

注意：historyUpdate 這裡帶 `completed: true, value: 1` 是因為地點只在完成的 card 上能改；若 task 是 quantitative/checklist，value 應沿用當前值 — 簡化：v1 只在 binary 完成卡顯示 chip（quant/checklist 的完成卡也顯示，但改地點時 value 用 task 當前 history 值）。實作時用 `historyUpdate` 帶現有 value：

```js
const curVal = task.history?.[dateStr];
const valNum = typeof curVal === 'number' ? curVal : (curVal ? 1 : 0);
// ... historyUpdate: { date: dateStr, completed: true, value: valNum, city: cityName }
```

### Step 4: jest + build

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO/web-app" && npx jest 2>&1 | tail -3 && npm run build:local 2>&1 | grep -E "Compiled|error" | head -3
```

Expected: green + compiled.

### Step 5: Commit

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/TaskCard.jsx web-app/src/components/MainApp.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): TaskCard renders LocationChip on completed cards + MainApp handlePickLocation (Slice O)"
```

---

## Task 10: TaskDetailModal — 該日完成顯示地點

**Files:** Modify `web-app/src/components/TaskDetailModal.jsx`

### Step 1: 顯示 + 可改

`TaskDetailModal` 已用 `currentDate` 顯示某日狀態。在它顯示完成狀態的區域加 LocationChip（當該日 isCompleted）。

Import：

```jsx
import LocationChip from './taskCard/LocationChip';
```

在日期導航 / 完成資訊區附近加（task 有 locationByDate）：

```jsx
{isCompletedOnDate(task, currentDate) && (
    <div className="flex justify-center mt-2" onClick={(e) => e.stopPropagation()}>
        <LocationChip
            city={task.locationByDate?.[currentDate] || null}
            recentCities={Object.values(task.locationByDate || {}).slice(-3)}
            onPick={(cityName) => onPickLocation?.(task, currentDate, cityName)}
        />
    </div>
)}
```

`TaskDetailModal` signature 加 `onPickLocation`（MainApp 傳同一個 handlePickLocation）。

### Step 2: MainApp 傳 onPickLocation 給 TaskDetailModal

```jsx
<TaskDetailModal
    // ... existing props
    onPickLocation={handlePickLocation}
/>
```

### Step 3: jest + build

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO/web-app" && npx jest 2>&1 | tail -3 && npm run build:local 2>&1 | grep -E "Compiled|error" | head -3
```

Expected: green + compiled.

### Step 4: Commit

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/TaskDetailModal.jsx web-app/src/components/MainApp.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): TaskDetailModal shows + edits completion location for the date (Slice O)"
```

---

## Task 11: Browser smoke + merge + push

### Step 1: 建測試 user（trackLocation off 預設）

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO/web-app" && set -a && source .env.local && set +a && node -e "
const {PrismaClient}=require('@prisma/client'); const bcrypt=require('bcryptjs'); const p=new PrismaClient();
(async()=>{
  const hash=await bcrypt.hash('SliceOtest',10);
  const u=await p.user.upsert({where:{phone:'0900000011'},update:{password:hash,isActive:true,trackLocation:false},create:{nickname:'SliceOtest',phone:'0900000011',countryCode:'+886',password:hash,isActive:true}});
  // one active binary task
  await p.task.upsert({where:{id:'sliceO-smoke-task'},update:{},create:{id:'sliceO-smoke-task',userId:u.id,title:'喝水測試',type:'binary',category:'飲食',frequency:'daily',recurrence:{type:'daily',interval:1,endType:'never'},reminder:{},subtasks:[],status:'active'}});
  console.log('user:',u.id);
  await p.\$disconnect();
})();
"
```

### Step 2: 啟動 preview server，手動驗證

啟動 dev（worktree 的 web-app）。登入 `0900000011 / SliceOtest`。驗證：

- [ ] 預設（trackLocation off）：完成「喝水測試」→ **不**出現地點、無權限彈窗、無報錯
- [ ] Profile → 開「記錄完成地點 📍」→ 瀏覽器跳定位授權窗
- [ ] 授權後完成習慣 → 卡片出現「📍<城市>」chip
- [ ] 點 chip → popover 出現最近城市 + 搜尋；搜「台」→ 台北/台中/台南/台東；選一個 → chip 更新
- [ ] 開 TaskDetailModal → 該日完成顯示地點、可改
- [ ] 拒絕授權的情況：完成習慣不報錯、chip 顯示「加地點」可手動補

### Step 3: 驗證 DB

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO/web-app" && set -a && source .env.local && set +a && node -e "
const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient();
(async()=>{
  const u=await p.user.findUnique({where:{phone:'0900000011'}});
  const h=await p.taskHistory.findMany({where:{task:{userId:u.id}},select:{date:true,completed:true,city:true,lat:true,lng:true}});
  console.log('history rows:',h);
  await p.\$disconnect();
})();
"
```

Expected: 完成的 row 有 city + lat/lng（若手動測過授權）。

### Step 4: 清理 + merge + push

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO/web-app" && set -a && source .env.local && set +a && node -e "
const {PrismaClient}=require('@prisma/client'); const p=new PrismaClient();
(async()=>{ const u=await p.user.findUnique({where:{phone:'0900000011'}}); if(u){ await p.task.deleteMany({where:{userId:u.id}}); await p.user.delete({where:{id:u.id}});} console.log('cleaned'); await p.\$disconnect(); })();
"
```

**Merge 注意**：主 repo 目錄被並行 session 佔用、且持續推進 main。Merge 前先在 worktree fetch + rebase 到最新 origin/main，再推自己的 feature branch，最後在 GitHub 開 PR 或請使用者在無人佔用時 ff-merge。**不要在並行 session 佔用主目錄時直接 checkout main 搶。**

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO" && git fetch origin && git rebase origin/main 2>&1 | tail -5 && git push origin feat/slice-O-location-foundation 2>&1 | tail -3
```

然後開 PR（或協調無人佔用時 merge）：

```bash
cd "C:/Users/user/.gemini/antigravity/scratch/habitnext1-sliceO" && gh pr create --base main --head feat/slice-O-location-foundation --title "Slice O — location foundation" --body "opt-in city-level completion location. Spec: docs/superpowers/specs/2026-06-01-slice-O-location-foundation-design.md"
```

---

## Self-Review Notes

**Spec coverage:**
- Spec §4 Schema → Task 1
- Spec §5.3 + §8.2 離線城市 → Task 2
- Spec §5.1 geolocation helper → Task 3
- Spec §6 資料流（完成抓座標）→ Task 6
- Spec §5.2 API 改動 → Tasks 4 (tasks/[id]) + 5 (profile)
- Spec §7 隱私 opt-in 開關 → Task 7
- Spec §5.1 LocationChip + §6 手動 fallback → Tasks 8/9/10
- Spec §9 Acceptance → Task 11 manual verification

**Placeholder scan:** cities.js ships a concrete 47-city list (real data, not a placeholder; explicitly extensible). All steps have real code/commands. Task 7/9 note "confirm existing callback name via grep" — that's a runtime integration check against existing code, with a concrete fallback provided, not a placeholder.

**Type consistency:**
- `getCachedPosition({maxAgeMs})` / `nearestCity(lat,lng)` / `searchCities(q)` consistent across Tasks 2/3/6/8
- `historyUpdate.{lat,lng,city}` consistent across Tasks 4/6/9/10
- `locationByDate` map consistent across Tasks 6/9/10
- `onPickLocation(task, dateStr, cityName)` consistent across Tasks 9/10 + MainApp handler
- `trackLocation` consistent across Tasks 1/5/6/7

**Worktree note:** All commands target `habitnext1-sliceO` worktree. Merge step explicitly avoids fighting the parallel session on the shared main checkout.
