# Slice K — Aspiration System

**Date:** 2026-05-23
**Status:** Design draft (Session 1 — schema + conceptual model), UX details deferred to Session 2
**Scope:** habitnext1 web-app — introduce a per-user "Aspiration" concept (想要 / 想擁有 / 想成為) as the explicit anchor for non-template habit selection, paired with a multi-identity model and per-aspiration habit scoring.

---

## 1. 背景

### 1.1 既有架構回顧

到 Slice J 為止，habitnext1 的「加入習慣」路徑有兩條：

1. **Template 路徑（探索計畫）**：使用者進「探索計畫」→ 看到花朵 / 睡眠 / 其他公開計畫 → 加入 → 14 天結構化任務
2. **官方習慣路徑（添加習慣）**：使用者進「添加習慣」→ 9 大健康面向 grid → HabitListView 列出該面向官方習慣 → 選難度 → 加入

兩條路徑都假設**使用者已經知道想做什麼**。Template 是「我認同這個 14 天結構」，官方習慣是「我認同這條習慣」。

### 1.2 缺口

許多使用者一開始**不知道想做什麼**。他們知道**痛點**（早上起來覺得累 / 想瘦下來 / 焦慮太多）但不知道對應到哪個健康面向、不知道哪些行為值得做、不知道從哪起步。

更深的問題：Slice D 嘗試用 focus map 解決「不知從何起」，但**將 impact / ability 當系統預設**是錯的 — 那兩個分數是**主觀感受**，依使用者狀況不同。同一個「每週運動 3 次」對健身教練很容易、對久坐上班族很難。

### 1.3 核心 insight（從討論結論精煉）

行為養成有三個層次的詞，混在一起會出事：

| 詞 | 定義 | 性質 | 範例 |
|---|---|---|---|
| **嚮往 (Aspiration)** | 想要的具體成果 | OUTCOME-oriented, BJ Fogg "step 1: Clarify the aspiration" | 「想睡得更好」 |
| **身分 (Identity)** | 我是 / 我成為 | BEING-oriented, James Clear 核心 | 「我是尊重生理節律的人」 |
| **習慣 (Habit/Behavior)** | 具體可執行的動作 | DOING-oriented | 「睡前 1 小時不看手機」 |

關鍵時間關係：**Aspiration → Habit 設計 → 重複執行 → 內化為 Identity**。Identity 是行為累積後的「加冕」，不是 onboarding 階段就該宣告的。

---

## 2. 目標

**Slice K v1**：使用者擁有自己的 aspiration 清單；每個 aspiration 下可掛多個 habit（officialHabit 或未來 AI 生成的 customHabit）；每個 habit 在該 aspiration 脈絡下有使用者自己評的 impact / ability。

具體場景：

```
新使用者進站
  → 不知道從何下手
  → 從 35 個 preset aspirations 點選共鳴的（or 自由打字）
  → 系統 / 未來 AI 提案 N 個對應 habits
  → 使用者評 impact × ability（per-aspiration）
  → 在 focus map 看候選位置
  → 選定 1-3 個 commit → 變成 Task
  → 做到 mark achieved → 加冕 identity（v1 手動）
```

### Non-goals

- **不接 AI**（v1 schema 只預留欄位、不發 API call）。生成 habits 的部分是 Session 3+ 才做。
- **不動 template 加入流程** — 跟計畫的使用者已經明確選定路徑，不需要走 aspiration 探索。
- **不在 Dashboard 顯示 aspiration** — 經討論決定有獨立「向往頁」承載。
- **不做 multi-aspiration → identity 自動推導** — v1 identity 是手動 mark achieved 時 carry 一個字串。
- **不做 aspiration 之間的優先排序 algorithm** — 使用者自己排（或 isPinned 旗標）。
- **不做 aspiration 進度條 / 完成度量化** — 達成是主觀判斷，使用者覺得到了就 mark achieved。
- **不做 social / 分享** — aspiration 是私人 layer。
- **不做 multi-language** — 中文 only。

---

## 3. 與既有資料模型的合約

### 3.1 Schema diff（純加法、不破壞既有）

```diff
model User {
  ...
  typeKey     String?
  sleepTypeKey String?
+ identities  String[]   // ★ 新增 — 多身分並存（"我是尊重生理節律的人", "我是個父親", ...）
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  tasks       Task[]
  assignments Assignment[]
+ aspirations Aspiration[]
}

+ model Aspiration {
+   id          String   @id @default(cuid())
+   userId      String
+   user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
+
+   text        String   // "想要早上起床不再覺得累"
+   domain      String?  // GENESIS+IO 9 domain — optional（AI 未來可推測）
+   source      String   @default("user")   // user | preset | ai (預留)
+
+   status      String   @default("active")  // active | achieved | paused | archived
+   isPinned    Boolean  @default(false)     // 向往頁優先顯示
+
+   unlockedIdentity String?    // ★ v1 手動 mark 時可選擇 carry 一個 identity 字串
+   unlockedAt       DateTime?
+
+   achievedAt  DateTime?
+   archivedAt  DateTime?
+   createdAt   DateTime @default(now())
+   updatedAt   DateTime @updatedAt
+
+   habits      AspirationHabit[]
+ }

+ model AspirationHabit {
+   id              String   @id @default(cuid())
+   aspirationId    String
+   aspiration      Aspiration @relation(fields: [aspirationId], references: [id], onDelete: Cascade)
+
+   // habit reference — 二擇一，二者皆 nullable 因為 v1 OfficialHabit ref-only，
+   //   customHabit 為未來 AI 生成的 ad-hoc habit 預留。
+   officialHabitId String?
+   customHabit     Json?
+
+   // Per-aspiration 評分 — 同一 habit 在不同 aspiration 下可有不同分
+   userImpact      Int?     // 1-5
+   userAbility     Int?     // 1-5
+
+   // 被「選定 commit」後填入；追溯該 habit 變成了哪個 Task
+   taskId          String?
+
+   createdAt       DateTime @default(now())
+   updatedAt       DateTime @updatedAt
+ }
```

**設計決策回顧**：

| 議題 | 決定 | 理由 |
|---|---|---|
| `User.aspirations` 為何升格成 model 而非 `String[]` | model | 要 carry status / unlockedIdentity / 多 habit 關聯，String[] 不夠 |
| `User.identities` 為何維持 `String[]` | String[] | 純字串標籤、不需狀態 / 關聯 |
| `AspirationHabit` 為何用 join table 而非直接 `Aspiration.habits Json[]` | join table | 要 per-row 評分 + index by officialHabitId（查「這個 habit 在哪些 aspiration 用過」） |
| `customHabit Json?` 為何不另開 table | nullable JSON | v1 不接 AI、不汙染 OfficialHabit；未來如果 AI 大量生成可再 normalize |
| `Aspiration.source` 為何加 enum | tracking | 「使用者自己想 vs 點 preset vs AI 建議」對未來分析 + UX 都有意義 |

### 3.2 與既有 model 的關係（不變）

- **Template** 不動。Template 加入流程不走 aspiration（Non-goal）。
- **OfficialHabit** 不動。`OfficialHabit.impact / ability`（Slice D 加的）變成「seed 預設位置 / 推薦預設值」，不是強制使用者的觀感。
- **Task** 不動。從 aspiration 流程加入 task 的時候、Task 還是 Task，只是 `AspirationHabit.taskId` 紀錄是哪個 aspiration 觸發的。

### 3.3 Slice D 既有產物的處置

Slice D 已 merge 進 main 的東西：

| 產物 | 處置 |
|---|---|
| `OfficialHabit.impact / ability` schema | **保留**，重新定位為「seed 預設 / 未評分時 fallback」 |
| 102 個 seed 評分 | **保留**，當作系統推薦的初始位置 |
| `FocusMap.jsx` | **保留** — Slice K 的「向往頁」會用 |
| `HabitListView` 內 [清單 ｜ 焦點地圖] toggle | **移除** — 探索流程錯位、由 Slice K 的向往頁取代（這部分由 Slice K Session 2 處理） |
| `check-focus-map-distribution.js` | **保留** |

---

## 4. Preset Aspirations Seed (35 個)

跨 9 個 GENESIS+IO domain，每 domain 3-5 個。源檔 `prisma/seed/preset-aspirations.json`：

```json
[
  { "text": "想要腸道更健康（減少脹氣 / 排便不順）", "domain": "基因與腸道" },
  { "text": "想要降低家族遺傳病風險", "domain": "基因與腸道" },
  { "text": "想要找出自己的食物敏感原", "domain": "基因與腸道" },
  { "text": "想要打造一個讓人放鬆的家", "domain": "環境" },
  { "text": "想要工作環境更舒服、不腰痠背痛", "domain": "環境" },
  { "text": "想要對環境更友善（減塑）", "domain": "環境" },
  { "text": "想要瘦下來", "domain": "飲食" },
  { "text": "想要戒糖 / 戒含糖飲料", "domain": "飲食" },
  { "text": "想要不再下午想睡覺", "domain": "飲食" },
  { "text": "想要食量穩定不暴飲暴食", "domain": "飲食" },
  { "text": "想要學會煮健康料理", "domain": "飲食" },
  { "text": "想要規律運動不偷懶", "domain": "運動" },
  { "text": "想要肌肉量增加 / 體脂下降", "domain": "運動" },
  { "text": "想要能輕鬆爬樓梯不喘", "domain": "運動" },
  { "text": "想要早上起床不再覺得累", "domain": "壓力與睡眠" },
  { "text": "想要快速入睡、睡眠品質好", "domain": "壓力與睡眠" },
  { "text": "想要焦慮少一點、放鬆多一點", "domain": "壓力與睡眠" },
  { "text": "想要白天能維持專注不昏沈", "domain": "壓力與睡眠" },
  { "text": "想要少滑手機、減少數位疲勞", "domain": "壓力與睡眠" },
  { "text": "想要跟伴侶 / 家人關係更好", "domain": "社交互動" },
  { "text": "想要結交新朋友、不孤單", "domain": "社交互動" },
  { "text": "想要溝通更有同理心", "domain": "社交互動" },
  { "text": "想要每天都有 me time", "domain": "心靈" },
  { "text": "想要找到生活的意義感", "domain": "心靈" },
  { "text": "想要心情更平穩、不易煩躁", "domain": "心靈" },
  { "text": "想要終身學習保持腦力", "domain": "認知與智慧" },
  { "text": "想要寫作 / 創作能力提升", "domain": "認知與智慧" },
  { "text": "想要學會一項新技能 / 語言", "domain": "認知與智慧" },
  { "text": "想要工作專注效率提升", "domain": "職涯與平衡" },
  { "text": "想要工作 / 生活平衡", "domain": "職涯與平衡" },
  { "text": "想要找到工作熱情 / 心流", "domain": "職涯與平衡" },
  { "text": "想要更敢於說「不」", "domain": "職涯與平衡" }
]
```

**約定**：preset 列入 DB 後不可改寫使用者既有資料；使用者在 onboarding 點選某個 preset 時，**複製文字成自己的 Aspiration row**（`source='preset'`），之後改 / 刪 / 達成都不影響原始 preset。

---

## 5. 已確定的設計決定（討論結果定錨）

| # | 議題 | 決定 |
|---|---|---|
| 1 | User aspirations 數量 | 不限、使用者自己管 |
| 2 | User identities 數量 | 不限、多身分並存 |
| 3 | 每個 task 的 identity | 從 `User.identities[]` 選一個（或自訂自由文字） |
| 4 | AI 生 habits 怎麼存 | 不存 backend；selected 後才寫入 `AspirationHabit.customHabit Json?` |
| 5 | AI 接入時程 | v1 不接、schema 預留欄位 (`source='ai'`, `customHabit`) |
| 6 | Habit 評分範圍 | per-aspiration（`AspirationHabit.userImpact / userAbility`） |
| 7 | Identity 加冕觸發 | v1 使用者手動 mark achieved；AI 自動加冕留到未來 |
| 8 | Aspiration 在 dashboard | **不顯示**，獨立「向往頁」 |
| 9 | Preset aspirations 數量 | 35 個跨 9 domain |
| 10 | Slice D 留下的 FocusMap | 保留、Slice K Session 2 移到「向往頁」 |
| 11 | Slice D HabitListView toggle | 移除（錯誤位置） |

---

## 6. 待 Session 2 釐清的開放問題（UX 細節）

> 以下不在本 spec 範圍。Session 2 開始前要先逐項拍板。

1. **「向往頁」UI** — list / card / sections by domain / 狀態 tab？aspiration 卡片內顯示什麼（habit count、status badge、unlocked identity）？
2. **「向往頁」入口** — Sidebar 多一個 nav？AppHeader 多一個 icon？Profile menu？dashboard 多一個 CTA「探索新習慣」？
3. **Onboarding** — 新使用者首次進站要不要強制走 aspiration 流程？跳過行不行？跳過後何時補？
4. **加 habit 進 aspiration 的 flow** — 從 OfficialHabit list 「加入向往」 vs 從 aspiration 內按「加 habit」進入官方 library 篩選 — 兩條路都支援嗎？
5. **Template 跟 aspiration 的關係** — Template 要不要也加 `aspirations[]`？加入 template 時讓使用者選一個 aspiration 「掛靠」？或完全分開？
6. **「向往頁」內 FocusMap 怎麼顯示** — 一個 aspiration 一張圖？所有 active aspirations 的 habits 合在一張？篩選器設計？
7. **加冕 identity 的 UX** — mark achieved 時跳一個小慶祝 modal？讓使用者輸入這次學到「我是個 ___ 的人」？
8. **Aspiration 進度視覺暗示** — 沒進度條（已 non-goal），但要不要顯示「掛了 X 個 habit、其中 Y 個正在打卡」？

---

## 7. 技術實作分塊（Session 3+ 才動工）

> 預估順序、實際依 plan 文件為準。

1. **Session 2 (UX)** — 釘 §6 開放問題、寫 plan 文件
2. **Session 3 (Schema + Seed)** — `prisma db push` + preset-aspirations seed script + 既有 user 的 `identities=[]` migration
3. **Session 4 (API)** — `/api/aspirations` CRUD + `/api/aspirations/[id]/habits` (add/remove/score) + `/api/aspirations/[id]/achieve`
4. **Session 5 (UI)** — 向往頁 + onboarding flow + dashboard 入口 + 既有 HabitListView 拿掉錯位 toggle
5. **Session 6 (Polish)** — Per-aspiration FocusMap + 加冕 modal + tests + bundle 預算驗證
6. **Session 7+ (AI, separate spec)** — Gemini / OpenAI 接入、prompt 工程、rate limit、cost monitoring

---

## 8. 風險與開放問題（Spec 階段）

1. **Schema 預留太多沒用的欄位** — `unlockedIdentity / customHabit / source='ai'` 都是預留。如果未來 AI 不接，這些變成死欄位。**緩解**：每個預留欄位都 nullable，dead-code 沒實際成本。
2. **使用者在「向往頁」與「探索計畫」之間概念混淆** — 兩個都是「我想做」的入口、可能 cognitive load。**緩解**：Session 2 UX 設計需要明確區分「我跟著結構走 (Template)」vs「我從痛點出發 (Aspiration)」的入口文案。
3. **Preset 35 個太多 / 太少** — 沒實機驗證。**緩解**：Session 5 onboarding 實作時 A/B 觀察、必要時調整 seed JSON。
4. **`User.identities[]` 跟既有 `Task.identity` 的關係** — 既有 Task.identity 是自由文字，使用者可填任何東西。Slice K 加 `User.identities[]` 之後，是要強制 Task.identity ∈ User.identities，還是繼續自由？**留 Session 2 拍板**。
5. **Identity 從 aspiration 「加冕」時的命名來源** — 使用者自填？預設文案？參考 `OfficialHabit.defaultIdentity`？**留 Session 2 拍板**。

---

## 9. Acceptance Criteria

僅針對本 spec 範圍（schema + preset seed + 設計決策），不涵蓋 UI：

- [ ] `prisma/schema.prisma` 加入 `Aspiration` model + `AspirationHabit` model + `User.identities String[]`
- [ ] `prisma db push` 乾淨完成（既有 user 自動拿到 `identities=[]`）
- [ ] `prisma/seed/preset-aspirations.json` 含 35 個 entries 對應 §4
- [ ] Seed script `scripts/seed-preset-aspirations.js` 把 preset 寫進獨立 `PresetAspiration` reference table（**待 Session 2 決定要不要 table、目前傾向 JSON only**）
- [ ] 這份 spec push 到 `feat/slice-K-aspiration-system` branch
- [ ] Plan 文件（Session 2 寫）push 到同一 branch
- [ ] 不寫任何 application code

---

## 10. 開放問題（spec 階段 — 待 Session 2 前 user 確認）

1. **「向往頁」要叫什麼名字** — 「向往」 / 「探索」 / 「我的願景」 / 「我想要」？影響 sidebar nav 文案。
2. **Preset 要不要也存 table** — 目前 spec 是 JSON only；如果要做「使用者也能新增成 preset 分享給別人」，就要 table。v1 是否需要？
3. **Slice K vs Slice K + AI Slice L 分還是合** — 目前 spec 把 AI 留 Session 7+ ；如果你想做「沒有 AI 的 v1 也要能跑」、就確認本 spec 的「使用者自己手動加 OfficialHabit 進 aspiration」的 fallback flow 是否足夠。
