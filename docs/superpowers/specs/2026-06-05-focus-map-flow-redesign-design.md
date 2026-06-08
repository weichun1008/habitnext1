# 焦點地圖流程重設計 — 設計文件

- 日期：2026-06-05
- 範圍：客戶端「焦點地圖（Focus Map）」評分與加入流程（Slice L 後續優化）
- 互動原型：`.superpowers/brainstorm/.../focusmap-flow-v6.html`（已與使用者逐版確認）

## 背景與問題

目前 `FocusMapModal` 把所有候選習慣放在同一頁，每列同時有「影響力 + 執行度」兩條 `<input type="range">` 拉桿與一個勾選框，並即時依象限分組。使用者回饋三個痛點：

1. **拉桿難按**：細拉桿在手機上不好操作。
2. **出現 BJ Fogg 字樣**：象限說明、勾選警語都寫「Fogg：…」，對一般使用者是黑話。
3. **一次面對全部維度太雜**：兩個維度 × N 個習慣同時呈現，認知負擔高。

此外原流程「跳過」象限在送出時會**直接刪除**候選任務（需 confirm），偏破壞性。

## 目標

把單頁多拉桿改成**引導式三階段流程**，並讓「焦點地圖」本身成為加入習慣的決策畫面：

1. **逐一評影響力** → 2. **逐一評執行度** → 3. **看焦點地圖 + 選擇加入**，加入時可設定養成期間。
2. 移除所有 BJ Fogg / 「Fogg」字樣，象限說明改白話。
3. 拉桿改成「大拖鈕、可拖可點軌道」，且**選了不自動跳下一步**，可改、可回上一步。
4. 影響力 / 執行度用**對比強的兩種顏色**區分（紫 / 琥珀橘）。
5. 焦點地圖頂部保留 **2×2 矩陣**，點可顯示習慣名稱（桌機 hover、手機點選）。
6. 「跳過」象限改為**建議**而非強制刪除 —— 仍可手動加入。

非目標（YAGNI）：不做拖曳排序、不做自訂象限門檻、不做多人協作、不改候選池進入邏輯（仍由 RecommendationPanel／+ 加入候選產生 `status='candidate'` 任務）。

## 流程設計

`FocusMapModal` 內部用 `phase` 狀態機驅動：`'impact' → 'ability' → 'map'`，外加結尾的「養成期間」bottom sheet。

### 階段一：影響力（紫色主題）

- 一次只顯示**一個候選習慣**。
- 大標問句：「這個習慣對你想要的改變，影響有多大？」副說明：「想它跟你的目標關聯多強，先別管做不做得到。」
- 控制元件：單一水平刻度（1–5），大拖鈕（≥36px 觸控目標），點軌道任一點也能設值。
- 即時顯示目前分數（大字）＋語意標籤（1 沒什麼感覺 … 5 非常關鍵）。
- 進度條依「已完成 / (候選數×2)」推進；顯示 `第一步 · 影響力　idx/total`。
- 底部：`‹ 上一個`（非第一題才出現）＋ `下一個 ›`。**選值不自動前進**，按「下一個」才換題。
- 主題色：滑桿、進度條、大分數、習慣膠囊、下一步鈕皆為紫色漸層。

### 階段二：執行度（琥珀橘主題）

- 與階段一相同模式，問句改：「對你來說，這個習慣有多容易做到？」副說明：「純評估難易，影響大不大這步先不管。」
- 標籤：1 很難做到 … 5 非常容易。
- 主題色改為琥珀橘漸層（與影響力的紫色色相拉開、便於辨識「現在在第幾步」）。
- 最後一題的下一步鈕文字為「看焦點地圖 ›」。

### 階段三：焦點地圖（矩陣 + 加入）

- **頂部 2×2 矩陣**：Y 軸＝影響力（上高下低），X 軸＝執行度（右易左難）。每個習慣是一個帶**編號**的彩色圓點，落在對應座標；座標重疊時水平微錯位避免完全重疊。點的顏色依象限。
  - 桌機 hover、手機點一下圓點 → 顯示「編號 + 習慣名稱」浮層；再點收合。
  - 矩陣下方「圖例」：編號 ↔ 習慣名稱（顏色＝象限色）。
- **四象限清單**：每區一張卡，含 Lucide 圖示、白話名稱、一句說明、該區習慣列表。
  - 每個習慣列右側為加入切換鈕（「＋ 加入」/「✓ 已加入」）。
  - `golden`（值得優先做）預設已勾選：依**使用者剛評定**的影響力×執行度計算（把 ratings 餵給 `recommendDefaults`，黃金象限取 impact+ability 前 3），而非載入時的 OfficialHabit 預設。
  - `skip`（建議先跳過）預設**不勾**、樣式較淡，但鈕為「＋ 仍要加入」**可點**（移除原強制刪除）。
- 底部 CTA：`加入 N 個習慣 ›`（N＝目前已勾選數）。按下 → 開啟「養成期間」sheet。

### 結尾：養成期間 bottom sheet

- 標題「想養成多久？」四選項（2×2）：
  - `21 天`（起步嘗試）
  - `66 天`（養成自動化）— **預設選取、標「推薦」**
  - `90 天`（鞏固成形）
  - `不設限`（沒有終止日，持續追蹤）
- 下方一個低調連結「為什麼建議 66 天？查看背後科學 ›」，點開才展開精簡說明（漸進揭露，**與既有「習慣背後科學 / HabitInsight」同一套設計語彙**），內含「查看完整來源與說明 ›」。
  - 文案依據：習慣養成至「自動化」中位數約 66 天（個體與難度差異大，約 18–254 天）。**不在主畫面直接寫研究全文**，只放連結。
- 「確認加入」→ 呼叫 batch-rate（帶 `targetDays`），關閉 Modal，`onActivated(count)` 讓父層刷新。

## 象限定義（取代含 Fogg 的版本）

| key | 名稱 | Lucide 圖示 | 點/主色 | 說明（白話、無 Fogg） |
|---|---|---|---|---|
| `golden` | 值得優先做 | `Star` | `#ea580c` | 高影響又容易做到 — 最划算，建議先加入。 |
| `big_fish` | 值得挑戰 | `Mountain` | `#7c3aed` | 影響大但目前不易做到 — 可先從更簡單的版本開始，別逼太緊。 |
| `background` | 順手加碼 | `Sprout` | `#0891b2` | 容易做但影響有限 — 行有餘力再加。 |
| `skip` | 建議先跳過 | `SkipForward` | `#94a3b8` | 影響有限又不易做 — 建議先擱著；但你仍可自行加入。 |

象限判定維持不變：`quadrantOf(impact, ability)`，高＝≥4、低＝≤3。

### 配色

- 影響力（紫）：漸層 `#a78bfa → #7c3aed`、solid `#8b5cf6`、文字 `#7c3aed`、淺底 `#f5f3ff`。
- 執行度（琥珀橘）：漸層 `#fbbf24 → #f97316`、solid `#f59e0b`、文字 `#ea580c`、淺底 `#fff7ed`。
- 圖示一律 Lucide（不用 emoji）；步驟圖示：影響力 `Target`、執行度 `Dumbbell`。

## 資料與 API 變更

### 1. Schema：`Task.targetDays Int?`（新增，nullable）

- 養成期間天數；`null` = 不設限。新增為可空欄位 → 對共用 DB 是安全的 additive migration。
- 主分支維持 schema superset，避免影響其他 session 部署。

### 2. `PATCH /api/tasks/batch-rate`

- payload 每筆新增可選 `targetDays`：`{ taskId, userImpact, userAbility, action, targetDays? }`。
- `action === 'activate'` 時一併寫入 `targetDays`（其餘 action 不動 targetDays）。
- **行為變更**：未勾選的非 skip 與 skip 習慣都記為 `keep_candidate`（保留在候選池），**不再自動刪除**。
  - 仍寫入 `userImpact/userAbility/ratedAt`，所以下次回來矩陣位置會記得。
  - 移除原本「跳過象限一鍵刪除 + confirm」。（如未來要清理候選池，另開「移除」功能，不在本次範圍。）

### 3. `GET /api/tasks/candidates`

- 不變（已 join officialHabit 的 impact/ability/icon/name 供 seed）。

## 元件結構

重構 `FocusMapModal` 為階段式容器，抽出聚焦、可獨立測試的子元件：

- `FocusMapModal.jsx`：狀態機（phase/idx/ratings/added/duration）、資料載入、送出。
- `focusMap/RatingStep.jsx`（新）：單一習慣、單一維度的評分畫面（吃主題色 props：問句、標籤表、顏色）。取代每列雙拉桿。
- `focusMap/FocusMatrix.jsx`（新，由 `MiniMap` 演進）：2×2 矩陣 + 編號彩點 + hover/tap 浮層 + 圖例。
- `focusMap/QuadrantSection.jsx`（改）：移除列內拉桿，改為「習慣 + 加入切換」清單；套用新象限文案與 Lucide 圖示。
- `focusMap/DurationSheet.jsx`（新）：養成期間選擇 + 背後科學漸進揭露連結。
- `lib/focusMap.js`（改）：更新 `QUADRANTS`（去 Fogg/emoji、加 `iconKey`、`color`、新 `desc`）；新增 `DURATION_OPTIONS`（含推薦旗標）與 `buildBatchPayload(candidates, ratings, addedSet, targetDays)` 純函式。保留 `quadrantOf / recommendDefaults / sliderSeedFor`。
- `HabitRatingRow.jsx`：用途消失（雙拉桿列），刪除或併入 QuadrantSection 的加入列。其中 `WARNING_BY_QUADRANT` 的 Fogg 警語一併移除。

## Fogg 字樣清除清單（驗收：`grep -ri fogg src/` 無使用者可見字串）

- `src/lib/focusMap.js`：`QUADRANTS.big_fish.advice` / `skip.advice` 的「Fogg：…」→ 移除/改寫。
- `src/components/focusMap/HabitRatingRow.jsx`：`WARNING_BY_QUADRANT` 的 Fogg 警語（列移除後即不存在）。
- `src/components/FocusMapModal.jsx`：副標「依 Fogg 框架挑出黃金行為」→ 改為白話（例：「依影響力與執行度，挑出最值得先做的習慣」）。
- 程式碼註解中的「BJ Fogg ABC anchor」等非使用者可見字串可保留（不在驗收範圍）。

## 測試策略

- **純函式（TDD）**：`buildBatchPayload`（勾選→activate＋targetDays、未勾→keep_candidate、null targetDays）、`QUADRANTS` 形狀與無 Fogg、`DURATION_OPTIONS` 推薦旗標。沿用既有 `quadrantOf` 測試。
- **元件（RTL）**：
  - RatingStep：拖/設值不前進、按「下一個」才換題、`上一個` 可回。
  - 階段切換：影響力跑完接執行度、再到 map。
  - FocusMatrix：點數正確、hover/tap 顯示名稱。
  - QuadrantSection：golden 預設已加入、skip 可「仍要加入」。
  - DurationSheet：預設 66 天、選取切換、背後科學連結展開。
- **行動裝置對等性**：同一個 responsive Modal（手機 bottom sheet、桌機置中）；確認觸控拖鈕大小、tap 浮層、sheet 在小螢幕可捲動。

## 風險與相依

- 共用 Neon DB + 多 session：新增欄位用 nullable additive migration；主分支保持 schema superset；push 前先 `git fetch/pull`。
- 「不再刪除候選」會讓候選池可能累積 —— 可接受；保留分數讓使用者隨時回來重評。
- Lucide 圖示需確認名稱存在（`Star/Mountain/Sprout/SkipForward/Target/Dumbbell`）。
