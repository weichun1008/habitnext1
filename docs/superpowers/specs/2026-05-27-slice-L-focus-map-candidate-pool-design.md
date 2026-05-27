# Slice L — 候選池 + 焦點地圖（Behavior Swarm + Focus Map）

**Date:** 2026-05-27
**Status:** Design — ready for plan
**Scope:** habitnext1 web-app — 把 BJ Fogg 的 Behavior Swarm + Focus Mapping 流程嵌入「新增習慣」體驗：使用者先一一加入候選池，累積到一定數量後一次評分（Impact × Ability），系統依四象限推薦執行哪幾個。

---

## 1. 背景與動機

### 1.1 既有流程的缺口

Slice K 完成後，使用者新增習慣有三條路徑：

1. **AspirationPicker → 推薦習慣** — 從嚮往出發，看到 domain-mapped habits
2. **TaskLibraryModal 直接探索** — 9 domain grid → habit → 難度 → anchor → identity
3. **TaskFormModal 手動建立**

三條都假設「**用戶已經知道想做什麼**」，且每個習慣都是即時 commit 為 active task。問題：

- **沒辦法批次思考**：想加 5 個習慣 → 走 5 次完整 flow，過程中沒法比較哪個更值得
- **沒辦法挑「最值得做」**：所有加入的都立刻變 active，使用者最後攢成 10+ 個 task，全部都沒做好
- **行為科學常識被忽略**：Fogg 明確建議「一次同時養成 3-5 個」、且「黃金行為 = 高 impact + 高可行性」應該被優先選

### 1.2 BJ Fogg Tiny Habits 的處方

Fogg 在 *Tiny Habits* 第 4-5 章提出兩步驟工具：

**Behavior Swarm（群想）**：
> "Don't filter as you brainstorm. List **at least 10–20** specific behaviors. The more, the better."

不要邊想邊篩，先大量產生候選。

**Focus Mapping（焦點地圖）**：
> "Plot each behavior on two axes: Impact (vertical) and Feasibility/Ability (horizontal). Then look at the **upper-right quadrant** — these are your **Golden Behaviors**."

雙軸打分後，右上角的就是黃金行為。Fogg 強調：
> "If a behavior is easy to do, you can do it even when motivation is low. The key to lasting habit change isn't motivation — it's choosing behaviors that are easy enough to do without motivation."

**Activate（啟動）**：
> "Begin with **3 to 5** of these gold behaviors."

同時新習慣不超過 3-5 個，避免 willpower 透支。

### 1.3 Slice D 的遺產

Slice D 加了 `OfficialHabit.impact` / `ability`（系統預設、1-5）與 `FocusMap.jsx` 元件（191 行）。Slice K 重新定位時把 FocusMap toggle 從 HabitListView 移除，元件本身保留作 debug tool。

**這次** FocusMap 找到正確位置：在「候選池 → 啟用」的中介步驟。

---

## 2. v1 目標

把「Swarm（新增候選） → Focus Map（評分） → Activate（啟用 3 個）」做成一條清楚的流程，幫助使用者：

1. **可以放心多加候選**：加入不等於啟用、沒有壓力
2. **看見對比再選**：所有候選並排打分，比較才看得出哪個值得
3. **被教 Fogg 原則**：四象限的標籤 + 文案直接傳達理論

### Non-goals（v1 不做）

- ❌ Pairwise rating（兩兩比較）
- ❌ 2D drag-and-drop 拖曳評分 — 用 slider
- ❌ Active 習慣的重評分 — 必須先 archive 變候選才能重評
- ❌ AI 自動推導 impact / ability — 純使用者主觀
- ❌ 完整視覺化的 2D scatter map 主畫面 — 用「列表 + 迷你預覽 map」
- ❌ TemplateExplorer 加入的 template **不走候選池** — template 已是策劃過的計畫，加入即啟用

---

## 3. UX 主流程

### 3.1 Swarm（新增候選）

**TaskLibraryModal 行為改動：**

- 使用者選 habit → 難度 → anchor → identity → save
- save 時 task 寫進 DB，但 `status='candidate'`（不是 active）
- TaskLibraryModal 不關閉，回到 domain grid，使用者可再加（直到自己關閉）
- 底部出現「已加 N 個候選 · 完成後一起評分」persist banner

**TemplateExplorer 不變**：template 是策劃過的計畫、加入就是 `status='active'`，不走候選池。

**TaskFormModal（手動建立）**：預設 `status='candidate'`，但表單底部加 checkbox「直接啟用，不進入候選池」（給 power user）。

**AspirationRecommendationPanel**：點推薦習慣後仍走 TaskLibraryModal（Slice K 的設計），自動繼承候選池流程。

### 3.2 Daily View Banner

當 `candidates.length >= 5`，daily view 在 DashboardSummaryCard **下方**、今日行程 **上方** 出現：

```
┌──────────────────────────────────────────┐
│ 🌟 你有 6 個候選習慣可以開始焦點地圖了！  │
│ Fogg 建議篩 3 個「黃金行為」實際開始      │
│                              [開始評分 →]│
└──────────────────────────────────────────┘
```

- 點 → 開啟 FocusMapModal（h-[90dvh] 底部彈出 / 中央 desktop）
- 隱藏條件：`candidates.length < 5`，或全部候選都已 `ratedAt != null` 且使用者選擇「之後再看」（per-session dismiss，不持久）

### 3.3 FocusMap 評分頁面（單頁 morph）

進入時的內容：

```
┌──────────────────────────────────────────┐
│ ← 焦點地圖                          [X]  │
│ 依 Fogg 框架挑出你的「黃金行為」         │
├──────────────────────────────────────────┤
│ ┌──── 迷你 map preview（80×80px）────┐  │
│ │  ⬆影響       🌟 黃金              │  │
│ │     └ (chips 即時)                 │  │
│ │  ⬇影響     易→                     │  │
│ └────────────────────────────────────┘  │
│                                          │
│ 拖每個 slider 評分，習慣會自動歸組        │
│                                          │
│ ┌── 🌟 黃金行為（推薦啟用）────────┐    │
│ │ ☑ 💧 喝水 2000cc                  │    │
│ │   影響 [────────●─] 5             │    │
│ │   執行 [────────●─] 5             │    │
│ │ ☑ 😴 早睡 11pm                    │    │
│ │   影響 [────────●─] 5             │    │
│ │   執行 [──────●───] 4             │    │
│ └─────────────────────────────────┘    │
│                                          │
│ ┌── 🌱 順手習慣（可選加入）────────┐    │
│ │ ☐ 📱 少滑社群                     │    │
│ │   影響 [──●──────] 2              │    │
│ │   執行 [──────●───] 4             │    │
│ └─────────────────────────────────┘    │
│                                          │
│ ┌── ⏳ 大魚（暫時保留）─────────────┐   │
│ │ • 💪 健身房 3 次/週                │   │
│ │   影響 [────────●─] 5              │   │
│ │   執行 [──●──────] 2               │   │
│ │ Fogg：先建立基本技能再來          │   │
│ └─────────────────────────────────┘    │
│                                          │
│ ┌── 🗑️ 跳過（不耗 willpower）──────┐    │
│ │ • 📚 學語言（線刪）                │    │
│ │   影響 [──●──────] 2              │    │
│ │   執行 [●────────] 1              │    │
│ └─────────────────────────────────┘    │
├──────────────────────────────────────────┤
│ [啟用勾選的 2 個（保留其他 4 個為候選）]│
└──────────────────────────────────────────┘
```

### 3.4 評分互動細節

- 每個 row 兩條 slider（影響、執行）— 1-5 整數值
- Slider 預填值：
  - 若 `task.userImpact` / `userAbility` 已存（之前評過）→ 用 user 值
  - 否則 → 用 task.officialHabit 的 `impact` / `ability`（透過 task.title 或 metadata 對應）
  - 若還是找不到 → 預設 3
- 拖 slider 時：
  - 迷你 map 上對應 chip 即時移動
  - 該 habit 動態 reflow 到對應象限分組（visual transition）
- 象限邊界：
  - impact ≥ 4 AND ability ≥ 4 → 🌟 黃金
  - impact ≤ 3 AND ability ≥ 4 → 🌱 順手
  - impact ≥ 4 AND ability ≤ 3 → ⏳ 大魚
  - impact ≤ 3 AND ability ≤ 3 → 🗑️ 跳過
- 黃金象限的 habit 預設 `checked=true`（最多 3 個 — 若 >3，取 `impact + ability` sum 最大的 3 個）
- 使用者可手動勾選非黃金象限的 habit：
  - 大魚：勾上 → 顯示 amber inline warning「Fogg 建議先建立基本技能、不過你決定要試也可以」
  - 跳過：勾上 → 顯示 amber inline warning「Fogg 認為這個低影響又難執行、建議先別啟用」
  - 順手：勾上 → 無 warning

### 3.5 Activate

底部 CTA「啟用勾選的 N 個（保留其他 X 個為候選）」：
- 勾選的：`status='active'`、`userImpact / userAbility` 寫入、`ratedAt=now()`
- 沒勾的非「跳過」：`status='candidate'`、`userImpact / userAbility` 也寫入（已經評過）、`ratedAt=now()` — 下次再進來不會被推上 banner（除非用戶從 Profile 重新進入）
- 「跳過」象限的：彈一個 confirm「跳過象限的 3 個習慣要全部刪除嗎？」
  - 點「全部刪除」→ `status='archived'`，daily view / candidates 都看不到
  - 點「保留」→ 跟非「跳過」一樣 `status='candidate'`

關閉 modal → 回 daily view，新 active habits 立即顯示在「今日行程」。

### 3.6 入口整理

| 動作 | 入口 |
|---|---|
| 新增候選 | AppHeader [+] → TaskLibraryModal（既有 flow，加入後 status=candidate）|
| 進入焦點地圖 | Daily view banner（自動，≥5 候選）/ Profile「我的候選池」按鈕 |
| 重評既有候選 | 同上 — 焦點地圖頁面 |
| 重評已 active 的習慣 | v1 不做 — 要先從 daily view 把它 archive 變候選 |

---

## 4. Schema diff

```diff
model Task {
  ...
  isLocked    Boolean  @default(false)
+ status      String   @default("candidate")  // candidate | active | archived
+ userImpact  Int?     // 1-5；user 自評（覆寫 OfficialHabit 預設）
+ userAbility Int?     // 1-5
+ ratedAt     DateTime?
  ...
}
```

**Migration 注意**：既有的 Task 全部要 backfill `status='active'`（不然 daily view 會空白）。寫一次性 seed/migration script。

### 4.1 對 Slice K 模型的影響

- `Aspiration` / `AspirationHabit` 不動
- AspirationHabit 的 taskId 仍指向同一個 Task — Slice L 加 status 後 candidate 也是合法的 link target
- 評分流程不影響 AspirationHabit 關聯（評過後 task 變 active，AspirationHabit 仍指這個 task）

### 4.2 跟 Slice D 的 `OfficialHabit.impact / ability` 的關係

- OfficialHabit 上的 impact / ability 仍當**系統預設值**
- 預填 slider 的優先序：`task.userImpact || officialHabit.impact || 3`
- Admin 可以繼續在 `/admin/dashboard/habits` 編輯 OfficialHabit.impact / ability — 那是 seed 預設

---

## 5. 推薦邏輯

```js
// lib/focusMap.js
const QUADRANTS = {
  golden:    { label: '🌟 黃金行為', tone: 'amber',  rec: 'recommended', advice: '推薦啟用 — 高影響又易做到' },
  background:{ label: '🌱 順手習慣', tone: 'gray',   rec: 'optional',    advice: '可加可不加 — 容易做、影響有限' },
  big_fish:  { label: '⏳ 大魚',     tone: 'gray',   rec: 'park',        advice: 'Fogg：先建立基本技能再來' },
  skip:      { label: '🗑️ 跳過',     tone: 'gray',   rec: 'skip',        advice: 'Fogg：別耗 willpower 在這上' },
};

function quadrantOf(impact, ability) {
  if (impact >= 4 && ability >= 4) return 'golden';
  if (impact <= 3 && ability >= 4) return 'background';
  if (impact >= 4 && ability <= 3) return 'big_fish';
  return 'skip';
}

function recommendDefaults(candidates) {
  // Returns Set<taskId> that should be pre-checked.
  // Top 3 by (impact + ability) within golden quadrant.
  const golden = candidates.filter(c => quadrantOf(c.userImpact ?? c.fallbackImpact, c.userAbility ?? c.fallbackAbility) === 'golden');
  golden.sort((a, b) => ((b.userImpact ?? b.fallbackImpact) + (b.userAbility ?? b.fallbackAbility))
                       - ((a.userImpact ?? a.fallbackImpact) + (a.userAbility ?? a.fallbackAbility)));
  return new Set(golden.slice(0, 3).map(c => c.id));
}
```

Pure functions、有 TDD 測試。

---

## 6. API

### 6.1 新增

```
GET /api/tasks/candidates?userId=
  → 列出 user 的 candidate tasks（含 OfficialHabit fallback impact/ability for slider seed）
  → 順帶帶 OfficialHabit join 給 slider 預填

PATCH /api/tasks/batch-rate
  body: { userId, ratings: [{ taskId, userImpact, userAbility, action: 'activate' | 'keep_candidate' | 'archive' }] }
  → 批次更新 status / userImpact / userAbility / ratedAt
  → 回傳 updated counts
```

### 6.2 既有改動

- `POST /api/tasks` — 接受 `status` field（預設 'candidate'，但 TemplateExplorer 那邊傳 'active' 跳過候選池）
- `GET /api/tasks?userId=` — 預設只回 `status: 'active'`；加 `?status=candidate` 或 `?status=all` 可篩

---

## 7. UI 元件清單

### 新建
| Component | 責任 |
|---|---|
| `web-app/src/lib/focusMap.js` | 純函數：quadrantOf / recommendDefaults / labels |
| `web-app/src/__tests__/lib/focusMap.test.js` | 單元測試 |
| `web-app/src/components/FocusMapModal.jsx` | 評分頁面 modal（單頁 morph）|
| `web-app/src/components/focusMap/QuadrantSection.jsx` | 4 象限分組區塊 |
| `web-app/src/components/focusMap/HabitRatingRow.jsx` | 每個 habit row 帶 2 sliders + checkbox |
| `web-app/src/components/focusMap/MiniMap.jsx` | 80×80 迷你 map（即時更新 chip 位置）|

### 修改
| File | 改動 |
|---|---|
| `web-app/prisma/schema.prisma` | Task 加 status / userImpact / userAbility / ratedAt |
| `web-app/scripts/backfill-task-status.js` (new) | 一次性把既有 Task 標為 status='active' |
| `web-app/src/components/MainApp.jsx` | Daily view 加 banner、把 TaskLibraryModal save callback 改成 candidate；加 FocusMapModal state |
| `web-app/src/components/TaskLibraryModal.jsx` | save 後 alert 改成 toast「+1 候選」+ 維持 modal 開著 |
| `web-app/src/components/TaskFormModal.jsx` | 加「直接啟用」checkbox（手動 path power-user 跳過候選池）|
| `web-app/src/app/api/tasks/route.js` | GET 加 status filter、POST 接受 status |
| `web-app/src/app/api/tasks/candidates/route.js` (new) | GET candidates 含 OfficialHabit fallback |
| `web-app/src/app/api/tasks/batch-rate/route.js` (new) | PATCH 批次評分 |
| `web-app/src/lib/utils.js` | `isTaskDueToday` 加入 status='active' 隱含 filter |

---

## 8. v1 Acceptance Criteria

- [ ] Task schema 加 `status` / `userImpact` / `userAbility` / `ratedAt` + db push
- [ ] 既有 task backfill `status='active'`（不影響現有用戶）
- [ ] TaskLibraryModal 加新 habit → 後台 `status='candidate'`
- [ ] Daily view 顯示 banner 當 candidates ≥ 5
- [ ] 點 banner → 開 FocusMapModal
- [ ] FocusMapModal：sliders 預填 OfficialHabit defaults、拖動即時更新象限分組、黃金預設勾選最多 3 個
- [ ] 點啟用 → batch-rate API 更新 status/評分/ratedAt
- [ ] 啟用後回 daily view → 新 active habits 出現
- [ ] Pure helper tests 全綠（TDD）
- [ ] No regression — 既有 Slice K aspiration flow 不壞

---

## 9. v1 Open Questions（留實作前確認）

1. **Banner dismiss 持久化**：v1 是 per-session dismiss（換 session 又出現）還是寫進 DB 加 `bannerDismissedAt`？
2. **OfficialHabit fallback 對應**：candidate task 怎麼回查 OfficialHabit？走 `task.title` 比對 `OfficialHabit.name`，還是 task 加一個 `officialHabitId String?` FK？後者比較乾淨但 schema 變動稍多。
3. **TaskLibraryModal save 後的 UX**：modal 維持開著用 toast 通知，還是先讓他關掉之後再開？
4. **「跳過」象限 confirm 文案**：是「全部刪除」一鍵還是要逐一勾選？v1 簡化用一鍵。
5. **Profile 候選池入口**：要不要在 Profile 加「我的候選池 (N)」tab？v1 先不做，靠 daily banner 即可。

---

## 10. 與 Slice K 的整體流程圖（合一視角）

```
[+ 新增] 按鈕
   ↓
TaskLibraryModal （← 既有，依 Slice K 含 ✨ 從嚮往開始 entry）
   ├── 走嚮往（Slice K）: aspiration → recommended habit → save as candidate
   └── 直接探索: domain → habit → save as candidate
   ↓
Task with status='candidate' 寫入 DB
   ↓
（重複加入到 ≥5 個）
   ↓
Daily view 顯示 banner「N 個候選等待評分」
   ↓
[開始評分 →]
   ↓
FocusMapModal （← Slice L）
   ├── 拖 sliders 評每個習慣
   ├── 系統依四象限分組
   ├── 黃金象限預設勾選最多 3 個
   └── [啟用 N 個]
   ↓
Task.status='active' → 顯示在今日行程
Task.status='candidate' → 保留池等下次
Task.status='archived' → 跳過象限的 willpower 殺手丟掉
```
