# HabitNext — Product Map

> 給 PM / 設計師 / 內容團隊 / 需求單位讀的產品地圖。
> 工程細節看 [`ARCHITECTURE.md`](ARCHITECTURE.md)，每個 slice 的設計理由看 [`superpowers/specs/`](superpowers/specs/)。

最後更新：2026-06-06 · Live: [habitnext1.vercel.app](https://habitnext1.vercel.app)

> 註：§3 功能地圖、§4 歷史、§5 路線圖主體寫於 05-22。05-26~06-06 的新功能見下方「近期更新」；工程交接細節見 [`HANDOFF.md`](HANDOFF.md)。

---

## 0. 近期更新（2026-05-26 ~ 06-06）

- **嚮往（為了什麼）→ 推薦習慣**：從「想成為什麼樣的人」出發給推薦，而非直接挑習慣。
- **焦點地圖（已上線並於 06-06 重設計）**：把候選習慣依「影響力 × 執行度」分四象限，挑出「值得優先做」。新流程＝**逐一評影響力 → 逐一評執行度 → 看焦點地圖加入**（大拖鈕、可反悔、白話象限、已移除 BJ Fogg 術語），加入時可選**養成期間**（21/66天推薦/90/不設限，附背後科學）。難度會依使用者評的「執行度」自動給合理預設，不必每次選。
- **社群計畫（06-06，新）**：使用者可把「自己一個嚮往底下的習慣集」一鍵生成為**有階段的計畫**，存成私人複用、或**申請公開分享**給其他人加入。公開需**管理員審核**核准，並清楚標示「用戶自創 · by 作者」對比官方；後台有審核佇列。
- **科學佐證（HabitInsight）**：每個習慣附「背後科學」與證據力指標。
- **遊戲化世界層**（持續精進中，非上線硬化重點）：完成地點、旅程城市地圖、世界切換、美食回憶照片 — 細節見 `HANDOFF.md` §3。
- **後台安全**：所有 `/api/admin/*` 已加伺服器端授權（外部無法直接呼叫）。

---

## 1. 是什麼

HabitNext 是基於**行為科學**的習慣養成 web app。和一般打卡 app 三個關鍵差異：

| 概念 | 來源 | App 內表現 |
|---|---|---|
| **錨點 + 行為** | BJ Fogg Tiny Habits | 每個 task 綁一個觸發時刻（午餐後、刷牙後…），顯示為 `午餐後 → 喝 250cc 水` |
| **身分認同** | James Clear Atomic Habits | 每個 task 綁一個身分宣告（「我是個照顧大腦放鬆的人」），顯示在 task 上方 |
| **9 大健康面向** | GENESIS+IO 模型 | 探索習慣從 9 個分類入口開始，避免「全部習慣」一長串 |

加上**雙維分型問卷**讓使用者收到量身打造的計畫：
- **花朵型**（女性週期身體）：雛菊 / 玫瑰 / 蘭花 / 向日葵
- **睡眠型**：壓力 / 節律 / 代謝失衡 / 荷爾蒙波動

---

## 2. 目標使用者

主要受眾：
- **重視「不只打卡、要真正改變身分」的個人使用者**
- **行為改變專業人士**（教練、營養師、心理師）做為帶客戶的工具

訂閱 / 收費模型目前未實作（roadmap 議題）。

---

## 3. 完整功能地圖（按使用者旅程）

### 探索與加入
- **探索計畫（Template）**：開啟可滑動 carousel，按家族（花朵/睡眠/其他）分區。每張卡顯示分類 chip（emoji + 顏色），點卡片進入 detail panel 看 4 階段任務預覽 → 加入計畫
- **探索習慣（Habit）**：從 9 個 GENESIS+IO 健康面向入口進入，每個 domain 下有推薦習慣（105 個內建），每個可選 3 個難度（入門 / 進階 / 挑戰）
- **加入新習慣**：選 habit → 選錨點（既有 task / 30 個生活時刻 / 自訂）→ 選身分（4 種推薦 + 4 種通用 + 自訂） → 寫入 task
- **訂閱計畫模板**：選計畫 → 選開始日期（今天 / 明天 / 自訂） → 系統 pre-bake 14 天 task

### 日常使用
- **每日行程 (daily view)**：當天的 task 卡片列表（含 cue + identity + title）。Binary 直接勾、Quantitative 用 ± 累計、Period（週/月目標）累積到目標
- **互動式週列**：點任一天 → 預覽該天 task；未來日鎖住（🔒 + 虛線 indigo 邊框）、過去日唯讀
- **生理期模式 toggle**：開啟後 task 列表會帶入花朵型計畫的「生理期專用 phase」（自動 5 天後關閉）
- **每餐型 checklist 每日重置**：「每餐都要有蛋白質」這類 multi-step 每天獨立追蹤

### 統計與洞察
- **統計頁 (Stats)**：5 個 widget — 完成率卡 / 9 域分布 / 連續紀錄 hero / Task 連續排行 / 週熱力圖
- **月曆 (Dashboard Detail)**：HabitCalendar 看每天的完成情況

### 帳號
- 手機 + 密碼登入
- 個人資料可改 nickname、avatar seed、typeKey、sleepTypeKey（後者由問卷設定，暫無實作問卷頁）

---

## 4. 完成功能歷史（按時間 / Slice）

每個 slice 有完整的 [`spec`](superpowers/specs/) + [`plan`](superpowers/plans/) 文件。

| Slice | 內容 | 上線 |
|---|---|---|
| **A** | 9 大健康面向探索入口 + Modal | 2026-05-15 |
| **A.5** | 90 個推薦習慣 seed（後續擴充到 105） | 2026-05-18 |
| **B** | 錨點 × 行為配對：選錨點 → 選身分 → 寫進 task | 2026-05-18 |
| **F** | 每日重置 Checklist（subtask 版本化 + Google-Calendar 風格編輯） | 2026-05-18 |
| **E** | 身分認同 — TaskCard 顯示 identity；通用 + 推薦兩層；4 種類型個別預設 | 2026-05-19 |
| **G** | 女性小課程 — 4 個 14 天花朵 template（雛菊/玫瑰/蘭花/向日葵），含生理期 phase | 2026-05-19 |
| **H** | 14 天睡眠處方 — 4 個睡眠 template（壓力/節律/代謝失衡/荷爾蒙），dual-typing CTA | 2026-05-20 |
| **I** | Stats + Streak 頁 — 5 widget + dynamic-import 省 100kB | 2026-05-21 |
| **J** | Template Detail Panel — 點 carousel 卡 → 滑入詳細頁看 4 phase 任務 | 2026-05-21 |
| **K** | 嚮往系統 — 從「為了什麼」出發推薦習慣（含身分宣告整併） | 2026-05~06 |
| **L** | 焦點地圖候選池 — Impact×Ability 評分挑黃金行為 | 2026-05~06 |
| **M** | 任務卡精修 — 暫停/隱藏/刪除/排序/swipe | 2026-05~06 |
| **N** | 科學佐證 HabitInsight + 證據力指標（102 習慣已建） | 2026-06 |
| **O/P/Q** | 遊戲化世界層（完成地點/旅程城市/世界切換/美食回憶，持續精進中） | 2026-06 |
| **焦點地圖重設計** | 三階段引導流程、去 Fogg、養成期間、難度自動 | 2026-06-06 |
| **社群計畫** | 嚮往→可分享計畫、送審、社群分區、作者標示 | 2026-06-06 |
| **後台授權** | `/api/admin/*` 伺服器端 cookie 授權 | 2026-06-06 |

### 2026-05-22 整理日（無 slice 編號）

| 主題 | 改動 |
|---|---|
| **行動裝置佈局** | 多項手機 viewport 問題修正：`page.js` wrapper 拿掉、`overflow-x: hidden` 安全網、iOS Safari URL bar 用 `dvh`、AppHeader 5 icon 全可見、TaskCard `min-w-0` |
| **TemplateExplorer carousel** | 從 vertical list 改成 horizontal snap-scroll（每行 1.2~3 張卡，看下一張 peek） |
| **PlanCategory 統一** | 把 lib 端的 8 個 slug（花朵 4 + 睡眠 4）與 admin 端的 PlanCategory table 合併 → 加 `slug @unique` + `isSystem Boolean`。Admin 可改顏色 / icon / order，但系統列鎖住 name |
| **計畫模板管理 UI 大改** | Admin 卡片用 PlanCategory 顏色 + emoji；rename「模板管理」→「計畫模板管理」；Sidebar 重排（建材 → 成品 → 使用者 → 權限）|
| **三端顏色一致** | Admin 列表 / User carousel / Detail Panel 三邊 chip 都讀同一個 PlanCategory，admin 改顏色立刻生效 |
| **日期瀏覽** | AppHeader 週列從裝飾變互動：點未來看計畫預覽（鎖住）、點過去看歷史完成、自動切換 section 標題 |

---

## 5. 路線圖（還沒做的）

### 短期 — 本月內可做
- **睡眠分型問卷頁**：把 `User.sleepTypeKey` 從 admin 手動設定改成使用者填問卷自動分型
- **花朵型問卷頁**：同上，`User.typeKey`
- **計畫分類 drag-to-reorder**：admin 直接拖拉 PlanCategory 的 order 欄位
- **內容方意見回鍋**：
  - 女性小課程：[`docs/notes/2026-05-19-women-course-content-feedback.md`](notes/2026-05-19-women-course-content-feedback.md)
  - 睡眠處方：[`docs/notes/2026-05-20-sleep-course-content-feedback.md`](notes/2026-05-20-sleep-course-content-feedback.md)
- **計畫詳細頁也顯示 cue / identity per task**（目前只顯示 task title）

### ✅ 已完成（原列為「未做」，現已上線）
- ~~**D — 焦點地圖（Impact × Ability）**~~ → **已上線**（Slice L）並於 2026-06-06 重設計，見 §0。
- ~~嚮往系統~~、~~科學佐證~~ → 已上線（見 §0）。

### 中期 — 需 spec 才能動工
- **使用者認證整合 cofit 會員系統**：目前使用者資料 API 仍信任前端 userId（資安缺口），預計整合 cofit 既有會員系統當身分來源（工程細節與待確認項見 `HANDOFF.md` §4-1）。**上線前必處理。**
- **C — AI 雙軌 Brainstorm**：使用者輸入目標 → Gemini 生 10 個 anchor × 10 個 behavior 候選 → 配對 UI（焦點地圖的分階段/文案未來可由 AI 強化）
- **社群計畫進階**：作者頁、追蹤、熱門排行、檢舉機制（目前 v1 僅：生成→送審→公開分區）
- **通知系統**：依錨點 / 時段觸發 push 提醒
- **付費 / 訂閱模型**（商業模式 strawman 見 `STRATEGY.md`）

### 長期 / 想法
- 教練端 dashboard（admin 角色看自己客戶的進度）
- 與穿戴裝置 / 健康 App 資料整合（Apple Health / Google Fit）
- AI 對話式 reflection（每週問 3 題判斷 phase 進度）

---

## 6. 設計原則（不變的）

1. **行為科學優先於 gamification** — 徽章、解鎖在 anchor / identity 沒站穩前先不做
2. **不鼓勵不健康行為** — 點心不在 meal pattern 預設；不推「再多吃一餐」
3. **斷食友善** — meal 類習慣自然支援 IF / OMAD（選低難度就達標，不用刪 subtask）
4. **強型別承諾** — 花朵 / 睡眠 typing 跟 lib 程式碼鎖住，admin 不能改 slug（避免推薦邏輯被誤改）
5. **完整深度 > 草草上線** — 每個 slice 全做 schema + UI + seed + 測試 + 部署
6. **YAGNI** — 每個 spec 明確列「不做」項，避免 scope creep
7. **手機優先** — 主要受眾在手機上使用；桌面是 sidebar + 中央 phone-canvas frame

---

## 7. 內容團隊接點

### 計畫模板（Template）
- **DB**：`Template` table（9 筆，全 public）
- **管理 UI**：`/admin/dashboard/templates` — 任何 expert 都看得到全部，可編輯 task 內容、phase 結構
- **新增**：admin 用 `+ 新增模板`；複雜情況也可寫 seed JSON + script（如 `seed-sleep-templates.js`）
- **結構**：v2.0 用 `{ version, phases: [{ id, name, days, tasks: [{ title, details, cue, identity, ... }] }] }`
- **社群計畫（2026-06-06 起）**：使用者也能自建計畫並申請公開。這些是 `authorType='user'`、需在 `/admin/dashboard/templates/review` **審核核准**後才出現在探索計畫的「社群計畫」分區；標示「用戶自創 · by 作者」。官方計畫不受影響。

### 計畫分類（PlanCategory）
- **DB**：`PlanCategory` table，13 筆（5 user-defined + 8 system）
- **管理 UI**：`/admin/dashboard/templates/categories`
- **規則**：
  - User-defined（健康生活 / 運動健身 / ...）：可自由改名、刪除、加新
  - System（🔒 標記）：是花朵 + 睡眠 8 個 slug，**只可改顏色 / icon / 排序**，不能改名也不能刪
- **效用**：每個 PlanCategory 的 `color` 與 `icon` 直接決定 admin 卡片、User carousel、Detail Panel 上 chip 的視覺

### 推薦習慣（OfficialHabit）
- **DB**：`OfficialHabit` table，105 筆
- **管理 UI**：`/admin/dashboard/habits`
- **結構**：每個 habit 有 3 個難度層級 `{ beginner, intermediate, challenge }`，每層帶獨立 `dailyTarget` / `unit` / `subtasks` / `recurrence`
- **9 個分類**：來自 `HabitCategory` table（不可改名 — 對應 GENESIS+IO 模型）

### 內容方意見流程
1. 收 Excel / 文件 → 工程方寫成 `docs/notes/YYYY-MM-DD-<topic>-feedback.md`
2. 跟內容方來回收斂 typo + 結構問題
3. 確認後改 seed JSON / 直接在 admin 改
4. 觀察使用者完成率回饋

---

## 8. 給需求單位的常見問答

| 問題 | 答案 |
|---|---|
| 我們有多少使用者？ | 看 Vercel Postgres `User` table；本日 9 個（包含測試帳號）|
| 我能直接從後台改計畫內容嗎？ | 可以。`/admin/dashboard/templates` 點任一個 → 編輯。但是花朵 / 睡眠的 category 不能改名 |
| 改了 PlanCategory 顏色，使用者要重新整理才看得到嗎？ | 開新一次計畫探索 modal 就會 fetch 新值。不需要重新登入 |
| 內建習慣可以新增嗎？ | 可以。`/admin/dashboard/habits` 直接 UI 加。Habit 不能屬於系統分類以外的 9 個 domain |
| 為什麼睡眠 / 花朵分型不能在後台改？ | 程式碼 lib 那邊的 enum 是 source of truth（避免 admin 改了一個字 → 推薦邏輯壞掉）。要新增分型要走 spec → plan |
| 一個計畫最多幾天？ | 沒硬性上限，但目前花朵 / 睡眠處方都是 14 天 × 4 phase |
| 使用者可以看未來的計畫嗎？ | 可以。daily view 點未來日 → 預覽（鎖住，不能提前打勾）|

---

## 9. 文件導覽

- **這份文件** — 產品全景
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — 技術全景（給工程師 / 想深入的 PM）
- [`superpowers/specs/`](superpowers/specs/) — 每個 slice 的設計 spec（為什麼這樣做、不做什麼、驗收條件）
- [`superpowers/plans/`](superpowers/plans/) — 每個 slice 的實作 plan（步驟細節 + 測試 + commit）
- [`notes/`](notes/) — 內容方意見回饋
- [README](../README.md) — 開發者快速上手
