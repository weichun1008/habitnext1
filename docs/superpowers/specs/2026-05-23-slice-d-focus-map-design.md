# Slice D — 焦點地圖（Focus Map）

**Date:** 2026-05-23
**Status:** Design draft, awaiting approval
**Scope:** habitnext1 web-app — 在「添加習慣」流程中加入一個 2D 散布視圖，把每個 domain 的官方習慣以 **impact × ability** 座標呈現，讓使用者一眼挑出「高影響 × 低門檻」的黃金行為。

---

## 1. 背景

目前使用者要把官方習慣加入計畫，會走 `TaskLibraryModal` → `DomainGrid`（9 大面向）→ `HabitListView`（該 domain 的習慣清單）。清單形式對「我已經知道想做什麼」的人有效，但對「我想開始改善某個面向，但不知道從哪裡下手」的新手沒有幫助 — 一字排開 10 幾條習慣，每條看起來都差不多重要、差不多難。

行為科學上，BJ Fogg 把行為選擇拆成「Impact（影響力）」和「Ability（執行容易度）」兩個正交軸，畫成 **Behavior Matrix**：右上角（高影響 × 高容易）就是「黃金行為」。James Clear 的「兩分鐘法則」也是同一個概念的單軸版本 — 先挑容易做的。

**PRODUCT.md 路線圖原本的 Slice D 是「focus map 配合 Slice C AI 雙軌 brainstorm」**。但 AI 模組牽涉 Gemini API key、prompt 工程、rate limit、語意審核，是一條額外的工程線。我們先做不接 AI 的版本 — 資料源直接從現有的 102 條 seed habits 抓，把 BJ Fogg 矩陣作為一個獨立、立即可用的視覺工具落地。AI 留到使用者證實這個 UI 有幫助後再接。

---

## 2. 目標

使用者打開「添加習慣」→ 點一個 domain → 在「**清單** ⇄ **焦點地圖**」之間切換，地圖模式下看到該 domain 所有 `isActive: true` 的官方習慣，依各自的 impact / ability 分數散布在 5×5 格子上；點任一個點打開既有的習慣詳情，後續加入計畫流程完全不變。

### Non-goals

- **不接 AI brainstorm**（原 Slice C）— 完全靠 seed 資料。AI 是後續獨立 slice。
- **不畫 anchor**（BJ Fogg ABC 的 A）— 這個 slice 只畫 behaviors。錨點配對沿用既有 Slice B 的 AnchorPicker，使用者選完習慣加入時觸發。
- **不做個人化打分**（「依你的型 / 過去完成率推算」）— 全使用者共用同一份 seed 分數，避免冷啟動。
- **不做跨 domain 比較**（「9 個 domain 全部放在同一張圖」）— 9×N 條點會過載且尺度錯亂。一次一個 domain。
- **不做拖拉自訂分數** — 純展示，不允許 user 改 impact/ability。
- **不做評論／投票機制** — 不是 social slice。
- **不做歷史追蹤**（「我上週進來看時這個習慣的位置」）— 分數是 seed 常數，靜態。
- **不改 TemplateExplorer**（探索計劃 / Slice J 詳情面板）— 這條是「自訂計畫」路線，與「跟模板」路線分開維護。

---

## 3. 與既有資料模型的合約

### 3.1 Schema diff（`web-app/prisma/schema.prisma`）

```diff
 model OfficialHabit {
   id          String   @id @default(cuid())
   name        String   @unique
   description String?
   category    String
   icon        String?
   difficulties Json
+  impact      Int      @default(3)  // 1-5; 5 = 對該 domain 影響最大
+  ability     Int      @default(3)  // 1-5; 5 = 最容易做（門檻最低）
   isActive    Boolean  @default(true)
   createdAt   DateTime @default(now())
   updatedAt   DateTime @updatedAt
 }
```

- **`Int` 而非 `Float`**：1-5 五級量表夠用，避免「3.7」這種假精度。
- **預設值 3（中庸）**：未評分的習慣會落在地圖正中央，不會偏右上或左下；提示 admin/作者「這條還沒評分」。
- **不加 CHECK 約束**：Prisma + Postgres 共用 schema 不方便加 check；用 seed script 的程式碼層 validation 守住 1–5 邊界（測試覆蓋）。
- **沒有 migration history**：依專案慣例 `prisma db push` 推上去。

### 3.2 Seed 補欄位

- 改 `web-app/prisma/seed/genesis-io-habits.json`：每筆 habit 加 `impact: 1-5`, `ability: 1-5`。
- 跑 seed 走 upsert（既有 `OfficialHabit` rows 用 `name` 唯一鍵更新），所以 prod DB 上的 102 條全部被改寫覆蓋。
- 評分流程在 Session 2 進行 — Session 1 只先訂出「rubric」（評分原則）放進 spec，避免 Session 2 動工時還要重新討論。

---

## 4. 評分 rubric（Session 2 套用）

> **設計用意**：rubric 要能讓任何後續評分者（含 AI）機械式打分，不依賴美感／直覺。

### 4.1 Impact（1–5）

問題：「**做這個習慣對該 domain 的長期健康指標貢獻多大？**」

| 分數 | 名稱 | 判斷依據 |
|------|------|---------|
| **5** | 旗艦行為 | 該 domain 的「first principle」— 不做這個其他都白搭。例：壓力與睡眠的「規律睡眠時間」、飲食的「不要吃加工食品」、運動的「每週累積運動 150 分鐘」。WHO/USDA/權威指南列為頂層建議。 |
| **4** | 主要槓桿 | 主流研究高度共識的有效干預。RCT meta-analysis 級別。例：飲食的「增加蔬菜攝取」、社交的「每週主動聯絡親密關係 3 次」。 |
| **3** | 有益補充 | 觀察性研究普遍支持，效益中等。多數人感受得到，但不是該 domain 的決定性因素。例：飲食的「正念進食」、心靈的「每日感恩日記」。 |
| **2** | 邊際加分 | 有部分證據但效益局限或個別差異大。例：環境的「定時通風」、認知的「玩數獨」。 |
| **1** | 錦上添花 | 證據薄弱／僅有少量小型研究。多半是「做了不會錯但別期待太多」的習慣。 |

**操作守則**：寫 seed 時先粗分（旗艦 vs 主要 vs 其他），再細調 1-2 / 4-5 的邊界。寧可保守給 3，不要全部往 5 推（地圖會塞滿右側、失去鑑別力）。

### 4.2 Ability（1–5）

問題：「**一個普通成年人第一次做這個習慣，需要付出的時間／金錢／心理門檻有多低？**」

| 分數 | 名稱 | 時間 | 裝備／金錢 | 心理阻力 |
|------|------|------|----------|---------|
| **5** | 微習慣 | <30 秒 | 0 | 幾乎沒有 | 例：起床後喝一杯水、深呼吸 3 次 |
| **4** | 輕量 | <5 分鐘 | 0 或極低 | 低 | 例：寫一句感恩日記、伸展 3 分鐘 |
| **3** | 一般 | 5–20 分鐘 | 廚房/家用品就有 | 普通 | 例：煮一頓有蔬菜的午餐、靜坐 10 分鐘 |
| **2** | 較難 | 20–60 分鐘 / 需排程 | 需要少量裝備或外出 | 中等 | 例：去健身房、煮複雜料理 |
| **1** | 高門檻 | >60 分鐘 / 需專業協助 / 涉及生活大改 | 顯著金錢或裝備 | 高 | 例：戒咖啡 30 天、找心理諮商師、執行嚴格 OMAD |

**操作守則**：
- 評「**第一次嘗試**」的門檻，不是「養成後」的門檻。寫日記到第 100 天很輕鬆，但對沒寫過的人是 4 不是 5。
- 不要對 `difficulties` 三檔（beginner/intermediate/challenge）做加權平均 — 我們評的是 habit 本身的「入門門檻」，beginner 配置就是評分的對標。
- Time-based 習慣（喝水、走路）的 ability 不該因為 daily target 大就壓低；要看「最小可行動作」的門檻。

### 4.3 自我檢核

評完 102 條後跑一次分布檢查（Session 2 末段，腳本式）：
- 每個 domain 至少要有 **1 個 impact ≥ 4** 的習慣（否則 domain 沒有重點）
- 每個 domain 至少要有 **1 個 ability ≥ 4** 的習慣（否則新手在這個 domain 全部卡住）
- 整體分數分布不要過度集中在 3,3（中央）— 預期常態分布的 5×5 應該有 60% 以上的習慣 ≠ (3,3)

---

## 5. 入口與資訊架構

### 5.1 進入點

沿用既有「添加習慣」flow，不新增 sidebar 入口：

```
[Dashboard 今日] →「+ 添加習慣」按鈕
   → TaskLibraryModal opens
      → DomainGrid (9 domains)
         → 點某個 domain
            → HabitListView ←─── NEW: 加一個 view-mode toggle
                                  ┌───────────────┐
                                  │ 清單 ｜ 焦點地圖 │
                                  └───────────────┘
```

**為什麼是 toggle 不是新 tab/page**：
- 焦點地圖只對單一 domain 有意義 — 必須先選 domain。放在 `HabitListView` 同層級最自然。
- 「清單 vs 地圖」是同一份資料的兩種視圖，UI patterns 上對應 list/board toggle，使用者直覺。
- 不在 sidebar 加項目 → 不衝擊 IA、不影響已習慣現有導航的使用者。
- 預設仍是清單 — 地圖是 progressive disclosure。

### 5.2 焦點地圖視覺

```
ability ↑ (容易)
   5 │ . . . . .
   4 │ . ◉. . .    ← 黃金象限（右上）highlight 淡綠底色
   3 │ . . ● . .
   2 │ . . . . .
   1 │ . . . . .
     └─────────→ impact (影響)
       1 2 3 4 5
```

- **5×5 格網**：用 recharts `ScatterChart` + `CartesianGrid`（已在 Slice I 安裝）。
- **點 = 一個官方習慣**：點直徑 ≥ 14px（觸控目標 ≥ 44px tap area，所以圍住點的隱形 hit area 用 44px），顏色用 domain 的代表色（`HabitCategory.color`，已 seed）。
- **同格多點時**：自動 jitter ±0.15 偏移避免完全重疊；超過 6 個點時改用稍小（10px）半透明色斑表示密集。
- **黃金象限**（impact ≥ 4 AND ability ≥ 4）淡綠底色 + 文字 label「黃金行為」。
- **軸標籤**：X 軸「影響 →」、Y 軸「容易 →」，刻度只標 1 / 3 / 5，避免擁擠。
- **小型輔助文字**（地圖下方）：「點選右上角（高影響 × 高容易）開始，可以最快看到效果」— 教育性 microcopy。

### 5.3 互動

- **tap 一個點** → 開啟既有的 `HabitDetailModal`（如果有；否則 fallback 到 `HabitListView` 的詳情面板邏輯）。
- **tap 詳情後的「加入計畫」** → 走既有流程（難度選擇 + AnchorPicker），地圖視圖在背景保留。
- **tap 視圖外（軸／空白）** → 不動作。
- **toggle 切回清單** → 視圖切換不重新 fetch；分數已在第一次載入時拿到。

### 5.4 Empty / Loading

- 切到地圖載入時 → skeleton 50ms 內顯示既有圓圈 spinner（沿用 `loading.js`）。
- 該 domain 沒有任何 active habit（理論上不會發生，9 個 domain 都有 seed）→ 顯示 fallback「此面向尚無官方習慣，請改用『自訂任務』新增」。

---

## 6. 技術細節

### 6.1 API

**不新增 endpoint**。沿用 `HabitListView` 現有的官方習慣 fetch — `OfficialHabit` row 透過 `/api/admin/official-habits`（或 `MainApp` 啟動時的 bootstrap fetch，取決於既有實作）下發到前端時，自動帶 `impact`/`ability` 欄位（schema 改後 Prisma 自動 select 所有欄位）。

> Session 2 task 0：先 grep 確認現有 fetch 路徑，必要時把 select 從顯式 list 改成 `select: { ...all_fields }` 或刪掉 select。

### 6.2 元件

新檔案：
- `web-app/src/components/explore/FocusMap.jsx` — 地圖視圖
- `web-app/src/components/explore/ViewModeToggle.jsx` — 清單/地圖切換 chip（也可 inline 在 `HabitListView`，看複雜度）

修改：
- `web-app/src/components/explore/HabitListView.jsx` — 加 `viewMode` 狀態（`'list' | 'map'`），條件 render 子元件。
- `web-app/src/components/explore/HabitListView.jsx` 不改原本的 list rendering — list 模式維持目前 props/邏輯。

### 6.3 套件

- **recharts 已安裝**（Slice I）。`<ScatterChart>` + `<XAxis>` + `<YAxis>` + `<CartesianGrid>` + `<Scatter>` + `<Tooltip>`。
- 為避免 First Load JS 重新膨脹：FocusMap 元件用 `dynamic(() => import('./FocusMap'), { ssr: false })` 動態載入（沿用 Slice I 對 StatsView 的同樣處理）。

### 6.4 測試

- **`__tests__/lib/`**：沒有純函式可抽。jitter 算法可獨立 unit test（給定 5 個點落同格，回傳 5 個不同座標）。如果決定簡化不抽，跳過。
- **`__tests__/components/FocusMap.test.jsx`**：
  - 渲染給定 N 個 habits → 出現 N 個 scatter dot。
  - tap dot → 觸發 onSelect callback。
  - 黃金象限有正確的 highlight class。
  - viewMode toggle 切換時不 unmount habit list（測 state 保留）。
- **既有 `__tests__/components/HabitListView.test.jsx`**（若有）→ 新增「toggle 出現、切換不影響清單資料」case。

### 6.5 Bundle budget

整個 slice 預算 **+30 kB First Load JS**（FocusMap 自身估 8–12 kB + jitter helper + 圖示），實際透過 dynamic import 攤到 chunk 不算 First Load。Session 2 末段跑 `npm run build` 對齊。

---

## 7. 風險與開放問題

1. **102 條手動評分耗時 + 主觀** → 在 Session 2 起手前先過一遍 rubric；可能會發現某 domain 全是低 impact，要再補 seed 或重新分配。**緩解**：先用既有 `genesis-io-habits.json` 跑一輪粗分（一條 30 秒），完成後再回頭微調邊界。
2. **同格大量重疊** → jitter 雖然解決位置碰撞但會稍微「污染」精確讀值。**緩解**：地圖標題寫明「分數為 1–5 整數，相近點為視覺呈現偏移」，必要時 tooltip 顯示真實分數。
3. **5×5 格網對行動裝置太擠** → 在 360px 寬螢幕下，每格約 50–60px，點 14px 應該還行。**緩解**：Session 3 跑實機測試後決定要不要橫向 scroll 或縮成 4×4。
4. **Toggle 隱藏既有清單** → 有些用戶可能找不到地圖。**緩解**：第一次進入該 domain 時，toggle 旁加一個一次性 dot badge 提示。（YAGNI 觀察期再做，先不上）
5. **impact/ability 是否會跟 user 的 typeKey/sleepTypeKey 互動？** → **不會**。這個 slice 保持「全使用者共用」。若未來要做個人化（雛菊型對社交互動 +1），可在 client 再加一層加分函數，不動 schema。
6. **資料源 ↔ 個性化緊張**：seed 是普世人群評分，但 BJ Fogg 原意是「對你個人來說容易」。**緩解**：spec 已在 non-goals 切割。這個 slice 提供的是「**入門參考座標**」，不是「個人推薦」。教育性 microcopy 要點到這層。

---

## 8. 驗收標準

- [ ] `OfficialHabit` schema 新增兩個 `Int` 欄位，預設 3，現有 102 條全部填好 1–5 的整數值。
- [ ] 進入「添加習慣 → 某 domain」可以看到「清單 / 焦點地圖」toggle。
- [ ] 切到地圖後，5×5 格網上有 N 個對應的 dots（N = 該 domain 的 active habit 數）。
- [ ] 黃金象限（≥4 × ≥4）有視覺高亮。
- [ ] tap dot → 跳出習慣詳情（與清單模式 tap 一致）→ 可加入計畫。
- [ ] 整體測試套件保持綠（97/0 fail，與目前 main 對齊）。
- [ ] First Load JS 增量在 30 kB 以內（dynamic import 後）。
- [ ] 每個 domain 通過自我檢核（≥1 高 impact、≥1 高 ability、整體不過度集中 3,3）。

---

## 9. Session 拆分

- **Session 1（本次）**：spec + plan + rubric。**Deliverable**：兩份 docs PR（不含任何 code）。
- **Session 2**：schema push + seed 評分 + sanity check。**Deliverable**：seed + schema PR，DB 已 push，分布腳本驗證通過。
- **Session 3**：UI（FocusMap + toggle 整合）+ tests + 整體 PR。**Deliverable**：feature merge 進 main。
