# Slice B — Anchor × Behavior 配對流程

**Date:** 2026-05-18
**Status:** Design approved, ready for implementation plan
**Scope:** habitnext1 web-app — 在「探索習慣」加入錨點（anchor）選擇步驟，把 BJ Fogg ABC 迴路落地

---

## 1. 背景

Slice A 與 A.5 完成後，使用者可以瀏覽 9 大健康面向、挑選推薦習慣、選難度加入追蹤。但這個流程缺少行為科學的關鍵一塊 — **錨點（Anchor / Cue）**。沒有錨點的習慣容易「忘記做」，因為沒有日常 trigger 拉回行為。

PRD v1 F2 規劃了 AI 雙軌生成 10 個錨點 × 10 個行為的 brainstorm UI，但這個 slice 採用**更輕量、更個人化的版本**：

- **錨點來源 = 使用者既有 task + 規劃好的生活時刻清單**（不需 AI）
- **行為來源 = 既有的 OfficialHabit 庫**（Slice A.5 已備好 93 個）

AI brainstorm 留到後續 Slice C。

## 2. 目標

讓使用者在新增習慣時，**強烈鼓勵但不強迫**指定一個錨點，使得最終建立的 Task 表達為「After [Anchor], I will [Behavior]」結構。錨點顯示在 TaskCard 上做為日常 trigger 提醒。

### Non-goals

- AI 雙軌 brainstorm（Gemini 生成 anchors / behaviors）— Slice C
- 焦點地圖 Impact × Ability 評估 — Slice D
- 身分認同 Identity 確立 — Slice E
- AI 診斷（refine cue / better_cue）— PRD v1 F6
- 通知系統整合（「每天起床後推播」） — 屬於 reminder slice
- 批次編輯既有 task 加 cue — 舊 task 保持 cue=null
- Anchor 使用次數統計、熱門度排序

## 3. 資料模型

### Schema 改動

```prisma
model Task {
  ...
  cue String?  // ★ 新增 — 錨點：例「起床後」/「刷完牙後」/從既有 task 取得的 title
  ...
}
```

僅新增 `cue` 一個 nullable 欄位。Nullable 確保舊資料零破壞。

### 為何不放 metadata JSON

Slice A 已建立 schema 欄位的慣例（icon）。cue 是會在 list view 顯示、會被搜尋的核心屬性，型別清晰比 JSON 包裝更合適。

## 4. 錨點資料來源

### 4.1 內建「生活時刻」清單

存於 `web-app/src/lib/anchors.js`，純前端 export：

```js
export const LIFE_MOMENTS = [
  { id: 'wake_up',         label: '起床後',                     timeOfDay: 'morning' },
  { id: 'after_brushing',  label: '刷完牙後',                   timeOfDay: 'morning' },
  { id: 'first_water',     label: '喝完第一杯水後',             timeOfDay: 'morning' },
  { id: 'leaving_home',    label: '出門前',                     timeOfDay: 'morning' },
  { id: 'arrive_work',     label: '到辦公室／工作場所後',       timeOfDay: 'morning' },
  { id: 'after_lunch',     label: '午餐後',                     timeOfDay: 'noon' },
  { id: 'arrive_home',     label: '回家進門後',                 timeOfDay: 'evening' },
  { id: 'after_dinner',    label: '晚餐後',                     timeOfDay: 'evening' },
  { id: 'after_shower',    label: '洗完澡後',                   timeOfDay: 'evening' },
  { id: 'bedtime',         label: '睡前躺上床後',               timeOfDay: 'evening' },
  { id: 'coffee_tea',      label: '等待煮咖啡／泡茶時',         timeOfDay: 'any' },
  { id: 'before_work',     label: '開電腦／開始工作前',         timeOfDay: 'work' },
  { id: 'first_unlock',    label: '看到手機螢幕第一次解鎖時',   timeOfDay: 'work' },
  { id: 'commute',         label: '通勤路上',                   timeOfDay: 'commute' },
  { id: 'waiting',         label: '排隊／等候時',               timeOfDay: 'any' },
];
```

`id` 僅作前端 React key 用，**寫進 DB 的是 `label` 字串**。改名或新增清單條目不影響既有 task 資料。

### 4.2 「你的習慣」清單

從 `/api/user/tasks` 既有的 active task list 過濾（client side）：

- 排除已 inactive / locked / completed 的 task
- 編輯既有 task 時，排除該 task 本身（避免自我循環）；新增 task 時不適用
- 顯示 `task.title` 為 anchor 候選字串
- 最終寫進 `task.cue` 的是 `task.title` 字串本身（不是 task.id），確保未來該 anchor task 被改名或刪除時不會壞掉

### 4.3 自訂錨點輸入

選項清單末尾有「自訂...」格子，點開彈出 text input：
- 最多 30 字
- 自動 trim 空白
- 空字串視為「跳過」

## 5. 流程改動（TaskLibraryModal）

### 從 2-view 擴成 3-view

```
View 1: domain grid          (既有)
View 2: habit list            (既有)
View 3: anchor select         (★ 新增)
View "search" (跨 1+2 暫存)  (既有)
```

### View 3 — Anchor select

進入點：使用者在 View 2 點某 habit 的「+ 新增」**且 anchor 流程啟用**時。

```
┌──────────────────────────────────────────────┐
│ ← 🍴 喝水 250cc · 入門                      ✕ │
├──────────────────────────────────────────────┤
│                                              │
│  選一個錨點：                                │
│                                              │
│  你的習慣 (N 個)            ← 隱藏 if N=0   │
│  [喝水] [跑步] [冥想]                        │
│  + 顯示更多 (if > 5)                         │
│                                              │
│  生活時刻                                    │
│  [起床後] [刷牙後] [午餐後] [睡前]           │
│  ...15 個 3-col grid                         │
│  [+ 自訂...]                                 │
│                                              │
│  [跳過此步驟]  [確認 (錨點：起床後)]         │
└──────────────────────────────────────────────┘
```

**Header**：顯示目前要加入的習慣摘要（icon + 習慣名 + 難度標籤）。Back chevron 退回 View 2 改選難度。

**選中態**：選中卡片 emerald 描邊 + tint bg，「確認」按鈕變 emerald；未選時「確認」按鈕 disabled，「跳過」始終可用。

**動線**：
- 點「確認」→ TaskFormModal 預填 title + cue
- 點「跳過」→ TaskFormModal 預填 title，cue=null
- TaskFormModal 既有 confirm 流程不變

### 入口路徑（兩條）

| 路徑 | 流程 | Anchor 怎麼選 |
|---|---|---|
| **路徑 1：探索習慣** | Domain → habit → 難度 → **View 3 AnchorPicker** → TaskFormModal 預覽 → 儲存 | 獨立 view，三類錨點來源齊備 |
| **路徑 2：手動建立** | 「+ 建立習慣」按鈕 → 直接開 TaskFormModal → 表單內 cue 欄位 | TaskFormModal 內嵌 AnchorPicker |

也就是說：
- 既有「+ 新增」按鈕（HabitListView 內）原本 onClick 直接送 task，**Slice B 改成轉去 View 3**
- 「手動建立」路徑保留直開 TaskFormModal，但表單裡多一個 cue 欄位（同樣用 AnchorPicker 元件）

## 6. 元件設計

### 新增

| Path | 責任 |
|---|---|
| `web-app/src/lib/anchors.js` | `LIFE_MOMENTS` 常數清單 |
| `web-app/src/components/explore/AnchorPicker.jsx` | Anchor 選擇 UI（your habits + life moments + custom + skip/confirm） |

### 修改

| Path | 改動 |
|---|---|
| `web-app/prisma/schema.prisma` | `Task.cue String?` |
| `web-app/src/components/TaskLibraryModal.jsx` | 加 View 3 (anchor)、state machine extend |
| `web-app/src/components/TaskFormModal.jsx` | 加 cue 欄位 + 編輯模式預填 |
| `web-app/src/components/TaskCard.jsx` | cue 存在時顯示「錨點：X」chip |
| `web-app/src/components/TaskDetailModal.jsx` | 同 TaskCard，顯示錨點 |
| `web-app/src/app/api/tasks/route.js` | POST 接受 cue |
| `web-app/src/app/api/tasks/[id]/route.js` | PUT 接受 cue |

## 7. AnchorPicker 元件 API

```jsx
<AnchorPicker
  value={cue}                    // 字串或 null
  onChange={(cue) => ...}        // 字串或 null
  yourTasks={[Task, Task, ...]}  // 用於「你的習慣」分區
  excludeTaskId={editingTaskId}  // 避免自我循環（編輯模式時）
/>
```

**內部 state**：
- `selected`: 字串或 null（目前選中的 anchor label）
- `customMode`: boolean — 是否進入自訂 input 模式
- `customText`: 自訂錨點輸入暫存

**Props 對 caller 的 contract**：caller 控制 cue value（受控元件），AnchorPicker 不持久化。

## 8. TaskCard 顯示

### Cue 存在時

```
┌──────────────────────────────────────────┐
│ [icon] 喝 250cc 水           [check btn] │
│        ┌────────────────┐                │
│        │ 錨點：起床後   │                │
│        └────────────────┘                │
│        類型 · 連續天數 · 進度             │
└──────────────────────────────────────────┘
```

樣式：淡灰底（`bg-gray-100`）、深灰文字（`text-gray-600`）、小字（`text-xs`）、圓角 chip、放在 title 下方。

### Cue 為 null 時

完全沒這個 chip，TaskCard 跟現在一模一樣。

## 9. API 改動

### POST `/api/tasks`

Request body 多接 `cue`（optional）：
```js
const { ..., cue } = body;
const data = { ..., cue: cue?.trim() || null };
```

### PUT `/api/tasks/:id`

同樣加 cue 處理：
```js
if (cue !== undefined) updateData.cue = cue?.trim() || null;
```

GET endpoints 自動回傳新欄位（Prisma 自動 select all），既有 client 忽略未知欄位。

## 10. 編輯既有 task

`TaskFormModal` 開啟時：
- 若 task.cue 存在，AnchorPicker 預設選中（如果是 LIFE_MOMENTS 之一）或顯示為 customText
- 使用者可改、清空（cue 變 null）、選別的
- 儲存時送 PUT 帶 cue

## 11. 風險與緩解

| 風險 | 緩解 |
|---|---|
| nullable 欄位破壞 production | nullable，Slice A icon 已驗證過 |
| 「跳過」太顯眼 → 使用者全部 skip | 「確認」用主要樣式（emerald 大按鈕），「跳過」用次要樣式（淡灰小字） |
| 自訂錨點亂打 | 30 字上限、trim、空字串視為跳過 |
| 「你的習慣」超過 10 個太擠 | 預設顯示 5 個最近建立的，超過時「+ 顯示更多」展開 |
| 編輯時看不到原 cue | TaskFormModal 進場若有 cue，AnchorPicker 預選 |
| Anchor name 與 user task title 衝突 | 顯示「你的習慣」優先（個人化勝過通用） |
| Anchor task 被刪 / 改名 | cue 是字串複製、不是 FK；保留歷史值，使用者要的話自己改 |

## 12. 驗收條件

1. `npx prisma db push` 後 `Task.cue` 是 nullable 字串欄位，舊資料不變
2. 探索習慣 → 選 habit + 難度 → 進到 anchor select view
3. View 3 顯示「你的習慣」與「生活時刻」分區
4. 點「確認 (錨點：X)」送出 → 新 Task 的 cue=X
5. 點「跳過此步驟」送出 → 新 Task 的 cue=null
6. 「自訂...」格子展開 input、送出後 cue 為輸入文字（trim 過）
7. TaskCard 對於 cue 存在的 task 顯示「錨點：X」chip
8. TaskCard 對於 cue=null 的 task 顯示行為跟現在完全一樣
9. TaskFormModal 編輯時 AnchorPicker 預選現有 cue（或 customText 模式）
10. 既有 96 個 task / OfficialHabit 全部 cue=null，UI 顯示行為完全不變
11. `/api/tasks*` 正確讀寫 cue 欄位

## 13. 與其他 slice 關係

- **Slice A** 完成的 explore 入口、9-card 流程、Slice A.5 的 90 個 habit 全部沿用
- **Slice C（AI brainstorm）** 未來會在 anchor / behavior 上加 AI 建議，但本 slice 的 AnchorPicker 元件介面已預留：caller 改傳入更多 anchor candidates 即可
- **Slice D（焦點地圖）** 評估流程會以 cue 已存在為前提
- **無 breaking change**：admin 後台、既有 API、TaskHistory 全部不動
