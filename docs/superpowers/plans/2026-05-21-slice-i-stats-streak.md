# Slice I — Stats + Streak Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a new "統計" sidebar tab that renders 5 widgets (StreakHero, CompletionRateCards, DomainBreakdownChart, WeeklyHeatmap, TaskStreakList) computed from existing `TaskHistory` data. **Schema unchanged** — read-only slice.

**Architecture:** Pure stats lib (`src/lib/stats.js`, no Prisma) → single `/api/stats` aggregator endpoint → `StatsView` parent that fans out to 5 sub-widgets. Recharts for the bar chart, hand-rolled Tailwind grid for the heatmap. TDD on the lib first.

**Tech Stack:** Prisma 5 + Vercel Postgres, Next.js 14 App Router, React 18, Tailwind, lucide-react. **New dep:** `recharts`.

**Spec:** [`docs/superpowers/specs/2026-05-21-slice-i-stats-streak-design.md`](../specs/2026-05-21-slice-i-stats-streak-design.md)

---

## File Structure

### Created
| Path | Responsibility |
|---|---|
| `web-app/src/lib/stats.js` | Pure aggregation functions; no Prisma import |
| `web-app/src/__tests__/lib/stats.test.js` | Unit tests (TDD — written first) |
| `web-app/src/app/api/stats/route.js` | GET handler; fetches DB rows, calls lib, returns bundle |
| `web-app/src/__tests__/api/stats.test.js` | API route integration test (mock Prisma) |
| `web-app/src/components/StatsView.jsx` | Parent layout |
| `web-app/src/components/stats/StreakHero.jsx` | |
| `web-app/src/components/stats/CompletionRateCards.jsx` | |
| `web-app/src/components/stats/DomainBreakdownChart.jsx` | Recharts BarChart |
| `web-app/src/components/stats/WeeklyHeatmap.jsx` | CSS-grid 12×7 |
| `web-app/src/components/stats/TaskStreakList.jsx` | |

### Modified
| Path | Change |
|---|---|
| `web-app/package.json` | Add `recharts` dependency |
| `web-app/src/components/MainApp.jsx` | New sidebar button + `currentView='stats'` render block |

### Untouched
- `web-app/prisma/schema.prisma` — zero schema changes
- Any seed scripts — no new data

---

## Task 1: Install recharts

**Files:**
- Modify: `web-app/package.json`, `web-app/package-lock.json`

- [ ] **Step 1: Install**

```bash
cd /Users/johnson/habitnext1/web-app && npm install recharts
```

- [ ] **Step 2: Sanity check bundle hint**

```bash
cd /Users/johnson/habitnext1/web-app && node -e "console.log(require('recharts/package.json').version)"
```

Expected: a `2.x.x` version number prints. No error means resolution works.

- [ ] **Step 3: Commit**

```bash
cd /Users/johnson/habitnext1 && git add web-app/package.json web-app/package-lock.json && git commit -m "chore(deps): add recharts for Slice I stats page"
```

---

## Task 2: `stats.js` pure lib (TDD)

**Files:**
- Create: `web-app/src/__tests__/lib/stats.test.js`
- Create: `web-app/src/lib/stats.js`

### Step 1: Write failing tests first

Create `web-app/src/__tests__/lib/stats.test.js` with the following test cases (each as its own `test()` block):

```js
const { computeStats } = require('../../lib/stats');

// Helper to build a TaskHistory row
const h = (taskId, date, completed) => ({ taskId, date, completed });
// Helper to build a Task row
const t = (id, title, category, identity = null) => ({ id, title, category, identity });
// Helper to build a HabitCategory row
const c = (name, color, order) => ({ name, color, icon: 'Dna', order });

describe('computeStats', () => {
  const today = '2026-05-21';

  test('empty input yields zeros and empty arrays, no throw', () => {
    const s = computeStats([], [], [], today);
    expect(s.overall.currentStreak).toBe(0);
    expect(s.overall.longestStreak).toBe(0);
    expect(s.overall.todayCompleted).toBe(false);
    expect(s.completionRate.last7).toBe(0);
    expect(s.completionRate.last30).toBe(0);
    expect(s.domainBreakdown).toEqual([]);
    expect(s.heatmap).toHaveLength(84);  // still pads
    expect(s.topTaskStreaks).toEqual([]);
  });

  test('5 consecutive completed days ending today → currentStreak = 5', () => {
    const tasks = [t('A', 'Drink water', '飲食')];
    const history = ['2026-05-17','2026-05-18','2026-05-19','2026-05-20','2026-05-21']
      .map(d => h('A', d, true));
    const s = computeStats(history, tasks, [c('飲食','#0ea5e9',4)], today);
    expect(s.overall.currentStreak).toBe(5);
    expect(s.overall.todayCompleted).toBe(true);
  });

  test('5 consecutive days ending YESTERDAY, today empty → currentStreak still 5 (grace)', () => {
    const tasks = [t('A', 'Drink water', '飲食')];
    const history = ['2026-05-16','2026-05-17','2026-05-18','2026-05-19','2026-05-20']
      .map(d => h('A', d, true));
    const s = computeStats(history, tasks, [c('飲食','#0ea5e9',4)], today);
    expect(s.overall.currentStreak).toBe(5);
    expect(s.overall.todayCompleted).toBe(false);
  });

  test('streak broken by gap before today → currentStreak resets to 1', () => {
    const tasks = [t('A', 'X', '飲食')];
    const history = [
      h('A', '2026-05-15', true),  // gap on 16-19
      h('A', '2026-05-20', false), // explicit miss
      h('A', '2026-05-21', true),
    ];
    const s = computeStats(history, tasks, [c('飲食','#0ea5e9',4)], today);
    expect(s.overall.currentStreak).toBe(1);
  });

  test('completionRate.last7 approximation: 5 tasks × 7 days = 35 expected, 21 completed → 0.6', () => {
    const tasks = ['A','B','C','D','E'].map(id => t(id, id, '飲食'));
    const dates = ['2026-05-15','2026-05-16','2026-05-17','2026-05-18','2026-05-19','2026-05-20','2026-05-21'];
    const history = [];
    // 21 completed rows scattered
    let n = 21;
    for (const taskId of ['A','B','C','D','E']) {
      for (const d of dates) {
        if (n > 0) { history.push(h(taskId, d, true)); n--; }
        else history.push(h(taskId, d, false));
      }
    }
    const s = computeStats(history, tasks, [c('飲食','#0ea5e9',4)], today);
    expect(Math.round(s.completionRate.last7 * 100)).toBe(60);
  });

  test('per-task topStreaks sorted by currentStreak desc, ties broken by longestStreak desc', () => {
    const tasks = [
      t('A', 'Long current', '飲食'),
      t('B', 'Short current high longest', '飲食'),
      t('C', 'Same current as A but lower longest', '飲食'),
    ];
    const history = [
      ...['2026-05-19','2026-05-20','2026-05-21'].map(d => h('A', d, true)),  // current=3, longest=3
      ...['2026-05-21'].map(d => h('B', d, true)),                              // current=1
      ...['2026-04-01','2026-04-02','2026-04-03','2026-04-04','2026-04-05'].map(d => h('B', d, true)), // longest=5
      ...['2026-05-19','2026-05-20','2026-05-21'].map(d => h('C', d, true)),  // current=3, longest=3
    ];
    const s = computeStats(history, tasks, [c('飲食','#0ea5e9',4)], today);
    expect(s.topTaskStreaks.map(t => t.taskId)).toEqual(['A', 'C', 'B']);
  });

  test('domainBreakdown follows HabitCategory.order, only counts last 30 days', () => {
    const tasks = [t('A', 'X', '飲食'), t('B', 'Y', '運動')];
    const history = [
      h('A', '2026-05-21', true),     // in window
      h('A', '2026-05-20', true),     // in window
      h('B', '2026-05-19', true),     // in window
      h('A', '2026-01-01', true),     // outside 30d → ignored
    ];
    const categories = [c('運動','#22c55e',5), c('飲食','#0ea5e9',4)];
    const s = computeStats(history, tasks, categories, today);
    expect(s.domainBreakdown.map(d => d.name)).toEqual(['飲食', '運動']);  // by order asc
    expect(s.domainBreakdown.find(d => d.name === '飲食').count).toBe(2);
    expect(s.domainBreakdown.find(d => d.name === '運動').count).toBe(1);
  });

  test('orphan history rows (task deleted) still feed overall stats but not topTaskStreaks', () => {
    const tasks = [];  // task A deleted
    const history = [h('A', '2026-05-21', true)];
    const s = computeStats(history, tasks, [], today);
    expect(s.overall.currentStreak).toBe(1);
    expect(s.topTaskStreaks).toEqual([]);
  });
});
```

Run: `cd /Users/johnson/habitnext1/web-app && npm test -- stats.test.js` — should fail (no impl yet).

### Step 2: Implement `stats.js`

Create `web-app/src/lib/stats.js` with this shape:

```js
function computeStats(history, tasks, categories, todayStr) {
  // history: [{taskId, date: 'YYYY-MM-DD', completed}]
  // tasks: [{id, title, category, identity}]
  // categories: [{name, color, icon, order}]
  // todayStr: 'YYYY-MM-DD'

  const overall = computeOverallStreak(history, todayStr);
  const completionRate = computeCompletionRate(history, tasks, todayStr);
  const domainBreakdown = computeDomainBreakdown(history, tasks, categories, todayStr);
  const heatmap = computeHeatmap(history, todayStr);
  const topTaskStreaks = computeTopTaskStreaks(history, tasks, todayStr).slice(0, 5);
  return { overall, completionRate, domainBreakdown, heatmap, topTaskStreaks };
}

// All helpers below operate on plain strings/numbers — no Date math except YYYY-MM-DD arithmetic via a small `addDays(str, n)` helper.

module.exports = { computeStats };
```

Key implementation notes:
- `addDays(dateStr, n)`: parse `YYYY-MM-DD`, use `Date.UTC(y, m-1, d)`, add n × 86400000 ms, reformat. Pure, deterministic, no TZ surprises.
- Overall streak: walk from `todayStr` backwards. If today has any completed=true row, count it and move to yesterday; if today has zero rows OR only completed=false, do **not** count today (grace) but continue with yesterday. If yesterday has no completed=true → break.
- Longest streak: build `Set` of dates that have any `completed: true` row, sort, scan for longest consecutive run.
- Completion rate window: days = last N. Build set of `taskIds` that have **any** history row in window (active proxy). Numerator = count of `(taskId, date)` pairs with completed=true in window. Denominator = `|taskIds| × N`. If denom = 0 → 0.
- Heatmap: always pad to 84 entries from `today - 83d` to `today`. Each entry `{date, count}` where count is # of completed=true rows that date.
- Top task streaks: for each task in `tasks`, compute current + longest. Filter out tasks with currentStreak=0 AND longestStreak=0. Sort: currentStreak desc, then longestStreak desc, then title asc.

### Step 3: Run tests until green

```bash
cd /Users/johnson/habitnext1/web-app && npm test -- stats.test.js
```

All 8 tests should pass.

### Step 4: Commit

```bash
cd /Users/johnson/habitnext1 && git add web-app/src/lib/stats.js web-app/src/__tests__/lib/stats.test.js && git commit -m "feat(lib): pure stats aggregation with 8 unit tests for Slice I"
```

---

## Task 3: `/api/stats` route

**Files:**
- Create: `web-app/src/app/api/stats/route.js`
- Create: `web-app/src/__tests__/api/stats.test.js`

### Step 1: Implement handler

`web-app/src/app/api/stats/route.js`:

```js
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { computeStats } from '@/lib/stats';

const prisma = new PrismaClient();

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const today = searchParams.get('today');  // YYYY-MM-DD, client-provided to respect local date

  if (!userId || !today) {
    return NextResponse.json({ error: 'userId and today required' }, { status: 400 });
  }

  // Fetch last 84 days of TaskHistory + all tasks (active + recent) + all categories
  const cutoff = addDays(today, -83);

  const [history, tasks, categories] = await Promise.all([
    prisma.taskHistory.findMany({
      where: { task: { userId }, date: { gte: cutoff } },
      select: { taskId: true, date: true, completed: true },
    }),
    prisma.task.findMany({
      where: { userId },
      select: { id: true, title: true, category: true, identity: true },
    }),
    prisma.habitCategory.findMany({
      select: { name: true, color: true, icon: true, order: true },
      orderBy: { order: 'asc' },
    }),
  ]);

  const stats = computeStats(history, tasks, categories, today);
  return NextResponse.json(stats);
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const t = Date.UTC(y, m - 1, d) + n * 86400000;
  const dt = new Date(t);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth()+1).padStart(2,'0')}-${String(dt.getUTCDate()).padStart(2,'0')}`;
}
```

### Step 2: Integration test

`web-app/src/__tests__/api/stats.test.js` — mock Prisma per the pattern in existing `habits.test.js`. Assert:
- Missing `userId` → 400
- Missing `today` → 400
- Happy path: prisma mocks return fixed rows → response.json() shape matches `{overall, completionRate, domainBreakdown, heatmap, topTaskStreaks}` with `heatmap.length === 84`.

### Step 3: Run

```bash
cd /Users/johnson/habitnext1/web-app && npm test -- stats
```

Both lib + API tests should pass.

### Step 4: Manual smoke

```bash
cd /Users/johnson/habitnext1/web-app && npm run dev
```

Then visit `http://localhost:3000/api/stats?userId=<real-user-id>&today=2026-05-21` and confirm valid JSON returned.

### Step 5: Commit

```bash
cd /Users/johnson/habitnext1 && git add web-app/src/app/api/stats web-app/src/__tests__/api/stats.test.js && git commit -m "feat(api): GET /api/stats single-bundle aggregation endpoint"
```

---

## Task 4: UI widgets

**Files:**
- Create: `web-app/src/components/StatsView.jsx`
- Create: `web-app/src/components/stats/{StreakHero,CompletionRateCards,DomainBreakdownChart,WeeklyHeatmap,TaskStreakList}.jsx`

### Step 1: `StatsView.jsx` — parent

Owns the fetch + loading + empty-state logic:

```jsx
'use client';
import { useEffect, useState } from 'react';
import StreakHero from './stats/StreakHero';
import CompletionRateCards from './stats/CompletionRateCards';
import DomainBreakdownChart from './stats/DomainBreakdownChart';
import WeeklyHeatmap from './stats/WeeklyHeatmap';
import TaskStreakList from './stats/TaskStreakList';

export default function StatsView({ userId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    fetch(`/api/stats?userId=${userId}&today=${todayStr}`)
      .then(r => r.json())
      .then(s => { setStats(s); setLoading(false); });
  }, [userId]);

  if (loading) return <div className="p-6 text-gray-500">載入中…</div>;
  if (!stats || (stats.heatmap.every(d => d.count === 0))) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>打完第一個卡再回來看 📊</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 max-w-4xl mx-auto">
      <StreakHero overall={stats.overall} />
      <CompletionRateCards rate={stats.completionRate} />
      <DomainBreakdownChart breakdown={stats.domainBreakdown} />
      <WeeklyHeatmap heatmap={stats.heatmap} />
      <TaskStreakList topTaskStreaks={stats.topTaskStreaks} />
    </div>
  );
}
```

### Step 2: 5 sub-widgets

Each sub-widget is < 80 LOC. Patterns:
- **StreakHero**: large number + 小字 "你的最長紀錄 X 天"; if `todayCompleted=false` show subtle "今天還沒打卡，加油 💪"
- **CompletionRateCards**: 兩張 card 並排，數字大、`% formatted`
- **DomainBreakdownChart**: `<ResponsiveContainer><BarChart>` from recharts, Cell color = `domainBreakdown[i].color`, no max-value label, no judgmental copy (per spec §11.5)
- **WeeklyHeatmap**: CSS grid `grid-cols-12 grid-rows-7`, each cell `bg-gray-100` / `bg-emerald-200` / `bg-emerald-400` / `bg-emerald-600` based on count buckets (0 / 1 / 2-3 / 4+); hover via `title` attribute (`"2026-05-21 · 3 個完成"`)
- **TaskStreakList**: rows with title + identity (small + grey) + "目前 X 天 · 最長 Y 天"; if list empty render nothing (parent already gated empty state)

### Step 3: Component tests

For each widget create a sibling `*.test.jsx` under `src/__tests__/components/stats/`:
- Render with fixture, assert key text appears
- `StreakHero` with `currentStreak=0` and `=100` — no broken layout
- `WeeklyHeatmap` — assert 84 cells rendered

Run: `cd /Users/johnson/habitnext1/web-app && npm test`

### Step 4: Commit

```bash
cd /Users/johnson/habitnext1 && git add web-app/src/components/StatsView.jsx web-app/src/components/stats web-app/src/__tests__/components/stats && git commit -m "feat(ui): 5 stats widgets + StatsView parent for Slice I"
```

---

## Task 5: Wire MainApp sidebar

**Files:**
- Modify: `web-app/src/components/MainApp.jsx`

### Step 1: Add sidebar button

Locate sidebar nav block (~lines 511–540 per Slice I spec brief). Add a new button between "日曆" (`dashboard_detail`) and "成就" (`badges`):

```jsx
<button
  onClick={() => setCurrentView('stats')}
  className={/* match sibling button className pattern */}
>
  <BarChart3 size={20} />
  統計
</button>
```

Import `BarChart3` from `lucide-react` at top of file (add to existing lucide imports).

### Step 2: Add render block

Locate the conditional render section (~line 570+). Add after the badges block:

```jsx
{currentView === 'stats' && <StatsView userId={user.id} />}
```

Import at top: `import StatsView from './StatsView';`

### Step 3: Manual verification

```bash
cd /Users/johnson/habitnext1/web-app && npm run dev
```

- [ ] Sidebar shows new "統計" button between 日曆 and 成就
- [ ] Click → enters stats view, loads data, all 5 widgets render
- [ ] All 4 previous tabs (今日 / 計畫總覽 / 日曆 / 成就) still work — regression check
- [ ] On a fresh user with no history: empty state copy shows, no crash
- [ ] On mobile 375px (DevTools): layout doesn't break, heatmap scrolls or fits

### Step 4: Commit

```bash
cd /Users/johnson/habitnext1 && git add web-app/src/components/MainApp.jsx && git commit -m "feat(ui): sidebar 統計 entry + render wiring for Slice I"
```

---

## Task 6: Final verification + push

- [ ] `npm test` — all green
- [ ] `npm run build` — no errors
- [ ] Visual smoke pass on dev server for both a populated and an empty user
- [ ] Bundle delta check:
  ```bash
  cd /Users/johnson/habitnext1/web-app && npm run build 2>&1 | grep -E "First Load|/stats"
  ```
  Confirm First Load JS for the page hosting StatsView did not grow by more than ~150kb gzip vs. master.

- [ ] **Push branch and open PR**

```bash
cd /Users/johnson/habitnext1 && git push -u origin feat/slice-i-stats-streak
```

PR body should link to the spec and this plan.

---

## Done Criteria (mirror of spec §10)

- [x] Sidebar "統計" button visible
- [x] 5 widgets render with data
- [x] Empty state renders cleanly
- [x] `src/lib/stats.js` pure, no Prisma import
- [x] `npm test` green, ≥ 8 stats lib test cases
- [x] `GET /api/stats` returns spec-shaped payload
- [x] All previous tabs still work
- [x] Mobile 375px doesn't break
- [x] Bundle delta < 150kb gzip
