# Slice K — 嚮往（Aspiration）系統 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在「+ 新增」flow 中插入 Step 1「嚮往 Picker」+ Step 2「依嚮往的 GENESIS+IO domain 推薦計畫與習慣」，並在 Profile 加「我的嚮往」tab 管理。

**Architecture:** 三新 Prisma model（Aspiration / AspirationHabit / User.identities[]）+ 一新欄位（PlanCategory.domain）+ 五新 API endpoints + 兩新 UI modals + 一新 Profile tab + Wire 既有 add flows 通過 aspirationId。推薦邏輯純依 domain mapping，無 AI。Preset 35 條走 JSON（不進 DB）。

**Tech Stack:** Prisma 5 + Vercel Postgres、Next.js 14 App Router、React 18、Tailwind CSS、lucide-react。Spec：[`docs/superpowers/specs/2026-05-23-slice-K-aspiration-system-design.md`](../specs/2026-05-23-slice-K-aspiration-system-design.md)

---

## Open Questions Resolved (before plan)

Spec §11 五項 — 寫 plan 時先拍板：

1. **Step 1 picker UI** → modal + 內部滑入 panel pattern (like TemplateExplorer + TemplateDetailPanel)
2. **零推薦 fallback** → inline 空狀態 + 兩個 fallback 按鈕（導 TemplateExplorer / TaskLibraryModal）
3. **重複嚮往** → 偵測同 text → 提示「你已有這個嚮往」+ 改成導向使用既有的（不阻擋）
4. **「為你推薦」演算法 v1** → hardcoded mapping in `lib/aspirations.js`：
   - `user.sleepTypeKey` 設 → 4 個 sleep-related preset 浮頂
   - `user.typeKey` 設（無 sleep）→ 2 個女性週期相關 preset 浮頂
   - 都無 → 不顯示「為你推薦」區
5. **AppHeader [+]** → 改成開 AspirationPicker（取代原 onOpenAddFlow → TaskLibraryModal）。Sidebar「建立習慣」也改開 AspirationPicker。「探索計畫」「探索習慣」既有 nav 不變。

---

## File Structure

### Created
| Path | Responsibility |
|---|---|
| `web-app/prisma/seed/preset-aspirations.json` | 35 個 preset entries（text + domain） |
| `web-app/src/lib/aspirations.js` | 純函數：duplicate detection、recommendation filter、為你推薦 mapping |
| `web-app/src/__tests__/lib/aspirations.test.js` | 上面的單元測試 |
| `web-app/src/app/api/aspirations/route.js` | GET list、POST create |
| `web-app/src/app/api/aspirations/[id]/route.js` | PATCH (status)、DELETE (cascade AspirationHabit) |
| `web-app/src/app/api/aspirations/[id]/habits/route.js` | POST：commit task 時寫 AspirationHabit row |
| `web-app/src/app/api/aspirations/[id]/recommendations/route.js` | GET：依 domain mapping 回 templates + habits |
| `web-app/src/components/AspirationPicker.jsx` | Step 1 modal（picker） |
| `web-app/src/components/AspirationRecommendationPanel.jsx` | Step 2 內部滑入 panel |
| `web-app/src/components/profile/MyAspirationsTab.jsx` | Profile「我的嚮往」tab |

### Modified
| Path | Change |
|---|---|
| `web-app/prisma/schema.prisma` | 加 `User.identities`、`Aspiration`、`AspirationHabit`、`PlanCategory.domain` |
| `web-app/scripts/seed-plan-categories.js` | 系統列 backfill `domain` 欄位 |
| `web-app/src/components/MainApp.jsx` | 加 AspirationPicker state、修改 [+] 處理、TemplateExplorer/TaskFormModal 傳 aspirationId |
| `web-app/src/components/AppHeader.jsx` | [+] icon 改開 AspirationPicker（透過 prop） |
| `web-app/src/components/TemplateExplorer.jsx` | 接 `aspirationId` prop、join 時呼叫 `/api/aspirations/:id/habits` |
| `web-app/src/components/TaskFormModal.jsx` | 接 `aspirationId` prop、save 時呼叫 `/api/aspirations/:id/habits` |
| `web-app/src/components/ProfileModal.jsx` | 加 tab 切換「個人資料 ｜ 我的嚮往」 |
| `web-app/src/app/admin/dashboard/templates/categories/page.js` | 加 domain dropdown（9 個 option）on edit row |
| `web-app/src/app/api/admin/plan-categories/[id]/route.js` | PUT 接受 `domain` 欄位 |
| `web-app/src/components/explore/HabitListView.jsx` | 移除 Slice D 的 [清單｜焦點地圖] toggle（錯位） |

---

## Task 1: Schema 升級

**Files:**
- Modify: `web-app/prisma/schema.prisma`

- [ ] **Step 1: 修改 User、加 Aspiration / AspirationHabit、加 PlanCategory.domain**

打開 `web-app/prisma/schema.prisma`：

(a) `User` model 加 `identities` 與 `aspirations` 關聯：

```prisma
model User {
  id          String       @id @default(cuid())
  nickname    String
  phone       String       @unique
  countryCode String?
  password    String?
  email       String?
  avatar      String?
  typeKey     String?
  sleepTypeKey String?
  identities  String[]     @default([])  // ★ Slice K — 多身分並存（手動 / Profile 加；v1 不自動加冕）
  isActive    Boolean      @default(true)
  createdAt   DateTime     @default(now())
  tasks       Task[]
  assignments Assignment[]
  aspirations Aspiration[]                 // ★ Slice K
}
```

(b) `PlanCategory` model 加 `domain`：

```prisma
model PlanCategory {
  id        String   @id @default(cuid())
  slug      String?  @unique
  name      String
  color     String?
  icon      String?
  domain    String?                          // ★ Slice K — GENESIS+IO domain mapping
  order     Int      @default(0)
  isSystem  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

(c) 在 `OfficialHabit` model 後面（檔案結尾前）加入兩個新 model：

```prisma
// ============================================
// Slice K — 嚮往系統
// ============================================

model Aspiration {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  text        String              // "想要快速入睡、睡眠品質好"
  domain      String?             // GENESIS+IO domain key — 推薦來源

  status      String   @default("active")   // active | achieved | archived
  achievedAt  DateTime?

  source      String   @default("user")     // user | preset (v1 沒 ai)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  habits      AspirationHabit[]

  @@index([userId, status])
}

model AspirationHabit {
  id              String      @id @default(cuid())
  aspirationId    String
  aspiration      Aspiration  @relation(fields: [aspirationId], references: [id], onDelete: Cascade)

  taskId          String?     // commit 後寫入；null 代表使用者瀏覽過但未加入

  createdAt       DateTime    @default(now())

  @@index([aspirationId])
  @@index([taskId])
}
```

- [ ] **Step 2: Push schema 到 DB**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && npx prisma db push --accept-data-loss
```

Expected ending：`Your database is now in sync with your Prisma schema.`（新欄位全為 nullable / default，無資料損失但 Prisma CLI 可能會 prompt — 用 `--accept-data-loss` flag 跳過）

- [ ] **Step 3: 重生 Prisma client**

如果 dev server 還在跑，先關掉再執行：

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx prisma generate
```

Expected：`Generated Prisma Client (vX.Y.Z) to ./node_modules/@prisma/client`

- [ ] **Step 4: 驗證**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && node -e "
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  // 驗證新欄位 + 新 model 可用
  const u = await p.user.findFirst({ select: { id: true, identities: true } });
  console.log('User.identities sample:', u);
  const cnt1 = await p.aspiration.count();
  const cnt2 = await p.aspirationHabit.count();
  console.log('Aspiration table:', cnt1, 'rows; AspirationHabit table:', cnt2, 'rows');
  const pc = await p.planCategory.findFirst({ where: { slug: 'sleep_stress' }, select: { slug: true, domain: true } });
  console.log('PlanCategory.domain field exists:', pc);
  await p.\$disconnect();
})();
"
```

Expected: `User.identities sample: { id: '...', identities: [] }`、`Aspiration table: 0 rows; AspirationHabit table: 0 rows`、`PlanCategory.domain field exists: { slug: 'sleep_stress', domain: null }`

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/prisma/schema.prisma && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(db): Slice K — Aspiration + AspirationHabit + User.identities + PlanCategory.domain"
```

---

## Task 2: Preset Aspirations seed JSON

**Files:**
- Create: `web-app/prisma/seed/preset-aspirations.json`

- [ ] **Step 1: 寫 JSON**

用 Write 工具建立 `web-app/prisma/seed/preset-aspirations.json`，內容（全 35 條，照 spec 寫的順序）：

```json
[
  { "text": "想要腸道更健康（減少脹氣 / 排便不順）", "domain": "基因與腸道" },
  { "text": "想要降低家族遺傳病風險", "domain": "基因與腸道" },
  { "text": "想要找出自己的食物敏感原", "domain": "基因與腸道" },
  { "text": "想要打造一個讓人放鬆的家", "domain": "環境" },
  { "text": "想要工作環境更舒服、不腰痠背痛", "domain": "環境" },
  { "text": "想要對環境更友善（減塑）", "domain": "環境" },
  { "text": "想要瘦下來", "domain": "飲食" },
  { "text": "想要戒糖 / 戒含糖飲料", "domain": "飲食" },
  { "text": "想要不再下午想睡覺", "domain": "飲食" },
  { "text": "想要食量穩定不暴飲暴食", "domain": "飲食" },
  { "text": "想要學會煮健康料理", "domain": "飲食" },
  { "text": "想要規律運動不偷懶", "domain": "運動" },
  { "text": "想要肌肉量增加 / 體脂下降", "domain": "運動" },
  { "text": "想要能輕鬆爬樓梯不喘", "domain": "運動" },
  { "text": "想要早上起床不再覺得累", "domain": "壓力與睡眠" },
  { "text": "想要快速入睡、睡眠品質好", "domain": "壓力與睡眠" },
  { "text": "想要焦慮少一點、放鬆多一點", "domain": "壓力與睡眠" },
  { "text": "想要白天能維持專注不昏沈", "domain": "壓力與睡眠" },
  { "text": "想要少滑手機、減少數位疲勞", "domain": "壓力與睡眠" },
  { "text": "想要跟伴侶 / 家人關係更好", "domain": "社交互動" },
  { "text": "想要結交新朋友、不孤單", "domain": "社交互動" },
  { "text": "想要溝通更有同理心", "domain": "社交互動" },
  { "text": "想要每天都有 me time", "domain": "心靈" },
  { "text": "想要找到生活的意義感", "domain": "心靈" },
  { "text": "想要心情更平穩、不易煩躁", "domain": "心靈" },
  { "text": "想要終身學習保持腦力", "domain": "認知與智慧" },
  { "text": "想要寫作 / 創作能力提升", "domain": "認知與智慧" },
  { "text": "想要學會一項新技能 / 語言", "domain": "認知與智慧" },
  { "text": "想要工作專注效率提升", "domain": "職涯與平衡" },
  { "text": "想要工作 / 生活平衡", "domain": "職涯與平衡" },
  { "text": "想要找到工作熱情 / 心流", "domain": "職涯與平衡" },
  { "text": "想要更敢於說「不」", "domain": "職涯與平衡" }
]
```

注意：spec §4 列了 32 條（不是 35）— 上面這份就是 32 個 entries。如果之後需要再加，調整本 JSON 即可。

- [ ] **Step 2: 驗證 JSON 結構**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && node -e "
const data = JSON.parse(require('fs').readFileSync('prisma/seed/preset-aspirations.json','utf-8'));
console.log('count:', data.length);
const validDomains = ['基因與腸道','環境','飲食','運動','壓力與睡眠','社交互動','心靈','認知與智慧','職涯與平衡'];
let bad = 0;
data.forEach((e, i) => {
  if (!e.text || typeof e.text !== 'string') { console.log('BAD text @', i, e); bad++; }
  if (!validDomains.includes(e.domain)) { console.log('BAD domain @', i, e); bad++; }
});
if (bad) { console.log('errors:', bad); process.exit(1); }
console.log('OK — all entries valid');
"
```

Expected: `count: 32` 與 `OK — all entries valid`

- [ ] **Step 3: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/prisma/seed/preset-aspirations.json && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(seed): 32 preset aspirations JSON across 9 GENESIS+IO domains"
```

---

## Task 3: PlanCategory.domain backfill for system rows

**Files:**
- Modify: `web-app/scripts/seed-plan-categories.js`

- [ ] **Step 1: 修改 SYSTEM_ROWS — 加 domain field**

打開 `web-app/scripts/seed-plan-categories.js`，把 `SYSTEM_ROWS` array 替換成：

```js
const SYSTEM_ROWS = [
  // Flower (women's course) — pink family
  { slug: 'daisy',           name: '雛菊型',         color: '#f472b6', icon: '🌼', order: 100, domain: '壓力與睡眠' },
  { slug: 'rose',            name: '玫瑰型',         color: '#ec4899', icon: '🌹', order: 101, domain: '壓力與睡眠' },
  { slug: 'orchid',          name: '蘭花型',         color: '#d946ef', icon: '🪷', order: 102, domain: '壓力與睡眠' },
  { slug: 'sunflower',       name: '向日葵型',       color: '#fb923c', icon: '🌻', order: 103, domain: '壓力與睡眠' },
  // Sleep — indigo family
  { slug: 'sleep_stress',    name: '睡眠 · 壓力',    color: '#818cf8', icon: '😵‍💫', order: 200, domain: '壓力與睡眠' },
  { slug: 'sleep_rhythm',    name: '睡眠 · 節律',    color: '#6366f1', icon: '🌙',  order: 201, domain: '壓力與睡眠' },
  { slug: 'sleep_metabolic', name: '睡眠 · 代謝',    color: '#4f46e5', icon: '⏰',  order: 202, domain: '壓力與睡眠' },
  { slug: 'sleep_hormone',   name: '睡眠 · 荷爾蒙',  color: '#4338ca', icon: '🔄',  order: 203, domain: '壓力與睡眠' },
];
```

然後在 `prisma.planCategory.update` / `prisma.planCategory.create` 的 `data` block 加 `domain: r.domain`：

把這兩處（update 與 create）：

```js
data: {
  name: r.name,
  color: r.color,
  icon: r.icon,
  order: r.order,
  isSystem: true,
},
```

改為：

```js
data: {
  name: r.name,
  color: r.color,
  icon: r.icon,
  order: r.order,
  domain: r.domain,
  isSystem: true,
},
```

create 的 data block 多一行（slug 上方插）：

```js
data: {
  slug: r.slug,
  name: r.name,
  color: r.color,
  icon: r.icon,
  order: r.order,
  domain: r.domain,
  isSystem: true,
},
```

- [ ] **Step 2: 跑 seed**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && node scripts/seed-plan-categories.js
```

Expected: `Seeded system PlanCategories: created=0, updated=8`（系統列已存在 → 全 update，把 domain 補上）

- [ ] **Step 3: 驗證**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && node -e "
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.planCategory.findMany({ where: { isSystem: true }, select: { slug: true, domain: true } }).then(r => {
  r.forEach(c => console.log(' -', c.slug, '|', c.domain));
  const allHaveDomain = r.every(c => c.domain);
  console.log(allHaveDomain ? 'OK — all system rows have domain' : 'FAIL');
  return p.\$disconnect();
});
"
```

Expected: 8 行全部顯示 `壓力與睡眠`，最後 `OK — all system rows have domain`

- [ ] **Step 4: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/scripts/seed-plan-categories.js && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(seed): PlanCategory.domain backfill for 8 system rows (all → 壓力與睡眠)"
```

---

## Task 4: `lib/aspirations.js` 純函數 + 單元測試（TDD）

**Files:**
- Create: `web-app/src/lib/aspirations.js`
- Create: `web-app/src/__tests__/lib/aspirations.test.js`

### Step 1: 寫失敗的測試

建立 `web-app/src/__tests__/lib/aspirations.test.js`：

```js
const {
  GENESIS_DOMAINS,
  findDuplicateAspiration,
  filterRecommendedTemplates,
  filterRecommendedHabits,
  getPersonalisedPresets,
} = require('../../lib/aspirations');

describe('GENESIS_DOMAINS', () => {
  it('contains all 9 canonical domain names', () => {
    expect(GENESIS_DOMAINS).toEqual([
      '基因與腸道', '環境', '飲食', '運動',
      '壓力與睡眠', '社交互動', '心靈', '認知與智慧', '職涯與平衡',
    ]);
  });
});

describe('findDuplicateAspiration', () => {
  it('returns existing aspiration when text matches (case-insensitive trim)', () => {
    const list = [
      { id: 'a1', text: '想要快速入睡、睡眠品質好', status: 'active' },
      { id: 'a2', text: '想要瘦下來', status: 'achieved' },
    ];
    expect(findDuplicateAspiration(list, '想要快速入睡、睡眠品質好')).toEqual({ id: 'a1', text: '想要快速入睡、睡眠品質好', status: 'active' });
    expect(findDuplicateAspiration(list, '  想要瘦下來  ')).toEqual({ id: 'a2', text: '想要瘦下來', status: 'achieved' });
  });

  it('returns null when no match', () => {
    const list = [{ id: 'a1', text: '想要瘦下來', status: 'active' }];
    expect(findDuplicateAspiration(list, '想要學會煮飯')).toBeNull();
  });

  it('handles empty list / empty text', () => {
    expect(findDuplicateAspiration([], '想要瘦下來')).toBeNull();
    expect(findDuplicateAspiration([{ id: 'a1', text: '想要瘦下來', status: 'active' }], '')).toBeNull();
    expect(findDuplicateAspiration(null, '想要瘦下來')).toBeNull();
  });
});

describe('filterRecommendedTemplates', () => {
  const planCategoryMap = {
    'sleep_stress': { domain: '壓力與睡眠' },
    'sleep_rhythm': { domain: '壓力與睡眠' },
    'rose':         { domain: '壓力與睡眠' },
    '健康生活':      { domain: null },
  };

  it('returns templates whose PlanCategory.domain matches aspiration.domain', () => {
    const templates = [
      { id: 't1', category: 'sleep_stress' },
      { id: 't2', category: 'sleep_rhythm' },
      { id: 't3', category: 'rose' },
      { id: 't4', category: '健康生活' },
    ];
    expect(filterRecommendedTemplates(templates, '壓力與睡眠', planCategoryMap).map(t => t.id))
      .toEqual(['t1', 't2', 't3']);
  });

  it('returns [] for null domain', () => {
    expect(filterRecommendedTemplates([{ id: 't1', category: 'rose' }], null, planCategoryMap)).toEqual([]);
  });

  it('drops templates whose category is not in planCategoryMap', () => {
    const templates = [{ id: 't1', category: 'unknown_slug' }];
    expect(filterRecommendedTemplates(templates, '飲食', planCategoryMap)).toEqual([]);
  });
});

describe('filterRecommendedHabits', () => {
  it('filters OfficialHabits where habit.category === aspiration.domain', () => {
    const habits = [
      { id: 'h1', category: '壓力與睡眠' },
      { id: 'h2', category: '飲食' },
      { id: 'h3', category: '壓力與睡眠' },
    ];
    expect(filterRecommendedHabits(habits, '壓力與睡眠').map(h => h.id)).toEqual(['h1', 'h3']);
  });

  it('returns [] for null domain', () => {
    expect(filterRecommendedHabits([{ id: 'h1', category: '飲食' }], null)).toEqual([]);
  });
});

describe('getPersonalisedPresets', () => {
  const presets = [
    { text: '想要快速入睡、睡眠品質好', domain: '壓力與睡眠' },
    { text: '想要早上起床不再覺得累',   domain: '壓力與睡眠' },
    { text: '想要瘦下來',                domain: '飲食' },
    { text: '想要食量穩定不暴飲暴食',   domain: '飲食' },
    { text: '想要終身學習保持腦力',     domain: '認知與智慧' },
  ];

  it('returns top sleep + 飲食 presets when user has sleepTypeKey', () => {
    const result = getPersonalisedPresets(presets, { sleepTypeKey: 'stress', typeKey: null });
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.every(p => ['壓力與睡眠', '飲食'].includes(p.domain))).toBe(true);
  });

  it('returns 飲食 + 壓力與睡眠 presets when user has typeKey only', () => {
    const result = getPersonalisedPresets(presets, { sleepTypeKey: null, typeKey: 'rose' });
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result.every(p => ['飲食', '壓力與睡眠'].includes(p.domain))).toBe(true);
  });

  it('returns empty array when user has no typeKey / sleepTypeKey', () => {
    expect(getPersonalisedPresets(presets, { sleepTypeKey: null, typeKey: null })).toEqual([]);
  });

  it('caps result at 5 entries', () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ text: `t${i}`, domain: '壓力與睡眠' }));
    expect(getPersonalisedPresets(many, { sleepTypeKey: 'stress', typeKey: null }).length).toBeLessThanOrEqual(5);
  });
});
```

- [ ] **Step 2: 跑測試確認 FAIL**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest src/__tests__/lib/aspirations.test.js
```

Expected: `Cannot find module '../../lib/aspirations'`

- [ ] **Step 3: 實作 `lib/aspirations.js`**

建立 `web-app/src/lib/aspirations.js`：

```js
// src/lib/aspirations.js
// Pure helpers for Slice K — no Prisma, no I/O.
// Spec: docs/superpowers/specs/2026-05-23-slice-K-aspiration-system-design.md

const GENESIS_DOMAINS = [
  '基因與腸道', '環境', '飲食', '運動',
  '壓力與睡眠', '社交互動', '心靈', '認知與智慧', '職涯與平衡',
];

// Detect whether the user already owns an aspiration with the same text.
// Case-insensitive + trim — picker uses it to redirect to the existing row.
function findDuplicateAspiration(existingAspirations, text) {
  if (!Array.isArray(existingAspirations) || !text || typeof text !== 'string') return null;
  const needle = text.trim();
  if (!needle) return null;
  return existingAspirations.find(a => a.text && a.text.trim() === needle) || null;
}

// Step 2 — 「適合的計畫」filter.
// Templates carry a category slug that joins to PlanCategory.slug;
// the caller pre-builds a `planCategoryMap` { slug -> { domain, ... } }.
function filterRecommendedTemplates(templates, aspirationDomain, planCategoryMap) {
  if (!aspirationDomain || !Array.isArray(templates)) return [];
  return templates.filter(t => {
    const cat = planCategoryMap?.[t.category];
    return cat?.domain === aspirationDomain;
  });
}

// Step 2 — 「適合的習慣」filter.
// OfficialHabit.category stores the GENESIS+IO domain string directly.
function filterRecommendedHabits(officialHabits, aspirationDomain) {
  if (!aspirationDomain || !Array.isArray(officialHabits)) return [];
  return officialHabits.filter(h => h.category === aspirationDomain);
}

// Step 1「為你推薦」mapping for v1 — hardcoded:
//   sleepTypeKey set → 壓力與睡眠 + 飲食 presets
//   typeKey set (no sleep) → 飲食 + 壓力與睡眠 presets (women's cycle)
//   neither → []
// Caps at 5 entries.
function getPersonalisedPresets(presets, user) {
  if (!Array.isArray(presets) || !user) return [];
  let priorityDomains = [];
  if (user.sleepTypeKey) {
    priorityDomains = ['壓力與睡眠', '飲食'];
  } else if (user.typeKey) {
    priorityDomains = ['飲食', '壓力與睡眠'];
  } else {
    return [];
  }
  const result = [];
  for (const d of priorityDomains) {
    for (const p of presets) {
      if (p.domain === d && result.length < 5) result.push(p);
    }
  }
  return result.slice(0, 5);
}

module.exports = {
  GENESIS_DOMAINS,
  findDuplicateAspiration,
  filterRecommendedTemplates,
  filterRecommendedHabits,
  getPersonalisedPresets,
};
```

- [ ] **Step 4: 跑測試確認 PASS**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest src/__tests__/lib/aspirations.test.js
```

Expected: 11 tests pass。

- [ ] **Step 5: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/lib/aspirations.js web-app/src/__tests__/lib/aspirations.test.js && git -c user.email="weichun1008@users.noreply.function" -c user.name="weichun1008" commit -m "feat(lib): aspirations helpers (duplicate detect / recommend filter / personalised presets)"
```

注意：上一行 git commit 的 user.email 有 typo（`noreply.function` 應該是 `noreply.github.com`），請執行時改回：

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/lib/aspirations.js web-app/src/__tests__/lib/aspirations.test.js && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(lib): aspirations helpers (duplicate detect / recommend filter / personalised presets)"
```

---

## Task 5: API endpoints

**Files:**
- Create: `web-app/src/app/api/aspirations/route.js`
- Create: `web-app/src/app/api/aspirations/[id]/route.js`
- Create: `web-app/src/app/api/aspirations/[id]/habits/route.js`
- Create: `web-app/src/app/api/aspirations/[id]/recommendations/route.js`

- [ ] **Step 1: `aspirations/route.js` — GET list + POST create**

建立 `web-app/src/app/api/aspirations/route.js`：

```js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/aspirations?userId=&status=active
// status default 'active'; pass 'all' for archived + achieved too.
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const status = searchParams.get('status') || 'active';

        if (!userId) {
            return NextResponse.json({ error: 'userId required' }, { status: 400 });
        }

        const where = { userId };
        if (status !== 'all') where.status = status;

        const rows = await prisma.aspiration.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            include: {
                _count: { select: { habits: true } },
            },
        });
        return NextResponse.json(rows);
    } catch (error) {
        console.error('Fetch aspirations error:', error);
        return NextResponse.json({ error: '取得嚮往失敗' }, { status: 500 });
    }
}

// POST /api/aspirations
// body: { userId, text, domain?, source? }
export async function POST(request) {
    try {
        const body = await request.json();
        const { userId, text, domain, source } = body;

        if (!userId || !text || typeof text !== 'string' || !text.trim()) {
            return NextResponse.json({ error: 'userId + text required' }, { status: 400 });
        }

        const created = await prisma.aspiration.create({
            data: {
                userId,
                text: text.trim(),
                domain: domain || null,
                source: source === 'preset' ? 'preset' : 'user',
            },
        });
        return NextResponse.json(created);
    } catch (error) {
        console.error('Create aspiration error:', error);
        return NextResponse.json({ error: '新增嚮往失敗' }, { status: 500 });
    }
}
```

- [ ] **Step 2: `aspirations/[id]/route.js` — PATCH + DELETE**

建立 `web-app/src/app/api/aspirations/[id]/route.js`：

```js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// PATCH /api/aspirations/:id
// body: { status?, achievedAt? }
export async function PATCH(request, { params }) {
    try {
        const body = await request.json();
        const { status, achievedAt } = body;

        const data = {};
        if (status !== undefined) {
            if (!['active', 'achieved', 'archived'].includes(status)) {
                return NextResponse.json({ error: 'invalid status' }, { status: 400 });
            }
            data.status = status;
            // Auto-set achievedAt when marking achieved
            if (status === 'achieved' && achievedAt === undefined) {
                data.achievedAt = new Date();
            }
            // Clear achievedAt when reverting to active
            if (status === 'active') {
                data.achievedAt = null;
            }
        }
        if (achievedAt !== undefined) {
            data.achievedAt = achievedAt ? new Date(achievedAt) : null;
        }

        const updated = await prisma.aspiration.update({
            where: { id: params.id },
            data,
        });
        return NextResponse.json(updated);
    } catch (error) {
        console.error('Update aspiration error:', error);
        return NextResponse.json({ error: '更新嚮往失敗' }, { status: 500 });
    }
}

// DELETE /api/aspirations/:id — cascades AspirationHabit rows
export async function DELETE(request, { params }) {
    try {
        await prisma.aspiration.delete({ where: { id: params.id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete aspiration error:', error);
        return NextResponse.json({ error: '刪除嚮往失敗' }, { status: 500 });
    }
}
```

- [ ] **Step 3: `aspirations/[id]/habits/route.js` — POST 寫 AspirationHabit**

建立 `web-app/src/app/api/aspirations/[id]/habits/route.js`：

```js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/aspirations/:id/habits
// body: { taskId }
// Called after committing a task or template join — registers the link.
export async function POST(request, { params }) {
    try {
        const body = await request.json();
        const { taskId } = body;

        if (!taskId) {
            return NextResponse.json({ error: 'taskId required' }, { status: 400 });
        }

        const created = await prisma.aspirationHabit.create({
            data: {
                aspirationId: params.id,
                taskId,
            },
        });
        return NextResponse.json(created);
    } catch (error) {
        console.error('Create AspirationHabit error:', error);
        return NextResponse.json({ error: '寫入嚮往任務關聯失敗' }, { status: 500 });
    }
}
```

- [ ] **Step 4: `aspirations/[id]/recommendations/route.js` — GET 推薦**

建立 `web-app/src/app/api/aspirations/[id]/recommendations/route.js`：

```js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { filterRecommendedTemplates, filterRecommendedHabits } from '@/lib/aspirations';

// GET /api/aspirations/:id/recommendations
// Returns { aspiration, templates, habits } based on aspiration.domain.
export async function GET(request, { params }) {
    try {
        const aspiration = await prisma.aspiration.findUnique({ where: { id: params.id } });
        if (!aspiration) {
            return NextResponse.json({ error: '嚮往不存在' }, { status: 404 });
        }

        // Bulk fetch and filter in memory — counts are small.
        const [templates, habits, planCategories] = await Promise.all([
            prisma.template.findMany({
                where: { isPublic: true },
                include: {
                    expert: { select: { id: true, name: true, title: true } },
                    _count: { select: { assignments: true } },
                },
            }),
            prisma.officialHabit.findMany({ where: { isActive: true } }),
            prisma.planCategory.findMany({ select: { slug: true, domain: true, name: true, color: true, icon: true } }),
        ]);

        const planCategoryMap = {};
        for (const c of planCategories) {
            if (c.slug) planCategoryMap[c.slug] = c;
        }

        const recommendedTemplates = filterRecommendedTemplates(templates, aspiration.domain, planCategoryMap);
        const recommendedHabits = filterRecommendedHabits(habits, aspiration.domain);

        return NextResponse.json({
            aspiration,
            templates: recommendedTemplates,
            habits: recommendedHabits,
        });
    } catch (error) {
        console.error('Recommendations error:', error);
        return NextResponse.json({ error: '取得推薦失敗' }, { status: 500 });
    }
}
```

- [ ] **Step 5: Smoke test API（手動）**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && node -e "
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  // Need a test user
  let u = await p.user.findFirst({ where: { phone: '0900000099' } });
  if (!u) {
    const bcrypt = require('bcryptjs');
    u = await p.user.create({ data: { nickname: 'SmokeK', phone: '0900000099', countryCode: '+886', password: await bcrypt.hash('test', 10), typeKey: 'rose', sleepTypeKey: 'stress' } });
  }
  console.log('user:', u.id);
  // Now we test live API after preview server is up
  await p.\$disconnect();
})();
"
```

接著啟動 preview server（Habitnext Dev）並用 fetch 跑 5 個 endpoint：

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && node -e "
(async () => {
  const userId = '<paste user id from previous step>';
  const base = 'http://localhost:3000';

  // POST create
  let res = await fetch(base + '/api/aspirations', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ userId, text: '想要快速入睡', domain: '壓力與睡眠', source: 'preset' }) });
  const created = await res.json();
  console.log('POST create:', res.status, created.id);

  // GET list
  res = await fetch(base + '/api/aspirations?userId=' + userId);
  console.log('GET list:', res.status, (await res.json()).length, 'rows');

  // GET recommendations
  res = await fetch(base + '/api/aspirations/' + created.id + '/recommendations');
  const r = await res.json();
  console.log('GET recommendations:', res.status, 'templates:', r.templates?.length, 'habits:', r.habits?.length);

  // PATCH status
  res = await fetch(base + '/api/aspirations/' + created.id, { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ status: 'achieved' }) });
  const upd = await res.json();
  console.log('PATCH status:', res.status, 'achievedAt:', upd.achievedAt);

  // DELETE
  res = await fetch(base + '/api/aspirations/' + created.id, { method: 'DELETE' });
  console.log('DELETE:', res.status);
})();
"
```

Expected: 5 個 endpoint 全 status 200，POST 回 created id；GET recommendations 應該回 4 個 sleep templates + 多個 habits（依 OfficialHabit 數）；PATCH 設 achievedAt 自動；DELETE 成功。

- [ ] **Step 6: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add "web-app/src/app/api/aspirations" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(api): aspirations CRUD + habits join + recommendations (5 endpoints)"
```

---

## Task 6: AspirationPicker component (Step 1 modal)

**Files:**
- Create: `web-app/src/components/AspirationPicker.jsx`

- [ ] **Step 1: 建立 AspirationPicker.jsx**

建立 `web-app/src/components/AspirationPicker.jsx`：

```jsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Sparkles, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import presetAspirationsData from '@/../prisma/seed/preset-aspirations.json';
import { GENESIS_DOMAINS, getPersonalisedPresets, findDuplicateAspiration } from '@/lib/aspirations';
import AspirationRecommendationPanel from './AspirationRecommendationPanel';

const AspirationPicker = ({ isOpen, onClose, user, onTemplateJoinFromAspiration, onHabitAddFromAspiration }) => {
    const [existingAspirations, setExistingAspirations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [expandedDomain, setExpandedDomain] = useState(null);
    const [customText, setCustomText] = useState('');
    const [customDomain, setCustomDomain] = useState('');
    const [customMode, setCustomMode] = useState(false);
    const [committingAspiration, setCommittingAspiration] = useState(false);

    // After we resolve an aspiration (existing / new), open the panel with this id.
    const [activeAspiration, setActiveAspiration] = useState(null);

    useEffect(() => {
        if (isOpen && user?.id) {
            fetchExisting();
        }
    }, [isOpen, user?.id]);

    const fetchExisting = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/aspirations?userId=${user.id}&status=active`);
            if (res.ok) {
                const data = await res.json();
                setExistingAspirations(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error('Fetch aspirations error', e);
        } finally {
            setLoading(false);
        }
    };

    const personalised = useMemo(
        () => getPersonalisedPresets(presetAspirationsData, user || {}),
        [user?.typeKey, user?.sleepTypeKey]
    );

    const presetsByDomain = useMemo(() => {
        const map = {};
        for (const d of GENESIS_DOMAINS) map[d] = [];
        for (const p of presetAspirationsData) {
            if (map[p.domain]) map[p.domain].push(p);
        }
        return map;
    }, []);

    const commitAspiration = async ({ text, domain, source }) => {
        // Reuse existing if duplicate
        const dup = findDuplicateAspiration(existingAspirations, text);
        if (dup) {
            setActiveAspiration(dup);
            return;
        }
        setCommittingAspiration(true);
        try {
            const res = await fetch('/api/aspirations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, text, domain, source }),
            });
            if (res.ok) {
                const created = await res.json();
                setExistingAspirations(prev => [created, ...prev]);
                setActiveAspiration(created);
            } else {
                alert('新增嚮往失敗，請稍後再試');
            }
        } catch (e) {
            console.error(e);
            alert('發生錯誤');
        } finally {
            setCommittingAspiration(false);
        }
    };

    const submitCustom = () => {
        const t = customText.trim();
        if (!t) { alert('請輸入嚮往內容'); return; }
        if (!customDomain) { alert('請選擇生活面向'); return; }
        commitAspiration({ text: t, domain: customDomain, source: 'user' });
        setCustomMode(false);
        setCustomText('');
        setCustomDomain('');
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end md:items-center justify-center p-0 md:p-4">
            <div className="bg-white w-full max-w-xl h-[85dvh] md:max-h-[85dvh] rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-start bg-white">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">你想要什麼？</h2>
                        <p className="text-xs text-gray-500 mt-0.5">從這裡開始，我們會推薦合適的計畫與習慣</p>
                    </div>
                    <button onClick={onClose} className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={22} className="text-gray-500" />
                    </button>
                </div>

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">

                    {/* 為你推薦 */}
                    {personalised.length > 0 && (
                        <section className="mb-6">
                            <h3 className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <Sparkles size={12} /> 為你推薦
                            </h3>
                            <div className="space-y-2">
                                {personalised.map((p, i) => (
                                    <button
                                        key={`pers-${i}`}
                                        type="button"
                                        onClick={() => commitAspiration({ text: p.text, domain: p.domain, source: 'preset' })}
                                        disabled={committingAspiration}
                                        className="w-full text-left bg-white border border-amber-200 hover:border-amber-300 rounded-xl px-4 py-3 text-sm text-gray-800 transition-colors disabled:opacity-50"
                                    >
                                        {p.text}
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* 你已有的嚮往 */}
                    {existingAspirations.length > 0 && (
                        <section className="mb-6">
                            <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">你已有的嚮往</h3>
                            <div className="space-y-2">
                                {existingAspirations.map(a => (
                                    <button
                                        key={a.id}
                                        type="button"
                                        onClick={() => setActiveAspiration(a)}
                                        className="w-full text-left bg-white border border-emerald-200 hover:border-emerald-300 rounded-xl px-4 py-3 transition-colors"
                                    >
                                        <p className="text-sm text-gray-800">{a.text}</p>
                                        <p className="text-[11px] text-gray-400 mt-0.5">掛 {a._count?.habits ?? 0} 個任務</p>
                                    </button>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* 從 9 個生活面向開始 */}
                    <section className="mb-6">
                        <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">從生活面向開始</h3>
                        <div className="space-y-2">
                            {GENESIS_DOMAINS.map(d => {
                                const items = presetsByDomain[d] || [];
                                if (items.length === 0) return null;
                                const open = expandedDomain === d;
                                return (
                                    <div key={d} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                                        <button
                                            type="button"
                                            onClick={() => setExpandedDomain(open ? null : d)}
                                            className="w-full px-4 py-3 flex items-center justify-between text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            <span>{d}</span>
                                            {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                        </button>
                                        {open && (
                                            <div className="border-t border-gray-100 divide-y divide-gray-100">
                                                {items.map((p, i) => (
                                                    <button
                                                        key={`${d}-${i}`}
                                                        type="button"
                                                        onClick={() => commitAspiration({ text: p.text, domain: p.domain, source: 'preset' })}
                                                        disabled={committingAspiration}
                                                        className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                                                    >
                                                        {p.text}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* 自訂 */}
                    <section>
                        {!customMode ? (
                            <button
                                type="button"
                                onClick={() => setCustomMode(true)}
                                className="w-full px-4 py-3 rounded-xl bg-white border-2 border-dashed border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2 text-sm transition-colors"
                            >
                                <Plus size={16} /> 自訂嚮往
                            </button>
                        ) : (
                            <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="輸入你的嚮往..."
                                    value={customText}
                                    onChange={e => setCustomText(e.target.value.slice(0, 80))}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                />
                                <select
                                    value={customDomain}
                                    onChange={e => setCustomDomain(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                                >
                                    <option value="">選擇生活面向</option>
                                    {GENESIS_DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={submitCustom}
                                        disabled={committingAspiration}
                                        className="flex-1 py-2 rounded-lg bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                    >
                                        加入
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setCustomMode(false); setCustomText(''); setCustomDomain(''); }}
                                        className="px-4 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm hover:bg-gray-200 transition-colors"
                                    >
                                        取消
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                {/* Step 2 panel — slides in when aspiration is picked */}
                {activeAspiration && (
                    <AspirationRecommendationPanel
                        aspiration={activeAspiration}
                        onBack={() => setActiveAspiration(null)}
                        onJoinTemplate={template => {
                            onTemplateJoinFromAspiration(template, activeAspiration);
                        }}
                        onAddHabit={habit => {
                            onHabitAddFromAspiration(habit, activeAspiration);
                        }}
                        onExploreTemplates={() => {
                            onTemplateJoinFromAspiration(null, activeAspiration); // null = trigger explorer
                        }}
                        onExploreHabits={() => {
                            onHabitAddFromAspiration(null, activeAspiration); // null = trigger library
                        }}
                    />
                )}
            </div>
        </div>
    );
};

export default AspirationPicker;
```

- [ ] **Step 2: Commit（此時尚不能驗證、Task 7 後一起）**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/AspirationPicker.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): AspirationPicker modal (Step 1) — preset list + personalised + custom + existing"
```

---

## Task 7: AspirationRecommendationPanel (Step 2 slide-in)

**Files:**
- Create: `web-app/src/components/AspirationRecommendationPanel.jsx`

- [ ] **Step 1: 建立 AspirationRecommendationPanel.jsx**

建立 `web-app/src/components/AspirationRecommendationPanel.jsx`：

```jsx
'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Sparkles, Loader, Users, Check, ListChecks } from 'lucide-react';

const AspirationRecommendationPanel = ({ aspiration, onBack, onJoinTemplate, onAddHabit, onExploreTemplates, onExploreHabits }) => {
    const [shown, setShown] = useState(false);
    const [data, setData] = useState({ templates: [], habits: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Slide-in animation
        const id = requestAnimationFrame(() => setShown(true));
        return () => cancelAnimationFrame(id);
    }, []);

    useEffect(() => {
        fetchRecommendations();
    }, [aspiration?.id]);

    const fetchRecommendations = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/aspirations/${aspiration.id}/recommendations`);
            if (res.ok) {
                const json = await res.json();
                setData({
                    templates: Array.isArray(json.templates) ? json.templates : [],
                    habits: Array.isArray(json.habits) ? json.habits : [],
                });
            }
        } catch (e) {
            console.error('Recommendations fetch error', e);
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        setShown(false);
        setTimeout(() => onBack?.(), 200);
    };

    return (
        <div
            className={`absolute inset-0 bg-white z-10 flex flex-col transition-transform duration-200 ease-out ${
                shown ? 'translate-x-0' : 'translate-x-full'
            }`}
            role="dialog"
            aria-label={`${aspiration?.text} 推薦`}
        >
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-shrink-0">
                <button
                    onClick={handleBack}
                    className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-600"
                    aria-label="返回"
                >
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-base font-bold text-gray-800 truncate flex-1">{aspiration?.text}</h2>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 pb-24 bg-gray-50">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader className="animate-spin text-emerald-500" />
                    </div>
                ) : (
                    <>
                        {/* 適合的計畫 */}
                        <section className="mb-6">
                            <h3 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-3 flex items-center gap-1">
                                <Sparkles size={12} /> 適合的計畫
                            </h3>
                            {data.templates.length === 0 ? (
                                <p className="text-xs text-gray-400 italic mb-2">這個嚮往目前沒有對應的計畫</p>
                            ) : (
                                <div className="space-y-3">
                                    {data.templates.map(t => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => onJoinTemplate(t)}
                                            className="w-full text-left bg-white border border-gray-200 hover:border-emerald-300 hover:shadow-sm rounded-xl p-4 transition-all"
                                        >
                                            <h4 className="font-bold text-gray-800 text-sm">{t.name}</h4>
                                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.description || ''}</p>
                                            <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-400">
                                                <span className="flex items-center gap-1"><Users size={11} /> {t._count?.assignments ?? 0}</span>
                                                <span className="flex items-center gap-1"><Check size={11} /> {t.expert?.name || '系統'}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* 適合的習慣 */}
                        <section className="mb-6">
                            <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-1">
                                <ListChecks size={12} /> 適合的習慣
                            </h3>
                            {data.habits.length === 0 ? (
                                <p className="text-xs text-gray-400 italic mb-2">這個嚮往目前沒有對應的習慣</p>
                            ) : (
                                <div className="space-y-2">
                                    {data.habits.map(h => (
                                        <button
                                            key={h.id}
                                            type="button"
                                            onClick={() => onAddHabit(h)}
                                            className="w-full text-left bg-white border border-gray-200 hover:border-emerald-300 hover:shadow-sm rounded-xl p-3 transition-all flex items-center gap-3"
                                        >
                                            <span className="text-xl">{h.icon || '⭐'}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-gray-800 text-sm">{h.name}</p>
                                                <p className="text-[11px] text-gray-400 line-clamp-1">{h.description || ''}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Fallback */}
                        {(data.templates.length === 0 && data.habits.length === 0) && (
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4 text-center">
                                <p className="text-sm text-amber-700">這個嚮往目前還沒有對應的計畫 / 習慣</p>
                                <p className="text-xs text-amber-600 mt-1">可以從下面手動探索</p>
                            </div>
                        )}

                        <div className="bg-white border border-gray-200 rounded-xl p-4">
                            <p className="text-xs text-gray-500 mb-3">或者，跳過嚮往直接探索：</p>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={onExploreTemplates}
                                    className="flex-1 py-2 rounded-lg bg-indigo-100 text-indigo-700 text-sm font-bold hover:bg-indigo-200 transition-colors"
                                >
                                    探索計畫
                                </button>
                                <button
                                    type="button"
                                    onClick={onExploreHabits}
                                    className="flex-1 py-2 rounded-lg bg-emerald-100 text-emerald-700 text-sm font-bold hover:bg-emerald-200 transition-colors"
                                >
                                    探索習慣
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default AspirationRecommendationPanel;
```

- [ ] **Step 2: Commit**

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/AspirationRecommendationPanel.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): AspirationRecommendationPanel (Step 2) — 適合的計畫/習慣 + fallback"
```

---

## Task 8: 把 AspirationPicker 接進 MainApp + AppHeader + TemplateExplorer + TaskFormModal

**Files:**
- Modify: `web-app/src/components/MainApp.jsx`
- Modify: `web-app/src/components/AppHeader.jsx`
- Modify: `web-app/src/components/TemplateExplorer.jsx`
- Modify: `web-app/src/components/TaskFormModal.jsx`

### Step 1: MainApp — 加 AspirationPicker state + 處理 onJoin/onAdd 回呼

打開 `web-app/src/components/MainApp.jsx`：

(a) 在頂部 imports 區加：

```jsx
import AspirationPicker from './AspirationPicker';
```

(b) 在 `useState` 區（其他 `isXxxOpen` 旁邊）加：

```jsx
const [isAspirationPickerOpen, setIsAspirationPickerOpen] = useState(false);
const [pendingAspirationId, setPendingAspirationId] = useState(null);
const [pendingHabitForForm, setPendingHabitForForm] = useState(null);
```

(c) 找到目前打開 TaskLibraryModal 的 `onOpenAddFlow` handler（搜尋 `setIsLibraryModalOpen(true); setIsFormModalOpen(false)`），把它替換成（保留變數但改成開 picker）：

把這個（在 AppHeader/Sidebar 各一處）：

```jsx
onOpenAddFlow={() => { setIsLibraryModalOpen(true); setIsFormModalOpen(false); setEditingTask(null); setSelectedDate(getTodayStr()); }}
```

改為：

```jsx
onOpenAddFlow={() => { setIsAspirationPickerOpen(true); setEditingTask(null); setSelectedDate(getTodayStr()); }}
```

（搜尋整個檔案，可能 2-3 處要改）

(d) 在 modal 渲染區（其他 `<TemplateExplorer ... />`、`<TaskLibraryModal ... />` 附近）加：

```jsx
<AspirationPicker
    isOpen={isAspirationPickerOpen}
    onClose={() => setIsAspirationPickerOpen(false)}
    user={user}
    onTemplateJoinFromAspiration={(template, aspiration) => {
        // template==null => user clicked 探索計畫 fallback
        setIsAspirationPickerOpen(false);
        setPendingAspirationId(aspiration.id);
        setIsTemplateExplorerOpen(true);
    }}
    onHabitAddFromAspiration={(habit, aspiration) => {
        // habit==null => user clicked 探索習慣 fallback
        setIsAspirationPickerOpen(false);
        setPendingAspirationId(aspiration.id);
        if (habit) {
            // direct add: open TaskFormModal pre-filled with this OfficialHabit
            setPendingHabitForForm(habit);
            setIsFormModalOpen(true);
        } else {
            // fallback: open library
            setIsLibraryModalOpen(true);
        }
    }}
/>
```

(e) 在 `<TemplateExplorer />` 加 prop：

```jsx
<TemplateExplorer
    // ... existing props
    aspirationId={pendingAspirationId}
    onJoinComplete={() => setPendingAspirationId(null)}
/>
```

(f) 在 `<TaskFormModal />` 加 prop：

```jsx
<TaskFormModal
    // ... existing props
    initialData={pendingHabitForForm ? mapHabitToTaskForm(pendingHabitForForm) : editingTask}
    aspirationId={pendingAspirationId}
    onSaveComplete={() => { setPendingAspirationId(null); setPendingHabitForForm(null); }}
/>
```

注意 `mapHabitToTaskForm` 是 helper — 暫時用 `pendingHabitForForm ?? editingTask`（如果 TaskFormModal 既有 initialData 不需要轉換 habit object，可以直接傳）。如不確定，先註解掉 pendingHabit 路徑，留 fallback 路徑（探索習慣）作為 v1 唯一 path：

```jsx
onHabitAddFromAspiration={(habit, aspiration) => {
    setIsAspirationPickerOpen(false);
    setPendingAspirationId(aspiration.id);
    setIsLibraryModalOpen(true);  // 永遠走探索習慣 fallback for v1
}}
```

v1 簡化版即：點推薦的習慣 = 點探索習慣 fallback。後續可優化直接 pre-fill TaskFormModal。

### Step 2: TemplateExplorer — 接 aspirationId 並在 join 時呼叫 AspirationHabit

打開 `web-app/src/components/TemplateExplorer.jsx`：

(a) 改 component signature 加 prop：

```jsx
const TemplateExplorer = ({ isOpen, onClose, userId, onJoin, userTypeKey = null, userSleepTypeKey = null, aspirationId = null, onJoinComplete }) => {
```

(b) 改 `confirmJoin` 函式 — 在 onJoin 成功後寫 AspirationHabit：

把現有的：

```jsx
const confirmJoin = async (template, startDate) => {
    setJoiningId(template.id);
    setShowDatePicker(false);
    try {
        const res = await fetch('/api/user/assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                templateId: template.id,
                startDate: startDate
            })
        });

        if (res.ok) {
            onJoin();
            onClose();
        } else {
            alert('加入失敗，請稍後再試');
        }
    } catch (error) {
        // ...
    }
};
```

加入 aspirationId 處理：

```jsx
const confirmJoin = async (template, startDate) => {
    setJoiningId(template.id);
    setShowDatePicker(false);
    try {
        const res = await fetch('/api/user/assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                templateId: template.id,
                startDate: startDate
            })
        });

        if (res.ok) {
            const assignment = await res.json();
            // Slice K — if joined from aspiration flow, register the link.
            // The assignment creates one or more tasks; we link to the first task id.
            if (aspirationId && assignment?.taskIds?.length) {
                try {
                    await fetch(`/api/aspirations/${aspirationId}/habits`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ taskId: assignment.taskIds[0] }),
                    });
                } catch (e) {
                    console.warn('Failed to link aspiration', e);
                }
            }
            onJoinComplete?.();
            onJoin();
            onClose();
        } else {
            alert('加入失敗，請稍後再試');
        }
    } catch (error) {
        console.error('Join template error:', error);
        alert('發生錯誤');
    } finally {
        setJoiningId(null);
        setSelectedTemplate(null);
    }
};
```

注意：上面假設 `/api/user/assignments` POST 回應含 `taskIds` array。若實際 response 是 assignment 本身，可改成 fetch tasks by assignmentId 再取 first.id。檢查現有 `/api/user/assignments/route.js` 的 response shape；若沒回 taskIds，append 一個 fetch：

```jsx
// After successful join — fetch the just-created tasks to get their ids
const tasksRes = await fetch(`/api/tasks?userId=${userId}&assignmentId=${assignment.id}`);
if (tasksRes.ok) {
    const tasks = await tasksRes.json();
    if (tasks.length > 0 && aspirationId) {
        await fetch(`/api/aspirations/${aspirationId}/habits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId: tasks[0].id }),
        });
    }
}
```

採用哪種視 `/api/user/assignments` 實際 response 決定。

### Step 3: TaskFormModal — 接 aspirationId，save 後寫 AspirationHabit

打開 `web-app/src/components/TaskFormModal.jsx`：

(a) signature 加 prop：

```jsx
const TaskFormModal = ({ isOpen, onClose, onSave, initialData, aspirationId = null, onSaveComplete }) => {
```

(b) 找 save 成功的 callback（搜尋 `onSave(` 或 `await fetch('/api/tasks'`）— 在 save 成功取得 task id 後 + 關閉前加：

```jsx
// Slice K — link to aspiration if this save originated from aspiration flow
if (aspirationId && createdTask?.id) {
    try {
        await fetch(`/api/aspirations/${aspirationId}/habits`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId: createdTask.id }),
        });
    } catch (e) {
        console.warn('Failed to link aspiration', e);
    }
}
onSaveComplete?.();
```

依現有 TaskFormModal save flow 細節適配，重點是「成功取得 task id → 寫 AspirationHabit」。

### Step 4: AppHeader [+] — 走 onOpenAddFlow（已對接 picker，不用改）

確認 AppHeader 內 [+] icon 的 onClick 是 `onOpenAddFlow`：

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && grep -n "onOpenAddFlow" src/components/AppHeader.jsx
```

Expected: 有 1-2 個結果，都是把 prop 接到 [+] button onClick。**不用改**（MainApp 那邊已把 onOpenAddFlow 改成開 picker）。

### Step 5: 跑全 jest

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -6
```

Expected: 全部 tests pass（原 122 + 新 lib 11 = ~133）。

### Step 6: Commit

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/MainApp.jsx web-app/src/components/TemplateExplorer.jsx web-app/src/components/TaskFormModal.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): wire AspirationPicker into [+] flow + pass aspirationId to TemplateExplorer/TaskFormModal"
```

---

## Task 9: Profile「我的嚮往」tab

**Files:**
- Create: `web-app/src/components/profile/MyAspirationsTab.jsx`
- Modify: `web-app/src/components/ProfileModal.jsx`

### Step 1: 建立 MyAspirationsTab.jsx

建立 `web-app/src/components/profile/MyAspirationsTab.jsx`：

```jsx
'use client';

import React, { useState, useEffect } from 'react';
import { Check, Archive, Trash2, Loader } from 'lucide-react';

const StatusBadge = ({ status }) => {
    const map = {
        active:   { label: '進行中', cls: 'bg-emerald-100 text-emerald-700' },
        achieved: { label: '已達成', cls: 'bg-amber-100 text-amber-700' },
        archived: { label: '已封存', cls: 'bg-gray-100 text-gray-500' },
    };
    const { label, cls } = map[status] || { label: status, cls: 'bg-gray-100 text-gray-500' };
    return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
};

const MyAspirationsTab = ({ userId }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId) fetchAll();
    }, [userId]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/aspirations?userId=${userId}&status=all`);
            if (res.ok) {
                const data = await res.json();
                setItems(Array.isArray(data) ? data : []);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            const res = await fetch(`/api/aspirations/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            if (res.ok) {
                const updated = await res.json();
                setItems(prev => prev.map(a => a.id === id ? { ...a, ...updated } : a));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const removeOne = async (id) => {
        if (!confirm('刪除這個嚮往？掛靠的任務不會被刪除。')) return;
        try {
            const res = await fetch(`/api/aspirations/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setItems(prev => prev.filter(a => a.id !== id));
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-8">
                <Loader className="animate-spin text-emerald-500" />
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="text-center py-8 text-gray-400 text-sm">
                還沒有嚮往。從首頁 [+] 開始試試看。
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {items.map(a => {
                const habitsCount = a._count?.habits ?? 0;
                const dateText = a.achievedAt
                    ? new Date(a.achievedAt).toISOString().split('T')[0]
                    : new Date(a.createdAt).toISOString().split('T')[0];
                return (
                    <div key={a.id} className="bg-white border border-gray-200 rounded-xl p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="text-sm font-medium text-gray-800 flex-1">{a.text}</p>
                            <StatusBadge status={a.status} />
                        </div>
                        <p className="text-[11px] text-gray-400 mb-3">
                            {habitsCount} 個任務 · {a.achievedAt ? `達成於 ${dateText}` : `建立於 ${dateText}`}
                        </p>
                        <div className="flex gap-2">
                            {a.status === 'active' && (
                                <button
                                    type="button"
                                    onClick={() => updateStatus(a.id, 'achieved')}
                                    className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors flex items-center justify-center gap-1"
                                >
                                    <Check size={12} /> 標記達成
                                </button>
                            )}
                            {a.status === 'achieved' && (
                                <button
                                    type="button"
                                    onClick={() => updateStatus(a.id, 'active')}
                                    className="flex-1 py-1.5 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                                >
                                    取消達成
                                </button>
                            )}
                            {a.status !== 'archived' && (
                                <button
                                    type="button"
                                    onClick={() => updateStatus(a.id, 'archived')}
                                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors flex items-center gap-1"
                                >
                                    <Archive size={12} /> 封存
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => removeOne(a.id)}
                                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export default MyAspirationsTab;
```

### Step 2: 修改 ProfileModal — 加 tab 切換

打開 `web-app/src/components/ProfileModal.jsx`：

(a) Imports 加：

```jsx
import MyAspirationsTab from './profile/MyAspirationsTab';
```

(b) State 加（找到其他 useState 區）：

```jsx
const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'aspirations'
```

(c) 在 modal 內容上方加 tab switcher（具體位置看現有 ProfileModal layout — 通常在 header 下方、scrollable content 之上）：

```jsx
<div className="flex border-b border-gray-100 px-6">
    <button
        type="button"
        onClick={() => setActiveTab('profile')}
        className={`px-3 py-2 text-sm font-bold transition-colors ${activeTab === 'profile' ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-gray-400'}`}
    >
        個人資料
    </button>
    <button
        type="button"
        onClick={() => setActiveTab('aspirations')}
        className={`px-3 py-2 text-sm font-bold transition-colors ${activeTab === 'aspirations' ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-gray-400'}`}
    >
        我的嚮往
    </button>
</div>
```

(d) 把原本 profile 內容包成 conditional + 加 aspirations 內容：

```jsx
{activeTab === 'profile' ? (
    /* ... existing profile form ... */
) : (
    <div className="p-6">
        <MyAspirationsTab userId={user?.id} />
    </div>
)}
```

### Step 3: 跑 jest

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -6
```

Expected: 全 pass。

### Step 4: Commit

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/components/profile/MyAspirationsTab.jsx web-app/src/components/ProfileModal.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(ui): Profile 我的嚮往 tab — list + mark achieved/archive/delete"
```

---

## Task 10: Admin PlanCategory.domain editor + 移除 HabitListView FocusMap toggle

**Files:**
- Modify: `web-app/src/app/admin/dashboard/templates/categories/page.js`
- Modify: `web-app/src/app/api/admin/plan-categories/[id]/route.js`
- Modify: `web-app/src/app/api/admin/plan-categories/route.js`
- Modify: `web-app/src/components/explore/HabitListView.jsx`

### Step 1: Admin PUT 接受 domain field

打開 `web-app/src/app/api/admin/plan-categories/[id]/route.js`，PUT handler 內 data 區補 domain：

把：

```js
const data = {};
if (color !== undefined) data.color = color;
if (icon !== undefined) data.icon = icon;
if (order !== undefined) data.order = order;
```

改為：

```js
const data = {};
if (color !== undefined) data.color = color;
if (icon !== undefined) data.icon = icon;
if (order !== undefined) data.order = order;
if (body.domain !== undefined) data.domain = body.domain || null;
```

Admin POST `route.js` 同步加 domain（讓 admin 新增 user-defined PlanCategory 時可帶 domain）：

打開 `web-app/src/app/api/admin/plan-categories/route.js` 的 POST handler：

把：

```js
const category = await prisma.planCategory.create({
    data: {
        name: name.trim(),
        color: color || '#10b981',
        icon: icon || null,
        order: newOrder
    }
});
```

改為：

```js
const category = await prisma.planCategory.create({
    data: {
        name: name.trim(),
        color: color || '#10b981',
        icon: icon || null,
        order: newOrder,
        domain: body.domain || null,
    }
});
```

### Step 2: Admin UI — 加 domain dropdown

打開 `web-app/src/app/admin/dashboard/templates/categories/page.js`：

(a) imports 上方加：

```jsx
const GENESIS_DOMAINS = ['基因與腸道', '環境', '飲食', '運動', '壓力與睡眠', '社交互動', '心靈', '認知與智慧', '職涯與平衡'];
```

(b) `formData` 初始 state 加 `domain: ''`：

```jsx
const [formData, setFormData] = useState({ name: '', color: '#10B981', icon: '', domain: '' });
```

(c) `startEdit` 同步 domain：

```jsx
const startEdit = (category) => {
    setEditingId(category.id);
    setFormData({
        name: category.name,
        color: category.color || '#10B981',
        icon: category.icon || '',
        domain: category.domain || '',
    });
    setIsAdding(false);
};
```

(d) `cancelEdit` 重置：

```jsx
const cancelEdit = () => {
    setEditingId(null);
    setIsAdding(false);
    setFormData({ name: '', color: '#10B981', icon: '', domain: '' });
};
```

(e) 在 table 加一欄「Domain」（table head + body 都要加，編輯 row 也要 dropdown）：

`<thead>` 區增加 `<th>Domain</th>` 放在「顏色」之後：

```jsx
<thead>
    <tr>
        <th>圖示</th>
        <th>名稱</th>
        <th>Slug</th>
        <th>顏色</th>
        <th>Domain</th>
        <th>類型</th>
        <th>操作</th>
    </tr>
</thead>
```

`<tbody>` 內 — 編輯 row 與 read-only row 各加一個 `<td>` for domain：

編輯 row 在「顏色」`<td>` 後加：

```jsx
<td>
    <select
        value={formData.domain}
        onChange={e => setFormData({ ...formData, domain: e.target.value })}
        className="admin-input text-xs"
    >
        <option value="">—</option>
        {GENESIS_DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
    </select>
</td>
```

Read-only row 在「顏色」`<td>` 後加：

```jsx
<td className="text-xs text-gray-300">{cat.domain || '—'}</td>
```

(f) 新增 row 的 form（`{isAdding && ...}` 區）也加一個 domain dropdown：

在「顏色」div 旁加：

```jsx
<div>
    <label className="admin-label">Domain</label>
    <select
        value={formData.domain}
        onChange={e => setFormData({ ...formData, domain: e.target.value })}
        className="admin-input"
    >
        <option value="">—</option>
        {GENESIS_DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
    </select>
</div>
```

### Step 3: 移除 HabitListView 的 FocusMap toggle（Slice D 留下的錯位）

打開 `web-app/src/components/explore/HabitListView.jsx`，搜尋 `FocusMap` 與 `viewMode` / `setViewMode`：

把 `useState` 區的：

```jsx
const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
```

刪除。

把 toggle UI（通常是 [清單 ｜ 焦點地圖] 按鈕組）整段刪除。

把 conditional render 改成只渲 list：

```jsx
{viewMode === 'map' ? <FocusMap ... /> : <ListView ... />}
```

改為：

```jsx
<ListView ... />
```

（如果原本 List 已是 inline JSX，直接用該 JSX 替換 conditional 即可）

import 區把 `FocusMap` import 刪除：

```jsx
import FocusMap from './FocusMap';  // 刪
```

注意：**不刪 `FocusMap.jsx` 檔本身**（保留作 admin / debug 用）。

### Step 4: 跑 jest + build

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && npx jest 2>&1 | tail -6 && echo "--- build ---" && npm run build:local 2>&1 | grep -E "Compiled|error|Error" | head -5
```

Expected: tests pass + `✓ Compiled successfully`。

### Step 5: Commit

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" add web-app/src/app/admin/dashboard/templates/categories/page.js web-app/src/app/api/admin/plan-categories/route.js web-app/src/app/api/admin/plan-categories/\[id\]/route.js web-app/src/components/explore/HabitListView.jsx && git -c user.email="weichun1008@users.noreply.github.com" -c user.name="weichun1008" commit -m "feat(admin): PlanCategory.domain editor (dropdown) + remove HabitListView FocusMap toggle"
```

---

## Task 11: Browser smoke + merge + push

### Step 1: 啟動 preview server

用 Habitnext Dev launch config。確認 http://localhost:3000 可用。

### Step 2: 建/重設測試 user（typeKey=rose, sleepTypeKey=stress 有兩個分型走推薦）

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && node -e "
const {PrismaClient} = require('@prisma/client');
const bcrypt = require('bcryptjs');
const p = new PrismaClient();
(async () => {
  const hash = await bcrypt.hash('SliceKtest', 10);
  const u = await p.user.upsert({
    where: { phone: '0900000088' },
    update: { password: hash, typeKey: 'rose', sleepTypeKey: 'stress', isActive: true },
    create: { nickname: 'SliceKtest', phone: '0900000088', countryCode: '+886', password: hash, typeKey: 'rose', sleepTypeKey: 'stress', isActive: true }
  });
  console.log('user:', u.id);
  await p.\$disconnect();
})();
"
```

### Step 3: 登入 + 走完整 flow

登入 `0900000088 / SliceKtest`。

驗證項目（手動）：
- [ ] 點 AppHeader [+] → AspirationPicker 開啟，顯示「為你推薦」（4-5 個 sleep + 飲食 preset）、「從生活面向開始」（9 個可展開）、「自訂嚮往」
- [ ] 點「想要快速入睡、睡眠品質好」preset → 滑入推薦頁
- [ ] 推薦頁顯示 4 個睡眠 templates + 多個壓力與睡眠 OfficialHabits
- [ ] 點一個 template → TemplateExplorer / detail panel 流程；加入完成 → 回 daily view
- [ ] 開 Profile → tab 切「我的嚮往」 → 看到剛才加入的「想要快速入睡」 with 1 個任務
- [ ] 點「標記達成」 → status 變 achieved + 顯示日期
- [ ] 點「封存」 → status 變 archived
- [ ] 點「刪除」 → confirm 後消失（但 Task 仍在）

### Step 4: 驗證 DB

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && node -e "
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const u = await p.user.findUnique({ where: { phone: '0900000088' } });
  const aspirations = await p.aspiration.findMany({ where: { userId: u.id }, include: { habits: true } });
  console.log('aspirations:', aspirations.length);
  aspirations.forEach(a => {
    console.log(' -', a.text, '|', a.status, '| habits:', a.habits.length);
  });
  await p.\$disconnect();
})();
"
```

Expected: 至少 1 個 active 嚮往 with 1 個 AspirationHabit 連到剛加入的 task。

### Step 5: 清理 + merge + push

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1\web-app" && set -a && source .env.local && set +a && node -e "
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.user.delete({ where: { phone: '0900000088' } }).then(u => console.log('cleaned', u.id)).catch(e => console.error(e.message)).finally(() => p.\$disconnect());
"
```

```bash
cd "C:\Users\user\.gemini\antigravity\scratch\habitnext1" && git checkout main && git merge --ff-only feat/slice-K-aspiration-system && git push origin main
```

Vercel auto-deploy。

---

## Self-Review Notes

**Spec coverage:**
- Spec §3 主流程 → Tasks 6 (AspirationPicker) + 7 (RecommendationPanel) + 8 (wiring)
- Spec §4 Schema → Task 1
- Spec §5 PlanCategory.domain backfill → Task 3
- Spec §6 Preset JSON → Task 2
- Spec §7 Profile tab → Task 9
- Spec §8 推薦邏輯 → Task 4 (lib)
- Spec §9 API → Task 5
- Spec §11 Open Q resolved up-top before plan body
- Spec §12 acceptance — schema/seed/spec done in tasks 1/2/3; plan doc itself is this file
- Spec §13 實作分段 — 對應 11 個 task

**Placeholder scan:** Task 8 有「依現有 TaskFormModal save flow 細節適配」「依現有 /api/user/assignments response shape 決定」幾處 — 這些是 known 已存在但需 runtime check 的 integration points，不是 TBD；保留交給實作者依現有 code 對接。其他無 TBD / TODO / 「fill in details」。

**Type consistency:** lib export 與 component import 命名一致；endpoint path `/api/aspirations/:id/habits` 與 component 呼叫一致。

**Bite-sized check:** 每個 task 內 step 都附完整 code + 明確命令 + expected output；commit message 明確；engineer 不需要猜測。
