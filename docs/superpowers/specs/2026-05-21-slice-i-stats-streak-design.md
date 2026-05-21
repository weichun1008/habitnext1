# Slice I — 統計頁 + Streak 視覺化

**Date:** 2026-05-21
**Status:** Design approved, ready for implementation plan
**Scope:** habitnext1 web-app — 新增「統計」分頁，呈現使用者整體完成率、Streak 連續天數、9 大健康面向分布、週熱圖。

---

## 1. 背景

目前 dashboard 有「今日 / 計畫總覽 / 日曆 / 成就」四個 tab，但都聚焦在**當下**的 task 狀態：今天要做什麼、這個月份的 calendar dots、累積的徽章數。**沒有任何介面回答這些問題：**

- 「我已經連續做了幾天？」（James Clear 原子習慣的核心反饋迴路）
- 「我這 7 天 / 30 天的完成率是多少？」
- 「我在 9 大健康面向裡偏重哪幾塊？是不是某幾塊一直被忽略？」
- 「我哪一個 task 的 streak 最長？」

PRODUCT.md 路線圖的 F+ 技術債第 4 項就是「統計頁、Streak 視覺化」。Slice F 已經把 `TaskHistory` 升級成 per-date 結構，資料模型已具備所有需要的事實 — 缺的只是聚合層 + 視覺化。

---

## 2. 目標

**Slice I**：使用者從 sidebar 點「統計」→ 進入新的 stats view → 看到 4 個 widget（總 Streak、完成率、9 大面向分布、週熱圖）+ 1 個 task-level streak 排行清單。所有資料 server-side 聚合，client 端只負責 render。

### Non-goals

- 對比同儕 / 群組統計（隱私 + 沒有 social 模組）
- 時段分析（早上 vs 晚上完成率） — `TaskHistory` 沒記時間戳
- 匯出 CSV / PDF / 分享圖卡
- 預測式分析（「下週你大概會做到 X%」）
- Identity 演進圖（哪些身分被勾的次數最多） — 等 Slice E 資料累積夠再做
- 月 / 季 / 年的長期趨勢圖 — 先做 7/30 天視窗，避免空資料圖很醜
- 補簽 / 補打卡功能 — 是另一個產品決策，跟統計頁無關
- Streak 中斷的「補救」機制（Duolingo streak freeze）— 行為科學上有爭議，先不做

---

## 3. 與既有資料模型的合約

**完全 read-only**。不新增、不修改任何 schema 欄位。所有事實已存在於：

| 來源 | 用途 |
|---|---|
| `TaskHistory.completed: Boolean` | Streak / 完成率分子 |
| `TaskHistory.date: String` (YYYY-MM-DD) | 時間軸 X 軸；無時區歧義 |
| `Task.category: String` | 對應 HabitCategory.name → 9 大面向分布 |
| `Task.userId` | per-user filter |
| `HabitCategory.{name, color, icon, order}` | 圖表 label / 顏色 / 排序 |

**Task 三種 type 的「完成」定義（沿用既有 PUT /api/tasks/[id] 規則）**：
- `binary` — `completed: true`
- `quantitative` — `completed: true`（已由前端在 value ≥ dailyTarget 時設好）
- `checklist` — `completed: true`（同上，subtaskCompletions 達標時）

統計層**只看 `completed` 欄位**，不重新判斷 dailyTarget。這保證 stats 跟 dashboard 上的「打勾」狀態完全一致 — 如果未來「完成」定義改變，stats 自動跟上。

---

## 4. 統計定義（v1 收斂後的清單）

### 4.1 Overall Streak（總連續天數）

**定義**：從今天往前回推，**至少有一個 task 被完成**的連續天數。

- 今天還沒完成任何 task → 不算斷，顯示昨天為止的 streak（grace until 23:59）
- 中斷規則：某天 `TaskHistory` 沒有任何 `completed: true` 的 row → 計數歸 0
- 沒有任何活動 task 的「真空日」也算斷（YAGNI：不做 pause 概念）

**為什麼這樣定**：原子習慣「never miss twice」原則的最低門檻 — 一天做一個 task 就算「show up」。比「所有 task 都打勾才算」寬鬆，避免使用者一天請假就清零的挫敗。

### 4.2 完成率（7 / 30 天視窗）

**定義**：分子 = 視窗內 `TaskHistory.completed = true` 的 row 數；分母 = 視窗內活動 task 的 expected occurrence 數。

**MVP 簡化**：分母用「視窗內有任何 history row 的 task × 視窗天數」近似，不去算 frequency 為 weekly/monthly 的 task 真正應出現次數。**Spec 明文承認這是近似**，等使用者跑 6 個月後再決定要不要精算。

兩個數字並列顯示：「最近 7 天 78%」「最近 30 天 65%」。

### 4.3 9 大面向分布（Bar chart）

**定義**：最近 30 天內，每個 HabitCategory 的 `TaskHistory.completed = true` row 數。

- X 軸：9 個 domain（依 HabitCategory.order 排）
- Y 軸：完成次數
- Bar 顏色：HabitCategory.color
- **只顯示數字，不加「最強 / 待加強」評判性 label**（使用者自行解讀，避免負擔感）

### 4.4 週熱圖（GitHub 草地）

**定義**：最近 12 週，每天的完成 task 數，渲染成 12×7 格子。

- 顏色梯度：0 / 1 / 2-3 / 4+（4 階）
- Hover 顯示日期 + 當天完成數
- 點某格不導頁（v2 再做「點開看那天的 detail」）

### 4.5 Per-task Streak Top 5

**定義**：列出使用者目前所有活動 task 的「current streak」，排序取前 5。

- 每行顯示 task title、identity（如有）、目前連續天數、最長歷史天數
- Current streak 算法跟 4.1 同邏輯，但侷限於該 task

---

## 5. 架構

### 5.1 新檔

```
web-app/src/lib/stats.js              # 純函數，吃 TaskHistory[] 吐統計物件，無 Prisma 依賴
web-app/src/lib/__tests__/stats.test.js  # Jest 單元測試（沿用既有 lib 測試慣例）
web-app/src/app/api/stats/route.js    # GET handler，回傳聚合 bundle
web-app/src/components/StatsView.jsx  # 整頁 component
web-app/src/components/stats/         # 4 個 widget sub-component
  ├── StreakHero.jsx
  ├── CompletionRateCards.jsx
  ├── DomainBreakdownChart.jsx
  ├── WeeklyHeatmap.jsx
  └── TaskStreakList.jsx
```

### 5.2 修改

```
web-app/src/components/MainApp.jsx    # 新增 currentView='stats' 按鈕 + 條件 render block
                                        位置：日曆 (dashboard_detail) 跟 成就 (badges) 之間
web-app/package.json                  # 新增 dependency: recharts
```

### 5.3 API 合約

**GET `/api/stats?userId=<id>`**

```json
{
  "overall": {
    "currentStreak": 12,
    "longestStreak": 28,
    "todayCompleted": false
  },
  "completionRate": {
    "last7": 0.78,
    "last30": 0.65
  },
  "domainBreakdown": [
    { "name": "基因與腸道", "color": "#...", "icon": "Dna", "order": 1, "count": 23 },
    ...
  ],
  "heatmap": [
    { "date": "2026-02-26", "count": 3 },
    ...   // 84 天，即使 0 也補 row 以利前端 grid render
  ],
  "topTaskStreaks": [
    { "taskId": "...", "title": "每天喝足 2500cc 水", "identity": "我是個照顧自己身體的人",
      "currentStreak": 18, "longestStreak": 18 },
    ...   // 最多 5 筆
  ]
}
```

單一 endpoint、單一 round trip。所有聚合在 server-side 用 Prisma 一次拉所有 history（過去 12 週 + 該使用者所有 active task）後在 JS 內 reduce。

### 5.4 Charting 函式庫選擇

**選 recharts**。理由：
- React-native、宣告式、跟既有 Tailwind + Lucide 風格相容
- Bundle ~96kb gzip，可接受（既有 next + react + prisma 已是主體積）
- Bar / Line / Heatmap-as-Bar 都可
- 替代方案 Chart.js（imperative，要 ref 操作 canvas，跟 React 慣例不合）已排除

**Heatmap 不用 recharts**，自己用 CSS grid + Tailwind 渲 12×7 格子（更輕、可控、無依賴）。

---

## 6. UI 設計

### 6.1 Sidebar 入口

```
[ 探索計畫 ]   ← 既有 CTA
[ 探索習慣 ]
[ 建立習慣 ]
─────────────
今日           ← currentView='daily'
計畫總覽       ← currentView='manage'
日曆           ← currentView='dashboard_detail'
統計           ← ★ 新增 currentView='stats'   icon: BarChart3
成就           ← currentView='badges'
```

### 6.2 統計頁 layout（mobile-first，桌面雙欄）

```
┌──────────────────────────────────┐
│  StreakHero                      │  ← 大字 current streak + 小字 longest
│  「連續 12 天 — 你的最長紀錄 28 天」 │
├──────────────────────────────────┤
│  最近 7 天 78%   最近 30 天 65%   │  ← CompletionRateCards (兩張並排)
├──────────────────────────────────┤
│  9 大面向分布（最近 30 天）       │
│  [Bar chart, 9 bars, 數字 only]   │  ← DomainBreakdownChart
├──────────────────────────────────┤
│  最近 12 週                       │
│  [Heatmap 12×7 grid]              │  ← WeeklyHeatmap
├──────────────────────────────────┤
│  你的金牌 Habit                   │
│  [Top 5 task streak list]         │  ← TaskStreakList
└──────────────────────────────────┘
```

### 6.3 空狀態

- 使用者**完全沒打過卡**：整頁顯示「打完第一個卡再回來看」+ 連結回今日
- 使用者**只有 1-3 天資料**：照常顯示，圖表會稀疏，不額外處理
- 不畫假數據 / placeholder（行為科學原則：誠實反饋）

---

## 7. Edge Cases

| 情境 | 處理 |
|---|---|
| 跨時區 | 使用 client local date 算「今天」；DB `date` 已是 String YYYY-MM-DD，server 信任 client 傳的 today |
| Daylight saving | YYYY-MM-DD 不受 DST 影響，免處理 |
| 使用者剛換手機改時區 | 一次性「streak 看起來少一天」可接受，不做 reconcile |
| Task 被刪除但 history 還在 | API join task 時用 LEFT JOIN，孤兒 history 仍計入 overall stats 但不出現在 task-level top 5 |
| Active task 全暫停 | overall streak 仍算（基於 history 而非 task active 狀態）|
| Frequency = weekly 的 task | 完成率分母用近似（見 4.2），承認誤差 |
| 12 週前剛註冊 | Heatmap 註冊前的格子顯示為 0；不畫「未活躍」狀態 |

---

## 8. 測試策略

### 8.1 Unit tests（`src/lib/__tests__/stats.test.js`）

純函數 `computeStats(historyRows, tasks, categories, today)` 必測 case：

1. 空輸入 → 全 0 / 空陣列，不 throw
2. 連續 5 天每天完成 → currentStreak = 5
3. 連續 5 天、今天空 → currentStreak = 5（grace）
4. 連續 5 天、昨天空、今天滿 → currentStreak = 1（昨天斷了）
5. 7 天視窗，5 個 task × 7 天 = 35 expected，21 completed → completionRate.last7 = 0.6
6. Per-task streak 排序 — 平手時用 longestStreak 次序
7. Domain breakdown 排序跟著 HabitCategory.order

### 8.2 API integration test

`src/__tests__/api/stats.test.js`，mock Prisma 回固定 history，斷言 endpoint shape 跟 lib 結果一致。

### 8.3 UI

- `StreakHero` snapshot：streak=0 / streak=1 / streak=100 三種
- `WeeklyHeatmap`：12×7 = 84 格子數對
- 其餘 widget 用 RTL render + 斷言主要文字存在即可，不做完整視覺回歸

### 8.4 不測

- 真實圖表畫面（recharts 內部）
- 跨時區精確邊界（acceptable approximation）

---

## 9. 不做的事 — 明文列出避免 scope creep

- ❌ 月 / 季 / 年趨勢線
- ❌ Identity 演進統計（等 Slice E 資料夠厚）
- ❌ 時段熱圖
- ❌ 任何 social / leaderboard
- ❌ Streak freeze / 補打卡
- ❌ Export / share 圖卡
- ❌ 推薦行動（「你應該多做 X」）
- ❌ Recharts 以外的 chart 客製動畫

---

## 10. Acceptance Criteria

- [ ] Sidebar 多出「統計」按鈕，點擊切到統計頁
- [ ] 5 個 widget 都能在有資料時正確 render
- [ ] 完全沒資料的新使用者看到空狀態而非 broken layout
- [ ] `src/lib/stats.js` 純函數，無 Prisma import，可獨立單測
- [ ] `npm test` 全綠，新增測試 ≥ 7 個 case 涵蓋 8.1 清單
- [ ] `GET /api/stats?userId=<id>` 回傳合約 §5.3 的 shape
- [ ] 既有「今日 / 計畫總覽 / 日曆 / 成就」四個 tab 不受影響（regression check）
- [ ] Heatmap、Bar chart 在 375px 寬度 mobile 不破版
- [ ] Bundle delta < 150kb gzip（recharts ≈ 96kb + 自家 code）

---

## 11. 開放問題 — 已確認（2026-05-21）

1. **Streak grace**：採用「今天空白不斷」（4.1 提案）✅
2. **Top task streak**：5 筆 ✅
3. **完成率分母**：v1 用近似（4.2 提案）✅
4. **Recharts**：採用 ✅
5. **面向 label**：只顯示數字，不加「最強 / 待加強」評判 ✅
