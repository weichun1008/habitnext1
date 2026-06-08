# 社群計畫 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓使用者把「一個嚮往底下的習慣集」用純演算法生成符合現有 Template 架構（v2.0 phases）的計畫，送審核准後公開到探索計畫的獨立「社群計畫」分區，並清楚標示「用戶自創 · by 作者」。

**Architecture:** 三個 slice 漸進上線。Slice 1 抽出難度演算法（`lib/difficulty.js`）並讓焦點地圖啟用時套用合理起始難度。Slice 2 加 `Template` 作者/審核欄位、放寬 `expertId`，新增 `lib/planBuilder.js` 生成 v2.0 計畫與 `POST /api/plans/from-aspiration`，做客戶端「存成計畫」流程。Slice 3 加「社群計畫」家族分區、探索標示、後台審核佇列，並讓加入流程相容無專家的計畫。

**Tech Stack:** Next.js 14 App Router、React 18、Prisma + PostgreSQL(Neon)、Tailwind、lucide-react、Jest + React Testing Library。

**Conventions:**
- 工作目錄 `web-app/`；測試在 `web-app/src/__tests__/`；純函式用 `require('../../lib/..')`，元件用 `@testing-library/react`，API route 測試加檔頭 `/** @jest-environment node */` 並 `jest.mock('@/lib/prisma')`。
- 跑單檔：`cd web-app && npx jest <path> -t "<name>"`。
- 共用 Neon DB + 多 session：schema 僅 additive（新欄位 nullable / 有 default）或放寬（NOT NULL → nullable）；`prisma db push` 出現任何 DROP/data-loss 即停止回報；主分支保持 schema superset；push 前先 `git fetch && git pull`。
- 回應 zh-TW；UI 不用 emoji，一律 lucide-react；每個 CTA 有 hover 微互動；行動裝置對等。
- commit trailer：`Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`；git identity：`HabitNext Dev <dev@habitnext.local>`。
- 分支：`feat/community-plans`（勿切換）。

---

## File Structure

| 檔案 | 動作 | 責任 | Slice |
|---|---|---|---|
| `web-app/src/lib/difficulty.js` | 建立 | `defaultDifficultyTier` / `resolveDifficulty` 純函式 | 1 |
| `web-app/src/app/api/tasks/batch-rate/route.js` | 修改 | activate 時依 userAbility 套用難度設定 | 1 |
| `web-app/prisma/schema.prisma` | 修改 | Template 作者/審核欄位；Template+Assignment `expertId` 放寬 nullable | 2 |
| `web-app/src/lib/planBuilder.js` | 建立 | `buildPlanFromAspiration` 生成 v2.0 phases | 2 |
| `web-app/src/app/api/plans/from-aspiration/route.js` | 建立 | 後端權威生成 + 建 Template（pending/private） | 2 |
| `web-app/src/components/focusMap/SaveAsPlanModal.jsx` | 建立 | 預覽階段 + 命名 + 公開/私人 送出 | 2 |
| `web-app/src/components/FocusMapModal.jsx` | 修改 | 完成畫面加「把這套存成計畫」入口 | 2 |
| `web-app/src/lib/templateRecommendation.js` | 修改 | `sectionIdFor` 加 community；TEMPLATE_SECTIONS + group 加 community | 3 |
| `web-app/src/app/api/plans/public/route.js` 或既有公開清單 API | 修改 | 公開清單只取 `isPublic && reviewStatus==='approved'` | 3 |
| `web-app/src/components/TemplateDetailPanel.jsx`、`TemplateExplorer.jsx` | 修改 | 「用戶自創 · by 作者」徽章；community 區塊 | 3 |
| `web-app/src/app/admin/dashboard/templates/review/page.js` | 建立 | 審核佇列頁 | 3 |
| `web-app/src/app/api/admin/plans/[id]/review/route.js` | 建立 | PATCH 核准/退回 | 3 |
| `web-app/src/app/api/user/assignments/route.js`、`api/admin/assignments/route.js` | 修改 | `Assignment.expertId = template.expertId ?? null`；expert 讀取 null 防護 | 3 |
| `web-app/src/__tests__/...` | 建立 | 各對應測試 | 1–3 |

---

# SLICE 1 — 難度預設演算法

## Task 1.1: `lib/difficulty.js` 純函式

**Files:**
- Create: `web-app/src/lib/difficulty.js`
- Test: `web-app/src/__tests__/lib/difficulty.test.js`

- [ ] **Step 1: 寫失敗測試**

建立 `web-app/src/__tests__/lib/difficulty.test.js`：

```js
const { defaultDifficultyTier, resolveDifficulty } = require('../../lib/difficulty');

describe('defaultDifficultyTier', () => {
  it('maps ability 1-3 to beginner', () => {
    expect(defaultDifficultyTier(1)).toBe('beginner');
    expect(defaultDifficultyTier(3)).toBe('beginner');
  });
  it('maps 4 to intermediate, 5 to challenge', () => {
    expect(defaultDifficultyTier(4)).toBe('intermediate');
    expect(defaultDifficultyTier(5)).toBe('challenge');
  });
  it('defaults non-number to beginner', () => {
    expect(defaultDifficultyTier(null)).toBe('beginner');
    expect(defaultDifficultyTier(undefined)).toBe('beginner');
  });
});

describe('resolveDifficulty', () => {
  const habit = (d) => ({ difficulties: d });

  it('uses desired tier when enabled', () => {
    const h = habit({ beginner: { enabled: true, dailyTarget: 1 }, intermediate: { enabled: true, dailyTarget: 2 } });
    const r = resolveDifficulty(h, 4); // desired intermediate
    expect(r.tier).toBe('intermediate');
    expect(r.config.dailyTarget).toBe(2);
  });

  it('clamps down to highest enabled tier <= desired', () => {
    const h = habit({ beginner: { enabled: true, dailyTarget: 1 } });
    const r = resolveDifficulty(h, 5); // desired challenge, only beginner enabled
    expect(r.tier).toBe('beginner');
  });

  it('falls up to lowest enabled when none <= desired', () => {
    const h = habit({ challenge: { enabled: true, dailyTarget: 9 } });
    const r = resolveDifficulty(h, 1); // desired beginner, only challenge enabled
    expect(r.tier).toBe('challenge');
    expect(r.config.dailyTarget).toBe(9);
  });

  it('handles missing difficulties', () => {
    expect(resolveDifficulty({}, 3)).toEqual({ tier: 'beginner', config: {} });
    expect(resolveDifficulty(null, 3)).toEqual({ tier: 'beginner', config: {} });
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd web-app && npx jest src/__tests__/lib/difficulty.test.js`
Expected: FAIL（找不到模組）。

- [ ] **Step 3: 實作 `web-app/src/lib/difficulty.js`**

```js
// src/lib/difficulty.js
// Pure helpers — 依使用者在焦點地圖評的「執行度(ability)」決定起始難度。
// 無 I/O、可單測。難度設定來源：OfficialHabit.difficulties
//   { beginner?, intermediate?, challenge? }，每個 = { enabled, label, type,
//     dailyTarget, unit, stepValue, subtasks, recurrence }。

const TIERS = ['beginner', 'intermediate', 'challenge']; // 由低到高

// 執行度 1-3 → beginner、4 → intermediate、5 → challenge；非數字 → beginner。
function defaultDifficultyTier(userAbility) {
  const a = typeof userAbility === 'number' ? userAbility : 0;
  if (a >= 5) return 'challenge';
  if (a >= 4) return 'intermediate';
  return 'beginner';
}

// 取期望 tier，夾擠到該習慣實際 enabled 的 tier：
//   優先期望 tier；否則取 <= 期望且 enabled 的最高者；都沒有則取 enabled 的最低者。
// 回傳 { tier, config }。無 difficulties → { tier:'beginner', config:{} }。
function resolveDifficulty(habit, userAbility) {
  const diffs = habit && habit.difficulties ? habit.difficulties : null;
  if (!diffs) return { tier: 'beginner', config: {} };

  const desired = defaultDifficultyTier(userAbility);
  const desiredIdx = TIERS.indexOf(desired);
  const enabled = TIERS.filter(t => diffs[t] && diffs[t].enabled);

  if (enabled.length === 0) return { tier: 'beginner', config: {} };

  // <= desired 的 enabled 取最高
  const downCandidates = enabled.filter(t => TIERS.indexOf(t) <= desiredIdx);
  let tier;
  if (downCandidates.length > 0) {
    tier = downCandidates[downCandidates.length - 1];
  } else {
    tier = enabled[0]; // 都比 desired 高 → 取最低 enabled
  }
  return { tier, config: diffs[tier] || {} };
}

module.exports = { defaultDifficultyTier, resolveDifficulty, TIERS };
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd web-app && npx jest src/__tests__/lib/difficulty.test.js`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add web-app/src/lib/difficulty.js web-app/src/__tests__/lib/difficulty.test.js
git -c user.name="HabitNext Dev" -c user.email="dev@habitnext.local" commit -m "feat(plans): difficulty default algorithm (defaultDifficultyTier/resolveDifficulty)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

## Task 1.2: `batch-rate` 啟用時套用難度

**Files:**
- Modify: `web-app/src/app/api/tasks/batch-rate/route.js`
- Test: `web-app/src/__tests__/api/batch-rate-difficulty.test.js`

說明：目前 `batch-rate`（Slice 焦點地圖）對每個 rating 做 `prisma.task.update`。本 task 讓 `action==='activate'` 的任務，依其 `officialHabit.difficulties` + 傳入的 `userAbility`，用 `resolveDifficulty` 重算任務設定欄位（type/dailyTarget/unit/stepValue/subtasks/frequency/recurrence）。需先查出這些任務的 officialHabit。

- [ ] **Step 1: 寫失敗測試**

建立 `web-app/src/__tests__/api/batch-rate-difficulty.test.js`：

```js
/** @jest-environment node */
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    $transaction: jest.fn((arr) => Promise.resolve(arr)),
    task: {
      update: jest.fn((args) => args),
      findMany: jest.fn(() => Promise.resolve([
        { id: 't1', officialHabitId: 'h1', officialHabit: { difficulties: {
          beginner: { enabled: true, type: 'binary', dailyTarget: 1, unit: '次', stepValue: 1, subtasks: [], recurrence: { type: 'daily' } },
          intermediate: { enabled: true, type: 'quantitative', dailyTarget: 3, unit: '杯', stepValue: 1, subtasks: [], recurrence: { type: 'daily' } },
        } } },
      ])),
    },
  },
}));

import prisma from '@/lib/prisma';
import { PATCH } from '../../app/api/tasks/batch-rate/route';

const req = (body) => ({ json: () => Promise.resolve(body) });

describe('batch-rate applies difficulty on activate', () => {
  beforeEach(() => jest.clearAllMocks());

  it('activate with ability 4 sets intermediate config', async () => {
    await PATCH(req({ ratings: [{ taskId: 't1', userImpact: 5, userAbility: 4, action: 'activate', targetDays: 66 }] }));
    const data = prisma.task.update.mock.calls[0][0].data;
    expect(data.status).toBe('active');
    expect(data.dailyTarget).toBe(3);     // intermediate
    expect(data.unit).toBe('杯');
    expect(data.type).toBe('quantitative');
  });

  it('keep_candidate does not touch config fields', async () => {
    await PATCH(req({ ratings: [{ taskId: 't9', userImpact: 2, userAbility: 2, action: 'keep_candidate' }] }));
    const data = prisma.task.update.mock.calls[0][0].data;
    expect('dailyTarget' in data).toBe(false);
    expect(data.status).toBe('candidate');
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd web-app && npx jest src/__tests__/api/batch-rate-difficulty.test.js`
Expected: FAIL（目前不套用難度、未呼叫 findMany）。

- [ ] **Step 3: 修改 `web-app/src/app/api/tasks/batch-rate/route.js`**

在檔案頂部 import 加：

```js
import { resolveDifficulty } from '@/lib/difficulty';
```

在解構 `ratings` 之後、`$transaction` 之前，加入「查 activate 任務的難度」：

```js
        // 取 activate 任務的 officialHabit.difficulties，供套用起始難度
        const activateIds = ratings.filter(r => r.action === 'activate').map(r => r.taskId);
        const habitByTaskId = new Map();
        if (activateIds.length > 0) {
            const rows = await prisma.task.findMany({
                where: { id: { in: activateIds } },
                select: { id: true, officialHabitId: true, officialHabit: { select: { difficulties: true } } },
            });
            for (const row of rows) habitByTaskId.set(row.id, row.officialHabit);
        }
        const abilityByTaskId = new Map(ratings.map(r => [r.taskId, r.userAbility]));
```

把 `$transaction` 內每筆建 `data` 的區塊改成（在原本 status/userImpact/userAbility/ratedAt/targetDays 之後，加入難度套用）：

```js
                const data = {
                    status,
                    userImpact: typeof r.userImpact === 'number' ? r.userImpact : null,
                    userAbility: typeof r.userAbility === 'number' ? r.userAbility : null,
                    ratedAt: now,
                };
                if (r.action === 'activate' && 'targetDays' in r) {
                    data.targetDays = typeof r.targetDays === 'number' ? r.targetDays : null;
                }
                // 啟用時依執行度套用起始難度（有 officialHabit 才套）
                if (r.action === 'activate') {
                    const habit = habitByTaskId.get(r.taskId);
                    if (habit && habit.difficulties) {
                        const { config } = resolveDifficulty(habit, abilityByTaskId.get(r.taskId));
                        if (config && Object.keys(config).length > 0) {
                            if (config.type != null) data.type = config.type;
                            if (config.dailyTarget != null) data.dailyTarget = config.dailyTarget;
                            if (config.unit != null) data.unit = config.unit;
                            if (config.stepValue != null) data.stepValue = config.stepValue;
                            if (Array.isArray(config.subtasks)) data.subtasks = config.subtasks;
                            if (config.recurrence != null) {
                                data.recurrence = config.recurrence;
                                if (config.recurrence.type) data.frequency = config.recurrence.type;
                            }
                        }
                    }
                }
                return prisma.task.update({ where: { id: r.taskId }, data });
```

> 注意：原本的 `prisma.task.update({ where, data })` 那行若已存在，整段以上述取代；保留 `counts[r.action]` 累計與 status 判定。

- [ ] **Step 4: 跑測試確認通過**

Run: `cd web-app && npx jest src/__tests__/api/batch-rate-difficulty.test.js`
Expected: PASS。

- [ ] **Step 5: 確認既有 batch-rate 測試仍綠**

Run: `cd web-app && npx jest src/__tests__/api/batch-rate.test.js`
Expected: PASS（既有 targetDays 行為不變）。若既有測試的 prisma mock 缺 `task.findMany`，在該 mock 補 `task: { update: ..., findMany: jest.fn(() => Promise.resolve([])) }`。

- [ ] **Step 6: Commit**

```bash
git add web-app/src/app/api/tasks/batch-rate/route.js web-app/src/__tests__/api/batch-rate-difficulty.test.js web-app/src/__tests__/api/batch-rate.test.js
git -c user.name="HabitNext Dev" -c user.email="dev@habitnext.local" commit -m "feat(plans): batch-rate applies starting difficulty from ability on activate

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

# SLICE 2 — 計畫生成 + 作者模型 + 存成計畫

## Task 2.1: Schema — Template 作者/審核欄位 + expertId 放寬

**Files:**
- Modify: `web-app/prisma/schema.prisma`

- [ ] **Step 1: 同步遠端**

```bash
git fetch origin && git pull origin main --no-edit
```
（若有衝突先解決）

- [ ] **Step 2: 修改 `Template` model**

把 `expertId String` / `expert Expert @relation(...)` 兩行改為可空：

```prisma
  expertId       String?
  expert         Expert?      @relation(fields: [expertId], references: [id], onDelete: Cascade)
```

在 `isPublic` 那行之後新增：

```prisma
  authorType   String  @default("official") // 'official' | 'user'
  authorUserId String? // 使用者自創計畫的作者（User.id）
  authorName   String? // 顯示用作者名（denormalize 自 User.nickname）
  reviewStatus String  @default("approved") // 'approved' | 'pending' | 'rejected'
```

- [ ] **Step 3: 修改 `Assignment` model**

把 `expertId String` / `expert Expert @relation(...)` 兩行改為可空：

```prisma
  expertId       String?
  expert         Expert?   @relation(fields: [expertId], references: [id], onDelete: Cascade)
```

- [ ] **Step 4: 推送 schema（放寬 + additive，安全）**

```bash
cd web-app && npx prisma db push && npx prisma generate
```
Expected: `Your database is now in sync`，**不得有 data-loss 警告**（放寬 NOT NULL → nullable 與新增 nullable 欄位皆安全）。若出現 data-loss，停止回報，不加 `--accept-data-loss`。

- [ ] **Step 5: Commit**

```bash
git add web-app/prisma/schema.prisma
git -c user.name="HabitNext Dev" -c user.email="dev@habitnext.local" commit -m "feat(plans): Template authorType/reviewStatus + nullable expertId (Template/Assignment)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

## Task 2.2: `lib/planBuilder.js`

**Files:**
- Create: `web-app/src/lib/planBuilder.js`
- Test: `web-app/src/__tests__/lib/planBuilder.test.js`

- [ ] **Step 1: 寫失敗測試**

建立 `web-app/src/__tests__/lib/planBuilder.test.js`：

```js
const { buildPlanFromAspiration } = require('../../lib/planBuilder');

const mkHabit = (over = {}) => ({
  beginner:     { enabled: true, type: 'binary', dailyTarget: 1, unit: '次', stepValue: 1, subtasks: [], recurrence: { type: 'daily', interval: 1 } },
  intermediate: { enabled: true, type: 'quantitative', dailyTarget: 3, unit: '次', stepValue: 1, subtasks: [], recurrence: { type: 'daily', interval: 1 } },
  challenge:    { enabled: true, type: 'quantitative', dailyTarget: 5, unit: '次', stepValue: 1, subtasks: [], recurrence: { type: 'daily', interval: 1 } },
  ...over,
});

const habits = [
  { taskId: 'a', title: '深蹲', category: 'fitness', officialHabit: { difficulties: mkHabit() }, userImpact: 5, userAbility: 3, targetDays: 66 },
  { taskId: 'b', title: '喝水', category: 'fitness', officialHabit: { difficulties: { beginner: mkHabit().beginner } }, userImpact: 4, userAbility: 5, targetDays: 66 },
];

describe('buildPlanFromAspiration', () => {
  it('returns v2.0 with up to 3 phases', () => {
    const plan = buildPlanFromAspiration({ habits });
    expect(plan.version).toBe('2.0');
    expect(Array.isArray(plan.phases)).toBe(true);
    expect(plan.phases.length).toBeGreaterThanOrEqual(1);
    expect(plan.phases.length).toBeLessThanOrEqual(3);
  });

  it('orders habits by impact desc within a phase', () => {
    const plan = buildPlanFromAspiration({ habits });
    expect(plan.phases[0].tasks[0].title).toBe('深蹲'); // impact 5 first
  });

  it('phase tasks carry full config fields needed by the join consumer', () => {
    const plan = buildPlanFromAspiration({ habits });
    const t = plan.phases[0].tasks[0];
    for (const k of ['title', 'type', 'category', 'frequency', 'recurrence', 'reminder', 'subtasks', 'dailyTarget', 'unit', 'stepValue']) {
      expect(t).toHaveProperty(k);
    }
  });

  it('escalates difficulty across phases when higher tiers exist', () => {
    const plan = buildPlanFromAspiration({ habits });
    // 深蹲: ability 3 → start beginner(dt1); phase2 intermediate(dt3); phase3 challenge(dt5)
    const squatByPhase = plan.phases.map(p => p.tasks.find(t => t.title === '深蹲'));
    expect(squatByPhase[0].dailyTarget).toBe(1);
    if (squatByPhase[1]) expect(squatByPhase[1].dailyTarget).toBe(3);
    if (squatByPhase[2]) expect(squatByPhase[2].dailyTarget).toBe(5);
  });

  it('keeps a beginner-only habit at beginner across phases', () => {
    const plan = buildPlanFromAspiration({ habits });
    for (const ph of plan.phases) {
      const water = ph.tasks.find(t => t.title === '喝水');
      if (water) expect(water.dailyTarget).toBe(1);
    }
  });

  it('each phase has positive integer days >= 7', () => {
    const plan = buildPlanFromAspiration({ habits });
    for (const ph of plan.phases) {
      expect(Number.isInteger(ph.days)).toBe(true);
      expect(ph.days).toBeGreaterThanOrEqual(7);
    }
  });

  it('returns single empty-safe plan for no habits', () => {
    const plan = buildPlanFromAspiration({ habits: [] });
    expect(plan.version).toBe('2.0');
    expect(plan.phases).toEqual([]);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd web-app && npx jest src/__tests__/lib/planBuilder.test.js`
Expected: FAIL（找不到模組）。

- [ ] **Step 3: 實作 `web-app/src/lib/planBuilder.js`**

```js
// src/lib/planBuilder.js
// 純函式：把一個嚮往的習慣集生成符合現有 Template v2.0 的計畫。
// 無 I/O、可單測。phase.tasks 物件格式對齊 api/user/assignments/route.js 的消費端。
const { TIERS, defaultDifficultyTier } = require('./difficulty');

const PHASE_META = [
  { id: 'p1', name: '養成期' },
  { id: 'p2', name: '進階' },
  { id: 'p3', name: '挑戰' },
];

// 從 difficulties + tier 組出 join 端需要的完整任務物件
function taskFromTier(habit, tier) {
  const cfg = (habit.officialHabit?.difficulties?.[tier]) || {};
  const recurrence = cfg.recurrence || { type: 'daily', interval: 1 };
  return {
    title: habit.title,
    type: cfg.type || 'binary',
    category: habit.category || 'other',
    frequency: recurrence.type || 'daily',
    recurrence,
    reminder: { enabled: false, offset: 0 },
    subtasks: Array.isArray(cfg.subtasks) ? cfg.subtasks : [],
    dailyTarget: cfg.dailyTarget != null ? cfg.dailyTarget : 1,
    unit: cfg.unit || '次',
    stepValue: cfg.stepValue != null ? cfg.stepValue : 1,
  };
}

// 該習慣可用 tier（enabled），由低到高
function enabledTiers(habit) {
  const d = habit.officialHabit?.difficulties || {};
  return TIERS.filter(t => d[t] && d[t].enabled);
}

// 起始 tier（夾擠到 enabled）；回傳 enabled 陣列中的索引
function startTierIndex(habit) {
  const enabled = enabledTiers(habit);
  if (enabled.length === 0) return { enabled: ['beginner'], idx: 0, onlyBeginner: true };
  const desired = defaultDifficultyTier(habit.userAbility);
  const desiredRank = TIERS.indexOf(desired);
  let idx = 0;
  for (let i = 0; i < enabled.length; i++) {
    if (TIERS.indexOf(enabled[i]) <= desiredRank) idx = i;
  }
  // 若全部都高於 desired，idx 留 0（最低 enabled）
  return { enabled, idx, onlyBeginner: enabled.length === 1 };
}

function median(nums) {
  const arr = nums.filter(n => typeof n === 'number').sort((a, b) => a - b);
  if (arr.length === 0) return 66;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : Math.round((arr[mid - 1] + arr[mid]) / 2);
}

// 主函式
function buildPlanFromAspiration({ habits }) {
  if (!Array.isArray(habits) || habits.length === 0) {
    return { version: '2.0', phases: [] };
  }
  // 依影響力 desc、同分 ability desc 排序
  const ordered = [...habits].sort((a, b) =>
    (b.userImpact ?? 3) - (a.userImpact ?? 3) || (b.userAbility ?? 3) - (a.userAbility ?? 3));

  // 每個習慣的 enabled tier 與起始索引
  const meta = ordered.map(h => ({ habit: h, ...startTierIndex(h) }));

  // 需要幾個 phase：取「任一習慣從起始往上還有幾階」的最大值 + 1，封頂 3
  const maxExtra = Math.max(0, ...meta.map(m => (m.enabled.length - 1) - m.idx));
  const phaseCount = Math.min(PHASE_META.length, 1 + maxExtra);

  // 每階段天數：targetDays 中位數 ÷ phaseCount，至少 7、整數
  const totalDays = median(ordered.map(h => h.targetDays));
  const perPhase = Math.max(7, Math.round(totalDays / phaseCount));

  const phases = [];
  for (let p = 0; p < phaseCount; p++) {
    const tasks = meta.map(m => {
      const tierIdx = Math.min(m.idx + p, m.enabled.length - 1); // 往上升、封頂該習慣最高 enabled
      const tier = m.enabled[tierIdx];
      return taskFromTier(m.habit, tier);
    });
    phases.push({ id: PHASE_META[p].id, name: PHASE_META[p].name, days: perPhase, tasks });
  }
  return { version: '2.0', phases };
}

module.exports = { buildPlanFromAspiration, taskFromTier };
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd web-app && npx jest src/__tests__/lib/planBuilder.test.js`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add web-app/src/lib/planBuilder.js web-app/src/__tests__/lib/planBuilder.test.js
git -c user.name="HabitNext Dev" -c user.email="dev@habitnext.local" commit -m "feat(plans): buildPlanFromAspiration generates v2.0 phased plan (algorithmic)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

## Task 2.3: `POST /api/plans/from-aspiration`

**Files:**
- Create: `web-app/src/app/api/plans/from-aspiration/route.js`
- Test: `web-app/src/__tests__/api/plans-from-aspiration.test.js`

說明：取一個嚮往底下 `status==='active'` 且有 `officialHabit` 的任務，組成 `habits`，呼叫 `buildPlanFromAspiration`，建立 `Template`。`visibility==='public'` → `reviewStatus='pending'` + `isPublic=true`；`private` → `reviewStatus='approved'` + `isPublic=false`。`authorType='user'`、`expertId=null`。

- [ ] **Step 1: 寫失敗測試**

建立 `web-app/src/__tests__/api/plans-from-aspiration.test.js`：

```js
/** @jest-environment node */
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    aspiration: { findUnique: jest.fn() },
    user: { findUnique: jest.fn(() => Promise.resolve({ id: 'u1', nickname: '小明' })) },
    template: { create: jest.fn((args) => Promise.resolve({ id: 'tpl1', ...args.data })) },
  },
}));

import prisma from '@/lib/prisma';
import { POST } from '../../app/api/plans/from-aspiration/route';

const req = (body) => ({ json: () => Promise.resolve(body) });

const aspiration = {
  id: 'asp1', userId: 'u1', identity: '我是重視睡眠的人', title: '睡得更好',
  habits: [
    { task: { id: 'a', title: '深蹲', category: 'fitness', status: 'active', userImpact: 5, userAbility: 3, targetDays: 66,
      officialHabit: { difficulties: { beginner: { enabled: true, type: 'binary', dailyTarget: 1, unit: '次', stepValue: 1, subtasks: [], recurrence: { type: 'daily' } } } } } },
  ],
};

describe('POST /api/plans/from-aspiration', () => {
  beforeEach(() => { jest.clearAllMocks(); prisma.aspiration.findUnique.mockResolvedValue(aspiration); });

  it('creates a pending public user template', async () => {
    const res = await POST(req({ aspirationId: 'asp1', userId: 'u1', name: '我的睡眠計畫', description: 'd', visibility: 'public' }));
    expect(res.status).toBe(200);
    const data = prisma.template.create.mock.calls[0][0].data;
    expect(data.authorType).toBe('user');
    expect(data.authorUserId).toBe('u1');
    expect(data.authorName).toBe('小明');
    expect(data.reviewStatus).toBe('pending');
    expect(data.isPublic).toBe(true);
    expect(data.expertId).toBeNull();
    expect(data.tasks.version).toBe('2.0');
    expect(data.tasks.phases.length).toBeGreaterThanOrEqual(1);
  });

  it('private template is approved + not public', async () => {
    await POST(req({ aspirationId: 'asp1', userId: 'u1', name: 'x', visibility: 'private' }));
    const data = prisma.template.create.mock.calls[0][0].data;
    expect(data.reviewStatus).toBe('approved');
    expect(data.isPublic).toBe(false);
  });

  it('400 when aspiration has no active habits', async () => {
    prisma.aspiration.findUnique.mockResolvedValue({ ...aspiration, habits: [] });
    const res = await POST(req({ aspirationId: 'asp1', userId: 'u1', name: 'x', visibility: 'private' }));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd web-app && npx jest src/__tests__/api/plans-from-aspiration.test.js`
Expected: FAIL（route 不存在）。

- [ ] **Step 3: 實作 `web-app/src/app/api/plans/from-aspiration/route.js`**

```js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { buildPlanFromAspiration } from '@/lib/planBuilder';

// POST /api/plans/from-aspiration
// body: { aspirationId, userId, name, description?, visibility: 'public' | 'private' }
// 取嚮往底下 active 且有 officialHabit 的任務 → 生成 v2.0 計畫 → 建 Template。
export async function POST(request) {
  try {
    const { aspirationId, userId, name, description, visibility } = await request.json();
    if (!aspirationId || !userId || !name) {
      return NextResponse.json({ error: 'aspirationId, userId, name required' }, { status: 400 });
    }

    const aspiration = await prisma.aspiration.findUnique({
      where: { id: aspirationId },
      include: {
        habits: { include: { task: { include: { officialHabit: { select: { difficulties: true } } } } } },
      },
    });
    if (!aspiration || aspiration.userId !== userId) {
      return NextResponse.json({ error: '找不到嚮往' }, { status: 404 });
    }

    const habits = (aspiration.habits || [])
      .map(ah => ah.task)
      .filter(t => t && t.status === 'active' && t.officialHabit)
      .map(t => ({
        taskId: t.id, title: t.title, category: t.category,
        officialHabit: t.officialHabit, userImpact: t.userImpact, userAbility: t.userAbility, targetDays: t.targetDays,
      }));

    if (habits.length === 0) {
      return NextResponse.json({ error: '這個嚮往還沒有已加入的習慣' }, { status: 400 });
    }

    const plan = buildPlanFromAspiration({ habits });
    const isPublic = visibility === 'public';
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { nickname: true } });

    const template = await prisma.template.create({
      data: {
        name,
        description: description || aspiration.identity || null,
        category: 'community', // 社群計畫；分區由 sectionIdFor(authorType) 決定
        authorType: 'user',
        authorUserId: userId,
        authorName: user?.nickname || '使用者',
        reviewStatus: isPublic ? 'pending' : 'approved',
        isPublic,
        expertId: null,
        tasks: plan,
      },
    });

    return NextResponse.json({ ok: true, templateId: template.id, reviewStatus: template.reviewStatus });
  } catch (error) {
    console.error('from-aspiration error:', error);
    return NextResponse.json({ error: '建立計畫失敗' }, { status: 500 });
  }
}
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd web-app && npx jest src/__tests__/api/plans-from-aspiration.test.js`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add web-app/src/app/api/plans/from-aspiration/route.js web-app/src/__tests__/api/plans-from-aspiration.test.js
git -c user.name="HabitNext Dev" -c user.email="dev@habitnext.local" commit -m "feat(plans): POST /api/plans/from-aspiration creates user template (pending/private)

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

## Task 2.4: 「存成計畫」UI（SaveAsPlanModal + 焦點地圖入口）

**Files:**
- Create: `web-app/src/components/focusMap/SaveAsPlanModal.jsx`
- Modify: `web-app/src/components/FocusMapModal.jsx`
- Test: `web-app/src/__tests__/components/focusMap/SaveAsPlanModal.test.jsx`

- [ ] **Step 1: 寫失敗測試**

建立 `web-app/src/__tests__/components/focusMap/SaveAsPlanModal.test.jsx`：

```jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SaveAsPlanModal from '../../../components/focusMap/SaveAsPlanModal';

const phases = [
  { id: 'p1', name: '養成期', days: 22, tasks: [{ title: '深蹲' }, { title: '喝水' }] },
  { id: 'p2', name: '進階', days: 22, tasks: [{ title: '深蹲' }] },
];

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true, templateId: 't1', reviewStatus: 'pending' }) }));
});
afterEach(() => jest.restoreAllMocks());

const base = { isOpen: true, userId: 'u1', aspirationId: 'a1', defaultName: '睡得更好', previewPlan: { version: '2.0', phases }, onClose: jest.fn(), onSaved: jest.fn() };

describe('SaveAsPlanModal', () => {
  test('預覽階段與習慣', () => {
    render(<SaveAsPlanModal {...base} />);
    expect(screen.getByText(/養成期/)).toBeInTheDocument();
    expect(screen.getByText(/進階/)).toBeInTheDocument();
    expect(screen.getAllByText('深蹲').length).toBeGreaterThanOrEqual(1);
  });

  test('名稱預填、可改', () => {
    render(<SaveAsPlanModal {...base} />);
    expect(screen.getByDisplayValue('睡得更好')).toBeInTheDocument();
  });

  test('申請公開送出呼叫 API 並帶 visibility=public', async () => {
    render(<SaveAsPlanModal {...base} />);
    fireEvent.click(screen.getByRole('button', { name: /申請公開/ }));
    await waitFor(() => {
      const call = global.fetch.mock.calls.find(c => String(c[0]).includes('/api/plans/from-aspiration'));
      expect(call).toBeTruthy();
      expect(JSON.parse(call[1].body).visibility).toBe('public');
      expect(base.onSaved).toHaveBeenCalled();
    });
  });

  test('存為私人帶 visibility=private', async () => {
    render(<SaveAsPlanModal {...base} />);
    fireEvent.click(screen.getByRole('button', { name: /存為私人/ }));
    await waitFor(() => {
      const call = global.fetch.mock.calls.find(c => String(c[0]).includes('/api/plans/from-aspiration'));
      expect(JSON.parse(call[1].body).visibility).toBe('private');
    });
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd web-app && npx jest src/__tests__/components/focusMap/SaveAsPlanModal.test.jsx`
Expected: FAIL。

- [ ] **Step 3: 實作 `web-app/src/components/focusMap/SaveAsPlanModal.jsx`**

```jsx
'use client';

import React, { useState } from 'react';
import { X, Layers, Loader } from 'lucide-react';

// SaveAsPlanModal — 把目前嚮往的習慣集存成計畫。
// Props: isOpen, userId, aspirationId, defaultName, previewPlan({version,phases}), onClose(), onSaved(result)
const SaveAsPlanModal = ({ isOpen, userId, aspirationId, defaultName, previewPlan, onClose, onSaved }) => {
  const [name, setName] = useState(defaultName || '');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  if (!isOpen) return null;
  const phases = previewPlan?.phases || [];

  const submit = async (visibility) => {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/plans/from-aspiration', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aspirationId, userId, name: name.trim(), description: description.trim(), visibility }),
      });
      if (res.ok) { const json = await res.json(); onSaved?.(json); }
      else { alert('建立計畫失敗，請稍後再試'); }
    } catch (e) { console.error('save plan error', e); alert('發生錯誤'); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-white w-full max-w-xl h-[88dvh] md:max-h-[88dvh] rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex justify-between items-center flex-shrink-0">
          <h2 className="text-base font-bold text-gray-800 flex items-center gap-1.5"><Layers size={16} className="text-emerald-500" /> 存成計畫</h2>
          <button onClick={onClose} className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors"><X size={20} className="text-gray-500" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <label className="block text-xs font-bold text-gray-500 mb-1">計畫名稱</label>
          <input value={name} onChange={e => setName(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold mb-3 focus:border-emerald-400 outline-none" />
          <label className="block text-xs font-bold text-gray-500 mb-1">描述（選填）</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-4 focus:border-emerald-400 outline-none" />
          <p className="text-xs font-bold text-gray-500 mb-2">階段預覽（共 {phases.length} 階段）</p>
          {phases.map((ph, i) => (
            <div key={ph.id || i} className="rounded-xl border border-gray-200 p-3 mb-2">
              <div className="flex items-center justify-between mb-1.5">
                <b className="text-[13px] text-gray-800">{ph.name}</b>
                <span className="text-[11px] text-gray-400 font-bold">{ph.days} 天 · {ph.tasks?.length || 0} 個習慣</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(ph.tasks || []).map((t, k) => (
                  <span key={k} className="text-[11px] font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">{t.title}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 flex gap-2.5 flex-shrink-0">
          <button type="button" onClick={() => submit('private')} disabled={submitting || !name.trim()}
            className="flex-none bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl px-4 py-3 font-extrabold text-sm transition-colors disabled:opacity-50">
            存為私人
          </button>
          <button type="button" onClick={() => submit('public')} disabled={submitting || !name.trim()}
            className="flex-1 bg-gradient-to-r from-emerald-400 to-emerald-600 text-white rounded-xl py-3 font-extrabold transition-transform hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-1.5">
            {submitting ? <Loader size={16} className="animate-spin" /> : null} 申請公開分享
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveAsPlanModal;
```

- [ ] **Step 4: 跑測試確認通過**

Run: `cd web-app && npx jest src/__tests__/components/focusMap/SaveAsPlanModal.test.jsx`
Expected: PASS。

- [ ] **Step 5: 在 FocusMapModal 完成畫面加入口**

在 `web-app/src/components/FocusMapModal.jsx`：
1. import 與狀態：頂部加 `import SaveAsPlanModal from './focusMap/SaveAsPlanModal';` 與 `import { buildPlanFromAspiration } from '@/lib/planBuilder';`；在 state 區加 `const [showSavePlan, setShowSavePlan] = useState(false);`。
2. props：在元件參數加入 `aspirationId`（由 MainApp 傳入；無則入口不顯示）。
3. 在 `handleConfirm` 成功分支設一個完成旗標：新增 state `const [doneCount, setDoneCount] = useState(null);`，成功時 `setDoneCount(json.counts?.activate || 0);`（不立即關閉，顯示完成畫面）。
4. 在 `map` 區塊之後、render 樹內，當 `doneCount != null` 時顯示完成畫面（取代地圖），含「把這套存成計畫」按鈕（僅當 `aspirationId` 存在）與「完成」按鈕：

```jsx
{doneCount != null && (
  <div className="text-center py-10 px-4">
    <p className="text-lg font-extrabold text-gray-800">已加入 {doneCount} 個習慣</p>
    <p className="text-xs text-gray-500 mt-1">要把這套習慣存成一個計畫嗎？之後可重複使用，或申請公開分享給大家。</p>
    <div className="flex flex-col gap-2 mt-5 max-w-xs mx-auto">
      {aspirationId && (
        <button type="button" onClick={() => setShowSavePlan(true)}
          className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-white rounded-xl py-3 font-extrabold transition-transform hover:-translate-y-0.5">
          把這套存成計畫
        </button>
      )}
      <button type="button" onClick={() => { onClose?.(); }}
        className="text-gray-500 hover:text-gray-700 font-bold text-sm py-2 transition-colors">完成</button>
    </div>
  </div>
)}
{showSavePlan && aspirationId && (
  <SaveAsPlanModal
    isOpen userId={userId} aspirationId={aspirationId}
    defaultName={''}
    previewPlan={buildPlanFromAspiration({ habits: candidates
      .filter(c => added.has(c.id))
      .map(c => ({ taskId: c.id, title: c.title, category: c.officialHabit ? (c.category || 'community') : 'community',
        officialHabit: c.officialHabit, userImpact: ratings.get(c.id)?.impact, userAbility: ratings.get(c.id)?.ability, targetDays: duration })) })}
    onClose={() => setShowSavePlan(false)}
    onSaved={() => { setShowSavePlan(false); onClose?.(); }}
  />
)}
```

> 注意：完成畫面只在 `doneCount != null` 時顯示；其餘 phase 邏輯不變。`onActivated` 仍照常呼叫讓父層刷新。`candidates` 物件需含 `officialHabit`（candidates API 已 include）。

5. 在 MainApp 傳入 `aspirationId`：找到 `<FocusMapModal ... />` 使用處，加上 `aspirationId={activeAspiration?.id || null}`（若該情境無 activeAspiration 則為 null，入口自然不顯示）。

- [ ] **Step 6: 跑相關測試 + 既有 FocusMapModal 測試**

Run: `cd web-app && npx jest src/__tests__/components/focusMap/`
Expected: PASS（既有 FocusMapModal 測試不應因新增 doneCount 完成畫面而破——確認「全部評完進入焦點地圖」測試在按確認加入前仍看得到地圖；若測試在 onActivated 後斷言關閉，調整為斷言完成畫面或 onActivated 被呼叫即可，不改變既有 onActivated 行為）。

- [ ] **Step 7: Commit**

```bash
git add web-app/src/components/focusMap/SaveAsPlanModal.jsx web-app/src/components/FocusMapModal.jsx web-app/src/components/MainApp.jsx web-app/src/__tests__/components/focusMap/SaveAsPlanModal.test.jsx
git -c user.name="HabitNext Dev" -c user.email="dev@habitnext.local" commit -m "feat(plans): SaveAsPlanModal + focus-map done-screen entry to save aspiration as plan

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

# SLICE 3 — 社群分區 + 探索標示 + 後台審核 + 加入

## Task 3.1: `sectionIdFor` + sections 加 community

**Files:**
- Modify: `web-app/src/lib/templateRecommendation.js`
- Test: `web-app/src/__tests__/lib/templateRecommendation.test.js`（若不存在則建立）

- [ ] **Step 1: 寫/補失敗測試**

在 `web-app/src/__tests__/lib/templateRecommendation.test.js` 加（若檔案不存在，建立並 `const { sectionIdFor, groupTemplatesBySection } = require('../../lib/templateRecommendation');`）：

```js
describe('sectionIdFor — community', () => {
  it('routes user-authored templates to community regardless of category', () => {
    expect(sectionIdFor({ authorType: 'user', category: 'daisy' })).toBe('community');
    expect(sectionIdFor({ authorType: 'user', category: 'sleep_stress' })).toBe('community');
  });
  it('keeps official templates on their category section', () => {
    expect(sectionIdFor({ authorType: 'official', category: 'daisy' })).toBe('flower');
    expect(sectionIdFor({ category: 'sleep_stress' })).toBe('sleep');
    expect(sectionIdFor({ category: 'whatever' })).toBe('other');
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd web-app && npx jest src/__tests__/lib/templateRecommendation.test.js -t community`
Expected: FAIL。

- [ ] **Step 3: 修改 `web-app/src/lib/templateRecommendation.js`**

在 `TEMPLATE_SECTIONS` 陣列最後（`other` 之後）加一個區段：

```js
    {
        id: 'community',
        label: '社群計畫',
        description: '由其他使用者分享、經審核的計畫。',
        quizPendingCopy: null,
    },
```

把 `sectionIdFor` 改為（authorType 優先）：

```js
function sectionIdFor(template) {
    if (!template) return 'other';
    if (template.authorType === 'user') return 'community';
    if (!template.category) return 'other';
    if (FLOWER_TYPES.has(template.category)) return 'flower';
    if (SLEEP_CATEGORIES.has(template.category)) return 'sleep';
    return 'other';
}
```

在 `groupTemplatesBySection` 的 `grouped` 物件初始化加入 `community: []`（找到 `const grouped = { flower: [], sleep: [], other: [] };` 改為 `const grouped = { flower: [], sleep: [], other: [], community: [] };`）。

- [ ] **Step 4: 跑測試確認通過**

Run: `cd web-app && npx jest src/__tests__/lib/templateRecommendation.test.js`
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
git add web-app/src/lib/templateRecommendation.js web-app/src/__tests__/lib/templateRecommendation.test.js
git -c user.name="HabitNext Dev" -c user.email="dev@habitnext.local" commit -m "feat(plans): sectionIdFor routes user templates to community section

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

## Task 3.2: 公開清單只取已核准

**Files:**
- Modify: 公開計畫清單 API（TemplateExplorer 取用的那支）
- Test: 對應 API 測試（若可行）

- [ ] **Step 1: 定位公開清單 API**

Run: `cd web-app && grep -rln "isPublic" src/app/api | grep -v __tests__`
找出 TemplateExplorer 取用的公開模板 API（預期含 `where: { isPublic: true }` 的 findMany）。記下檔案路徑 `<PUBLIC_API>`。

- [ ] **Step 2: 加 reviewStatus 過濾**

在該 API 的 `where` 把 `{ isPublic: true }` 改為：

```js
where: { isPublic: true, reviewStatus: 'approved' }
```
（官方模板 `reviewStatus` 預設 `approved`，不受影響；pending 社群計畫不會出現。）

- [ ] **Step 3: 驗證**

Run: `cd web-app && npx jest`（確保現有 API/元件測試未紅；若有測試 mock 回傳含 pending 應更新）。
另手動：`grep -n "reviewStatus" <PUBLIC_API>` 確認已加入。

- [ ] **Step 4: Commit**

```bash
git add <PUBLIC_API>
git -c user.name="HabitNext Dev" -c user.email="dev@habitnext.local" commit -m "feat(plans): public plan list shows only approved templates

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

## Task 3.3: 「用戶自創 · by 作者」徽章

**Files:**
- Modify: `web-app/src/components/TemplateDetailPanel.jsx`、`web-app/src/components/TemplateExplorer.jsx`
- Test: `web-app/src/__tests__/components/TemplateAuthorBadge.test.jsx`
- Create: `web-app/src/components/templates/AuthorBadge.jsx`（共用小元件）

- [ ] **Step 1: 寫失敗測試**

建立 `web-app/src/__tests__/components/TemplateAuthorBadge.test.jsx`：

```jsx
import { render, screen } from '@testing-library/react';
import AuthorBadge from '../../components/templates/AuthorBadge';

describe('AuthorBadge', () => {
  test('user-authored shows 用戶自創 + author name', () => {
    render(<AuthorBadge template={{ authorType: 'user', authorName: '小明' }} />);
    expect(screen.getByText(/用戶自創/)).toBeInTheDocument();
    expect(screen.getByText(/小明/)).toBeInTheDocument();
  });
  test('official shows 官方', () => {
    render(<AuthorBadge template={{ authorType: 'official', expert: { name: '王醫師' } }} />);
    expect(screen.getByText(/官方/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd web-app && npx jest src/__tests__/components/TemplateAuthorBadge.test.jsx`
Expected: FAIL。

- [ ] **Step 3: 實作 `web-app/src/components/templates/AuthorBadge.jsx`**

```jsx
'use client';

import React from 'react';
import { Users, BadgeCheck } from 'lucide-react';

// AuthorBadge — 標示計畫是「官方」或「用戶自創 · by 作者」。
const AuthorBadge = ({ template }) => {
  if (!template) return null;
  if (template.authorType === 'user') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2 py-0.5 bg-violet-50 text-violet-700 border border-violet-200">
        <Users size={11} /> 用戶自創{template.authorName ? ` · by ${template.authorName}` : ''}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold rounded-full px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200">
      <BadgeCheck size={11} /> 官方{template.expert?.name ? ` · ${template.expert.name}` : ''}
    </span>
  );
};

export default AuthorBadge;
```

- [ ] **Step 4: 在 TemplateDetailPanel 與 TemplateExplorer 卡片插入徽章**

在 `TemplateDetailPanel.jsx` 標題附近 import `import AuthorBadge from './templates/AuthorBadge';` 並渲染 `<AuthorBadge template={template} />`。
在 `TemplateExplorer.jsx` 的計畫卡標題列同樣 import 並加 `<AuthorBadge template={t} />`（`t` 為該卡的 template 變數，依現場命名調整）。

- [ ] **Step 5: 跑測試確認通過**

Run: `cd web-app && npx jest src/__tests__/components/TemplateAuthorBadge.test.jsx`
Expected: PASS。

- [ ] **Step 6: Commit**

```bash
git add web-app/src/components/templates/AuthorBadge.jsx web-app/src/components/TemplateDetailPanel.jsx web-app/src/components/TemplateExplorer.jsx web-app/src/__tests__/components/TemplateAuthorBadge.test.jsx
git -c user.name="HabitNext Dev" -c user.email="dev@habitnext.local" commit -m "feat(plans): AuthorBadge — distinguish user-created vs official plans

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

## Task 3.4: 後台審核佇列 + review API

**Files:**
- Create: `web-app/src/app/api/admin/plans/[id]/review/route.js`
- Create: `web-app/src/app/admin/dashboard/templates/review/page.js`
- Modify: `web-app/src/app/admin/dashboard/templates/page.js`（加入口連結）
- Test: `web-app/src/__tests__/api/admin-plan-review.test.js`

- [ ] **Step 1: 寫失敗測試（review API）**

建立 `web-app/src/__tests__/api/admin-plan-review.test.js`：

```js
/** @jest-environment node */
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    template: {
      findUnique: jest.fn(() => Promise.resolve({ id: 't1', authorType: 'user', reviewStatus: 'pending' })),
      update: jest.fn((args) => Promise.resolve({ id: 't1', ...args.data })),
    },
  },
}));

import prisma from '@/lib/prisma';
import { PATCH } from '../../app/api/admin/plans/[id]/review/route';

const req = (body) => ({ json: () => Promise.resolve(body) });

describe('PATCH /api/admin/plans/[id]/review', () => {
  beforeEach(() => jest.clearAllMocks());

  it('approve sets reviewStatus approved', async () => {
    const res = await PATCH(req({ decision: 'approve' }), { params: { id: 't1' } });
    expect(res.status).toBe(200);
    expect(prisma.template.update.mock.calls[0][0].data.reviewStatus).toBe('approved');
  });

  it('reject sets reviewStatus rejected with reason', async () => {
    await PATCH(req({ decision: 'reject', reason: '內容不足' }), { params: { id: 't1' } });
    expect(prisma.template.update.mock.calls[0][0].data.reviewStatus).toBe('rejected');
  });

  it('400 on invalid decision', async () => {
    const res = await PATCH(req({ decision: 'maybe' }), { params: { id: 't1' } });
    expect(res.status).toBe(400);
  });

  it('409 when template is not pending', async () => {
    prisma.template.findUnique.mockResolvedValue({ id: 't1', authorType: 'user', reviewStatus: 'approved' });
    const res = await PATCH(req({ decision: 'approve' }), { params: { id: 't1' } });
    expect(res.status).toBe(409);
  });
});
```

- [ ] **Step 2: 跑測試確認失敗**

Run: `cd web-app && npx jest src/__tests__/api/admin-plan-review.test.js`
Expected: FAIL。

- [ ] **Step 3: 實作 `web-app/src/app/api/admin/plans/[id]/review/route.js`**

```js
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// PATCH /api/admin/plans/[id]/review
// body: { decision: 'approve' | 'reject', reason? }
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const { decision, reason } = await request.json();
    if (decision !== 'approve' && decision !== 'reject') {
      return NextResponse.json({ error: 'decision must be approve or reject' }, { status: 400 });
    }
    const tpl = await prisma.template.findUnique({ where: { id }, select: { id: true, reviewStatus: true } });
    if (!tpl) return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (tpl.reviewStatus !== 'pending') {
      return NextResponse.json({ error: '此計畫不是待審狀態' }, { status: 409 });
    }
    const updated = await prisma.template.update({
      where: { id },
      data: {
        reviewStatus: decision === 'approve' ? 'approved' : 'rejected',
        description: decision === 'reject' && reason ? `（退回：${reason}）` : undefined,
      },
    });
    return NextResponse.json({ ok: true, reviewStatus: updated.reviewStatus });
  } catch (error) {
    console.error('plan review error:', error);
    return NextResponse.json({ error: '審核失敗' }, { status: 500 });
  }
}
```

> 退回原因僅做簡單記錄（附在描述）；若不希望覆寫描述，改存到 metadata 或略過——此處保持最小實作，不新增欄位。

- [ ] **Step 4: 跑測試確認通過**

Run: `cd web-app && npx jest src/__tests__/api/admin-plan-review.test.js`
Expected: PASS。

- [ ] **Step 5: 實作審核佇列頁 `web-app/src/app/admin/dashboard/templates/review/page.js`**

```jsx
"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ChevronLeft, Check, X, Loader } from 'lucide-react';

export default function PlanReviewPage() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/templates');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setPending(list.filter(t => t.authorType === 'user' && t.reviewStatus === 'pending'));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const decide = async (id, decision) => {
    let reason;
    if (decision === 'reject') { reason = window.prompt('退回原因（選填）') || ''; }
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/plans/${id}/review`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, reason }),
      });
      if (res.ok) await load(); else alert('審核失敗');
    } catch (e) { console.error(e); alert('發生錯誤'); }
    finally { setBusyId(null); }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href="/admin/dashboard/templates" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-4">
        <ChevronLeft size={16} /> 返回計畫管理
      </Link>
      <h1 className="text-2xl font-bold text-white mb-1">社群計畫審核</h1>
      <p className="text-sm text-gray-400 mb-6">使用者送出的公開計畫，核准後才會出現在探索計畫的「社群計畫」分區。</p>
      {loading ? (
        <div className="flex justify-center py-12"><Loader className="animate-spin text-emerald-500" /></div>
      ) : pending.length === 0 ? (
        <p className="text-sm text-gray-500 italic">目前沒有待審計畫。</p>
      ) : (
        <div className="space-y-3">
          {pending.map(t => {
            const phases = t.tasks?.phases || [];
            const taskCount = phases.reduce((s, p) => s + (Array.isArray(p.tasks) ? p.tasks.length : 0), 0);
            return (
              <div key={t.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-white">{t.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">by {t.authorName || '使用者'} · {phases.length} 階段 · {taskCount} 個習慣</p>
                    {t.description && <p className="text-xs text-gray-500 mt-1">{t.description}</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => decide(t.id, 'approve')} disabled={busyId === t.id}
                      className="admin-btn admin-btn-primary flex items-center gap-1"><Check size={14} /> 核准</button>
                    <button onClick={() => decide(t.id, 'reject')} disabled={busyId === t.id}
                      className="admin-btn admin-btn-secondary flex items-center gap-1"><X size={14} /> 退回</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: 計畫管理頁加審核入口**

在 `web-app/src/app/admin/dashboard/templates/page.js` 標題列的按鈕群（「計畫家族」連結附近）加一個：

```jsx
<Link href="/admin/dashboard/templates/review" className="admin-btn admin-btn-secondary no-underline">
    社群計畫審核
</Link>
```

- [ ] **Step 7: 確認 admin/templates API 回傳含 authorType/reviewStatus/authorName/tasks**

Run: `cd web-app && grep -n "select\|findMany\|authorType" src/app/api/admin/templates/route.js`
若該 API 用 `select` 限制欄位，補上 `authorType: true, reviewStatus: true, authorName: true`（`tasks`/`name`/`description` 應已含）。若用預設全欄位則免改。

- [ ] **Step 8: 跑測試 + Commit**

Run: `cd web-app && npx jest src/__tests__/api/admin-plan-review.test.js`
Expected: PASS。

```bash
git add web-app/src/app/api/admin/plans/[id]/review/route.js web-app/src/app/admin/dashboard/templates/review/page.js web-app/src/app/admin/dashboard/templates/page.js web-app/src/app/api/admin/templates/route.js web-app/src/__tests__/api/admin-plan-review.test.js
git -c user.name="HabitNext Dev" -c user.email="dev@habitnext.local" commit -m "feat(plans): admin community-plan review queue + review API

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

## Task 3.5: 加入流程相容無專家計畫

**Files:**
- Modify: `web-app/src/app/api/user/assignments/route.js`、`web-app/src/app/api/admin/assignments/route.js`
- Test: `web-app/src/__tests__/api/assignments-no-expert.test.js`（針對 user/assignments 的 expertId 行為，若難以單測則以手動驗證 + grep 取代）

- [ ] **Step 1: 找出 Assignment 建立時的 expertId 來源**

Run: `cd web-app && grep -n "expertId" src/app/api/user/assignments/route.js src/app/api/admin/assignments/route.js`
預期 user/assignments 約 line 105 有 `expertId: template.expertId`。

- [ ] **Step 2: 改為 null-safe**

把 `expertId: template.expertId,` 改為：

```js
                    expertId: template.expertId ?? null,
```
（schema 已將 `Assignment.expertId` 放寬為 nullable；admin/assignments 同樣處理若有相同寫法。）

- [ ] **Step 3: null-guard 讀取 template.expert**

Run: `cd web-app && grep -rn "template.expert\b\|\.expert\.name\|expert\.id" src/components src/app | grep -v __tests__`
逐處確認以可選鏈存取（`template.expert?.name`）；社群計畫 `expert` 為 null 時不可丟錯。修正任何直接 `template.expert.xxx` 為 `template.expert?.xxx`。

- [ ] **Step 4: 驗證**

Run: `cd web-app && npx jest`（全綠）。
手動：建立一個 private 社群計畫（expertId null）→ 在客戶端加入 → 任務正確展開、無 expert 相關錯誤。

- [ ] **Step 5: Commit**

```bash
git add -A
git -c user.name="HabitNext Dev" -c user.email="dev@habitnext.local" commit -m "feat(plans): joining a plan tolerates null expertId; guard expert reads

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Task 4: 整合驗收 + 收尾

- [ ] **Step 1: 全測試** `cd web-app && npx jest`（全綠）。
- [ ] **Step 2: Lint + build** `cd web-app && npm run lint && npm run build`（build 成功；`prisma generate` 已含新欄位）。
- [ ] **Step 3: 手動冒煙（桌機 + 手機尺寸）**：
  - 焦點地圖加入 → 高執行度習慣起始難度非初級（驗 Slice 1）。
  - 完成畫面「把這套存成計畫」→ 預覽階段 → 申請公開（pending）/ 存私人。
  - 後台 `/admin/dashboard/templates/review` → 核准 → 探索計畫「社群計畫」分區出現、徽章「用戶自創 · by 作者」。
  - 加入該社群計畫（expertId null）→ 任務展開正常。
  - 行動尺寸：SaveAsPlanModal、社群分區、審核頁可用。
- [ ] **Step 4: 收尾分支** — Announce: "I'm using the finishing-a-development-branch skill to complete this work." 依該 skill 驗證、push 前 `git fetch && git pull origin main`、合併、部署。

---

## Self-Review（計畫對照 spec）

- **預設難度演算法**：Task 1.1（lib）+ 1.2（batch-rate 套用）✓
- **計畫生成（演算法、v2.0 phases、分階段升級）**：Task 2.2 ✓；對齊 join 端欄位由 2.2 測試把關 ✓
- **作者模型 + 審核欄位 + expertId 放寬**：Task 2.1 ✓
- **存成計畫流程（預覽/命名/公開申請/私人，後端權威生成）**：Task 2.3（API）+ 2.4（UI）✓
- **社群分區（獨立家族）**：Task 3.1 ✓
- **公開只取已核准**：Task 3.2 ✓
- **標示用戶自創 vs 官方 + 作者**：Task 3.3 ✓
- **後台審核佇列 + review API**：Task 3.4 ✓
- **加入相容無專家**：Task 3.5 ✓
- **共用 DB additive/superset**：Task 2.1 step 1/4、Task 4 step 4 ✓
- **行動對等 / no-emoji / hover**：各 UI task 與 Task 4 step 3 ✓
- **型別/命名一致**：`resolveDifficulty(habit,userAbility)→{tier,config}`、`buildPlanFromAspiration({habits})→{version,phases:[{id,name,days,tasks}]}`、`sectionIdFor(template)`、AuthorBadge `template` prop、review API `{decision,reason}` — 跨 task 一致 ✓
- **無 placeholder**：UI 對既有檔案的插入點（TemplateExplorer 卡片變數、admin/templates select、公開清單 API）以 grep 定位步驟處理，因現場命名未知；其餘皆附完整程式碼 ✓
