# HabitNext — Product Map

> 給 PM / 設計師 / 未來合作者讀的一頁產品地圖。給工程細節請看 [`superpowers/specs/`](superpowers/specs/)。

## 是什麼

HabitNext 是一個基於**行為科學**的習慣養成 web app。跟一般打卡 app 不同的地方：

- **錨點 (Anchor)**：每個習慣綁定一個既有的日常時刻（起床後、午餐後、刷牙後…）— BJ Fogg 微習慣模型
- **分難度 (Difficulty)**：入門 / 進階 / 挑戰 — 使用者可自我評估與進化
- **9 大健康面向 (GENESIS+IO)**：基因與腸道、環境、飲食、運動、壓力與睡眠、社交互動、心靈、認知與智慧、職涯與平衡 — 整全健康
- **每餐型 checklist 每日重置**：「每餐都要有蛋白質」這類習慣每天獨立追蹤，不會把昨天的勾選帶到今天

## 目標使用者

行為改變專業人士（教練、營養師、心理師）和重視「不是只打卡、要真的改變身分」的個人使用者。

---

## 已完成的功能

### Slice A — 9 大健康面向探索入口
[Spec](superpowers/specs/2026-05-15-explore-habits-slice-a-genesis-io-design.md) · 上線 2026-05-15

從 sidebar 點「探索習慣」進入 → 看到 3×3 的 9 個分類卡片（每個有 Lucide icon + 配色） → 點某個 domain → 看到該分類下的推薦習慣。Modal 設計為 2-view + search 視圖切換。

**為什麼這樣設計**：使用者不知道從哪開始時，9 個健康面向是清晰的起點。比起一個又長又雜的「全部習慣」列表，分類入口讓人能依當下最在意的面向探索。

### Slice A.5 — 90 個推薦習慣 seed
[Spec](superpowers/specs/2026-05-18-slice-a5-recommended-habits-seed-design.md) · 上線 2026-05-18

9 個分類各 10 個推薦習慣，每個含 1-2 句行為原理描述與 3 個難度設定。例：「每天喝足 2500cc 水」的入門 1500cc / 進階 2000cc / 挑戰 2500cc。

**為什麼這樣設計**：探索入口若是空的就沒意義。內建 90 個習慣讓使用者立刻有得選；難度階梯讓「我能做到」與「進步空間」並存。

**沒有點心 slot**：刻意不鼓勵「再多吃一餐」。

### Slice B — 錨點 × 行為配對
[Spec](superpowers/specs/2026-05-18-slice-b-anchor-pairing-design.md) · 上線 2026-05-18

選好習慣後多一步「選錨點」：
- **你的習慣**：使用者既有的 active task 可當錨點（只列 binary 類型，因為「飲水 2000cc」這類累積目標當錨點意義不大）
- **生活時刻**：內建 30 個，分早晨/中午/晚上/工作/通勤/任意時刻六組
- **自訂錨點**：30 字內輸入框

加入後 TaskCard 顯示 `午餐後 → 喝 250cc 水`，強化 BJ Fogg「After X, I will Y」結構。

**為什麼這樣設計**：沒有錨點的習慣容易忘記做，因為沒有日常觸發。把 trigger 顯眼地擺在 task 名稱上方，是行為科學上很有效的「微提示」。

### Slice F — 每日重置 Checklist + Google Calendar 風格編輯
[Spec](superpowers/specs/2026-05-18-slice-f-recurring-checklist-design.md) · 上線 2026-05-18

針對「每餐都要有蛋白質」「每餐前先喝一杯水」這類**每天必做 N 次**的習慣：
- Subtasks 結構升級為時間軸版本化：`{id, label, addedAt, removedAt?}`
- Completion state 從 master 物件搬到 `TaskHistory` per-date — **每天自動重置**
- 編輯 subtask 時可選「**從今天起不再出現**（過去保留）」或「**永久刪除（含歷史紀錄）**」，像 Google Calendar 編輯週期事件那樣

連同 4 個既有 meal habit 一起升級到 checklist 結構。

**為什麼這樣設計**：原本的 checklist 有 bug — 今天勾「早餐」會永遠勾住。對「每餐做某事」的習慣這完全行不通。修完之後也順帶提供斷食族（16:8、OMAD）的優雅支援：選低難度即可達標，不用刪 subtask。

### 其他改進
- 探索 Modal 的 habit card 點開可看完整 description + 三難度詳情（detail preview）
- Sidebar 三層 CTA：探索計畫（templates）/ 探索習慣（NEW）/ 建立習慣（manual）
- TaskCard cue 顯示在 title 上方而非下方，更清晰
- Admin 新增同名 habit 從 generic 500 改回友善 409

---

## 還沒做的（路線圖）

### Slice C — AI 雙軌 Brainstorm
[PRD v1 F2]

使用者輸入一個目標（例：改善睡眠品質） → Gemini API 生 10 個 anchor 候選 × 10 個 behavior 候選 → 配對 UI 讓使用者自由組合。需要後端 server-side API 整合 + prompt engineering + rate limit / cost 管理。

### Slice D — 焦點地圖（Impact × Ability）
[PRD v1 F3]

對多個候選 behavior 進行 2D 評估（影響力 × 執行難度），視覺化成四象限，找出「黃金行為」優先養成。需要 Slice C 先產出 behavior 候選池。

### Slice E — 身分認同（Identity）
[PRD v1 F4 + F7]

每個習慣綁定一個身分宣告（「我是個照顧自己身體的人」），TaskCard 顯示。同時 AI 根據使用者所有 habits 動態生成「身分稱號 + 宣言」放在 dashboard。**這是 James Clear 原子習慣的核心，也是 app 跟一般打卡工具最大差異化的點。**

### Slice F+ (技術債清單)
- `OfficialHabit.icon` 從 emoji 換 Lucide
- 兩個 routine 類 checklist（晨間脊椎伸展操、建立固定的睡前儀式）的 subtasks 留空，使用者得自填
- 通知 / 提醒系統（根據錨點觸發推播）
- 統計頁、Streak 視覺化

---

## 設計原則

1. **行為科學優先於 gamification**：徽章、勳章、解鎖在沒站穩 anchor / identity 之前先不做
2. **不鼓勵不健康行為**：點心不在 meal pattern 預設，因為「再多吃一餐」不是健康目標
3. **斷食友善**：所有 meal 類習慣自然支援 IF / OMAD — 選低難度即可
4. **完整深度 > 草草上線**：每個 slice 全做完 schema + UI + seed + 測試，不留半成品
5. **YAGNI**：每個 slice 明確列「不做」項，避免 scope creep

---

## 技術差異點（給工程合作者）

- **Slice 化開發**：每個功能走 spec → plan → execute → review，4 個已完成 slice 的紀錄都在 `superpowers/`
- **Dev = Prod 共用 DB**：每次腳本跑都會動到 production，注意安全
- **無 migration 歷史**：用 `prisma db push`，schema = 真相來源
- **TDD 用在 pure helpers**：UI 用 React Testing Library，DB 操作靠 idempotent seed script

詳情看 [README](../README.md) 與各 slice 的 spec / plan。
