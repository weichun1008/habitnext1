# HabitNext — Architecture Guide

> 給未來工程師的技術全景。
> 產品角度看 [`PRODUCT.md`](PRODUCT.md)。
> 想看某個 slice 的具體設計理由，去 [`superpowers/specs/`](superpowers/specs/)。

最後更新：2026-06-06（核心結構為 2026-05-22 撰寫；下方「近期增補」記錄之後的重大變更。工程交接細節另見 `HANDOFF.md`，尤其 §0.5 與 §4。）

---

## 0. 近期增補（2026-05-26 ~ 06-06）

本份 §1–§10 主體寫於 05-22，之後新增的功能/變更摘錄如下，衝突處以本節與 `HANDOFF.md` 為準：

- **嚮往系統 / Focus Map / 身分 / 錨點**（Slice K/L）、**科學佐證 HabitInsight + 證據力**（Slice N）、**PlanFamily**（計畫家族分區）、**遊戲化世界層**（Slice O/P/Q：完成地點、旅程城市地圖、世界切換、美食回憶照片 — 詳見 `HANDOFF.md` §3）。
- **焦點地圖流程重設計**（2026-06-06）：三階段引導（影響力→執行度→焦點地圖+養成期間），新增 `Task.targetDays Int?`（null=不設限）、`Task.userImpact/userAbility/ratedAt`、`Task.officialHabitId`；難度於啟用時依「執行度」自動套用（`lib/difficulty.js`）。
- **社群計畫**（2026-06-06）：使用者把嚮往生成可分享計畫（`lib/planBuilder.js` → Template v2.0）。`Template` 新增 `authorType`(official/user)/`authorUserId`/`authorName`/`reviewStatus`(approved/pending/rejected)；`Template.expertId` 與 `Assignment.expertId` **放寬為 nullable**。`sectionIdFor` 對 `authorType==='user'` 歸 `community` 分區。後台 `/admin/dashboard/templates/review` 審核佇列。
- **後台伺服器端授權**（2026-06-06）：`src/middleware.js` + `lib/adminAuth.js`（Web Crypto HMAC、httpOnly 簽章 cookie）保護全部 `/api/admin/*`，需環境變數 `ADMIN_SESSION_SECRET`。**這修正了原 §7/§8 所述「admin 無 auth」的狀態。**
- Schema 由 05-22 的少數 model 擴充到 **14 models**（User/Task/TaskHistory/Aspiration/AspirationHabit/PlanCategory/PlanFamily/OfficialHabit/HabitInsight/HabitCategory/Template/Assignment/Expert/ExpertTitle）。測試 ~122 → **~486**。

---

## 1. 技術棧

| 層 | 技術 |
|---|---|
| Framework | Next.js 14 App Router + React 18 |
| Styling | Tailwind CSS 3.4 + lucide-react icons |
| Auth | **使用者**：Phone + bcrypt（無 session；user info 存 localStorage）— 預計整合 cofit 會員系統（見 `HANDOFF.md` §4-1）。**後台**：2026-06-06 起 `/api/admin/*` 由 `src/middleware.js` + httpOnly 簽章 cookie 授權（需 `ADMIN_SESSION_SECRET`）|
| DB | Vercel Postgres + Prisma 5 |
| Schema 管理 | `prisma db push`（**沒有 migration history**）|
| Testing | Jest + React Testing Library + 純函數 unit tests |
| Deploy | Vercel auto-deploy on push to `main`；build = `prisma generate && prisma db push && next build` |
| Dev = Prod | **同一個 Vercel Postgres**；腳本直接動 production data |

---

## 2. 資料模型重點

完整 schema 在 `web-app/prisma/schema.prisma`。這裡只說**關鍵抽象** + 不直觀的設計選擇。

### 2.1 User — 雙維分型

```prisma
model User {
  typeKey      String?  // 'daisy' | 'rose' | 'orchid' | 'sunflower'  — 花朵型（女性週期）
  sleepTypeKey String?  // 'stress' | 'rhythm' | 'metabolic' | 'hormone' — 睡眠分型
  // ... 其他常規欄位
}
```

**為什麼兩個欄位而不是一個 polymorphic `typeKey`：**
- 兩個維度業務上獨立 — 一個使用者可以同時有花朵型 + 睡眠型
- 推薦邏輯（`TemplateExplorer` filter / dashboard CTA）需要分別判斷
- 未來可能再加第三維度（情緒型？飲食型？）— 平行欄位更易擴充

值由 lib 端 enum 鎖住：
- 花朵：`src/lib/typeKeys.js` 的 `USER_TYPE_PROFILES`
- 睡眠：`src/lib/sleepTypeKeys.js` 的 `SLEEP_TYPE_PROFILES`

**每個 profile 帶 4 欄**：`label` / `categorySlug` / `iconName` / `identity`（per-type 預設身分宣告）

### 2.2 Template / Phase / Task

```prisma
model Template {
  category String   // slug — joins to PlanCategory.slug
  tasks    Json     // v1.0: [task, task, ...]  / v2.0: { version, phases: [...] }
  // ...
}
```

#### 兩種 tasks 結構（**未統一**，要兼顧）

| 版本 | 結構 | 用在 |
|---|---|---|
| v1.0 | `tasks: [task, task, ...]` 扁平陣列 | 舊版 templates（健康計劃30天）|
| v2.0 | `tasks: { version: "2.0", phases: [{ id, name, days, tasks: [...] }] }` | 所有花朵 / 睡眠 templates |

讀取時用 helper `countTasks(tasks)`（在 `admin/dashboard/templates/page.js` 與其他幾處）。**v2.0 phase 的 `days` 欄位是該 phase 持續天數**，加總 = template 總天數（花朵 = 5+5+5+5+? = 25；睡眠 = 3+4+3+4 = 14）。

#### Task.date 是 pre-baked

當使用者加入 template，系統會**預先為每一天建立 Task row**，把 phase rollover 的日期算好寫進 `Task.date`。所以 daily view 不需要 runtime 計算「今天是 phase 幾」— 直接 `WHERE date = today`。

驗證腳本：[`scripts/spike-template-rollover.js`](../web-app/scripts/spike-template-rollover.js)

### 2.3 PlanCategory — 統一的分類維度（含強型別保護）

```prisma
model PlanCategory {
  slug      String?  @unique  // 'daisy', 'sleep_stress', '健康生活'
  name      String              // 雛菊型, 睡眠 · 壓力, 健康生活
  color     String?             // Hex
  icon      String?             // Emoji or icon key
  order     Int      @default(0)
  isSystem  Boolean  @default(false)
}
```

**13 筆**：
- 5 user-defined（健康生活 / 運動健身 / 營養飲食 / 心理成長 / 職場效率）— `isSystem = false`
- 8 system（4 花朵 + 4 睡眠）— `isSystem = true`

**強型別 vs 可配置的折衷**：
- `slug` + `name` system 列**不可改**（PUT/DELETE API 防護 + UI 鎖住）
- `color` / `icon` / `order` 都可改 → admin 改顏色 → 三端（admin 列表 / user carousel / detail panel）立刻同步

**Template.category 用 `slug` 字串連到 PlanCategory.slug**（不是 FK，因為 slug 改名需另寫 migration）。Lookup 時用 `lib/typeKeys.js` / `lib/sleepTypeKeys.js` 的 enum 做 source of truth；PlanCategory 是 visual 層 cache。

### 2.4 OfficialHabit — 9 GENESIS+IO 分類 + 3 難度

```prisma
model OfficialHabit {
  category     String   // 'environment', 'diet', 'fitness', ... 9 個 slug
  difficulties Json     // { beginner?: Config, intermediate?: Config, challenge?: Config }
}
```

**Difficulty config** 結構：`{ enabled, label, type, dailyTarget, unit, stepValue, subtasks, recurrence }`

105 筆 seed 來自 `scripts/seed-genesis-io-habits.js`。

### 2.5 Task.history — 每日完成狀態

```prisma
model Task {
  date    String   // 'yyyy-mm-dd' — task 的「應該完成日」
  history Json     // { 'yyyy-mm-dd': { value, completed, subtaskCompletions: {...} }, ... }
}
```

`history` 是逐日 map。`isCompletedOnDate(task, dateStr)` 從這裡讀。日期瀏覽功能（Slice 2026-05-22）讀的就是這個 map。

---

## 3. 關鍵慣例

### 3.1 Slug 穩定性
- 任何被 lib 端 hard-code 的字串都**不能在 runtime 改**（花朵 4 個、睡眠 4 個、9 個 habit category）
- 新增 slug → 走 spec → plan → schema → lib enum 同步更新
- PlanCategory.isSystem 用來保護這條規則（API + UI）

### 3.2 兩維度 typing 並存
- `User.typeKey`（花朵）與 `User.sleepTypeKey`（睡眠）**互不影響**
- TemplateExplorer 過濾邏輯：`FLOWER_CATEGORIES` set + `SLEEP_CATEGORIES` set + 其他全 pass
- Dashboard CTA：`hasJoinedFlowerTemplate` 與 `hasJoinedSleepTemplate` 獨立計算

### 3.3 Dev = Prod
- `.env.local` 取自 Vercel：`vercel env pull .env.local`
- **跑任何 seed / migration script 都會動 production**
- 必須是 idempotent（用 upsert by stable key）
- Prisma CLI 不會自動讀 `.env.local`，要先 `set -a; source .env.local; set +a`

### 3.4 沒有 migration history
- 用 `prisma db push --accept-data-loss`（schema 是 source of truth）
- Schema 變動會觸發 Vercel build 時的 `prisma db push`
- **要新欄位 + backfill** → 步驟：
  1. 加 nullable 欄位
  2. `prisma db push`
  3. 寫 backfill script 並跑
  4. 若要 non-null，再 push 一次

### 3.5 Idempotent seed scripts
- 全部 seed 都用 `findFirst → update | create` 模式
- 識別 key：通常是 (expertId, name) 或 slug
- 命名：`scripts/seed-<topic>.js`
- 跑兩次 → `created=0, updated=N`

### 3.6 Slice 開發流程
- `/brainstorm` → 收斂需求，得到 spec → 存 `docs/superpowers/specs/YYYY-MM-DD-<name>-design.md`
- `/write-plan` → 拆成可執行的 task 序列 → 存 `docs/superpowers/plans/YYYY-MM-DD-<name>.md`
- `/execute-plan` 或 subagent-driven execution → 自動 spec compliance + code quality review per task
- Merge → push main → Vercel 自動部署

詳細指引：[Superpowers framework](https://github.com/obra/superpowers)

---

## 4. 檔案結構（重點目錄）

```
web-app/
├── prisma/
│   ├── schema.prisma            ← schema 定義
│   └── seed/
│       ├── women-templates.json  ← 4 花朵 templates
│       └── sleep-templates.json  ← 4 睡眠 templates
├── scripts/
│   ├── lib/env.js                ← 載入 .env.local
│   ├── seed-genesis-io-habits.js ← 105 OfficialHabit seed
│   ├── seed-women-templates.js   ← 花朵 templates seed
│   ├── seed-sleep-templates.js   ← 睡眠 templates seed
│   ├── seed-plan-categories.js   ← PlanCategory backfill + 8 系統 seed
│   └── ...
├── src/
│   ├── app/
│   │   ├── page.js                       ← 首頁 (MainApp wrapper, NO centering/padding!)
│   │   ├── globals.css                   ← html, body overflow-x: hidden 安全網
│   │   ├── layout.js                     ← root layout
│   │   ├── api/
│   │   │   ├── auth/login                ← user login
│   │   │   ├── templates/public          ← user-side public templates
│   │   │   ├── plan-categories           ← user-side PlanCategory (read-only)
│   │   │   ├── tasks                     ← user-side CRUD
│   │   │   ├── user/assignments          ← join template
│   │   │   ├── stats                     ← user-side stats aggregation
│   │   │   └── admin/                    ← admin endpoints
│   │   │       ├── auth/login
│   │   │       ├── plan-categories       ← admin CRUD with isSystem guards
│   │   │       ├── templates             ← admin CRUD (no owner gate)
│   │   │       ├── habits                ← admin OfficialHabit CRUD
│   │   │       └── ...
│   │   ├── admin/
│   │   │   ├── login/page.js
│   │   │   ├── dashboard/
│   │   │   │   ├── layout.js             ← sidebar nav (重排過：建材→成品→使用者→權限)
│   │   │   │   ├── page.js               ← 總覽
│   │   │   │   ├── habits/               ← 習慣庫管理
│   │   │   │   ├── templates/
│   │   │   │   │   ├── page.js           ← 計畫模板管理列表
│   │   │   │   │   ├── new/
│   │   │   │   │   ├── [id]/
│   │   │   │   │   └── categories/       ← 計畫分類管理（PlanCategory）
│   │   │   │   ├── users/
│   │   │   │   ├── assignments/
│   │   │   │   ├── experts/
│   │   │   │   └── titles/
│   │   │   └── admin.css                 ← admin 專用 dark theme styles
│   ├── components/
│   │   ├── MainApp.jsx                   ← 主容器：sidebar + AppHeader + 各 view
│   │   ├── AppHeader.jsx                 ← 手機 header + 互動週列
│   │   ├── TaskCard.jsx                  ← 每張 task；接受 viewingDate 控制鎖定
│   │   ├── DashboardSummaryCard.jsx      ← 今日健康分數（只在 selectedDate=today 顯示）
│   │   ├── HabitCalendar.jsx             ← 月曆 view
│   │   ├── TaskDetailModal.jsx           ← 點 task 開啟（h-[90dvh]）
│   │   ├── TaskFormModal.jsx             ← 新增 / 編輯 task
│   │   ├── TaskLibraryModal.jsx          ← 探索習慣入口
│   │   ├── TemplateExplorer.jsx          ← 探索計畫 modal（carousel 內讀 PlanCategory）
│   │   ├── TemplateDetailPanel.jsx       ← 點 carousel 卡 → 滑入詳細頁
│   │   ├── ProfileModal.jsx              ← 個人資料編輯（含 IdentityPicker）
│   │   ├── StatsView.jsx                 ← 統計頁主容器（dynamic import）
│   │   ├── stats/                        ← 5 個 widgets
│   │   │   ├── CompletionRateCards.jsx
│   │   │   ├── DomainBreakdownChart.jsx
│   │   │   ├── StreakHero.jsx
│   │   │   ├── TaskStreakList.jsx
│   │   │   └── WeeklyHeatmap.jsx
│   │   └── explore/                      ← 探索習慣相關
│   │       ├── HabitListView.jsx
│   │       ├── IdentityPicker.jsx
│   │       ├── AnchorPicker.jsx
│   │       └── LUCIDE_ICONS.js           ← icon 白名單
│   ├── lib/
│   │   ├── prisma.js                     ← singleton client
│   │   ├── utils.js                      ← 日期工具、isCompletedOnDate、isFutureDate, ...
│   │   ├── constants.js                  ← CATEGORY_CONFIG（9 GENESIS+IO 配色 + icon）
│   │   ├── typeKeys.js                   ← 4 花朵 enum + helpers
│   │   ├── sleepTypeKeys.js              ← 4 睡眠 enum + helpers
│   │   ├── templateRecommendation.js     ← TEMPLATE_SECTIONS + groupTemplatesBySection
│   │   ├── subtasks.js                   ← visibleSubtasks（Slice F 版本化 helper）
│   │   └── stats.js                      ← pure stats aggregation（Slice I）
│   └── __tests__/
│       ├── lib/                          ← pure helper tests（最有效用的 layer）
│       └── components/                   ← 視覺 component tests
└── package.json

docs/
├── PRODUCT.md                            ← 產品全景（這份的 sibling）
├── ARCHITECTURE.md                       ← 這份
├── superpowers/
│   ├── specs/                            ← per-slice 設計 spec
│   └── plans/                            ← per-slice 實作 plan
└── notes/                                ← 內容方意見回饋
```

---

## 5. API 與 Lib 對應地圖

### User-facing（**仍信任 body/query 的 userId — IDOR，待整合 cofit 會員系統，見 `HANDOFF.md` §4-1**）
- `POST /api/auth/login` — 手機 + 密碼登入
- `POST /api/plans/from-aspiration` — 把嚮往生成計畫（社群計畫，pending/private）
- `POST /api/register` — 註冊
- `GET /api/templates/public` — 列出全部 public templates（含 expert + _count）
- `GET /api/plan-categories` — 列出全部 PlanCategory（read-only minimal subset）
- `GET /api/tasks?userId=` — 該使用者的 task 列表（含 history）
- `POST /api/user/assignments` — 加入 template（pre-bake tasks）
- `GET /api/user/assignments?userId=` — 該使用者已加入的 templates
- `GET /api/stats?userId=` — 一次取齊所有統計資料

### Admin（**2026-06-06 起由 `src/middleware.js` 伺服器端授權**：httpOnly 簽章 cookie，非 admin → 401/403；放行 `auth/login`、`auth/logout`）
- `POST /api/admin/auth/login` — 驗證後種 `admin_session` cookie
- `POST /api/admin/auth/logout` — 清 cookie
- `PATCH /api/admin/plans/[id]/review` — 社群計畫審核（核准/退回）
- `GET/POST/PUT/DELETE /api/admin/templates` — Template CRUD
- `GET/POST/PUT/DELETE /api/admin/plan-categories` — PlanCategory CRUD（PUT/DELETE 對 system 列回 403）
- `GET/POST/PUT/DELETE /api/admin/habits` — OfficialHabit CRUD
- `GET /api/admin/users` — 使用者列表
- `GET /api/admin/assignments` — 全部 assignment 列表
- `GET/POST/PUT/DELETE /api/admin/experts` — Expert CRUD
- `GET/POST/PUT/DELETE /api/admin/titles` — Expert title CRUD

### Lib 對應
- 任何需要花朵 metadata → `import { USER_TYPE_PROFILES, deriveDefaultIdentity } from '@/lib/typeKeys'`
- 任何需要睡眠 metadata → `import { SLEEP_TYPE_PROFILES, deriveSleepDefaultIdentity } from '@/lib/sleepTypeKeys'`
- 日期工具 → `import { getTodayStr, isCompletedOnDate, isFutureDate, isPastDate, isToday } from '@/lib/utils'`
- Stats 純函數 → `@/lib/stats`

---

## 6. 主要 Components 互動圖

```
MainApp (manages user / tasks / assignments / selectedDate)
├── AppHeader (mobile)
│   ├── 個人資料 button → ProfileModal
│   ├── 5 action icons (探索計畫 / 月曆 / 統計 / 成就 / + 新增)
│   └── 互動式週列 (selectedDate ← → onSelectDate)
├── Sidebar (desktop, hidden md:flex)
│   └── 同樣的 5 個 action + 個人資料
└── <main>
    ├── if currentView=daily
    │   ├── 生理期 toggle
    │   ├── 花朵 CTA（user.typeKey && !hasJoinedFlowerTemplate）
    │   ├── 睡眠 CTA（user.sleepTypeKey && !hasJoinedSleepTemplate）
    │   ├── 「正在預覽 X」pill（selectedDate !== today）
    │   ├── DashboardSummaryCard（只在 today）
    │   ├── 今日行程 / 明日行程 / N/D 行程 section
    │   │   └── TaskCard × N（接 viewingDate）
    │   └── 週期目標 section（只在 today）
    ├── if currentView=stats
    │   └── StatsView (dynamic import)
    │       └── 5 widgets
    ├── if currentView=dashboard_detail
    │   └── HabitCalendar
    └── if currentView=manage / badges
        └── ...

Modals (z-50+)
├── LoginModal
├── ProfileModal
├── TaskDetailModal
├── TaskFormModal
├── TaskLibraryModal
└── TemplateExplorer
    └── TemplateDetailPanel (slide-in absolute inside modal)
```

---

## 7. 重要設計決策（為什麼這樣做）

### Q: 為什麼 PlanCategory 跟 lib enum 兩套並存而不合併？
**A**: 強型別承諾 vs 可配置 trade-off。lib enum 鎖住業務邏輯（推薦、CTA、問卷結果），PlanCategory 是 visual 層讓 admin 可以調顏色 / icon。中間用 `slug` 做穩定 join key + `isSystem` 標記做防護。

### Q: 為什麼用兩個 typeKey 欄位而不是 polymorphic？
**A**: 兩個維度業務上獨立，使用者可同時有花朵型 + 睡眠型。如果用單一 `userTypeKey: { type, value }` JSON 會把 simple 的查詢變複雜（`WHERE userTypeKey @> '{"type":"flower"}'`）且需要多次 query。

### Q: 為什麼用 `prisma db push` 而非 migration？
**A**: 小團隊（~2 人）/ 早期產品，schema 變動頻繁。`db push` 讓 schema = source of truth、不用維護 migration history。Trade-off：要 backfill 時需手寫 script。將來客戶 / 多環境就需要 migration。

### Q: 為什麼 dev = prod 共用一個 DB？
**A**: 早期方便。代價：跑 seed script 要小心、寫 idempotent。未來必須拆。

### Q: 為什麼 Task.date pre-bake 而不 runtime 算 phase？
**A**: Spike 驗證過（[`spike-template-rollover.js`](../web-app/scripts/spike-template-rollover.js)）— pre-bake 讓 daily view 用簡單 `WHERE date=today` 取資料、不需要算 phase math。代價：phase 結構改了要 migrate 既有 task rows（目前用「廢棄舊 assignment + 新加入」處理）。

### Q: 為什麼手機端用 `h-[90dvh]` 而不是 `h-[90vh]`？
**A**: iOS Safari 的 `vh` 包含 URL bar 區域，導致 modal 頂部跑到 URL bar 後面被裁切。`dvh`（dynamic viewport height）會跟 URL bar 摺疊同步更新。Tailwind 3.4+ 用 `h-[90dvh]` arbitrary value。

### Q: 為什麼首頁 `page.js` 沒有 `flex items-center`？
**A**: 之前用過，造成手機畫面被擠到 384px > viewport 寬度（`items-center` 讓 flex child 取 intrinsic min-width 而非 stretch）。現在 page.js 只有 `<main className="min-h-screen">`，讓 MainApp 自己決定寬度。Belt-and-suspenders 還在 `globals.css` 加 `html, body { overflow-x: hidden }`。

### Q: admin auth middleware（已於 2026-06-06 補上）
**A**: 早期僅 `admin_expert` 存 localStorage、API 不檢查（任何人可改資料）。**2026-06-06 已補**：`src/middleware.js` 攔截全部 `/api/admin/*`，驗證登入時種下的 httpOnly HMAC 簽章 cookie（`lib/adminAuth.js`，Web Crypto，無新依賴），非 admin → 401/403，fail-closed（需 `ADMIN_SESSION_SECRET`）。**使用者端**資料 API 的同類授權尚未做，預計整合 cofit 會員系統（見 `HANDOFF.md` §4-1）。

### Q: 為什麼花朵 / 睡眠分型沒有問卷頁？
**A**: 暫時 admin 手動設 `User.typeKey` / `User.sleepTypeKey` 來測。問卷頁是 roadmap 上短期內要做的（spec 尚未寫）。

---

## 8. 已知技術債

- ~~**無真正的 admin auth middleware**~~ — ✅ 已於 2026-06-06 解決（`src/middleware.js` + `lib/adminAuth.js`）
- **使用者端資料 API 仍信任 client `userId`（IDOR）** — 上線 blocker，預計整合 cofit 會員系統（`HANDOFF.md` §4-1）
- **Test coverage 偏 lib + critical components** — UI integration test 仍偏少（~486 tests / ~69 suites）
- **沒有 e2e tests** — Playwright / Cypress 尚未引入
- **沒有 error boundary 覆蓋全部 view**（只有 root `ErrorBoundary`）
- **Vercel deploy 沒有 staging 環境** — push main = production
- **沒有 monitoring / error tracking** —（Sentry / LogRocket 沒設）
- **無 i18n 框架** — 全部中文 hardcoded
- **OfficialHabit.icon 部分為 emoji，部分為 Lucide key**（已修正中）
- **兩個 routine 類 checklist（晨間脊椎伸展操、建立固定的睡前儀式）的 subtasks 留空** — 使用者得自填

---

## 9. 開發 / 部署常用指令

```bash
# 本地 dev
cd web-app
npm run dev                    # localhost:3000，Turbopack

# 跑測試
npm test                       # 全部
npm test src/__tests__/lib    # 只跑 lib（最快）

# 重新生 Prisma client（schema 變動後）
npx prisma generate

# Push schema 到 DB
set -a && source .env.local && set +a && npx prisma db push

# 跑 seed
node scripts/seed-genesis-io-habits.js   # 105 OfficialHabit
node scripts/seed-women-templates.js     # 4 花朵 templates
node scripts/seed-sleep-templates.js     # 4 睡眠 templates
node scripts/seed-plan-categories.js     # PlanCategory backfill + system rows

# Build (local test, skip prisma push)
npm run build:local

# 部署
git checkout main && git merge --ff-only feat/<branch> && git push origin main
# → Vercel 自動觸發 build + deploy
```

---

## 10. 下一個工程師接手 checklist

當你拿到這個 repo：
1. `git clone` → `cd web-app` → `npm install`
2. `vercel env pull .env.local`（要 Vercel project access）
3. `npx prisma generate`
4. `npm test` → 確認 ~486 tests pass
5. `npm run dev` → localhost:3000
6. 讀 `PRODUCT.md` 了解產品全貌
7. 讀這份 `ARCHITECTURE.md` 了解資料模型 + 慣例
8. 挑一個 spec / plan 文件對照程式碼讀，建立心智模型
9. 任何 schema 變動先 spec → push 前先寫好 backfill script
10. 部署前一定要本地 `npm test` + `npm run build:local`
