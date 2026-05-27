# Slice N — 科學佐證（Scientific Brief）系統

**Date:** 2026-05-26（spec 寫於原 Slice L、2026-05-27 改名 Slice N，避免與另一 session 的 Slice L 候選池/焦點地圖撞名）
**Status:** Design draft, ready for implementation
**Scope:** habitnext1 web-app — 為每個 `OfficialHabit` 掛載 0–N 條「科學佐證」(insight)，由 AI 從研究文獻草擬、admin review 後發佈，呈現在「為什麼這個習慣值得做」的位置。為未來日週 AI 報告提供可引用的事實來源。

## 跟其他並行 slice 的關係

| Slice | 連接的層 | 與本 slice 的介面 |
|---|---|---|
| **K** — 嚮往（Aspiration） | outcome ↔ habit | 嚮往推薦的習慣展開後，會看到該習慣的 insights。Insight 內容可被 AI 報告引用以解釋「為什麼這個嚮往對應這個習慣」 |
| **L** — 候選池 + 焦點地圖 | task lifecycle（candidate → active） | Task.officialHabitId 已被 Slice L 加入（解決本 spec §9.2.1 開放問題），TaskDetailModal 可靠地反查 insights。Insight 與 task status 正交：候選 / 已啟用都顯示同樣的 insights |
| **M** — Task Card polish | task UI | 本 slice 在 TaskCard 上不出現（已在非目標清單）。Slice M 的 Sort/SwipeReveal 不受影響 |

兩條完整三角：
```
嚮往 (K) ←→ 習慣 (Official) ←→ 科學佐證 (N)
                ↓
              候選池 (L) → 啟用 task → 顯示 insight
```

---

## 1. 背景

### 1.1 現況

`OFFICIAL_TASKS` 已有 `science` 欄位（`src/lib/constants.js`），但只是**一句話**級別：

```js
science: '飲水不足會影響腎臟功能及消化系統。'
```

這對「快速提示」夠用，但無法承載真正的研究敘事。例如使用者問「為什麼戒糖？」，答案有兩個科學角度：

1. **糖 → 表觀遺傳老化**（JAMA Network Open 2024：每多 1g 添加糖 ≈ GrimAge2 老化 0.02 年）
2. **糖 → 脂肪肝（類酒精性損傷）**（果糖溢流、腸-肝軸、乙醛 / 醋酸 / LPS / 內毒素）

一個習慣可以有**多個獨立角度**的科學支撐，每個角度都需要：摘要、詳細敘事、來源連結、可量化的關鍵數字、實務 takeaway。一句話 `science` 不夠。

### 1.2 為什麼現在做

- Slice K（嚮往）剛把 **outcome ↔ habit** 接起來
- Slice N 要把 **habit ↔ science** 接起來
- 兩條合起來形成「outcome ←→ habit ←→ science」三角，**為未來 AI 報告**（日報、週報、營養素分析）提供結構化、可引用的事實來源
- 行為養成的「why」一旦薄弱，使用者堅持不下去；強化動機是這個 slice 的直接目標

### 1.3 跟原本 Slice C（AI brainstorm）的差異

Slice C 是 **「給 user goal，AI 生 10×10 anchor × behavior」**（user-facing AI）。
Slice N 是 **「給 PubMed paper，AI 生 brief 草稿、admin review、user 看成品」**（admin-facing AI，user 看 review 後內容）。

兩條都用 AI，但風險不同：Slice N 因為有人類審稿閘門，AI hallucination 不會直達使用者。

---

## 2. 目標

**v1**：admin 在後台貼一篇研究的 paper 標題 + abstract + URL（+ 可選 focus 提示），AI 草擬一條 `HabitInsight`（含 summary / detail / sources / takeaway / tags），admin 編輯後 publish。User 在 HabitListView 展開卡片 + TaskDetailModal 看到該習慣下所有 published insights。

### Non-goals

- **AI 自動發佈**：所有 insight 必須經 admin review + publish 才對 user 可見。AI 只負責「草擬」。
- **AI 對 user 直接生成 insight**：使用者看到的永遠是 admin reviewed 過的內容。User-facing AI brainstorm 留給 Slice C。
- **多語**：v1 只支援繁體中文。
- **Per-difficulty insight**：brief 是針對 habit 的「為什麼值得做」，不分入門/進階/挑戰。
- **Insight 版本歷史**：edit 就直接覆蓋，不保留 diff。要追改動史走 git on the JSON seed file。
- **User 可投稿 / 點讚 / 留言**：不是 social slice。
- **跨習慣 insight（一條 insight 掛多個 habit）**：v1 一對多，從 habit 端 author，避免分類學爆炸。可在 metadata `relatedHabitIds` 之類欄位記載，但 v1 不實作。
- **Insight 引用內含圖片 / 表格**：純文字 + markdown。複雜表格用 detail markdown 表達即可。
- **Daily/weekly AI report 介接**：Slice N 提供事實來源層，但 report 本身是 Slice N+（未定）。

---

## 3. 與既有資料模型的合約

### 3.1 Schema diff

```diff
 model OfficialHabit {
   id          String   @id @default(cuid())
   name        String   @unique
   description String?
   category    String
   icon        String?
   difficulties Json
   impact      Int      @default(3)
   ability     Int      @default(3)
   isActive    Boolean  @default(true)
   createdAt   DateTime @default(now())
   updatedAt   DateTime @updatedAt
+  insights    HabitInsight[]
 }

+ model HabitInsight {
+   id           String        @id @default(cuid())
+   habitId      String
+   habit        OfficialHabit @relation(fields: [habitId], references: [id], onDelete: Cascade)
+
+   title        String        // 12-20 字標題, e.g. "糖加速生物老化"
+   summary      String        // 2-3 句 tldr, 永遠顯示
+   detail       String        // markdown, 折疊展開後顯示
+   takeaway     String?       // 一句結尾 / 引用句, e.g. "不是戒糖, 是減少讓細胞提早老化的飲食訊號"
+
+   sources      Json          // [{ label, url, type?: 'pubmed' | 'journal' | 'book' | 'other' }]
+   tags         String[]      @default([])  // 自由標籤, e.g. ["營養素", "抗老", "添加糖"]
+
+   status       String        @default("draft")  // draft | published | archived
+   order        Int           @default(0)        // 同一 habit 多 insight 時的顯示順序
+
+   aiGenerated  Boolean       @default(false)    // 是否由 AI 草擬, 供 admin filter / metric
+   sourcePrompt String?       // AI 生成時的輸入 (paper abstract + focus 提示), 留 audit trail
+
+   createdAt    DateTime      @default(now())
+   updatedAt    DateTime      @updatedAt
+ }
```

### 3.2 為什麼這幾個欄位

| 欄位 | 為何存在 |
|---|---|
| `title` | 卡片上的醒目標題；同一 habit 多個 insight 需要區分 |
| `summary` | 列表 / 折疊狀態下的 tldr；2-3 句包含關鍵數字 |
| `detail` | 完整研究敘事，含方法、數字、限制；markdown 允許粗體 / 列表 / 引用 |
| `takeaway` | 行動性結尾語；可在 AI 報告中被引用作為「金句」 |
| `sources[]` | 1-N 個來源；type 區分主要文獻 vs 補充閱讀 |
| `tags[]` | AI 報告抓取 corpus 的鉤子；跨 habit 聚合（e.g. 「添加糖」tag 抓所有 insights） |
| `status` | 三態：draft（編輯中）/ published（user 可見）/ archived（不刪但隱藏） |
| `order` | admin 可控同 habit 多個 insight 的呈現順序 |
| `aiGenerated` | 區分 AI 草擬 vs 手寫；長期統計 AI 內容品質 |
| `sourcePrompt` | AI 草擬時的輸入 audit trail；user 永遠不見 |

### 3.3 不動

- `OfficialHabit.description` 維持「一句話介紹」用途，不被 insight 取代
- `OFFICIAL_TASKS.science` 字串欄位**保留**做為極簡 fallback（沒 insight 時的最低保證）

### 3.4 沒有 migration history

依專案慣例 `prisma db push` 推上去。Schema 是真源。

---

## 4. 內容形狀（範例）

以你給的「糖 → 表觀遺傳老化」為例：

```json
{
  "habitId": "<official_habit_id_for_戒糖>",
  "title": "添加糖加速生物老化",
  "summary": "JAMA Network Open 2024 在 342 位中年女性身上發現，每多 1g 添加糖約對應表觀遺傳年齡 GrimAge2 老化 0.02 年；地中海飲食每多 1 分對應年輕 0.41 年。即使健康飲食充足，添加糖的負面關聯仍存在。",
  "detail": "**研究設計**：342 位平均 39.2 歲中年女性，3 天飲食紀錄。\n\n**主要發現**（完整調整模型）：\n- aMED（替代地中海飲食）每 +1 分 → GrimAge2 年輕 0.41 年\n- AHEI 2010 每 +1 分 → 年輕 0.05 年\n- ENI（作者自創表觀遺傳營養指數）每 +1 分 → 年輕 0.17 年\n- 添加糖每 +1g → 老化 0.02 年\n\n**ENI 涵蓋的關鍵營養素**：維生素 A/C/E、葉酸、B12、鋅、硒、鎂、膳食纖維、單元不飽和脂肪酸 / 飽和脂肪酸比、異黃酮。\n\n**關鍵推論**：將「健康飲食分數」與「添加糖」放進同一模型，添加糖的負面關聯依然存在 — 高蔬果好油**無法完全抵銷**高糖傷害。\n\n**限制**：橫斷面研究，只能說相關，無法證明因果。",
  "takeaway": "不是戒糖，是減少讓細胞提早老化的飲食訊號。",
  "sources": [
    {
      "label": "JAMA Network Open 2024 — 飲食品質、營養素、添加糖與表觀遺傳年齡",
      "url": "https://pubmed.ncbi.nlm.nih.gov/39073813/",
      "type": "pubmed"
    }
  ],
  "tags": ["營養素", "抗老", "添加糖", "表觀遺傳", "地中海飲食"],
  "status": "published",
  "order": 0,
  "aiGenerated": true,
  "sourcePrompt": "<paper abstract + 'focus on epigenetic aging angle' 提示>"
}
```

長度建議：
- `summary`：80-150 字
- `detail`：300-800 字
- `takeaway`：15-40 字

---

## 5. Editorial flow（AI 草擬 + admin review）

### 5.1 流程

```
[admin /admin/habits/<id>/insights 頁面]
    │
    ├─ 點「+ 新增 insight」按鈕
    │      ↓
    │   打開 AI 草擬 modal:
    │     - Habit context (auto-filled from habitId)
    │     - Paper 標題 (text input)
    │     - Paper abstract / summary (textarea)
    │     - Source URL (PubMed / DOI)
    │     - Focus 提示 (optional textarea, e.g. "focus on aging angle")
    │     - [生成草稿] 按鈕
    │      ↓
    │   POST /api/admin/habits/insights/draft
    │     - server-side 呼叫 Claude API
    │     - 用結構化 prompt 強制輸出 JSON (title/summary/detail/takeaway/tags)
    │     - 回傳給前端
    │      ↓
    │   admin 看到草稿 in form, 可編輯各欄位
    │      ↓
    │   [Save as draft] 或 [Publish]
    │      ↓
    │   POST /api/admin/habits/:id/insights
    │     - 寫入 HabitInsight row, status=draft/published, aiGenerated=true
```

### 5.2 AI 草擬 prompt 結構

System prompt 大致：
```
You are a careful science writer for a Traditional Chinese (Taiwan) habit-tracking app.
Given a research paper's abstract, draft a HabitInsight as JSON with these fields:
- title (12-20 chars, punchy, in Traditional Chinese)
- summary (80-150 chars, 2-3 sentences, include the most concrete number from the paper)
- detail (300-800 chars, markdown, structured: 研究設計 / 主要發現 / 限制)
- takeaway (15-40 chars, actionable single sentence)
- tags (3-5 array items, Traditional Chinese)

Constraints:
- Only use facts from the provided abstract. No invented numbers.
- Explicitly mark observational / cross-sectional studies as 相關性而非因果.
- Tone: rigorous but accessible. Avoid hype words like "革命性" or "顛覆".
- Output JSON only, no surrounding prose.
```

User prompt：habit info + paper title + abstract + URL + focus 提示。

### 5.3 模型選擇

**Claude API**（Anthropic SDK）— 已在專案技術棧內（per `claude-api` skill）。
- 模型：`claude-sonnet-4` 或當下最新 Sonnet 等級 — 中文長文敘事 + JSON 結構化輸出表現好
- Temperature: 0.3（要忠於原文、不要創意）
- Max tokens: 2000（detail 800 字 + 其他欄位有餘裕）
- Prompt caching：system prompt 跨次數固定，套用 1h ephemeral cache 降成本

### 5.4 失敗 / 中斷處理

- AI 回傳非 JSON / schema 不對 → 直接顯示 raw output 讓 admin 手動修
- API timeout / 失敗 → admin 可以「不用 AI」直接手寫整條 insight
- Rate limit：admin 自然慢，不需限制

### 5.5 Editorial 守則（給 admin）

寫進後台頁面上方說明：
1. **數字要對得起來源**：AI 可能改寫或推估，admin 核對所有數字 vs paper abstract
2. **觀察性研究要標明「相關性 / 不能證明因果」**
3. **避免絕對化的字眼**（「徹底證明」「完全」「絕對」）
4. **takeaway 是行動建議**，不是學術結論
5. **Tags 控制在 5 個內**，跨 habit 一致性 > 完整性

---

## 6. UI placement（v1）

### 6.1 HabitListView accordion — primary surface

當使用者展開一個習慣的 accordion（HabitListView.jsx 既有 expanded state），在「選擇難度」上方加一個「**為什麼這個習慣重要**」section：

```
┌─────────────────────────────────┐
│ 🍰 戒糖 / 減少添加糖              │
│ 描述...                          │
├─────────────────────────────────┤
│ 📖 為什麼這個習慣重要             │
│ ┌─────────────────────────────┐ │
│ │ 添加糖加速生物老化            │ │
│ │ JAMA Network Open 2024 在... │ │
│ │ [▼ 展開詳細]                 │ │
│ │ 「不是戒糖，是減少讓細胞...」 │ │
│ │ → JAMA Network Open 2024     │ │
│ └─────────────────────────────┘ │
│ ┌─────────────────────────────┐ │
│ │ 過量糖類似酒精性肝損傷         │ │
│ │ ...                          │ │
│ └─────────────────────────────┘ │
├─────────────────────────────────┤
│ 選擇難度：[入門][進階][挑戰]      │
│ [加入此習慣]                     │
└─────────────────────────────────┘
```

- Multiple insights 並排（每條一張小卡）
- 預設折疊只顯示 title + summary + takeaway + 來源連結
- 點「展開詳細」顯示 detail markdown
- Source 是 clickable external link

### 6.2 TaskDetailModal — 已加入習慣的 user 看

使用者點開既有 task 進 detail modal，下方加同一個 section（讀的 insight 來自 task.officialHabitId — 如果 task 是從 OfficialHabit add 進來的話有此關聯；用 `Task.title === OfficialHabit.name` 反查的 fallback）。

> ⚠️ 若 `Task` 表沒有指回 `OfficialHabit.id` 的欄位，這個 fallback 不可靠。**Plan 第一個任務**：確認 `Task` 是否有 `officialHabitId`，若無則加上 + backfill。

### 6.3 RecommendationPanel teaser（v2，本 slice 不做）

在 AspirationRecommendationPanel 的習慣卡上加 1 行 takeaway 預覽，吸引點選。

### 6.4 不出現的地方

- TaskCard（每日卡片）— 太擠
- AppHeader / sidebar — 不是 navigation

---

## 7. API

```
GET  /api/habits/:habitId/insights?status=published
        → published only by default
        → ?status=all 給 admin

POST /api/admin/habits/insights/draft           [admin only]
        body: { habitId, paperTitle, abstract, sourceUrl, focusHint? }
        → 呼叫 Claude API, 回傳 draft JSON (不寫入 DB)

POST /api/admin/habits/:habitId/insights        [admin only]
        body: { title, summary, detail, takeaway?, sources, tags, status, order, aiGenerated, sourcePrompt? }
        → 建立 HabitInsight row

PATCH /api/admin/habits/insights/:id            [admin only]
        body: { ... 任何 HabitInsight 欄位 ... }

DELETE /api/admin/habits/insights/:id           [admin only]
        → hard delete (沒 cascade dependent, 安全)
```

Admin 認證：沿用既有的 admin auth（看 `web-app/src/app/api/admin/*` 既有 pattern）。

---

## 8. 跟未來 AI 報告的介接（informational）

雖然不是這 slice 範圍，但要確保 schema 為這條未來路徑留好鉤子：

```
[Daily/weekly AI report 生成器]
  → 看 user 本週做了哪些 task (已養成的習慣)
  → 對應到 OfficialHabit ids
  → 拉那些 habit 的 published insights, filter 相關 tags
  → 加上 user 的營養素 / 完成度 metrics
  → 喂給 Claude 生成個人化報告段落，引用 insight.takeaway 作為金句、引用 source URL 作為腳註
```

關鍵 schema 鉤子：
- `tags[]` — 跨 habit 抓 corpus（例：「添加糖」tag → 所有跟糖有關的 insights）
- `takeaway` — 適合做為報告中的引用句
- `sources[]` — 報告末尾的引用列表
- `aiGenerated` flag — 將來品質統計 / A/B

---

## 9. 風險與開放問題

### 9.1 風險

1. **AI hallucinate 數字**：mitigation = admin review + editorial 守則 + 提示「核對所有數字 vs 原文」。長期可加自動 fact-check（grep 數字在 source 中的存在）— 不在 v1。
2. **AI 寫太「玄」**：mitigation = temperature 0.3 + prompt 限制用詞 + admin 編輯權。
3. **同一條 paper 被多次重複生成 / 不一致敘事**：暫時靠 admin 自律。長期可加 source URL 去重 hint。
4. **Admin overhead**：寫一條 insight 要核對數字 + 編輯，預估每條 15-30 分鐘。**MVP 階段先做 5-10 條高優先 habit**（戒糖、運動、睡眠、補水...），不要 102 條一次全做。
5. **Claude API 額度**：每次草擬 ~1-2k tokens output × 5-10 條 = 數塊美金等級，可接受。
6. **既有 `science` 欄位 vs 新 insight 表的雙軌期**：簡單規則 = 新 habit 一律走 insight；舊的 `science` 字串保留做 fallback；不做資料遷移。

### 9.2 開放問題（plan 前拍板）

1. ✅ **Task ↔ OfficialHabit 關聯** — 已由 Slice L（候選池）的 `f57fd89` commit 加入 `Task.officialHabitId String?` + FK（`OfficialHabit.tasks Task[]` reverse relation）。TaskDetailModal 可直接 `task.officialHabitId` 反查 insights。**Resolved**。
2. ✅ **Admin 介面位置** — 採 `/admin/dashboard/habits/[id]` 詳情頁內，加 insights section。
3. ✅ **AI 模型版本** — env var `CLAUDE_MODEL_NAME`，default `claude-sonnet-4.7`。
4. ✅ **Tag taxonomy** — v1 freeform。蓋夠 30+ 條後再 curate canonical 列表。
5. **detail markdown 渲染** — Session 2 grep 確認專案是否已有 markdown renderer；若無，引 `react-markdown`（輕量、tree-shakable）。**Decided at Session 2 start**。

---

## 10. Acceptance criteria

- [ ] `HabitInsight` model 進 schema 並 `prisma db push` 成功
- [ ] Admin 介面可以：貼 paper 資料 → 呼叫 AI → 看到草稿 → 編輯 → 儲存（draft 或 published）
- [ ] GET `/api/habits/:id/insights` 可拉到 published insights
- [ ] HabitListView 展開時顯示該 habit 的 published insights（含展開詳細 / 來源連結）
- [ ] TaskDetailModal 顯示對應 OfficialHabit 的 published insights（含 fallback 處理）
- [ ] **手寫 + AI 草擬 共 ≥ 5 條 insights** 放進 prod DB（涵蓋糖 ×2、運動 ×1、睡眠 ×1、補水 ×1）
- [ ] Admin editorial 守則寫在後台頁面上方（避免之後忘規則）
- [ ] 全測試套件保持綠
- [ ] 整體 First Load JS 增量在 30 kB 以內

---

## 11. Session 拆分

| Session | 內容 | 大小 |
|---|---|---|
| **1（本次）** | Spec + plan docs（不寫 code） | S |
| **2** | Schema + API（HabitInsight model, 4 endpoints, no UI） | M |
| **3** | Admin UI：habit 詳情頁加 insights 區段 + AI 草擬 modal + 編輯 form | L |
| **4** | User UI：HabitListView accordion 加 insights + TaskDetailModal 加 insights | M |
| **5** | Editorial：手寫 / AI 草擬 5+ 條 insights 進 prod DB | S–M |
| **後續** | Slice N+1：Task.officialHabitId 欄位（若 §9.2.1 確認沒有） / RecommendationPanel teaser / report 介接 | — |

預估 Session 2–5 共 4-6 個工作 session。

---

## 12. 為什麼用 AI 草擬而不是純手寫（trade-off）

| 純手寫 | AI 草擬 + review（v1 採用） |
|---|---|
| 內容品質最高、ton 一致 | 速度快 5-10x |
| 慢，admin 容易 burnout | 需 review 防 hallucination |
| 量受限，覆蓋 < 30 條 | 可短期內覆蓋 50-100 條 habit |
| 結構不一致 | Schema-enforced 結構固定 |
| 不需 AI cost | Claude API 成本 $5-20 / 100 條 |

**v1 採 AI 草擬**：使用者選 2，理由是要快速覆蓋多 habit；admin review 守住品質下限；可隨時換成手寫（同 form），所以不是單向決定。
