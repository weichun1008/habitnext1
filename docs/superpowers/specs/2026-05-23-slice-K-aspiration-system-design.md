# Slice K — 嚮往（Aspiration）系統

**Date:** 2026-05-23（Session 1 schema 草案）／ Session 2 修正於 2026-05-25
**Status:** Design v2 — ready for plan
**Scope:** habitnext1 web-app — 在「新增計畫 / 任務」flow 中引入「嚮往」做為起點，依嚮往的 GENESIS+IO domain 推薦既有 templates + habits。

---

## 0. Session 2 修正 changelog

> Session 1 把嚮往設計為**獨立頁面 + sidebar nav**。Session 2 重新定位：**嚮往是 flow 中的工具、不是目的地**。

| 議題 | Session 1 | Session 2 |
|---|---|---|
| 角色 | 獨立「嚮往頁」+ sidebar 入口 | 「+ 新增」flow 的 Step 1，無獨立頁 |
| 主管理位置 | 嚮往頁列表 / FocusMap | Profile「我的嚮往」tab |
| 推薦邏輯 | Slice D FocusMap (impact × ability) | GENESIS+IO domain mapping |
| Aspiration model 欄位 | 多（`unlockedIdentity`/`isPinned`/`userImpact`...） | 精簡（移掉 5 個 v1 用不到的欄位） |
| AspirationHabit join | 含 `userImpact`/`userAbility`/`customHabit` | 精簡：只剩 `taskId` |
| Slice D 既有 FocusMap | 「保留、嚮往頁會用」 | 不會用了 — 留作 admin-側 debug tool |
| 名字 | 「向往」 | 「嚮往」（typo 修正） |

---

## 1. 背景

### 1.1 既有「新增」路徑

到目前為止，habitnext1 有三條「加進來」的路徑：

1. **新增計畫** （TemplateExplorer）：花朵 / 睡眠 / 其他 公開計畫 → join
2. **新增習慣** （TaskLibraryModal）：9 GENESIS+IO domain grid → habits → difficulty → anchor → identity → save
3. **建立習慣** （TaskFormModal）：完全手動

三條都假設使用者**已知道想做什麼**。Template 是「我認同這個 14 天結構」，新增習慣是「我認同這條習慣」。

### 1.2 缺口

許多使用者只知道**痛點**（早上累 / 想瘦 / 焦慮），不知道對應哪個 domain、哪些行為值得做、哪 14 天結構合適。

行為養成有三層詞，混用會出事：

| 詞 | 定義 | 範例 |
|---|---|---|
| **嚮往 (Aspiration)** | 想要的結果（outcome） | 「想要快速入睡」 |
| **身分 (Identity)** | 我是 / 我成為（being） | 「我是尊重生理節律的人」 |
| **習慣 (Habit)** | 具體動作（doing） | 「睡前 60 分鐘不滑手機」 |

時間關係：**嚮往 → 設計 habits → 重複執行 → 內化為 identity**。Identity 是行為累積後的加冕、不是 onboarding 階段宣告。

---

## 2. 目標（v1）

**v1**：在「+ 新增」入口加一層 Step 1 詢問嚮往，依嚮往的 domain 推薦既有 templates + habits。Profile 加「我的嚮往」tab 給 read-only 管理。

具體場景：
```
新使用者按 [+]
  → Step 1：「你想要什麼？」 picker
       ├── 為你推薦（依 typeKey/sleepTypeKey 推 3-5 個 preset）
       ├── 你已有的嚮往（active 才顯示）
       ├── 35 個 preset 依 9 domain 分組
       └── 自訂（自由文字 + 選 domain）
  → Step 2：「為此嚮往，這些可能適合你」 推薦頁
       ├── ✨ 適合的計畫（domain mapping → templates）
       ├── 🌱 適合的習慣（domain mapping → OfficialHabits）
       └── 「跳過 — 自己探索」
  → Step 3：Template 路徑 / Habit 路徑（現有 flow 不動）
  → commit 時寫 AspirationHabit{ aspirationId, taskId }
```

### Non-goals（v1 不做）

- **AI 生 customHabit / aspiration** — schema 留欄位、不接 API call
- **Identity 自動加冕** — `User.identities[]` 仍加，但只能 Profile 手動加
- **進度條 / 量化** — 達成 = 使用者主觀 mark
- **多 aspiration 一次加入** — Step 1 只選一個
- **pinned / 排序 algorithm** — Profile 按 createdAt
- **跨使用者分享 aspiration**
- **Onboarding 強制** — 新使用者跳過 / 直接打卡都行
- **Multi-language** — 中文 only

---

## 3. 主流程（UX）

### 3.1 入口

```
AppHeader 「+」icon（emerald-50） → 開啟嚮往 Picker modal
Sidebar 「建立習慣」按鈕 → 開啟嚮往 Picker modal
```

「探索計畫」「探索習慣」兩個既有入口**不動**（手動探索 fallback）。

### 3.2 Step 1：嚮往 Picker

modal，類 TemplateExplorer 結構（h-[80dvh] 底部彈出 / 中央 desktop）：

```
┌─────────────────────────────────────┐
│ 你想要什麼？                      X │
│ 從這裡開始，我們會推薦合適的計畫與習慣 │
├─────────────────────────────────────┤
│ 為你推薦（依你的類型）  ←─ 條件顯示    │
│  [想要快速入睡、睡眠品質好]            │
│  [想要焦慮少一點...]                  │
│                                     │
│ 你已有的嚮往  ←─ 條件顯示             │
│  [想要瘦下來] 掛 3 個任務 / 14 天前   │
│  [想要規律運動不偷懶] 掛 5 個 ...     │
│                                     │
│ 從 35 個生活面向開始                   │
│  ▼ 基因與腸道                         │
│    [想要腸道更健康]                    │
│    [想要降低家族遺傳病風險]            │
│    [想要找出自己的食物敏感原]          │
│  ▼ 環境                               │
│    ...                                │
│  ▼ 飲食 ...                          │
│                                     │
│ [+] 自訂嚮往                          │
└─────────────────────────────────────┘
```

點任何一個 → Step 2。

### 3.3 Step 2：推薦頁

modal 內滑入，類 TemplateDetailPanel pattern：

```
┌─────────────────────────────────────┐
│ ← 想要快速入睡、睡眠品質好             │
├─────────────────────────────────────┤
│ ✨ 適合的計畫                          │
│ ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐    │
│ │ 🌙 壓力型睡眠處方                │    │
│ │ 14 天循序漸進，從 baby step      │    │
│ │ ...                              │    │
│ │ [查看 / 加入]                    │    │
│ └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘    │
│                                     │
│ 🌱 適合的習慣                          │
│ ┌────────────────────────────┐     │
│ │ 😴 睡前 60 分鐘停止高刺激螢幕  │     │
│ │ 入門 / 進階 / 挑戰              │     │
│ │ [選用]                          │     │
│ └────────────────────────────┘     │
│ ...                                 │
│                                     │
│ ────────────────────                 │
│ 或者，跳過嚮往直接探索：              │
│ [探索計畫] [探索習慣]                 │
└─────────────────────────────────────┘
```

點計畫卡 → 原 TemplateDetailPanel / join flow（onJoin 時帶 `aspirationId`，server 寫 `AspirationHabit`）
點習慣卡 → 原 TaskFormModal difficulty/anchor/identity flow（save 時帶 `aspirationId`）

### 3.4 Step 3：commit

加入成功後：
- 寫 `Aspiration` row（如果是新嚮往）
- 寫 `AspirationHabit { aspirationId, taskId }`
- Modal 關閉，回到 daily view

---

## 4. Schema diff

```diff
model User {
  ...
+ identities  String[]   // 多身分並存（手動 / Profile 加；v1 不自動加冕）
  ...
+ aspirations Aspiration[]
}

+ model Aspiration {
+   id          String   @id @default(cuid())
+   userId      String
+   user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
+
+   text        String              // "想要快速入睡、睡眠品質好"
+   domain      String?             // GENESIS+IO domain — 推薦來源
+
+   status      String   @default("active")  // active | achieved | archived
+   achievedAt  DateTime?
+
+   source      String   @default("user")    // user | preset (v1 沒 ai)
+
+   createdAt   DateTime @default(now())
+   updatedAt   DateTime @updatedAt
+
+   habits      AspirationHabit[]
+ }

+ model AspirationHabit {
+   id              String      @id @default(cuid())
+   aspirationId    String
+   aspiration      Aspiration  @relation(fields: [aspirationId], references: [id], onDelete: Cascade)
+
+   taskId          String?     // commit 後寫入；null 代表使用者瀏覽過但未加入
+
+   createdAt       DateTime    @default(now())
+ }

# PlanCategory（既有）— 加一欄
  model PlanCategory {
    ...
+   domain    String?   // GENESIS+IO domain mapping for aspiration recommendation
  }
```

### 4.1 與既有 model 的關係（不變）

- **Template** 不動。
- **OfficialHabit** 不動。`OfficialHabit.category` 已直接是 GENESIS+IO domain → 推薦時直接 `WHERE category = aspiration.domain` 過濾。
- **Task** 不動。

### 4.2 Slice D 既有產物的處置

| 產物 | v2 處置 |
|---|---|
| `OfficialHabit.impact / ability` schema | **保留**（admin 端可看，但 user UX 不用） |
| 102 個 seed 評分 | **保留**（無害） |
| `FocusMap.jsx` | **保留**（admin / debug tool） |
| `HabitListView` 內 [清單 ｜ 焦點地圖] toggle | **移除** — 不在 user 主流程出現 |

---

## 5. PlanCategory 加 domain 欄位

`PlanCategory.domain String?` 給 admin 標每個分類對應的 GENESIS+IO domain。

系統 row 預設值（seed migration）：

| slug | domain |
|---|---|
| `daisy` / `rose` / `orchid` / `sunflower` | 「壓力與睡眠」（女性週期主要影響） |
| `sleep_stress` / `sleep_rhythm` / `sleep_metabolic` / `sleep_hormone` | 「壓力與睡眠」 |
| `健康生活` | （null — admin 自設）|

**v1 不支援 multi-domain**（一個 PlanCategory 只能對一個 domain）。

Admin 在 `/templates/categories` 編輯時可選 domain（dropdown 9 個 GENESIS+IO option）。

---

## 6. Preset Aspirations

`prisma/seed/preset-aspirations.json`（不進 DB），35 個跨 9 domain，內容同 Session 1 spec §4。

Picker 直接 import JSON。使用者點 preset → 複製 text+domain → 新增 `Aspiration{ source: 'preset' }`。之後改 / 刪 / 達成都不影響原始 preset。

---

## 7. Profile「我的嚮往」tab

進入：Profile modal → tab 切換「個人資料 ｜ 我的嚮往」（或下方 section）。

List view：
```
┌────────────────────────────────────┐
│ 想要快速入睡、睡眠品質好             │
│ active · 掛 3 個任務 · 14 天前      │
│ [標記達成] [封存] [刪除]            │
├────────────────────────────────────┤
│ 想要瘦下來                          │
│ achieved · 5/12 · 掛 2 個任務      │
│ [封存] [刪除]                       │
└────────────────────────────────────┘
```

操作：
- **標記達成**：`status='achieved', achievedAt=now()`
- **封存**：`status='archived'`
- **刪除**：confirm → `DELETE`，cascade 移除 AspirationHabit（不刪 Task）

**沒做**（v1）：编輯 text / 改 domain（改 = 刪除重建）；不顯示 archived 預設（filter toggle 給 v2）。

---

## 8. 推薦邏輯（v1）

```js
// aspirationRecommendations(aspiration, allTemplates, allHabits)
const templates = allTemplates.filter(t => {
  const cat = planCategoryMap[t.category];
  return cat?.domain === aspiration.domain;
});

const habits = allHabits.filter(h => h.category === aspiration.domain);

return { templates, habits };
```

**零結果處理**：顯示「這個嚮往目前還沒有對應的計畫 / 習慣，去[探索計畫][探索習慣] 自己找看看」（兩個按鈕導向既有 nav）。

---

## 9. API

```
POST   /api/aspirations
  body: { userId, text, domain, source: 'user'|'preset' }
  → Aspiration row, return id

GET    /api/aspirations?userId=&status=active
  → list (default active, ?status=all returns 全部)

PATCH  /api/aspirations/:id
  body: { status?, achievedAt? }
  → updated row

DELETE /api/aspirations/:id
  → cascade AspirationHabit

POST   /api/aspirations/:id/habits
  body: { taskId }
  → AspirationHabit row（commit task 完成時呼叫）

GET    /api/aspirations/:id/recommendations
  → { templates: [...], habits: [...] } 依 domain mapping
```

無 admin endpoint — preset 改動走 JSON + redeploy。

---

## 10. 已敲定的設計決定（Session 2）

| # | 議題 | 決定 |
|---|---|---|
| 1 | v1 包 AI？ | 不包，只手動挑現有 OfficialHabit |
| 2 | Preset storage | JSON only |
| 3 | 名字 | 嚮往 |
| 4 | Task.identity vs User.identities[] | Task.identity 保持自由文字；User.identities[] 是另一層 |
| 5 | 嚮往的角色 | 「+ 新增」flow 的 Step 1 |
| 6 | 推薦類型 | 計畫 + 習慣 兩種都推薦，同一頁兩區 |
| 7 | 既有 nav 處置 | 保留「探索計畫」「探索習慣」做手動 fallback |
| 8 | 推薦邏輯 | GENESIS+IO domain mapping（PlanCategory.domain 新欄位） |
| 9 | Aspiration 管理位置 | Profile「我的嚮往」tab |
| 10 | PlanCategory.domain 多/單選 | v1 單選 |

---

## 11. Open Questions（留 Session 3 / 寫 plan 前）

1. **Step 1 picker** 是 fullscreen modal 還是現有 modal pattern + 滑入 panel？
2. **零推薦 fallback** 體驗：是 inline 提示還是直接導去既有 nav？
3. **重複嚮往** — 使用者已有「想快速入睡」、又點 preset 同名 — 阻擋還是新增第二筆？
4. **Step 1 「為你推薦」** 演算法細節：依 typeKey / sleepTypeKey 推哪 3-5 個 preset？hardcoded mapping 還是 attribute match？
5. **AppHeader [+]** 目前是 `onOpenAddFlow` → TaskLibraryModal — 要改成嚮往 picker 還是再加新按鈕？

---

## 12. Acceptance Criteria

僅針對 schema + seed + spec 確認，不涵蓋實作：

- [x] 本 spec 同意（Session 2 設計討論結束）
- [ ] schema diff 完成 `prisma db push`
- [ ] `preset-aspirations.json` 35 筆 entries 在位
- [ ] PlanCategory 系統列 domain backfill seed script
- [ ] Plan 文件（待寫）push 到同分支

---

## 13. 實作分段（待 Session 3 寫 plan 時定）

預估順序：
1. **Schema + Seed**：`prisma db push` + PlanCategory.domain backfill
2. **API**：`/api/aspirations/*` CRUD + recommendations
3. **嚮往 Picker modal**（Step 1）
4. **推薦頁 panel**（Step 2）
5. **Hook into existing flows**：TemplateExplorer / TaskFormModal save 時帶 aspirationId
6. **Profile「我的嚮往」tab**
7. **AppHeader [+] / Sidebar 改 wiring**
8. **Slice D HabitListView toggle 移除**
9. **Tests**：lib helpers + API integration + key UI flows
