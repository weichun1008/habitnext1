# Slice J — 計劃詳細介紹頁

**Date:** 2026-05-21
**Status:** Design approved, ready for implementation plan
**Scope:** habitnext1 web-app — TemplateExplorer 點 template card → 顯示完整介紹（描述、Phase 分段、任務清單預覽），讓使用者在按「加入計畫」前可以了解計劃內容。

---

## 1. 背景

PR B（feat/template-explorer-sections）把 8 個 typed templates 分成花朵 / 睡眠 / 其他三個 section，但每張 template card 只露：

- 名稱 + （若配對）為你推薦 badge
- 專家頭銜 + 名字
- 1-2 行 description（截斷）
- "X 人已加入" + "Y 個任務"
- 「加入計畫」按鈕

使用者實際反饋：「**計劃要有獨立的介紹頁面 讓大家知道要不要加入**」。意思是：description 太短、看不出計劃實際包含什麼、不知道 14 天會做什麼事、無法做出明智的「加入 / 不加入」決策。

Template `tasks` JSON 已經帶完整資訊（`phases[].tasks[]`），只是 UI 沒露。

---

## 2. 目標

**Slice J**：使用者在 TemplateExplorer 點 template card 任一處（除「加入計畫」按鈕本身）→ 滑出 / 覆蓋一個 detail view → 看到：

- 完整 description（不截斷）
- Phase 分段：每 Phase 名稱、天數、任務數
- 每 Phase 內每個任務的標題（簡明列表）
- 統計：總任務數、總天數
- 底部固定「加入計畫」按鈕（沿用既有 date picker flow）

點 X 或返回鍵回到 explorer list。

### Non-goals

- 完整任務 detail（subtasks、recurrence、time slot）— 加入後在 dashboard 看
- 評論 / 評分系統 — 跟 social feature 一起做、不在此 slice
- 分享 / bookmark 功能 — 需要獨立 route，留到 Slice K（如果有的話）
- Edit / 自訂 template — 是專家後台功能、跟使用者端介紹頁無關
- 多語系
- 加入後的「進度預覽」（顯示「未來 X 天會做什麼」）— 加入後 dashboard 已有

---

## 3. 與既有資料模型的合約

**完全 read-only、不新增 endpoint**。

`/api/templates/public` 已經回傳：

```ts
{
  id, name, description, category, isPublic,
  tasks: {                          // ★ 已有的 JSON，detail view 全靠這個
    version: '2.0',
    phases: [
      { id, name, days, tasks: [{ title, details, type, category, defaultCue, defaultIdentity, ... }] }
    ]
  },
  expert: { id, name, title },
  _count: { assignments, tasks }
}
```

Detail view 直接用這份資料、不用 fetch 額外。

---

## 4. UI 設計

### 4.1 進入方式

TemplateExplorer 內 template card 整張變成可點：
- 點卡片任何位置（除「加入計畫」按鈕本身）→ 開 detail view
- 「加入計畫」按鈕仍維持直接觸發 date picker（**不改既有「快速加入」捷徑**）

### 4.2 Detail view layout

「覆蓋式」設計：在 TemplateExplorer modal 內部 push 一個全螢幕 panel，從右側 slide 進來；按 X 或 ← 返回鍵 slide 出。

```
┌────────────────────────────────────────────┐
│  ←    雛菊型小課程        ✨為你推薦  X    │  ← 頂部：返回 + 標題 + badge + close
├────────────────────────────────────────────┤
│  [emerald pill] 專家頭銜 by 專家名稱       │
│                                            │
│  📝 完整 description                       │
│  (paragraph，不截斷)                       │
│                                            │
│  ──────                                    │
│  📊 4 階段 · 共 14 天 · 28 個任務           │  ← 統計總覽
│  👥 12 人已加入                            │
│                                            │
│  ──── L1 入門 — 微習慣起步（7 天）────      │
│   1. 早上喝兩大口水（200cc）               │
│   2. 上完廁所後伸展 10 分鐘                 │
│   3. 第一餐吃完後吃保健品                   │
│   ...                                      │
│                                            │
│  ──── L2 進階 — 加入第二個錨點（4 天）──── │
│   1. ...                                   │
│                                            │
│  ──── L3 ...                               │
│   ...                                      │
│                                            │
├────────────────────────────────────────────┤
│  [ 加入計畫 ]   ← sticky bottom，全寬 button │
└────────────────────────────────────────────┘
```

### 4.3 詳細元素

**Header bar**:
- 左：ArrowLeft icon（返回 explorer）
- 中：template name
- 右：X icon（直接關閉整個 explorer 回 dashboard）— OR 移除 X、讓 ← 是唯一退路（更不易誤觸）

> **設計選擇 #1**：頂部要不要有 X？(待確認)

**Recommendation badge** 顯示在 name 旁，沿用 explorer card 的 amber 樣式。

**Expert section**:
- 跟現有 card 的呈現一致（綠色 pill + 名字）

**Description**:
- 全文展示，沒有 line-clamp
- 用 prose 樣式（leading-relaxed、text-gray-700）

**Stats row**:
- 4 階段 · 共 14 天 · 28 個任務 — 從 `tasks.phases` 計算
- X 人已加入 — 從 `_count.assignments`

**Phase blocks**:
- 每個 phase 是一個區塊
- Phase 標題：`L1 入門 — 微習慣起步`（從 phase.name 直接拿，已含 L 編號）
- 副標：`(7 天)`
- 任務列表：縮排 numbered list
  - 每行：任務 title（不顯 details、type、cue、identity — 留 noise 低）

**Sticky bottom button**:
- 全寬「加入計畫」按鈕
- 點下 → 觸發既有 `handleJoinClick(template)` → 既有 date picker flow
- 不重新實作日期選取邏輯

### 4.4 響應式

- Mobile：detail view 全螢幕覆蓋 explorer
- Desktop：sliding panel from right side（or stack on top）
- 都用既有 explorer modal 的 z-index + 框架

---

## 5. 技術實作

### 5.1 元件結構

```
TemplateExplorer.jsx              （既有 - 接 detail open/close state）
└─ TemplateDetailPanel.jsx        （★ 新檔）
   └─ PhaseBlock.jsx               （★ 新檔，內部）
```

TemplateExplorer 多兩個 state：
```js
const [detailTemplate, setDetailTemplate] = useState(null);
```

點 card → `setDetailTemplate(template)` → render `<TemplateDetailPanel template={...} onClose={...} onJoin={...} />`。

### 5.2 進場 / 退場動畫

- Mobile：`transform translate-x-full → translate-x-0` slide-in，class transition
- Desktop：同樣 slide-in from right
- 用既有 Tailwind transition utilities

### 5.3 樣式不依賴 layout 變動

不動 MainApp.jsx、不動 TemplateExplorer 外層 layout — 純 explorer 內部加 panel。

---

## 6. Edge Cases

| 情境 | 處理 |
|---|---|
| Template `tasks` 是舊 v1.0 格式（無 phases） | 顯示 fallback：「本計劃任務結構為舊版，請直接加入查看細節」 + 加入按鈕 |
| Template 完全沒任務 | 顯示「(尚無任務)」，加入按鈕仍可點 |
| 任務 title 超長 | line-clamp-2 |
| 沒有 expert（很罕見） | 隱藏 expert pill |
| Phase 數量太多（> 4） | 不限制，自然向下滾動 |
| 按 detail view 內的「加入計畫」→ date picker 開啟時 | detail view 不關閉，date picker 疊在上面 |

---

## 7. 不做的事 — 明文列出

- ❌ 獨立 URL route（`/templates/[id]`）
- ❌ Server-side 詳細 endpoint
- ❌ 任務的 detail 折疊 / 展開（直接列 title 就好）
- ❌ Subtasks 預覽
- ❌ recurrence pattern 視覺化
- ❌ 預覽「未來 N 天」日曆
- ❌ 評論 / 評分 / 心得
- ❌ Share button
- ❌ 任務的 cue / identity 顯示（在 detail panel；加入後 dashboard 才會看到）

---

## 8. Acceptance Criteria

- [ ] TemplateExplorer 內每張 card 變可點，點開進 detail panel
- [ ] Detail panel 顯示：name、recommendation badge（若 applicable）、expert、完整 description、phases stats、每 phase 任務 title 列表
- [ ] 底部 sticky 「加入計畫」可觸發既有 date picker flow
- [ ] 返回鍵 / X 把 detail panel 關掉、回到 explorer list
- [ ] Mobile（375px）佈局正確、不破版
- [ ] Desktop slide 動畫順暢
- [ ] 沒 phases 的 v1 template 顯示 fallback 不 crash
- [ ] `npm test` 全綠
- [ ] Bundle delta < 20 kB gzip（純 UI，無 chart 依賴）

---

## 9. 開放問題 — 已確認（2026-05-21）

1. **Header**：只留 ← 返回，不放 X（避免誤關整個 explorer）✅
2. **加入計畫按鈕**：Sticky bottom，全寬 ✅
3. **Card 觸發詳情**：整張 card 可點；「加入計畫」按鈕仍維持「快速加入」捷徑（不被 detail 攔截） ✅
4. **進場動畫**：Slide from right（mobile 標準）— 未提交審查、採用 spec 提案
5. **任務列表深度**：只顯 title，不秀 cue / identity（noise 最低）✅
