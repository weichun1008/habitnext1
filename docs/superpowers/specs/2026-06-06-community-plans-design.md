# 社群計畫：把嚮往生成可分享的計畫 — 設計文件

- 日期：2026-06-06
- 範圍：客戶端 + 後台。把「使用者一個嚮往底下的習慣集」生成為符合現有 Template 架構的計畫，可送審後公開到探索計畫的獨立「社群計畫」分區。
- 前置：焦點地圖流程重設計（已上線，提供每個習慣的 `userImpact`/`userAbility` 與 `Task.targetDays`）。

## 背景

目前狀況（已查證）：

- 使用者從「嚮往 → 推薦 → 加入」建立的是**獨立 `Task`**（`status` candidate→active），可選擇性標記到一個 `Aspiration`（透過 `AspirationHabit`），但**不是 `Template`/計畫**。
- 從快速加入路徑建立的任務**難度固定取第一個啟用的難度（通常初級）**（`MainApp.handleAddHabitAsCandidate`），焦點地圖也沒有讓使用者調難度 → 加入的習慣都停在初級。
- `Template`（計畫）只有後台能建、必掛一位 `Expert` 作者（`expertId` 必填）、`tasks` 為 JSON（v2.0 = `{ version:'2.0', phases:[{ id, name, days, tasks:[] }] }`）、`isPublic` 控公開、靠 `PlanCategory` + `lib/templateRecommendation.sectionIdFor` 歸入計畫家族（flower/sleep/other）。加入計畫 = 建 `Assignment` 並依 v2.0 `phases[].days` 累計算每階段起始日、把 `phase.tasks` 灑成使用者的 `Task`（見 `api/user/assignments/route.js`）。`Assignment.expertId` 目前取 `template.expertId`。

## 目標

1. **預設難度演算法**：加入習慣時自動給合理的起始難度（依使用者剛在焦點地圖評的「執行度」），使用者不必每次選，之後可手動調。
2. **嚮往 → 計畫生成**：用純演算法把一個嚮往的習慣集生成 v2.0、含階段（phase）的計畫；v1 不使用 AI。
3. **社群計畫（送審公開）**：使用者可把生成的計畫送出公開申請，**管理員核准後**才出現在探索計畫的**獨立「社群計畫」分區**，清楚標示「用戶自創 · by 作者」對比官方。

非目標（YAGNI）：AI 生成/潤飾（v1 不做，預留）、計畫版本管理、社群互動（讚/留言/追蹤作者）、複雜權限、計畫內習慣的拖曳排序、跨嚮往合併計畫。

## 既有架構決策（已與使用者確認）

- 公開採**送審核准制**（pending → approved/rejected）。
- 核准後放在**獨立「社群計畫」PlanFamily 分區**，與官方清楚分開。
- 難度門檻偏保守（執行度 3 → 初級）；階段最多 3 段；送審期間作者看得到自己的 pending、別人看不到。
- 難度與分階段皆**純演算法**；AI 之後可選用。

## 拆解（3 個 Slice，各自可獨立上線）

實作計畫按 Slice 1 → 2 → 3 切。本 spec 涵蓋三者。

---

## Slice 1 — 難度預設演算法

### 純函式（新增於 `src/lib/difficulty.js`）

```
defaultDifficultyTier(userAbility) → 'beginner' | 'intermediate' | 'challenge'
  // 1–3 → beginner；4 → intermediate；5 → challenge；非數字 → beginner
resolveDifficulty(habit, userAbility) → { tier, config }
  // 取 defaultDifficultyTier 為「期望 tier」，夾擠到 habit.difficulties 中
  // 實際 enabled 的 tier：優先期望 tier；否則取 ≤ 期望且 enabled 的最高者；
  // 都沒有則取 enabled 的最低者。config = habit.difficulties[tier]。
  // habit 無 difficulties → { tier:'beginner', config:{} }。
```

### 套用

- 焦點地圖「加入」（啟用）時，依 `resolveDifficulty(habit, userAbility)` 設定該任務的起始設定（type/dailyTarget/unit/stepValue/recurrence/subtasks），取代現在「固定第一個啟用難度」。
  - 資料流：候選任務已帶 `officialHabitId`。在 `batch-rate`（activate 分支）或啟用後處理中，以 `userAbility` + 該習慣的 `difficulties` 重算任務設定欄位。
  - 為避免 `batch-rate` 變肥：新增 `POST /api/tasks/apply-difficulty`（或在 batch-rate activate 時，後端 join `officialHabit.difficulties` 後套用）。**採後者**：`batch-rate` 在 `action==='activate'` 時，若任務有 `officialHabitId`，讀其 `difficulties`、依傳入的 `userAbility` 用 `resolveDifficulty` 重算並寫入任務設定欄位。
- 使用者仍可在既有習慣詳情/難度選擇 UI 手動改（不在本 slice 新增 UI）。

### 測試

- `defaultDifficultyTier`：1–5 對應、邊界、非數字。
- `resolveDifficulty`：夾擠（期望 challenge 但只有 beginner → beginner；期望 intermediate 但只有 beginner+challenge → beginner）、無 difficulties。
- `batch-rate`：activate 且有 officialHabitId 時套用對應難度設定；無 officialHabitId 時不動設定。

---

## Slice 2 — 計畫生成 + 作者模型 + 「存成計畫」

### Schema（`Template` 與 `Assignment`，全部 additive / 放寬，對共用 DB 安全）

`Template` 新增：

```prisma
  authorType   String  @default("official") // 'official' | 'user'
  authorUserId String? // 使用者自創計畫的作者
  authorName   String? // 顯示用作者名（denormalize 自 User.nickname）
  reviewStatus String  @default("approved") // 'approved' | 'pending' | 'rejected'
```

並把作者關聯放寬：`expertId String?`、`expert Expert? @relation(...)`（社群計畫無專家）。`Assignment.expertId String?`、`expert Expert? @relation(...)`。

公開可見規則：探索計畫顯示條件 = `isPublic === true && reviewStatus === 'approved'`（官方預設 approved，沿用）。

### 純函式（新增於 `src/lib/planBuilder.js`）

```
buildPlanFromAspiration({ aspiration, habits, ratings }) → { version:'2.0', phases:[...] }
  // habits: 該嚮往「已加入（active）」且有 officialHabit 的任務 + 其 officialHabit.difficulties
  // ratings: Map<taskId,{impact,ability}>（用 userImpact/userAbility，或任務上的值）
  // 步驟：
  //  1. 依 impact desc 排序（同分 ability desc）。
  //  2. 起始難度 = resolveDifficulty(habit, ability)（重用 Slice 1）。
  //  3. 產生最多 3 個 phase：
  //     Phase 1「養成期」: 每個習慣的起始 tier config。
  //     Phase 2「進階」: 對「有比起始更高且 enabled 的 tier」的習慣升一階；沒有則沿用上一階。
  //     Phase 3「挑戰」: 同理再升一階到 challenge（若 enabled）。
  //     若所有習慣都無更高 tier，則不產生該 phase（計畫可能只有 1–2 段）。
  //  4. 每個 phase：{ id: 'p1'..., name, days, tasks:[ <完整任務設定物件> ] }
  //     days = 養成節奏：用各習慣 targetDays 的中位數（無則 66）÷ phase 數，至少 7、整數天。
  //  5. 每個 task 物件欄位比照 join 消費端需要（title/type/category/frequency/recurrence/
  //     reminder/subtasks/dailyTarget/unit/stepValue），由該 tier 的 difficulties config 組出。
```

> phase task 物件格式必須與 `api/user/assignments/route.js` 的 v2.0 消費端相容（spread 進 `Task.createMany`）。

### 「存成計畫」流程（客戶端）

- 入口：焦點地圖完成後的成功畫面、或「我的嚮往」檢視，出現「把這套存成計畫」。
- 預覽：呼叫前端用 `buildPlanFromAspiration` 即時預覽階段與每階段習慣（或後端產生後回傳預覽）。**採前端預覽 + 後端權威生成**：送出時後端重新生成存檔，避免被竄改。
- 命名：預填嚮往 `identity`/`title`；可改名稱與描述。
- 送出：
  - 「申請公開」→ 建 `Template`：`authorType='user'`、`authorUserId`、`authorName`、`reviewStatus='pending'`、`isPublic=true`、`expertId=null`、`category`（由嚮往主領域對應）、`tasks`=生成結果。
  - 「存為私人」→ 同上但 `isPublic=false`、`reviewStatus='approved'`（私人不需審）。
- API：`POST /api/plans/from-aspiration`（body: `{ aspirationId, name, description, visibility:'public'|'private' }`）→ 後端組 habits+ratings、`buildPlanFromAspiration`、建 Template。

### 測試

- `buildPlanFromAspiration`：排序、起始難度套用、phase 升階（含「無更高 tier 不產生 phase」）、days 計算、task 物件含必要欄位且與 join 端相容、空 habits 防呆。
- API：建立 public→pending / private→approved；expertId null；authorName 帶入。

---

## Slice 3 — 社群分區 + 探索標示 + 後台審核 + 加入

### PlanFamily「社群計畫」

- 新增一個 PlanFamily（slug `community`，標題「社群計畫」，獨立分區）。
- `lib/templateRecommendation.sectionIdFor`：當 `template.authorType === 'user'` → 回 `community`（優先於 category 判定）；官方維持原邏輯。

### 探索/詳情標示

- TemplateExplorer 兩層、TemplateDetailPanel、計畫卡：
  - `authorType==='user'` → 徽章「用戶自創 · by {authorName}」（Lucide 圖示，例 `Users`），與官方「官方 · {expert}」對比樣式區隔。
- 探索清單查詢只取 `isPublic && reviewStatus==='approved'`（+ 官方）。

### 後台審核佇列

- 新增獨立路由 `/admin/dashboard/templates/review`：列出 `authorType==='user' && reviewStatus==='pending'`，可預覽階段、核准（`reviewStatus='approved'`）/退回（`'rejected'` + 可留原因）。計畫管理頁加一個入口連結到此。
- API：`PATCH /api/admin/plans/[id]/review`（body `{ decision:'approve'|'reject', reason? }`）。
- 計畫管理第一層的「社群計畫」家族區塊顯示這些計畫（沿用現有家族分組頁）。

### 加入（沿用現有，補強）

- `api/user/assignments/route.js`：`Assignment.expertId` 改用 `template.expertId ?? null`（schema 已放寬）。其餘 v2.0 展開不變。
- 作者本人加入自己的計畫亦可（不特別限制）。

### 測試

- `sectionIdFor`：authorType=user → community；官方不受影響。
- 審核 API：approve/reject 改 reviewStatus；非 pending 不可重複審。
- 探索查詢：pending 不出現在公開清單；approved 出現在 community 分區。
- assignments：template.expertId 為 null 時 Assignment 仍成功建立、任務正確展開。

---

## 跨切面

- **共用 Neon DB / 多 session**：所有 schema 變更為 additive（新欄位 nullable / 有 default）或放寬（NOT NULL → nullable），`prisma db push` 不得出現 data-loss；主分支保持 schema superset；push 前 `git fetch && git pull`。
- **無 emoji UI**：一律 lucide-react。**CTA 皆有 hover 微互動**。**行動裝置對等**：存成計畫流程、社群分區、審核頁皆需手機可用。
- **不偽造**：背後科學/數字沿用既有 HabitInsight 與 66 天依據，不新增未經查證數字。

## 風險

- 放寬 `expertId` 為 nullable 需確認所有讀取 `template.expert.xxx` 的地方有 null 防護（探索/詳情/後台）。實作時全面 grep `expert` 相關存取。
- 社群計畫的 task 物件需嚴格符合 join 消費端格式，否則加入後任務缺欄位 → 以 `buildPlanFromAspiration` 測試對齊 join 端必要欄位把關。
- 審核佇列是新後台頁，需與既有 admin 樣式（admin-btn 等）一致。
