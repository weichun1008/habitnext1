# 設計：科學證據力指標（Evidence Strength Indicator）

- **日期**：2026-06-01
- **狀態**：設計定案，待寫實作計畫
- **相關**：Slice N 科學簡報（`HabitInsight`）— `docs/superpowers/specs/2026-05-26-slice-N-scientific-brief-design.md`

## 1. 目標

為每一則 `HabitInsight` 科學簡報加上「證據力」指標，達成三件事：

1. **一眼看懂**：客戶不必讀完內文，就能看出這則佐證的科學有多硬（強 / 中 / 初步）。
2. **透明化評分標準**：點開能看到我們「怎麼算出這個等級」的逐項拆解。
3. **可持續優化**：評分由一套可調的評分表（rubric）推算，未來調整權重或門檻不需改資料。

## 2. 指標的語義（關鍵框架）

指標衡量的是「**證據有多硬 / 多可信**」，**不是「這個習慣有多好」**。

一個嚴謹的 RCT 即使結論是「效果有限」（例如 168 斷食），證據力依然是「強」——硬證據告訴我們「效果有限」這件事本身就是可信的。這個誠實的區分是本指標的核心價值。

## 3. 評分表（Rubric v1）

4 個面向，各自給分，加總後對應等級。各等級的分數、配分、門檻皆集中於一支 lib，未來可調。

| 面向 (key) | 高分 | 中分 | 低分 |
|------|------|------|------|
| **研究類型** `studyType` | 統合分析／系統綜述 `3` | RCT 介入試驗 `2` | 觀察性研究 `1`／動物·機制·專家意見 `0` |
| **對象與規模** `scale` | 大型人體 `2` | 小型人體 `1` | 非人體（動物／細胞） `0` |
| **因果強度** `causality` | 介入證明因果 `2` | 強相關＋合理機制 `1` | 僅相關／機制推論 `0` |
| **重複驗證** `replication` | 多研究一致 `2` | 部分支持 `1` | 單一研究／結果混合 `0` |

**加總 0–9 → 等級：**

| 等級 (tier) | 分數 | 標籤 | 顏色 |
|------|------|------|------|
| `strong` | 7–9 | 強 | 綠 emerald |
| `moderate` | 4–6 | 中 | 琥珀 amber |
| `preliminary` | 0–3 | 初步 | 灰 slate |

**已知重疊**：`studyType` 與 `causality` 在 RCT 上會互相加強——v1 視為刻意加權，未來可調。

### 現有 6 則的評分（驗證 + backfill 用）

| 簡報 | studyType | scale | causality | replication | 總 | 等級 |
|------|:-:|:-:|:-:|:-:|:-:|:-:|
| 糖／細胞老化（橫斷 n=342 相關） | 1 | 2 | 0 | 0 | 3 | 初步 |
| 過量果糖肝損（機制＋動物） | 0 | 0 | 0 | 1 | 1 | 初步 |
| 進食順序（RCT n=15） | 2 | 1 | 2 | 1 | 6 | 中 |
| 細嚼慢嚥（RCT n=21，對實際攝取無效） | 2 | 1 | 1 | 0 | 4 | 中 |
| 168 斷食（RCT n=116，效果有限） | 2 | 2 | 2 | 2 | 8 | 強 |
| Omega-3（AHA 彙整 RCT） | 3 | 2 | 2 | 2 | 9 | 強 |

## 4. 互動與顯示（UX）

採用 **訊號格 badge（手機訊號格風格）+ 點擊就地展開評分面板**。

- **平常**：卡片標題列只顯示一個訊號格 badge（▮▮▯ + 「證據力 中」），顏色對應等級。一眼看懂。
- **點 badge**：就地展開「證據力評分」面板——逐項顯示 4 個面向各拿幾格、各等級標籤、總分、等級，以及「了解我們怎麼評分 →」連結。
- **獨立於卡片既有展開**：點 badge 觸發評分面板，與「點標題列展開摘要／來源」是兩個獨立的開合狀態（badge 的 onClick 需 `stopPropagation`，避免連帶觸發卡片展開）。
- **未評分（`evidence` 為空）**：不顯示 badge，卡片行為與現況完全相同（向下相容）。
- **微互動**：badge 在桌機 hover 時有輕微回饋（符合品牌「CTA 不靜止」原則）。
- **無 emoji**：所有圖示走 Lucide（評分連結用箭頭、來源用書本圖示等）。

「了解我們怎麼評分」開啟一份共用說明（呈現 §3 的 4 面向與門檻）——這就是公開的評分標準。

## 5. 資料模型

`HabitInsight` 新增一個 **nullable** 欄位：

```prisma
evidence Json? // { studyType, scale, causality, replication }，各為整數等級；null = 未評分（不顯示 badge）
```

**只存原始 4 個面向等級**，不存算出來的總分／tier。總分與 tier 一律由共用 lib 即時推算。好處：未來調整配分／門檻時，只需改 lib 並重新部署、由既有原始值重算，**無需資料遷移**。這正是「持續優化」的關鍵設計。

面板上每個面向顯示的是該等級的**通用標籤**（如「研究類型 → RCT 介入試驗」）；精確數字（如 n=15）已存在於 `summary` / `detail`，不額外存每則自訂文字（YAGNI）。

## 6. 元件分解（單一職責、可獨立測試）

1. **`lib/evidenceStrength.js`**（純函式、無相依）
   - `DIMENSIONS`：4 面向設定（key、label、levels: `[{value, label, points}]`）
   - `scoreEvidence(evidence)` → `{ total, tier, tierLabel }`；輸入 null/不完整時回傳 null（代表不顯示）
   - `TIER_META`：各 tier 的 `{ label, colorTokens }`
   - `THRESHOLDS`：門檻常數（可優化）
   - 單元測試覆蓋：門檻邊界、null、全 0、全滿、tier 對應
2. **`components/insights/EvidenceBadge.jsx`**
   - props：`evidence`（或 `tier`）、`onClick`
   - 渲染 3 格訊號格（依 tier 填滿格數）+ 標籤；桌機 hover 微互動
   - 無 evidence → 回傳 null
3. **`components/insights/EvidenceScorePanel.jsx`**
   - props：`evidence`
   - 渲染 4 面向列（mini 訊號格）+ 總分 + tier + 「了解我們怎麼評分」連結（開啟 §7 說明）
4. **`components/insights/EvidenceRubricModal.jsx`**
   - 一個輕量 modal（點「了解我們怎麼評分」開啟、點遮罩或 Esc 關閉）
   - 顯示 §3 評分表（4 面向、各等級、門檻）——公開的評分標準
   - 評分表內容由 `lib/evidenceStrength.js` 的 `DIMENSIONS` / `THRESHOLDS` 動態產生，與實際算分同源（不寫死兩份）
5. **整合 `components/insights/HabitInsightSection.jsx` 的 `InsightCard`**
   - Layer 1 標題列加入 `EvidenceBadge`
   - 新增獨立 state `scoreOpen`；點 badge 切換 `EvidenceScorePanel`（`stopPropagation`）
6. **整合 admin `app/admin/dashboard/habits/components/HabitInsightFormModal.jsx`**
   - 加入 4 個下拉（每面向一個，選等級）
   - 即時預覽算出的 tier（呼叫同一支 lib）
   - 存檔時把 `evidence` 一併送出

## 7. API

- 使用者端 `GET /api/habits/[habitId]/insights` 以 `findMany` 不帶 select 回傳全欄位 → 新欄位 `evidence` 自動帶出，**無需改 API**。
- Admin 建立／更新路由需把 `evidence` 納入寫入欄位。
- tier 一律由前端／呼叫端透過 `lib/evidenceStrength.js` 即時推算（lib 為純 JS，前後端皆可 import）。

## 8. 種子與 backfill

- `prisma/seed/habit-insights.json` 每則新增 `evidence` 物件（§3 表格的值）。
- `scripts/seed-habit-insights.js` 把 `evidence` 納入 upsert 的 data。
- 跑種子即完成現有 6 則的 backfill。

## 9. 測試策略

- **單元**：`scoreEvidence` 門檻與 tier 對應；null／全 0／全滿邊界。
- **元件**：`EvidenceBadge` 依 tier 渲染正確格數與標籤；`EvidenceScorePanel` 渲染 4 列 + 總分；點 badge 不會連帶展開卡片（state 獨立）。
- **回歸**：未評分的 insight 不顯示 badge、卡片行為不變。

## 10. 非目標（YAGNI）

- AI 自動推算面向等級（未來）
- 每面向自訂說明文字
- 超過 3 個等級
- 使用者端自訂權重

## 11. 未來優化掛勾

- 配分與門檻集中於 `lib/evidenceStrength.js`；調整後重新部署、由既有原始 `evidence` 值重算，無需資料遷移。
- 之後可加入 AI 草稿時順帶建議各面向等級，admin 再校。
