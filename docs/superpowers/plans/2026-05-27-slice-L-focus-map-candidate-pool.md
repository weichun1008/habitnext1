# Slice L — 候選池 + 焦點地圖 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 BJ Fogg 的 Behavior Swarm + Focus Mapping 流程嵌入新增習慣體驗：candidate → 評分 → 啟用，daily view 自動跳出 banner 引導。

**Architecture:** Task 加 status 欄位（candidate / active / archived）+ userImpact/userAbility/ratedAt + officialHabitId FK。新增 `FocusMapModal` 含 sliders/迷你 map/4 象限分組。Daily view 加 banner。TaskLibraryModal save 改成寫 candidate + 維持 modal 開著。批次評分用新 API `/api/tasks/batch-rate`。

**Tech Stack:** Prisma 5 + Vercel Postgres、Next.js 14 App Router、React 18、Tailwind、lucide-react、Jest 純函數 TDD。

**Spec:** [`docs/superpowers/specs/2026-05-27-slice-L-focus-map-candidate-pool-design.md`](../specs/2026-05-27-slice-L-focus-map-candidate-pool-design.md)

---

## Open Questions Resolved（寫 plan 前定錨）

Spec §9 5 條開放問題：

1. **Banner dismiss 持久化**：v1 用 **per-session in-memory state**（重新整理會再出現）。簡單、無 schema 變動。v2 可加 `User.bannerDismissedAt` 持久化。
2. **OfficialHabit fallback 對應**：**Task 加 `officialHabitId String?` FK**（onDelete: SetNull）。比 name-match 乾淨，且 TaskLibraryModal save 時知道 officialHabit.id、可以直接寫入。
3. **TaskLibraryModal save 後 UX**：**維持 modal 開著 + 顯示 toast「+1 候選」+ 底部 persist banner 顯示「已加 N 個 · 完成後一起評分」**。鼓勵批次。
4. **「跳過」象限 confirm**：**一鍵全刪 + 單一 confirm dialog**。
5. **Profile 候選池入口**：**v1 不做**，靠 daily banner 即可。

---

## File Structure

### Created
| Path | Responsibility |
|---|---|
| `web-app/scripts/backfill-task-status.js` | 一次性 migration：既有 Task `status` 預設 'active' |
| `web-app/src/lib/focusMap.js` | 純函數 — quadrantOf / recommendDefaults / QUADRANTS const |
| `web-app/src/__tests__/lib/focusMap.test.js` | 單元測試 |
| `web-app/src/app/api/tasks/candidates/route.js` | GET candidates 含 OfficialHabit fallback |
| `web-app/src/app/api/tasks/batch-rate/route.js` | PATCH 批次評分 |
| `web-app/src/components/focusMap/MiniMap.jsx` | 迷你 80×80 map（即時 chip 位置）|
| `web-app/src/components/focusMap/HabitRatingRow.jsx` | 每個 habit 一個 row（2 slider + checkbox + warning）|
| `web-app/src/components/focusMap/QuadrantSection.jsx` | 4 象限分組區塊（標題 + 教學文 + rows）|
| `web-app/src/components/FocusMapModal.jsx` | 主 modal — 拼裝迷你 map + 4 sections + CTA |

### Modified
| Path | Change |
|---|---|
| `web-app/prisma/schema.prisma` | Task 加 status / userImpact / userAbility / ratedAt / officialHabitId + OfficialHabit reverse relation |
| `web-app/src/app/api/tasks/route.js` | POST 接受 status + officialHabitId；GET 加 `?status=` filter（預設 active）|
| `web-app/src/components/TaskLibraryModal.jsx` | save 帶 status='candidate' + officialHabitId、save 後維持 modal + toast、底部 persist banner |
| `web-app/src/components/TaskFormModal.jsx` | 加「直接啟用」checkbox（手動建立 power-user 跳過候選池）|
| `web-app/src/components/MainApp.jsx` | Daily view 加 candidate banner、加 isFocusMapModalOpen state、handleSaveTask 從 candidates 路徑帶 status |
| `web-app/src/components/AspirationRecommendationPanel.jsx` | habit pick 走 TaskLibraryModal 已加入 candidate flow — 不用改 |
| `web-app/src/components/TemplateExplorer.jsx` | template join 仍 active — 不用改 |

---

## Task 1: Schema 升級 + backfill

**Files:**
- Modify: `web-app/prisma/schema.prisma`
- Create: `web-app/scripts/backfill-task-status.js`

- [ ] **Step 1: 修改 Task model**

打開 `web-app/prisma/schema.prisma`，找到 `model Task`。在 `isLocked Boolean @default(false)` 之後、`expertName` 之前加入：

```prisma
model Task {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  title        String
  details      String?
  cue          String?
  identity     String?
  type         String
  category     String
  frequency    String

  recurrence   Json
  reminder     Json
  subtasks     Json

  dailyTarget  Int?
  unit         String?
  stepValue    Int?
  date         String?
  time         String?

  assignmentId String?
  isLocked     Boolean  @default(false)
  // ★ Slice L — candidate pool + focus map
  status       String   @default("candidate")  // candidate | active | archived
  userImpact   Int?                             // 1-5, user-rated (overrides OfficialHabit default)
  userAbility  Int?                             // 1-5
  ratedAt      DateTime?
  officialHabitId String?                       // FK fallback for slider seed
  officialHabit   OfficialHabit? @relation(fields: [officialHabitId], references: [id], onDelete: SetNull)
  // ★ end Slice L

  expertName   String?
  metadata     Json?

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  history          TaskHistory[]
  aspirationHabits AspirationHabit[]
}
```

然後找到 `model OfficialHabit`，在它的尾部（`updatedAt` 之後、`}` 之前）加 reverse relation：

```prisma
model OfficialHabit {
  // ... existing fields ...
  updatedAt   DateTime @updatedAt

  tasks       Task[]   // ★ Slice L — reverse relation for officialHabitId FK
}
```

- [ ] **Step 2: Push schema**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && npx prisma db push --accept-data-loss
```

Expected ending: `Your database is now in sync with your Prisma schema.`

**注意**：這個時候新欄位都 nullable / 有 default，舊 row 不會壞，但 `status` 預設值是 `'candidate'`，所有既有 task 都會被當成 candidate → daily view 會空白。**Step 3 必須立刻跑 backfill**。

- [ ] **Step 3: 重生 Prisma client**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx prisma generate
```

Expected: `Generated Prisma Client`.

- [ ] **Step 4: 寫 backfill script**

建立 `web-app/scripts/backfill-task-status.js`：

```js
// scripts/backfill-task-status.js
// One-time migration after Slice L schema push.
// Task.status defaulted to 'candidate', so every pre-existing task would
// disappear from the daily view. Flip them to 'active'. Idempotent —
// re-running only touches rows still without an explicit status.

require('./lib/env');
const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();

  // Anything written before Slice L should be 'active'. New tasks created
  // by the post-Slice-L flow will land as 'candidate' by default.
  // We treat 'candidate' default as the migration signal — flip back to
  // 'active' for any task whose createdAt < migration cutoff.
  // Simpler: flip every row that's still on the default 'candidate' AND
  // was created before now. The seed/import paths will explicitly set
  // 'active' going forward so they won't be touched again.
  const cutoff = new Date();
  const result = await prisma.task.updateMany({
    where: { status: 'candidate', createdAt: { lt: cutoff } },
    data: { status: 'active' },
  });
  console.log(`Backfilled ${result.count} tasks from candidate → active`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
```

- [ ] **Step 5: 跑 backfill**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && node scripts/backfill-task-status.js
```

Expected: `Backfilled N tasks from candidate → active`（N 應該是目前 DB 全部 task 數）

- [ ] **Step 6: 驗證**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && node -e "
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const byStatus = await p.task.groupBy({ by: ['status'], _count: true });
  console.log('Task counts by status:', byStatus);
  const sample = await p.task.findFirst({ select: { id: true, title: true, status: true, userImpact: true, ratedAt: true, officialHabitId: true } });
  console.log('Sample task:', sample);
  await p.\$disconnect();
})();
"
```

Expected: 所有 task 都 `status: 'active'`，sample row 有 `userImpact: null, ratedAt: null, officialHabitId: null`。

- [ ] **Step 7: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/prisma/schema.prisma web-app/scripts/backfill-task-status.js && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(db): Slice L — Task.status/userImpact/userAbility/ratedAt/officialHabitId + backfill"
```

---

## Task 2: `lib/focusMap.js` + TDD tests

**Files:**
- Create: `web-app/src/lib/focusMap.js`
- Create: `web-app/src/__tests__/lib/focusMap.test.js`

### Step 1: 寫失敗的測試

建立 `web-app/src/__tests__/lib/focusMap.test.js`：

```js
const {
  QUADRANTS,
  quadrantOf,
  recommendDefaults,
  sliderSeedFor,
} = require('../../lib/focusMap');

describe('QUADRANTS', () => {
  it('has 4 entries with required fields', () => {
    expect(Object.keys(QUADRANTS).sort()).toEqual(['background', 'big_fish', 'golden', 'skip']);
    for (const q of Object.values(QUADRANTS)) {
      expect(typeof q.label).toBe('string');
      expect(typeof q.advice).toBe('string');
      expect(['recommended', 'optional', 'park', 'skip']).toContain(q.rec);
    }
  });
});

describe('quadrantOf', () => {
  it('returns golden for impact>=4 AND ability>=4', () => {
    expect(quadrantOf(5, 5)).toBe('golden');
    expect(quadrantOf(4, 4)).toBe('golden');
    expect(quadrantOf(4, 5)).toBe('golden');
  });

  it('returns background for impact<=3 AND ability>=4', () => {
    expect(quadrantOf(3, 4)).toBe('background');
    expect(quadrantOf(1, 5)).toBe('background');
  });

  it('returns big_fish for impact>=4 AND ability<=3', () => {
    expect(quadrantOf(4, 3)).toBe('big_fish');
    expect(quadrantOf(5, 1)).toBe('big_fish');
  });

  it('returns skip for impact<=3 AND ability<=3', () => {
    expect(quadrantOf(3, 3)).toBe('skip');
    expect(quadrantOf(1, 1)).toBe('skip');
  });

  it('clamps non-numeric to 3 (defensive)', () => {
    expect(quadrantOf(null, null)).toBe('skip');
    expect(quadrantOf(undefined, undefined)).toBe('skip');
  });
});

describe('recommendDefaults', () => {
  it('returns Set of golden quadrant task ids, capped at 3', () => {
    const candidates = [
      { id: 't1', userImpact: 5, userAbility: 5 },
      { id: 't2', userImpact: 5, userAbility: 4 },
      { id: 't3', userImpact: 4, userAbility: 5 },
      { id: 't4', userImpact: 4, userAbility: 4 },
      { id: 't5', userImpact: 2, userAbility: 5 },
      { id: 't6', userImpact: 5, userAbility: 2 },
    ];
    const result = recommendDefaults(candidates);
    expect(result.size).toBe(3);
    // Top 3 by sum: t1(10), t2(9), t3(9)
    expect(result.has('t1')).toBe(true);
    expect(result.has('t5')).toBe(false); // background
    expect(result.has('t6')).toBe(false); // big_fish
  });

  it('returns empty Set when no golden candidates', () => {
    const candidates = [{ id: 't1', userImpact: 2, userAbility: 2 }];
    expect(recommendDefaults(candidates).size).toBe(0);
  });

  it('handles empty input', () => {
    expect(recommendDefaults([]).size).toBe(0);
    expect(recommendDefaults(null).size).toBe(0);
  });

  it('uses fallback impact/ability when user values are null', () => {
    const candidates = [
      { id: 't1', userImpact: null, userAbility: null, officialHabit: { impact: 5, ability: 5 } },
      { id: 't2', userImpact: 3, userAbility: 3, officialHabit: { impact: 5, ability: 5 } },
    ];
    const result = recommendDefaults(candidates);
    expect(result.has('t1')).toBe(true);  // golden via fallback
    expect(result.has('t2')).toBe(false); // skip via user override
  });
});

describe('sliderSeedFor', () => {
  it('prefers userImpact/userAbility over fallback', () => {
    const c = { userImpact: 2, userAbility: 4, officialHabit: { impact: 5, ability: 5 } };
    expect(sliderSeedFor(c)).toEqual({ impact: 2, ability: 4 });
  });

  it('falls back to officialHabit values', () => {
    const c = { userImpact: null, userAbility: null, officialHabit: { impact: 4, ability: 3 } };
    expect(sliderSeedFor(c)).toEqual({ impact: 4, ability: 3 });
  });

  it('defaults to 3/3 when no source available', () => {
    expect(sliderSeedFor({})).toEqual({ impact: 3, ability: 3 });
    expect(sliderSeedFor({ userImpact: null, officialHabit: null })).toEqual({ impact: 3, ability: 3 });
  });
});
```

- [ ] **Step 2: Run test — confirm FAIL**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest src/__tests__/lib/focusMap.test.js
```

Expected: `Cannot find module '../../lib/focusMap'`.

### Step 3: 實作 `lib/focusMap.js`

建立 `web-app/src/lib/focusMap.js`：

```js
// src/lib/focusMap.js
// Pure helpers for Slice L — no Prisma, no I/O.
// Spec: docs/superpowers/specs/2026-05-27-slice-L-focus-map-candidate-pool-design.md

const QUADRANTS = {
  golden:     { label: '🌟 黃金行為', tone: 'amber', rec: 'recommended', advice: '推薦啟用 — 高影響又易做到' },
  background: { label: '🌱 順手習慣', tone: 'gray',  rec: 'optional',    advice: '可加可不加 — 容易做但影響有限' },
  big_fish:   { label: '⏳ 大魚',     tone: 'gray',  rec: 'park',        advice: 'Fogg：先建立基本技能再來' },
  skip:       { label: '🗑️ 跳過',     tone: 'gray',  rec: 'skip',        advice: 'Fogg：別耗 willpower 在這上' },
};

// Map an (impact, ability) pair to its quadrant key.
// Boundary rule: high = >=4, low = <=3.
function quadrantOf(impact, ability) {
  const i = typeof impact === 'number' ? impact : 3;
  const a = typeof ability === 'number' ? ability : 3;
  if (i >= 4 && a >= 4) return 'golden';
  if (i <= 3 && a >= 4) return 'background';
  if (i >= 4 && a <= 3) return 'big_fish';
  return 'skip';
}

// Returns Set<id> of candidates to pre-check on the rating page.
// Golden quadrant only, capped at 3 by (impact+ability) sum.
// Uses sliderSeedFor() to read the effective impact/ability (user → fallback → 3).
function recommendDefaults(candidates) {
  if (!Array.isArray(candidates)) return new Set();
  const golden = candidates
    .map(c => ({ c, seed: sliderSeedFor(c) }))
    .filter(({ seed }) => quadrantOf(seed.impact, seed.ability) === 'golden')
    .sort((a, b) => (b.seed.impact + b.seed.ability) - (a.seed.impact + a.seed.ability))
    .slice(0, 3)
    .map(({ c }) => c.id);
  return new Set(golden);
}

// Resolve the effective impact/ability for a candidate task.
// Priority: userImpact/userAbility (already rated) → officialHabit defaults → 3.
function sliderSeedFor(candidate) {
  if (!candidate) return { impact: 3, ability: 3 };
  const impact = typeof candidate.userImpact === 'number'
    ? candidate.userImpact
    : (candidate.officialHabit?.impact ?? 3);
  const ability = typeof candidate.userAbility === 'number'
    ? candidate.userAbility
    : (candidate.officialHabit?.ability ?? 3);
  return { impact, ability };
}

module.exports = {
  QUADRANTS,
  quadrantOf,
  recommendDefaults,
  sliderSeedFor,
};
```

- [ ] **Step 4: Run tests — confirm PASS**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest src/__tests__/lib/focusMap.test.js
```

Expected: `Tests: 15 passed, 15 total`

- [ ] **Step 5: Run full suite to confirm no regression**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -3
```

Expected: 213 passing (198 existing + 15 new).

- [ ] **Step 6: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/lib/focusMap.js web-app/src/__tests__/lib/focusMap.test.js && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(lib): focusMap helpers — QUADRANTS / quadrantOf / recommendDefaults / sliderSeedFor"
```

---

## Task 3: API — 既有改動 + 2 個新 endpoints

**Files:**
- Modify: `web-app/src/app/api/tasks/route.js`
- Create: `web-app/src/app/api/tasks/candidates/route.js`
- Create: `web-app/src/app/api/tasks/batch-rate/route.js`

### Step 1: 改 `/api/tasks/route.js` GET — 加 status filter

打開 `web-app/src/app/api/tasks/route.js`，找到 GET handler。原本：

```js
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const assignmentId = searchParams.get('assignmentId');

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    try {
        const where = { userId };
        if (assignmentId) where.assignmentId = assignmentId;
        const tasks = await prisma.task.findMany({
            where,
            include: { history: true },
            orderBy: { createdAt: 'asc' }
        });
        return NextResponse.json(tasks);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }
}
```

改成（加 status filter — daily view 只想看 active）：

```js
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const assignmentId = searchParams.get('assignmentId');
    // Slice L — daily view defaults to active only. Pass ?status=candidate
    // or ?status=all to see other statuses.
    const status = searchParams.get('status') || 'active';

    if (!userId) {
        return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    try {
        const where = { userId };
        if (assignmentId) where.assignmentId = assignmentId;
        if (status !== 'all') where.status = status;
        const tasks = await prisma.task.findMany({
            where,
            include: { history: true },
            orderBy: { createdAt: 'asc' }
        });
        return NextResponse.json(tasks);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }
}
```

### Step 2: 改 POST — 接受 status + officialHabitId

在同一個檔案找到 POST handler。在 body destructure 加 status + officialHabitId，並在 create 的 data 加：

```js
export async function POST(request) {
    try {
        const body = await request.json();
        const { userId, ...taskData } = body;

        if (!userId) {
            return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        // Slice L — explicit status (default 'candidate' for new manual adds;
        // template join paths pass 'active'). officialHabitId is the FK that
        // lets focus-map sliders seed from the catalog default.
        const status = ['candidate', 'active', 'archived'].includes(taskData.status) ? taskData.status : 'candidate';

        const created = await prisma.task.create({
            data: {
                userId,
                title: taskData.title,
                details: taskData.details ?? null,
                cue: taskData.cue ?? null,
                identity: taskData.identity ?? null,
                type: taskData.type,
                category: taskData.category,
                frequency: taskData.frequency,
                recurrence: taskData.recurrence,
                reminder: taskData.reminder ?? {},
                subtasks: taskData.subtasks ?? [],
                dailyTarget: taskData.dailyTarget ?? null,
                unit: taskData.unit ?? null,
                stepValue: taskData.stepValue ?? null,
                date: taskData.date ?? null,
                time: taskData.time ?? null,
                assignmentId: taskData.assignmentId ?? null,
                isLocked: taskData.isLocked ?? false,
                expertName: taskData.expertName ?? null,
                metadata: taskData.metadata ?? null,
                status,
                officialHabitId: taskData.officialHabitId ?? null,
            },
            include: { history: true },
        });
        return NextResponse.json(created);
    } catch (error) {
        console.error('Create task error:', error);
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }
}
```

**注意**：原檔的 POST 可能用 spread 直接寫 `...taskData`。如果是這樣，務必保留現有邏輯 — 只加 `status` + `officialHabitId` 兩個欄位即可，不要影響其他 field 的 pass-through。檢查現有實作後最小化改動。

### Step 3: 建立 `/api/tasks/candidates/route.js`

```js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/tasks/candidates?userId=
// Returns the user's candidate tasks with the OfficialHabit join so the
// FocusMap sliders can seed from the catalog default impact/ability.
export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    try {
        const candidates = await prisma.task.findMany({
            where: { userId, status: 'candidate' },
            include: {
                officialHabit: { select: { id: true, name: true, impact: true, ability: true, icon: true } },
            },
            orderBy: { createdAt: 'asc' },
        });
        return NextResponse.json(candidates);
    } catch (error) {
        console.error('Fetch candidates error:', error);
        return NextResponse.json({ error: '取得候選清單失敗' }, { status: 500 });
    }
}
```

### Step 4: 建立 `/api/tasks/batch-rate/route.js`

```js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/tasks/batch-rate
// body: { ratings: [{ taskId, userImpact, userAbility, action: 'activate' | 'keep_candidate' | 'archive' }] }
// Updates each task in one transaction. Idempotent — calling again with the
// same payload produces the same state.
export async function PATCH(request) {
    try {
        const body = await request.json();
        const { ratings } = body;

        if (!Array.isArray(ratings) || ratings.length === 0) {
            return NextResponse.json({ error: 'ratings array required' }, { status: 400 });
        }

        const now = new Date();
        const counts = { activate: 0, keep_candidate: 0, archive: 0 };

        await prisma.$transaction(
            ratings.map(r => {
                let status;
                if (r.action === 'activate') status = 'active';
                else if (r.action === 'archive') status = 'archived';
                else status = 'candidate';
                counts[r.action] = (counts[r.action] || 0) + 1;

                return prisma.task.update({
                    where: { id: r.taskId },
                    data: {
                        status,
                        userImpact: typeof r.userImpact === 'number' ? r.userImpact : null,
                        userAbility: typeof r.userAbility === 'number' ? r.userAbility : null,
                        ratedAt: now,
                    },
                });
            })
        );

        return NextResponse.json({ ok: true, counts });
    } catch (error) {
        console.error('Batch rate error:', error);
        return NextResponse.json({ error: '批次評分失敗' }, { status: 500 });
    }
}
```

### Step 5: Smoke test via Prisma

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && node -e "
const {PrismaClient} = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();
(async () => {
  const hash = await bcrypt.hash('test', 10);
  const u = await p.user.upsert({
    where: { phone: '0900000066' },
    update: {},
    create: { nickname: 'sliceLsmoke', phone: '0900000066', countryCode: '+886', password: hash },
  });
  console.log('user:', u.id);

  // Create a candidate task
  const t = await p.task.create({
    data: {
      userId: u.id, title: 'smoke candidate', type: 'binary', category: '飲食', frequency: 'daily',
      recurrence: { type: 'daily', interval: 1, endType: 'never' }, reminder: {}, subtasks: [],
      status: 'candidate',
    },
  });
  console.log('candidate task:', t.id, t.status);

  // Batch-rate to activate
  await p.\$transaction([
    p.task.update({ where: { id: t.id }, data: { status: 'active', userImpact: 5, userAbility: 5, ratedAt: new Date() } }),
  ]);
  const after = await p.task.findUnique({ where: { id: t.id }, select: { status: true, userImpact: true, ratedAt: true } });
  console.log('after batch-rate:', after);

  // Cleanup
  await p.task.delete({ where: { id: t.id } });
  await p.user.delete({ where: { id: u.id } });
  console.log('cleaned');
  await p.\$disconnect();
})();
"
```

Expected: `candidate task: ..., candidate` → `after batch-rate: { status: 'active', userImpact: 5, ratedAt: <Date> }` → `cleaned`

- [ ] **Step 6: Run full test suite**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -3
```

Expected: 213 passing (still no regression).

- [ ] **Step 7: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/app/api/tasks/route.js "web-app/src/app/api/tasks/candidates" "web-app/src/app/api/tasks/batch-rate" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(api): Slice L — tasks status filter + candidates list + batch-rate"
```

---

## Task 4: TaskLibraryModal — save 改成 candidate + maintain modal + toast

**Files:**
- Modify: `web-app/src/components/TaskLibraryModal.jsx`

### Step 1: 加 toast state + persist banner

在 TaskLibraryModal 找到 `const [view, setView] = useState('domain');` 之後加：

```jsx
// Slice L — show a transient "+1 candidate" toast after each save,
// keep the modal open so the user can keep adding to the candidate pool.
const [toast, setToast] = useState(null);          // { text, timer }
const [savedThisSession, setSavedThisSession] = useState(0);  // counter
```

useEffect 區（modal open reset 那段）裡，把 `if (isOpen) { ... }` 區的 reset 加上：

```jsx
if (isOpen) {
    fetchHabits();
    if (initialHabit) { /* ... existing ... */ }
    else { /* ... existing ... */ }
    setSearch('');
    setPendingHabit(null);
    setPendingCue(null);
    setIdentityChoice(null);
    setToast(null);
    setSavedThisSession(0);  // ★ reset per modal open
}
```

### Step 2: 改 emitPendingTask — 加 toast + 不關 modal

原 `emitPendingTask` 結尾：

```jsx
onSelectTask(task);
setPendingCue(null);
setIdentityChoice(null);
```

改成（在 task 物件加 `status='candidate'` + `officialHabitId`，呼叫 callback 後不關 modal、加 toast）：

```jsx
const task = {
    title: habit.name,
    details: habit.description || '',
    cue: cue || null,
    identity: identity || null,
    type: config.type || 'binary',
    category: habit.category || 'star',
    frequency: config.recurrence?.type || 'daily',
    recurrence: config.recurrence || { type: 'daily', interval: 1, endType: 'never' },
    dailyTarget: config.dailyTarget || 1,
    unit: config.unit || '次',
    stepValue: config.stepValue || 1,
    subtasks: config.subtasks || [],
    // Slice L — flow into candidate pool by default
    status: 'candidate',
    officialHabitId: habit.id,
};
onSelectTask(task);

// Reset to domain grid so user can add another
setPendingHabit(null);
setPendingCue(null);
setIdentityChoice(null);
setView('domain');
setSelectedDomain(null);

// Toast
setSavedThisSession(n => n + 1);
if (toast?.timer) clearTimeout(toast.timer);
const timer = setTimeout(() => setToast(null), 2200);
setToast({ text: `+1 候選：${habit.name}`, timer });
```

### Step 3: 渲染 toast + 底部 persist banner

在 modal 渲染的內容區（找 `return (` 之後的 JSX），在最外層 `<div className="bg-white w-full ...">` 內部、頂部 header 之後加 toast；在底部 close 之前加 persist banner。

找 `<div className="px-6 py-4 border-b ...">` 區之後（header 結束、view content 開始之前）插入：

```jsx
{/* Slice L — transient toast */}
{toast && (
    <div className="mx-6 mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold flex items-center gap-2 animate-fade-in-up">
        <Sparkles size={14} /> {toast.text}
    </div>
)}
```

然後找這個 modal 最外層 panel `<div className="bg-white w-full md:max-w-xl h-[90dvh] md:h-auto md:max-h-[85dvh] md:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col animate-fade-in-up">` 內，最底部、所有 view 渲染之後、在 `</div>` 之前加底部 persist banner：

```jsx
{/* Slice L — persist banner showing session count */}
{savedThisSession > 0 && (
    <div className="px-6 py-3 border-t border-gray-100 bg-amber-50 flex items-center justify-between gap-3">
        <p className="text-xs text-amber-700">
            <span className="font-bold">{savedThisSession}</span> 個已加候選 · 關閉後到 daily view 一起評分
        </p>
        <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-amber-700 underline hover:text-amber-800"
        >
            完成 →
        </button>
    </div>
)}
```

### Step 4: 跑全測試

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -3
```

Expected: still 213 passing.

### Step 5: Commit

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/TaskLibraryModal.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): TaskLibraryModal save → candidate + toast + persist banner (Slice L Swarm)"
```

---

## Task 5: TaskFormModal — 「直接啟用」 checkbox

**Files:**
- Modify: `web-app/src/components/TaskFormModal.jsx`

### Step 1: 加 state

找到 TaskFormModal 元件內的 formData state，在其他 state 旁加：

```jsx
// Slice L — power user opt-out: skip candidate pool and go straight to active
const [activateImmediately, setActivateImmediately] = useState(false);
```

### Step 2: 加 checkbox UI

在 form 的提交按鈕區（找 `儲存` / `submit` 按鈕的上方）加：

```jsx
{/* Slice L — opt-out for power users who don't want candidate-pool flow */}
{!initialData && (
    <label className="flex items-center gap-2 mt-3 cursor-pointer text-sm text-gray-600">
        <input
            type="checkbox"
            checked={activateImmediately}
            onChange={e => setActivateImmediately(e.target.checked)}
            className="w-4 h-4 text-emerald-500 rounded"
        />
        <span>直接啟用，不進入候選池</span>
    </label>
)}
```

`!initialData` 條件確保只有「新增」時才顯示（編輯既有 task 不該有這個選項）。

### Step 3: 修改 submit handler

找到 form 的 submit / save handler（搜尋 `onSave(` 或 `onSubmit`），把它傳給 onSave 的 data 加上 status：

```jsx
const dataToSave = {
    ...formData,
    status: activateImmediately ? 'active' : 'candidate',
};
onSave(dataToSave);
```

依現有 TaskFormModal 的實際 callback 結構適配 — 重點是把 `status` 加到傳遞給 onSave 的物件。如果現有 submit 是 `onSave(formData)` 就改成 `onSave({ ...formData, status })`。

### Step 4: 跑全測試

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -3
```

Expected: still 213 passing.

### Step 5: Commit

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/TaskFormModal.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): TaskFormModal — 直接啟用 checkbox (skip candidate pool, opt-in for new tasks only)"
```

---

## Task 6: FocusMap 子元件（MiniMap / HabitRatingRow / QuadrantSection）

**Files:**
- Create: `web-app/src/components/focusMap/MiniMap.jsx`
- Create: `web-app/src/components/focusMap/HabitRatingRow.jsx`
- Create: `web-app/src/components/focusMap/QuadrantSection.jsx`

### Step 1: MiniMap.jsx

建立 `web-app/src/components/focusMap/MiniMap.jsx`：

```jsx
'use client';

import React from 'react';
import { quadrantOf } from '@/lib/focusMap';

// MiniMap — 80×80px focus-map preview. Each candidate becomes a tiny dot
// positioned by (ability=x, impact=y). The upper-right quadrant gets an
// amber tint to advertise 黃金行為.
//
// Props:
//   candidates: Array<{ id, userImpact, userAbility, officialHabit?: {impact, ability} }>
//   sliderSeedFor: function returning { impact, ability } per candidate
const MiniMap = ({ candidates, sliderSeedFor }) => {
    return (
        <div className="relative w-20 h-20 bg-gray-50 border border-gray-200 rounded-md flex-shrink-0">
            {/* Quadrant tint */}
            <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-amber-100/50 rounded-tr-md" />
            {/* Cross axes */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-300" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-300" />
            {/* Dots */}
            {candidates.map(c => {
                const seed = sliderSeedFor(c);
                // impact 1-5 → y (top=5 → 5%; bottom=1 → 95%)
                // ability 1-5 → x (left=1 → 5%; right=5 → 95%)
                const top  = `${5 + (5 - seed.impact) * 22.5}%`;
                const left = `${5 + (seed.ability - 1) * 22.5}%`;
                const q = quadrantOf(seed.impact, seed.ability);
                return (
                    <div
                        key={c.id}
                        className={`absolute w-2 h-2 rounded-full transition-all duration-200 ${q === 'golden' ? 'bg-amber-500' : 'bg-gray-400'}`}
                        style={{ top, left, transform: 'translate(-50%, -50%)' }}
                        aria-hidden
                    />
                );
            })}
            {/* Labels */}
            <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] text-gray-400">⬆影響</span>
            <span className="absolute -bottom-4 right-1 text-[9px] text-gray-400">易→</span>
        </div>
    );
};

export default MiniMap;
```

### Step 2: HabitRatingRow.jsx

建立 `web-app/src/components/focusMap/HabitRatingRow.jsx`：

```jsx
'use client';

import React from 'react';
import { Check, AlertTriangle } from 'lucide-react';

// HabitRatingRow — one row inside a QuadrantSection.
// Renders: checkbox, name + icon, two sliders, warning text when user
// checks a non-golden row.
//
// Props:
//   candidate: { id, title, officialHabit?: { icon, name } }
//   impact, ability: current slider values (1-5)
//   checked: bool
//   quadrant: 'golden' | 'background' | 'big_fish' | 'skip'
//   onSliderChange(axis, value): axis is 'impact' | 'ability'
//   onToggleChecked(checked): bool
const WARNING_BY_QUADRANT = {
    big_fish: 'Fogg：先建立基本技能再來；現在啟動很容易放棄',
    skip:     'Fogg：低影響+難執行 — 啟動會耗 willpower',
    background: null, // 'optional', no warning
    golden:    null,
};

const HabitRatingRow = ({ candidate, impact, ability, checked, quadrant, onSliderChange, onToggleChecked }) => {
    const icon = candidate.officialHabit?.icon || '⭐';
    const warning = checked && WARNING_BY_QUADRANT[quadrant];

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-3 mb-2">
            <div className="flex items-start gap-2">
                <button
                    type="button"
                    onClick={() => onToggleChecked(!checked)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        checked
                            ? 'bg-emerald-500 border-emerald-500'
                            : 'border-gray-300 hover:border-emerald-400'
                    }`}
                    aria-pressed={checked}
                    aria-label={`${checked ? '取消勾選' : '勾選'} ${candidate.title}`}
                >
                    {checked && <Check size={12} strokeWidth={3} className="text-white" />}
                </button>
                <span className="text-base flex-shrink-0">{icon}</span>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{candidate.title}</p>
                </div>
            </div>

            {/* Sliders */}
            <div className="mt-2 ml-7">
                <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] text-gray-500 w-10">影響</span>
                    <input
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={impact}
                        onChange={e => onSliderChange('impact', Number(e.target.value))}
                        className="flex-1 accent-emerald-500"
                        aria-label="影響度"
                    />
                    <span className="text-xs font-bold text-gray-700 w-4 text-right">{impact}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500 w-10">執行</span>
                    <input
                        type="range"
                        min={1}
                        max={5}
                        step={1}
                        value={ability}
                        onChange={e => onSliderChange('ability', Number(e.target.value))}
                        className="flex-1 accent-blue-500"
                        aria-label="執行容易度"
                    />
                    <span className="text-xs font-bold text-gray-700 w-4 text-right">{ability}</span>
                </div>
            </div>

            {/* Warning if user checks a non-golden row */}
            {warning && (
                <div className="mt-2 ml-7 p-2 rounded-lg bg-amber-50 border border-amber-200 flex items-start gap-1.5">
                    <AlertTriangle size={11} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-700 leading-snug">{warning}</p>
                </div>
            )}
        </div>
    );
};

export default HabitRatingRow;
```

### Step 3: QuadrantSection.jsx

建立 `web-app/src/components/focusMap/QuadrantSection.jsx`：

```jsx
'use client';

import React from 'react';
import HabitRatingRow from './HabitRatingRow';
import { QUADRANTS } from '@/lib/focusMap';

// QuadrantSection — header (label + advice) + list of HabitRatingRow.
// Props:
//   quadrantKey: 'golden' | 'background' | 'big_fish' | 'skip'
//   candidates: rows in this quadrant
//   ratings: Map<taskId, { impact, ability, checked }>
//   onUpdate(taskId, partial): merge partial into ratings[taskId]
const QuadrantSection = ({ quadrantKey, candidates, ratings, onUpdate }) => {
    if (!candidates || candidates.length === 0) return null;
    const meta = QUADRANTS[quadrantKey];
    const accent = quadrantKey === 'golden'
        ? 'bg-amber-50 border-amber-200'
        : 'bg-gray-50 border-gray-200';

    return (
        <section className={`mb-4 p-3 rounded-xl border ${accent}`}>
            <div className="mb-2">
                <h3 className="text-sm font-bold text-gray-800">{meta.label}</h3>
                <p className="text-[11px] text-gray-600 mt-0.5">{meta.advice}</p>
            </div>
            {candidates.map(c => {
                const r = ratings.get(c.id) || { impact: 3, ability: 3, checked: false };
                return (
                    <HabitRatingRow
                        key={c.id}
                        candidate={c}
                        impact={r.impact}
                        ability={r.ability}
                        checked={r.checked}
                        quadrant={quadrantKey}
                        onSliderChange={(axis, value) => onUpdate(c.id, { [axis]: value })}
                        onToggleChecked={(checked) => onUpdate(c.id, { checked })}
                    />
                );
            })}
        </section>
    );
};

export default QuadrantSection;
```

### Step 4: 全測試 + 視覺驗證 (build only)

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -3 && echo "--- build ---" && npm run build:local 2>&1 | grep -E "Compiled|error|Error" | head -5
```

Expected: 213 tests passing + `✓ Compiled successfully`.

### Step 5: Commit

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/focusMap && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): focusMap sub-components — MiniMap + HabitRatingRow + QuadrantSection"
```

---

## Task 7: FocusMapModal — 主 modal 拼裝

**Files:**
- Create: `web-app/src/components/FocusMapModal.jsx`

### Step 1: 建立 FocusMapModal

```jsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Loader, Sparkles } from 'lucide-react';
import MiniMap from './focusMap/MiniMap';
import QuadrantSection from './focusMap/QuadrantSection';
import { quadrantOf, recommendDefaults, sliderSeedFor } from '@/lib/focusMap';

// FocusMapModal — Slice L Step 2.
// Renders all candidate tasks across the 4 quadrants, with sliders + checkbox
// per row. Drag a slider → the row animates into its new quadrant. The CTA
// at the bottom runs PATCH /api/tasks/batch-rate with one of three actions
// per task: activate / keep_candidate / archive.
//
// Props:
//   isOpen: bool
//   userId: string
//   onClose(): close without changes
//   onActivated(count): called after batch-rate completes — parent refreshes tasks
const FocusMapModal = ({ isOpen, userId, onClose, onActivated }) => {
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    // ratings: Map<taskId, { impact, ability, checked }>
    const [ratings, setRatings] = useState(new Map());

    useEffect(() => {
        if (!isOpen || !userId) return;
        let cancelled = false;
        setLoading(true);
        (async () => {
            try {
                const res = await fetch(`/api/tasks/candidates?userId=${userId}`);
                if (cancelled) return;
                if (res.ok) {
                    const data = await res.json();
                    if (cancelled) return;
                    setCandidates(Array.isArray(data) ? data : []);
                    // Seed ratings from sliderSeedFor + recommendDefaults
                    const next = new Map();
                    const recs = recommendDefaults(data);
                    for (const c of data) {
                        const seed = sliderSeedFor(c);
                        next.set(c.id, { impact: seed.impact, ability: seed.ability, checked: recs.has(c.id) });
                    }
                    setRatings(next);
                }
            } catch (e) {
                if (!cancelled) console.error('Candidates fetch error', e);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [isOpen, userId]);

    // Group candidates by current (live) quadrant.
    const grouped = useMemo(() => {
        const out = { golden: [], background: [], big_fish: [], skip: [] };
        for (const c of candidates) {
            const r = ratings.get(c.id);
            const q = quadrantOf(r?.impact ?? 3, r?.ability ?? 3);
            out[q].push(c);
        }
        return out;
    }, [candidates, ratings]);

    // Effective ratings for MiniMap — same source but in candidate shape so
    // sliderSeedFor can read live values via userImpact/userAbility overrides.
    const liveCandidates = useMemo(() => {
        return candidates.map(c => {
            const r = ratings.get(c.id);
            return { ...c, userImpact: r?.impact, userAbility: r?.ability };
        });
    }, [candidates, ratings]);

    const checkedCount = useMemo(() => {
        let n = 0;
        for (const r of ratings.values()) if (r.checked) n++;
        return n;
    }, [ratings]);

    const handleUpdate = (taskId, partial) => {
        setRatings(prev => {
            const next = new Map(prev);
            const cur = next.get(taskId) || { impact: 3, ability: 3, checked: false };
            next.set(taskId, { ...cur, ...partial });
            return next;
        });
    };

    const handleActivate = async () => {
        // Skip quadrant confirm — one click delete all
        if (grouped.skip.length > 0) {
            const ok = window.confirm(`「跳過」象限有 ${grouped.skip.length} 個習慣將被刪除，確定嗎？`);
            if (!ok) return;
        }

        setSubmitting(true);
        try {
            const payload = candidates.map(c => {
                const r = ratings.get(c.id) || { impact: 3, ability: 3, checked: false };
                const q = quadrantOf(r.impact, r.ability);
                let action;
                if (r.checked) action = 'activate';
                else if (q === 'skip') action = 'archive';
                else action = 'keep_candidate';
                return { taskId: c.id, userImpact: r.impact, userAbility: r.ability, action };
            });
            const res = await fetch('/api/tasks/batch-rate', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ratings: payload }),
            });
            if (res.ok) {
                const json = await res.json();
                onActivated?.(json.counts?.activate || 0);
            } else {
                alert('批次評分失敗，請稍後再試');
            }
        } catch (e) {
            console.error('Batch rate submit error', e);
            alert('發生錯誤');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="bg-white w-full max-w-xl h-[90dvh] md:max-h-[90dvh] rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-start bg-white flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <MiniMap candidates={liveCandidates} sliderSeedFor={sliderSeedFor} />
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-1">
                                <Sparkles size={16} className="text-amber-500" /> 焦點地圖
                            </h2>
                            <p className="text-[11px] text-gray-500 mt-0.5">依 Fogg 框架挑出黃金行為</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={22} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    {loading ? (
                        <div className="flex justify-center py-12"><Loader className="animate-spin text-emerald-500" /></div>
                    ) : candidates.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-8">沒有候選習慣可評分</p>
                    ) : (
                        <>
                            <QuadrantSection quadrantKey="golden"     candidates={grouped.golden}     ratings={ratings} onUpdate={handleUpdate} />
                            <QuadrantSection quadrantKey="background" candidates={grouped.background} ratings={ratings} onUpdate={handleUpdate} />
                            <QuadrantSection quadrantKey="big_fish"   candidates={grouped.big_fish}   ratings={ratings} onUpdate={handleUpdate} />
                            <QuadrantSection quadrantKey="skip"       candidates={grouped.skip}       ratings={ratings} onUpdate={handleUpdate} />
                        </>
                    )}
                </div>

                {/* CTA */}
                <div className="px-6 py-4 border-t border-gray-100 bg-white flex-shrink-0">
                    <button
                        type="button"
                        onClick={handleActivate}
                        disabled={submitting || candidates.length === 0}
                        className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-bold transition-colors"
                    >
                        {submitting ? '處理中…' : `啟用勾選的 ${checkedCount} 個` + (grouped.skip.length > 0 ? ` · 刪除 ${grouped.skip.length} 個跳過` : '')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FocusMapModal;
```

### Step 2: 全測試 + build

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -3 && npm run build:local 2>&1 | grep -E "Compiled|error" | head -3
```

Expected: 213 tests + `✓ Compiled successfully`.

### Step 3: Commit

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/FocusMapModal.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): FocusMapModal — focus map page assembled (mini map + 4 quadrants + activate CTA)"
```

---

## Task 8: Daily view banner + wire FocusMapModal

**Files:**
- Modify: `web-app/src/components/MainApp.jsx`

### Step 1: Imports + state

在 MainApp 的 imports 頂部加：

```jsx
import FocusMapModal from './FocusMapModal';
```

在 state 區（其他 `is*Open` 旁邊）加：

```jsx
const [isFocusMapModalOpen, setIsFocusMapModalOpen] = useState(false);
const [candidateCount, setCandidateCount] = useState(0);
// Per-session dismiss — survives modal close, lost on full page reload.
const [bannerDismissed, setBannerDismissed] = useState(false);
```

### Step 2: Fetch candidate count on mount + after add/rate

找到 `fetchTasks` 函式定義附近，加：

```jsx
const fetchCandidateCount = async (userId) => {
    try {
        const res = await fetch(`/api/tasks/candidates?userId=${userId}`);
        if (res.ok) {
            const data = await res.json();
            setCandidateCount(Array.isArray(data) ? data.length : 0);
        }
    } catch (e) {
        console.error('Fetch candidate count error', e);
    }
};
```

在 `useEffect` 的初始 auth check 區，當 user 存在時也呼叫一次：

```jsx
if (storedUser) {
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);
    fetchTasks(parsedUser.id);
    fetchAssignments(parsedUser.id);
    fetchCandidateCount(parsedUser.id);  // ★ Slice L
}
```

在 `handleLogin` 也加：

```jsx
const handleLogin = (userData) => {
    // ... existing ...
    fetchTasks(userData.id);
    fetchAssignments(userData.id);
    fetchCandidateCount(userData.id);  // ★ Slice L
    // ...
};
```

### Step 3: handleSaveTask 改成接 status + 更新 candidate count

找 `handleSaveTask`，在送出去之前確認帶 `status`（從 taskData 帶來，預設 'candidate'）：

原本：

```jsx
body: JSON.stringify({ ...sanitizedData, userId: user.id })
```

確認 `sanitizedData` 已包含 `status`（從 TaskLibraryModal 與 TaskFormModal 傳來）。create 成功後加：

```jsx
if (res.ok) {
    const created = await res.json();
    if (created.status === 'candidate') {
        // Don't add to live tasks list — it's a candidate
        setCandidateCount(c => c + 1);
    } else {
        const formatted = { ...created, history: {}, dailyProgress: {} };
        setTasks(prev => [...prev, formatted]);
    }
    // ... rest of existing aspiration link code
}
```

### Step 4: Render banner + FocusMapModal

找 Daily view 渲染區（搜尋 `currentView === 'daily'`），在 DashboardSummaryCard 上方、生理期 toggle 之後加：

```jsx
{/* Slice L — banner appears when >= 5 candidates and user hasn't dismissed */}
{candidateCount >= 5 && !bannerDismissed && (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 mb-4">
        <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
                <p className="text-xs font-bold text-amber-700 flex items-center gap-1">
                    <Sparkles size={12} /> 你有 {candidateCount} 個候選習慣
                </p>
                <p className="text-sm font-black text-gray-800 mt-1">開始焦點地圖，挑出黃金行為</p>
                <p className="text-[11px] text-gray-500 mt-1">Fogg 建議篩 3 個實際開始</p>
            </div>
            <button
                type="button"
                onClick={() => setBannerDismissed(true)}
                className="p-1 -mr-1 text-gray-400 hover:text-gray-600"
                aria-label="暫時隱藏"
            >
                <X size={16} />
            </button>
        </div>
        <button
            type="button"
            onClick={() => setIsFocusMapModalOpen(true)}
            className="mt-3 w-full px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors"
        >
            開始評分 →
        </button>
    </div>
)}
```

確認頂部已 import `Sparkles, X` from lucide-react — 應該已經是。

### Step 5: Render FocusMapModal

在 modal 渲染區（其他 `<TemplateExplorer ... />`、`<AspirationPicker ... />` 附近）加：

```jsx
<FocusMapModal
    isOpen={isFocusMapModalOpen}
    userId={user?.id}
    onClose={() => setIsFocusMapModalOpen(false)}
    onActivated={(activatedCount) => {
        setIsFocusMapModalOpen(false);
        setBannerDismissed(false);
        // Refresh both lists
        if (user?.id) {
            fetchTasks(user.id);
            fetchCandidateCount(user.id);
        }
    }}
/>
```

### Step 6: 全測試 + build

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -3 && npm run build:local 2>&1 | grep -E "Compiled|error" | head -3
```

Expected: 213 tests + `✓ Compiled successfully`.

### Step 7: Commit

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/MainApp.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): MainApp — daily banner + FocusMapModal wiring + candidate count tracking"
```

---

## Task 9: Browser smoke + merge + push

### Step 1: 啟動 preview server

用 Habitnext Dev launch config，確認 http://localhost:3000 可用。

### Step 2: 建測試 user

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && node -e "
const {PrismaClient} = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();
(async () => {
  const hash = await bcrypt.hash('SliceLtest', 10);
  const u = await p.user.upsert({
    where: { phone: '0900000055' },
    update: { password: hash, typeKey: 'rose', sleepTypeKey: 'stress', isActive: true },
    create: { nickname: 'SliceLtest', phone: '0900000055', countryCode: '+886', password: hash, typeKey: 'rose', sleepTypeKey: 'stress', isActive: true }
  });
  console.log('user:', u.id);
  await p.\$disconnect();
})();
"
```

### Step 3: 登入 + 走完整 flow

登入 `0900000055 / SliceLtest`。

驗證項目（手動）：
- [ ] 點 [+] → TaskLibraryModal 開
- [ ] 連續加 5 個習慣（不同 domain）→ 每次 toast 出現 + savedThisSession 累加
- [ ] 關 modal → 回 daily view
- [ ] Daily view 顯示 banner「你有 5 個候選習慣」
- [ ] 點「開始評分 →」 → FocusMapModal 開
- [ ] 看到 5 個 row 分佈在 4 象限（依 OfficialHabit 預設 impact/ability）
- [ ] 黃金象限的 row 預設 checked（最多 3 個）
- [ ] 拖一個 row 的 impact slider → row 動態 reflow 到對應象限
- [ ] 勾一個「跳過」象限的 row → 顯示 amber warning
- [ ] 點「啟用勾選的 N 個」→ confirm dialog（若有 skip 象限）
- [ ] 啟用後回 daily view → 新習慣出現在今日行程

### Step 4: 驗證 DB

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && node -e "
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const u = await p.user.findUnique({ where: { phone: '0900000055' } });
  const byStatus = await p.task.groupBy({ by: ['status'], where: { userId: u.id }, _count: true });
  console.log('Slice L user task counts:', byStatus);
  const rated = await p.task.findMany({ where: { userId: u.id, ratedAt: { not: null } }, select: { title: true, status: true, userImpact: true, userAbility: true } });
  console.log('Rated tasks:', rated);
  await p.\$disconnect();
})();
"
```

Expected: 至少 N 個 active + 可能 archived/candidate；rated tasks 有 userImpact/userAbility 寫進。

### Step 5: 清理 + merge + push

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && node -e "
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const u = await p.user.findUnique({ where: { phone: '0900000055' } });
  if (u) {
    await p.task.deleteMany({ where: { userId: u.id } });
    await p.assignment.deleteMany({ where: { userId: u.id } });
    await p.aspiration.deleteMany({ where: { userId: u.id } });
    await p.user.delete({ where: { id: u.id } });
    console.log('cleaned');
  }
  await p.\$disconnect();
})();
"
```

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git checkout main && git merge --ff-only feat/slice-L-focus-map && git push origin main
```

Vercel auto-deploy.

---

## Self-Review Notes

**Spec coverage:**
- Spec §3.1 Swarm → Task 4 (TaskLibraryModal candidate) + Task 5 (TaskFormModal opt-out)
- Spec §3.2 Daily banner → Task 8 (banner + count fetching)
- Spec §3.3 FocusMap morph → Task 6 (sub-components) + Task 7 (modal)
- Spec §3.4 評分互動 → Task 7 (live grouping in modal)
- Spec §3.5 Activate → Task 7 (batch-rate call) + Task 3 (batch-rate API)
- Spec §3.6 入口 → Task 8 (banner only, no profile entry — matches §9 resolution)
- Spec §4 Schema → Task 1
- Spec §5 推薦邏輯 → Task 2 (lib + TDD)
- Spec §6 API → Task 3
- Spec §7 元件 → Tasks 6, 7
- Spec §9 Open Q → resolved at top of plan

**Placeholder scan:** Task 5 has "依現有 TaskFormModal 的實際 callback 結構適配" — runtime integration point, not a placeholder. Otherwise no TBD / TODO / vague language.

**Type consistency:**
- `QUADRANTS` keys: 'golden' | 'background' | 'big_fish' | 'skip' — consistent across Task 2 lib + Task 6 sub-components + Task 7 modal
- `recommendDefaults`, `quadrantOf`, `sliderSeedFor` — same signatures throughout
- API contracts: `/api/tasks/candidates` (GET), `/api/tasks/batch-rate` (PATCH), `?status=` filter — consistent

**Bite-sized check:** Each task averages 4-7 steps, each step is ≤5 min. Largest is Task 7 (FocusMapModal) but it's atomic by file.
