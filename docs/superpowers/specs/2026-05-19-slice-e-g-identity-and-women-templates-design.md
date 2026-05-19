# Slice E + G — 身分認同基礎建設 + 4 花朵小課程 Template

**Date:** 2026-05-19
**Status:** Design approved, ready for implementation plan
**Scope:** habitnext1 web-app — Identity foundation (Slice E) + female-cycle 4-type templates wiring (Slice G)

---

## 1. 背景

同事整理了一份「女性小課程」內容（`女性小課程.xlsx` 「分型內容任務」分頁），把女性使用者依生理特徵分 4 型（4 種花朵命名，本身就是隱性身分認同），每型 4 級漸進課程（L1-L4），加生理期 conditional add-on。

該文件 = 4 個 Template 的完整內容，但接到 habitnext1 之前需要兩個基礎建設：

- **Slice E（身分認同基礎）**：對應 PRD v1 F4。James Clear 原子習慣的核心 — 每個 task 連結到一個身分宣告。
- **Slice G（Template + Phase 啟用）**：既有 `Template.phases[]` schema 從未被使用過；啟動 admin-managed phase rollover + 用 `User.typeKey` 推薦對應 type 的 template。

問卷模組另一位同事在做，會把使用者分型結果寫入 `User.typeKey` 欄位。本 spec 不負責問卷邏輯。

Slice E 與 G 緊耦合（G 大量利用 E 的 identity 結構），合併為 1 個 spec 分 3 chunk 出 commit。

## 2. 目標

**Slice E**：每個 task 可帶 identity 宣告；新增 task 時用 `IdentityPicker` 選擇（從 `user.typeKey` 預設、可改、可自訂）；TaskCard / Modal 顯示 identity。

**Slice G**：使用者問卷答完後 (`user.typeKey` 設定) → dashboard 顯示「為你準備的小課程：[花朵名]」CTA → 加入該 type 的 4-phase template → 既有 phase rollover 機制自動推進；可手動觸發生理期模式新增臨時 task。

### Non-goals

- AI 身分卡產生 / 動態 identity (PRD F7)
- 自動週期日期預測（手動 toggle 即可）
- 多重 identity / identity 統計與 reflection
- Admin Template editor UI 修改（已存在，沿用）
- 多重 Template 同時訂閱
- L4 完成的成就/獎勵系統
- 問卷邏輯（其他同事負責）

## 3. 與其他模組的合約

### 與問卷模組（另一同事）

```prisma
model User {
  ...
  typeKey String?  // ★ 新增 — 'daisy' | 'rose' | 'orchid' | 'sunflower'
}
```

問卷模組責任：答題完成後把對應結果寫入 `user.typeKey`。本 spec 不實作問卷端。

Value enum（前端常數，不用 DB enum）：
- `'daisy'` — 雛菊型 / 穩定保養型
- `'rose'` — 玫瑰型 / 週期波動型
- `'orchid'` — 蘭花型 / 週期不規律型
- `'sunflower'` — 向日葵型 / 代謝能量型

### 與既有 Template / Phase 系統

既有 `Template.tasks` JSON 結構（spec 003 + admin TemplateForm.jsx 已實作）：

```json
{
  "version": "2.0",
  "phases": [
    { "id": "...", "name": "L1 入門", "days": 7, "tasks": [...] },
    ...
  ]
}
```

既有 `phase.tasks[]` 每個 task 物件結構由 admin form 決定。本 spec 會 reuse 並擴展：每個 phase task 物件**新增** `defaultCue` 與 `defaultIdentity` 欄位（純前端讀取、admin form 不一定要改）。

**Spike 待驗證**：使用者 join template 時，既有 `/api/user/assignments` POST 是 (a) 一次展開所有 phase 的 task、還是 (b) 按 phase 時間動態 active。預期 (b)，若實際是 (a) 則 Chunk 2 加修補 task。

## 4. Slice E — Identity 基礎建設

### Schema

```prisma
model Task {
  ...
  identity String?  // ★ 新增 — 「我是個照顧週期身體的人」之類的身分宣告
}
```

### `IdentityPicker` 元件介面

```jsx
<IdentityPicker
  value={identity}              // 目前選的 identity 字串或 null
  onChange={(s) => ...}
  userTypeKey={user.typeKey}    // null 時不顯示「⭐ 預選」徽章
/>
```

**內部資料來源** `src/lib/typeKeys.js`：

```js
export const USER_TYPE_PROFILES = {
  daisy:     { label: '雛菊型', identity: '我是個穩定照顧自己的人' },
  rose:      { label: '玫瑰型', identity: '我是個照顧週期身體的人' },
  orchid:    { label: '蘭花型', identity: '我是個重視生活節律的人' },
  sunflower: { label: '向日葵型', identity: '我是個照顧代謝健康的人' },
};

// 4 個跨 type 通用 identity（手選備案）
export const GENERIC_IDENTITIES = [
  '我是個有紀律的人',
  '我是個珍惜身體的人',
  '我是個堅持微小行動的人',
  '我是個照顧自己心靈的人',
];

export const IDENTITY_MAX_LENGTH = 40;
```

### IdentityPicker UI

```
┌─ 為什麼做這個習慣？──────────────────┐
│ 你的身分                              │
│                                       │
│ [⭐ 我是個照顧週期身體的人]   ← typeKey 推薦
│                                       │
│ 或自選 ──                             │
│ [我是個有紀律的人]                    │
│ [我是個珍惜身體的人]                  │
│ [我是個堅持微小行動的人]              │
│ [我是個照顧自己心靈的人]              │
│                                       │
│ [+ 自訂 (最多 40 字)]                 │
│                                       │
│ [跳過]      [確認 (我是個照顧週期...)]│
└───────────────────────────────────────┘
```

- typeKey 為 null：不顯示「⭐ 推薦」徽章但其他選項全可用
- 「跳過」 → `onChange(null)` → identity 不顯示
- 自訂輸入：40 字內（`IDENTITY_MAX_LENGTH`）、trim 過、空字串視為跳過

### 整合進探索流程

`TaskLibraryModal` 從目前的 3-view (domain → habit → anchor) 擴成 **4-view**：
- domain → habit → **anchor** → **identity** → save

Anchor view 確認後切到 identity view（IdentityPicker），確認/跳過後送 TaskFormModal 預填。

`TaskFormModal` 編輯模式加 IdentityPicker（同 cue 的位置編輯）。

### TaskCard / TaskDetailModal 顯示

```
┌──────────────────────────────────────────┐
│ 我是個照顧週期身體的人  ← 極小灰字 (identity)
│ 午餐後 →                ← emerald (cue)
│ 每餐有蛋白質            ← 粗體 (title)
│ 描述（一行截斷）
└──────────────────────────────────────────┘
```

identity 不存在 → 整行不渲染。

### 範圍邊界（Slice E）

✅ schema、Picker、4-view flow、display、edit
❌ AI 身分卡、reflection、統計

---

## 5. Slice G — Template + 4 花朵 + 生理期

### Schema

```prisma
model User {
  ...
  typeKey String?  // ★ 新增（與問卷模組共享合約）
}

model Assignment {
  ...
  isMenstrual    Boolean   @default(false)  // ★ 新增 — 是否進入生理期模式
  menstrualStart DateTime?                   // ★ 新增 — 觸發日期（5 天後自動 archive）
}
```

### Template.tasks JSON 結構擴展

既有 `phases[]` 結構保留。每個 phase 的 task 新增兩個 metadata 欄位（純資料、後台 form 不需要顯示出來、admin 不一定要編）：

```json
{
  "version": "2.0",
  "phases": [
    {
      "id": "phase_1",
      "name": "L1 入門",
      "days": 7,
      "tasks": [
        {
          "officialHabitName": "每餐都要有一份蛋白質",
          "difficulty": "beginner",
          "defaultCue": "午餐後",                            // ★ 新增
          "defaultIdentity": "我是個照顧週期身體的人"        // ★ 新增
        }
      ]
    },
    /* L2, L3, L4 */
  ],
  "menstrualPhase": {                                          // ★ 新增 — 不在 phases[] 中
    "tasks": [
      {
        "officialHabitName": "做 5 分鐘溫和伸展",
        "difficulty": "beginner",
        "defaultCue": "起床後",
        "defaultIdentity": "我是個照顧週期身體的人"
      }
    ]
  }
}
```

**`Template.category`** 欄位用花朵 slug 標記（`daisy` / `rose` / `orchid` / `sunflower`）— 對應 typeKey。

### Dashboard typeKey-aware CTA

使用者 logged in 後，dashboard 檢查：

```js
if (user.typeKey && !userHasActiveAssignmentForTemplateWithCategory(user.typeKey)) {
  showCTA(user.typeKey);  // 「為你準備的小課程：玫瑰型」
}
```

CTA 點下去 → 修改版 TemplateExplorer（過濾 `category === user.typeKey`）→ 顯示 1 個 Template → 加入。

**Chunk 2 狀態**：CTA 顯示「coming soon」（template seed 還沒做）。Chunk 3 完成後切換到實際 join 流程。

### Template join 流程（複用既有）

`/api/user/assignments` POST 邏輯既有，不改。Assignment 建立後既有展開機制決定 task 怎麼 active（spike 待驗）。

Template join 後，每個 phase task 預設帶 `cue` 與 `identity`（從 phase task 的 `defaultCue` / `defaultIdentity` 拷貝過去）。

### 生理期模式

**入口**：dashboard 加一個 toggle/button：「我正在生理期」。
**觸發** ON：
1. `Assignment.isMenstrual = true`, `menstrualStart = today`
2. 從 user 目前訂閱的所有 Template 抓出 `menstrualPhase.tasks`
3. 為每個 task 建立 isActive Task，`metadata` 標記 `{ source: 'menstrual', assignmentId, expiresAt: today + 5 days }`

**5 天 auto-archive**：
- 採 **client-side check + server lazy archive** 混合：
  - Client：dashboard 載入時若 `assignment.isMenstrual && now > menstrualStart + 5 days` → 顯示「結束生理期？」按鈕（不自動關，給使用者明確 closure 感）
  - Server：cleanup script `node scripts/archive-expired-menstrual.js` 可手動跑 / 設 cron（出本 slice 範圍）

**手動關閉**：dashboard 「結束生理期模式」按鈕 → set `isMenstrual = false` + 對應 task isActive = false（保留歷史）

### 需補的 OfficialHabit（同事文件有、Slice A.5 沒 seed）

實際清單需在 Chunk 3 內容階段對齊；預估 ~10 個，例如：
- 睡前做 2 分鐘深呼吸（4-7-8 呼吸法）
- 第一餐吃完後吃保健品
- 空腹吃益生菌
- 飯後補充薑黃和葉酸鐵
- 睡前補充鎂
- 起床後喝兩大口水
- 上完廁所後伸展 10 分鐘
- 想吃甜食先吃堅果等 10 分鐘
- 把含糖飲料換成白開水或無糖飲品
- 找一個 5 分鐘「什麼都不用做」的時間

每個依 Slice A.5 規格定 3 難度，補進 `genesis-io-habits.json` seed。

### 範圍邊界（Slice G）

✅ schema (typeKey, isMenstrual, menstrualStart)、CTA、TemplateExplorer 過濾、補 OfficialHabit、生理期 toggle、4 花朵 Template seed (Chunk 3)
❌ Template editor admin UI 修改、自動週期預測、多重 Template、L4 成就

## 6. 拆解（3 chunk）

### Chunk 1 — Slice E（identity 基礎建設）
**獨立 ship、不需任何 type 內容**
- Schema: Task.identity, User.typeKey（兩個一起加，但本 chunk 只用 Task.identity）
- `IdentityPicker` 元件 + lib/typeKeys.js 常數
- `TaskLibraryModal` 擴成 4-view（加 identity view）
- `TaskFormModal` 加 IdentityPicker 欄位
- TaskCard / TaskDetailModal 顯示 identity（上方極小灰字）
- 預估 7-9 tasks

### Chunk 2 — Slice G 基礎建設（不需內容）
**獨立 ship、CTA placeholder「coming soon」**
- Schema: Assignment.isMenstrual + menstrualStart
- 補 10 個 OfficialHabit seed
- Dashboard typeKey-aware CTA (placeholder mode)
- Spike: 既有 Template join 是否 phase-rollover；若一次展開、補修補
- 生理期 toggle UI + 5 天 client-side expiry check
- 預估 6-8 tasks

### Chunk 3 — Slice G 內容（等同事回覆）
**Gated on colleague feedback**
- 同事確認累加/替換規則
- 4 個花朵 Template seed JSON + `phase.days` 排好
- 生理期 menstrualPhase task 擴充 seed
- CTA 從 placeholder 切實際
- End-to-end QA：register → typeKey 設置 → CTA → join → phase rollover → 生理期 toggle
- 預估 4-5 tasks

## 7. 風險與緩解

| 風險 | 緩解 |
|---|---|
| `User.typeKey` 與同事問卷模組合約沒對齊 | Chunk 2 出來時 sync schema；4 enum 值固定 |
| 既有 Template join 一次展開全 phase tasks（違漸進） | Chunk 2 第一個 task 做 spike，若需要修補加進 plan |
| 同事內容回覆延遲卡住 Chunk 3 | Chunk 1+2 已具獨立價值（identity 基礎 + 基礎建設） |
| 累加/替換不同決定影響 phase.days | Chunk 3 seed 寫不寫看同事決定，其他 chunk 不受影響 |
| 生理期與 phase rollover 邊界 corner case | menstrualPhase 不在 phases[] 中、用獨立欄位處理；不污染 days 計算 |
| typeKey 與既有 `Template.category` 撞名（既有可能是 "health"/"fitness" 等字串） | 既有 7 個 PlanCategory 標籤跟新 4 花朵 slug 名字無衝突；用花朵 slug 不破壞既有 |
| Dashboard 上 identity / cue 三行垂直堆疊太擠 | TaskCard 已測 cue 一行 + title 一行，identity 加在最上面用 `text-[10px]` 不會超出既有高度 |

## 8. 驗收條件

### Chunk 1 完成
1. `User.typeKey String?` + `Task.identity String?` 跑 db push 完成
2. 新增習慣流程：探索 → habit → anchor → **identity（typeKey 為 'rose' 時預選「我是個照顧週期身體的人」）** → 加入
3. TaskCard 顯示 identity（若存在）在 cue 上方、極小灰字、cue/title 排版保留 Slice B 樣式
4. TaskFormModal 編輯能改/清 identity
5. typeKey 為 null 時 IdentityPicker 不顯示「⭐ 推薦」徽章但所有選項可選/可自訂
6. 既有 95 habits / 1 蛋白質 task / 所有 binary/quant/checklist 無 regression

### Chunk 2 完成
7. `Assignment.isMenstrual Boolean + menstrualStart DateTime?` 跑 db push 完成
8. Spike 結果記錄：既有 phase rollover 行為（rollover ✓ / 一次展開 ✗）並完成修補（若必要）
9. 補 10 個 OfficialHabit 進 `genesis-io-habits.json`，seed idempotent，DB 共 ~105 habits
10. Dashboard 有 typeKey-aware CTA placeholder（若 typeKey 存在）顯示「為你準備：[花朵名]小課程（即將上線）」
11. 「我正在生理期」開關存在 dashboard、能 toggle Assignment.isMenstrual（暫時無 task 觸發）

### Chunk 3 完成
12. 4 個花朵 Template seed 進 DB（category 為 daisy/rose/orchid/sunflower），phase.days 依同事決定
13. Dashboard CTA 從 placeholder 切實際 join 流程
14. typeKey='rose' 的測試用戶 join 後看到 phase 1 (L1) 的 tasks，預填 defaultCue + defaultIdentity
15. Toggle 生理期 → menstrualPhase.tasks 對應的 task 出現 isActive
16. menstrualStart 過 5 天 → dashboard 顯示「結束生理期」prompt

## 9. 與既有 slice 關係

- **Slice A / A.5** 完成的 9 GENESIS+IO 分類 + 95 habit 沿用，Chunk 2 加 10 個進來
- **Slice B** 完成的 anchor (cue) 提供 IdentityPicker 設計範本
- **Slice F** 完成的 checklist 早午晚 subtasks 給 4 花朵 template 的 task 用
- 不破壞 admin 後台、API、TaskHistory
