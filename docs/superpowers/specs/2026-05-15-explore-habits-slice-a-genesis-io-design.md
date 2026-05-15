# Slice A — GENESIS+IO 目標探索（Explore Habits 強化 v1）

**Date:** 2026-05-15
**Status:** Design approved, ready for implementation plan
**Scope:** habitnext1 web-app — 探索習慣入口改造

---

## 1. 背景

habitnext1 目前的「探索習慣」（`TaskLibraryModal`）以水平 pill 篩選 + 卡片網格呈現任意數量的 HabitCategory。整個 Atomic Loop 系列 PRD（v1 / v2 / v3-5T）規劃了一套基於行為科學的設計實驗室流程（目標探索 → AI 雙軌發想 → 焦點地圖評估 → 身分認同），但完整實作範圍過大。

本 spec 只處理 **Slice A：目標探索（PRD v1 F1）**。後續 Slice B/C/D 將以本 slice 的資料模型與入口為基礎演進。

## 2. 目標

把現有「任意分類 + 水平 pill」改為「9 個 GENESIS+IO 標準健康面向 + 3×3 卡片入口」，作為未來引導式設計流程的起點，同時保留現有的「選難度 → 加入習慣」下游邏輯。

### Non-goals

- AI brainstorm（錨點×行為配對）— Slice B
- 焦點地圖評估（Impact × Ability）— Slice C
- 身分認同確立 — Slice D
- Habit Loadout（技能/硬體/軟體）— PRD v2
- 部落、Triumph 獎勵 — PRD v3
- 自訂目標輸入框 — 等 Slice B 才有實際後續流程
- `/explore` 獨立路由 — 等 Slice B 觸發再做
- `OfficialHabit.icon` 從 emoji 換成 Lucide — 另開 ticket

## 3. 9 個標準分類

| order | name (zh)    | slug (參考)    | Lucide icon  | color  |
|-------|--------------|----------------|--------------|--------|
| 1     | 基因與腸道   | gene_gut       | Dna          | indigo |
| 2     | 環境         | environment    | Leaf         | emerald|
| 3     | 飲食         | nutrition      | Utensils     | orange |
| 4     | 運動         | exercise       | Dumbbell     | red    |
| 5     | 壓力與睡眠   | stress_sleep   | Moon         | violet |
| 6     | 社交互動     | interpersonal  | Users        | rose   |
| 7     | 心靈         | spirit_mind    | Sparkles     | sky    |
| 8     | 認知與智慧   | intellectual   | BrainCircuit | blue   |
| 9     | 職涯與平衡   | occupational   | Briefcase    | slate  |

`slug` 僅為 seed/migration 對照用，DB 不存；HabitCategory 仍以 `name` 為唯一識別。

## 4. 資料模型

### Prisma schema diff

```prisma
model HabitCategory {
  id        String   @id @default(cuid())
  name      String   @unique     // 既有 — 中文顯示名
  color     String?              // 既有
  order     Int      @default(0) // 既有
  icon      String?              // ★ 新增 — Lucide 圖示名
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

僅新增 `icon` 一個 nullable 欄位。

**`OfficialHabit.category` 維持以 String 對應 `HabitCategory.name`，不改現有方式。**

### Seed 資料

新增 `prisma/seed/genesis-io.json`：

```json
[
  { "name": "基因與腸道", "order": 1, "icon": "Dna",          "color": "indigo"  },
  { "name": "環境",       "order": 2, "icon": "Leaf",         "color": "emerald" },
  { "name": "飲食",       "order": 3, "icon": "Utensils",     "color": "orange"  },
  { "name": "運動",       "order": 4, "icon": "Dumbbell",     "color": "red"     },
  { "name": "壓力與睡眠", "order": 5, "icon": "Moon",         "color": "violet"  },
  { "name": "社交互動",   "order": 6, "icon": "Users",        "color": "rose"    },
  { "name": "心靈",       "order": 7, "icon": "Sparkles",     "color": "sky"     },
  { "name": "認知與智慧", "order": 8, "icon": "BrainCircuit", "color": "blue"    },
  { "name": "職涯與平衡", "order": 9, "icon": "Briefcase",    "color": "slate"   }
]
```

由 seed script `upsert by name` 寫入；重複跑安全。

## 5. 資料遷移

Production DB 已有任意 HabitCategory + 依附的 OfficialHabits。流程：

### Step 1 — 盤點

`scripts/audit-categories.js`：印出目前所有 HabitCategory + 每個底下的 habit 數。
不寫資料、唯讀。

### Step 2 — 人工 mapping

維護 `prisma/seed/category-migration.json`：

```json
{
  "舊分類A": "飲食",
  "舊分類B": "運動",
  "_unmapped": "心靈"
}
```

由 owner（user）人工 review 後 commit。`_unmapped` 為 fallback —— 遷移時若遇到 mapping 表沒列到的舊分類，把其底下 habits 全部歸到 fallback 分類。

### Step 3 — 跑遷移

`scripts/migrate-categories.js`：

1. 讀 `genesis-io.json`，upsert 9 個標準分類
2. 讀 `category-migration.json`
3. 對每個現有 OfficialHabit：依其 `category` 字串查 mapping 表 → 改成對應的標準分類 name（沒對到就用 `_unmapped` fallback）
4. 未在 mapping 表中的舊 HabitCategory 記錄 **保留不刪**（安全網）
5. 印出統計：N 個 habits 已搬遷、M 個舊分類保留待清

### Step 4 — 後台手動清

Admin 在 `/admin/dashboard/habits` 後台手動刪除孤立的舊分類。

### 冪等性

- Seed script：跑 N 次結果一致
- Migrate script：habit.category 重複設成同樣值不影響
- 兩個 script 都可以在 staging 試跑、出問題重跑

## 6. UI / UX

### 入口位置

保留 `TaskLibraryModal`（既有「建立習慣」按鈕觸發），**不改觸發點、不開新 route**。

### Modal 內部改成雙視圖

**View 1 — Domain Grid（預設）**
- 3×3 卡片網格
- 每張卡片：上方 Lucide icon（大）+ 下方分類名稱（中文）
- 背景用 `color` token 的淺色 + icon 用深色（沿用既有 `bg-{color}-100 text-{color}-700` 樣式慣例）
- 點卡片 → 切換至 View 2
- 頂部保留搜尋框

**View 2 — Habit List**
- 頂部：「← 返回」按鈕 + 當前分類名稱（icon + name）
- 既有的 OfficialHabit 卡片網格 + 難度選擇 + 加入按鈕 **完全不動**
- 頂部搜尋框：在 View 2 為「該分類內搜尋」
- Empty state：「這個面向目前還沒有推薦習慣」提示文字

**搜尋跨視圖行為**
- View 1 搜尋：全域搜尋；輸入後自動切到「搜尋結果」視圖（無 domain 過濾）+ 顯示「← 返回探索」
- View 2 搜尋：當前 domain 內過濾

### 既有設計風格

- 用既有的 button hover micro-interaction（既有 codebase pattern 已有）
- 不引入新 component library
- 沿用既有的 Tailwind + 自訂 CSS 設定（與專案現況一致）
- Motion：卡片進場可加輕量 stagger 動畫（採既有專案已有的動畫庫即可，未引入新依賴）

## 7. 後台改動

`/admin/dashboard/habits`（既有的分類管理 UI）：

- 「新增 / 編輯分類」對話框新增 **icon 選擇器**
  - 預設展示 seed 用到的 9 個 Lucide 圖示
  - 也允許手動輸入 Lucide 圖示名（自由文字）
- 分類列表 row 顯示 icon preview
- 刪除分類 **不加新保護**（沿用現況；admin 自負其責）

## 8. API

- `GET /api/habits` 回應的 categories 陣列 **加上 `icon` 欄位**
- 既有 client 忽略未知欄位即可，無破壞性
- 不新增任何 endpoint

## 9. 測試重點

- **遷移腳本冪等性**：staging DB 跑兩次，第二次無資料變動
- **視覺**：Mobile（375 寬）3 欄網格不擠；Desktop 顯示一致
- **回歸**：既有「選分類 → 選難度 → 加入」整條 flow 不變
- **Empty state**：建立一個 domain 沒有任何 habit 的情境，確認顯示提示文字
- **搜尋**：View 1 搜尋自動切視圖、View 2 搜尋限於該分類

## 10. 風險與緩解

| 風險 | 緩解 |
|---|---|
| 既有舊分類有 OfficialHabit 沒被 mapping 涵蓋 | `_unmapped` fallback；script 印出未對到的清單 |
| 9 標準分類後續仍要改 | seed 由 JSON 驅動，可改；script 用 `upsert by name` |
| Mobile 3×3 在小螢幕變擠 | 預設 grid 響應式：mobile 2 欄、tablet+ 3 欄 |
| icon 字串輸入錯誤（後台手 key 拼錯 Lucide 名） | 前端 render 時 fallback 到通用圖示，不 crash |

## 11. 演進路徑（給未來 Slice 參考）

- **Slice B（AI brainstorm）**：點某個 domain 後，除了現有 habits，補上「✨ 用 AI 設計一個新習慣」按鈕，呼叫 `/api/v1/ai/brainstorm` 取得 anchor × behavior 配對 UI
- **Slice C（焦點地圖）**：選完候選 behaviors 後進入 Impact × Ability 評估
- **Slice D（身分認同）**：加入習慣前要求填 `identity`，並把欄位加到 Task 表

Slice A 的 9 分類資料模型成為後續所有 slice 的入口骨架。
