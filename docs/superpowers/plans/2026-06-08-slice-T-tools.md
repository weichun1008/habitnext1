# Slice T — 5T Tool（呼吸 + 番茄鐘 + 音樂）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use `- [ ]`.

**Goal:** 在習慣上長出第一個落地的 T（Tool）：有工具的習慣，任務卡多「▶ 開始」→ ToolModal 載入 呼吸 / 番茄鐘 / 睡眠音樂 widget，跑完自動打卡；詳情頁列實體工具。

**Architecture:** 純前端 widget + additive nullable schema（`Task.toolType/toolConfig`、`OfficialHabit.fiveT`）。toolType/toolConfig 走與 Slice U `direction` 完全相同的 threading（API tasks route data block → TaskLibraryModal emitPendingTask → MainApp create payload）。音樂曲庫由 `gaia-t/sleepmusic` data.ts 搬入（暫存於 `web-app/.refs/sleepmusic-data.ts`），v1 只有 t41–t44（每分類 1 首）有真實 Suno CDN audioUrl 可播。

**Tech Stack:** Next.js 14 · React 18 · lucide-react（無 emoji）· Prisma · Jest + RTL。零外部依賴，`<audio>` 直接吃 CDN URL。

---

### Task T-T1: Schema + API 欄位

**Files:**
- Modify: `web-app/prisma/schema.prisma`（Task + OfficialHabit）
- Modify: `web-app/src/app/api/tasks/route.js`（POST data block）
- Modify: `web-app/src/app/api/tasks/[id]/route.js`（PUT data block，若有 update 白名單）

- [ ] **Step 1:** schema 加 additive nullable 欄位：
  - `Task`：`toolType String?` + `toolConfig Json?`（緊接既有 `direction` 後，加註解）
  - `OfficialHabit`：`fiveT Json?`（加註解：`{ skill?, toolVirtual?:{type:'breathing'|'timer'|'music', params}, toolPhysical?:[{name,url?}], tiny?, tribe?, triumph? }`）
- [ ] **Step 2:** `api/tasks/route.js` POST 的 `data: {}` 加 `toolType: taskData.toolType ?? null,` `toolConfig: taskData.toolConfig ?? null,`（仿 line 73 `direction`）。
- [ ] **Step 3:** `api/tasks/[id]/route.js` PUT 若有欄位白名單，同樣加 toolType/toolConfig（讓 TaskFormModal 編輯可存）。
- [ ] **Step 4:** 載入 env 跑 `npx prisma generate`（不要在這裡 db push 到共用 DB；db push 由部署 build 處理）。`set -a && . ./.env.local && set +a && npx prisma generate`
- [ ] **Step 5:** commit `feat(slice-T): schema toolType/toolConfig + OfficialHabit.fiveT + API threading`

### Task T-T2: lib/tools.js + TDD

**Files:**
- Create: `web-app/src/lib/tools.js`（CommonJS `module.exports`）
- Test: `web-app/src/__tests__/lib/tools.test.js`

- [ ] **Step 1:** 先寫測試（red）：
  - `defaultToolConfig('breathing')` → `{ inhale:4, hold:7, exhale:8, cycles:5 }`（4-7-8 預設）
  - `defaultToolConfig('timer')` → `{ seconds:1500, mode:'count' }`（25 分）
  - `defaultToolConfig('music')` → `{ playMode:'similar', timerMin:30, autoComplete:true }`
  - `breathingPhases({inhale:4,hold:7,exhale:8,cycles:1})` → `[{phase:'inhale',seconds:4},{phase:'hold',seconds:7},{phase:'exhale',seconds:8}]`；cycles:2 → 6 個相位；hold:0 略過 hold 相位
  - `describeTool('breathing',{inhale:4,hold:7,exhale:8,cycles:5})` → 含「4-7-8」與「5 輪」
  - `describeTool('timer',{seconds:1500,mode:'count'})` → 含「25 分」
  - `describeTool('timer',{seconds:1500,mode:'pomodoro',rounds:4})` → 含「番茄鐘」
- [ ] **Step 2:** 跑測試確認 fail。
- [ ] **Step 3:** 實作 tools.js 讓測試綠。純函式、無副作用。
- [ ] **Step 4:** `npm test -- tools.test` 綠。
- [ ] **Step 5:** commit `feat(slice-T): lib/tools.js (defaultToolConfig/breathingPhases/describeTool) + TDD`

### Task T-T3: 音樂曲庫 lib/musicData.js + lib/musicTool.js + TDD

**Files:**
- Create: `web-app/src/lib/musicData.js`（由 `web-app/.refs/sleepmusic-data.ts` 轉換）
- Create: `web-app/src/lib/musicTool.js`（CommonJS）
- Test: `web-app/src/__tests__/lib/musicTool.test.js`

- [ ] **Step 1:** 把 `.refs/sleepmusic-data.ts` 的 `PROBLEMS / CATEGORIES / TRACKS` 轉成 `musicData.js`：移除 TS import/型別，改 `const PROBLEMS=[...]; const CATEGORIES=[...]; const TRACKS=[...]; module.exports={PROBLEMS,CATEGORIES,TRACKS};`（保留全部 44 首與所有欄位，含 t41–t44 的 audioUrl）。**完整 44 首，不可截斷。**
- [ ] **Step 2:** 寫 musicTool 測試（red）：
  - `resolveTracks({trackId:'t41'})` → `[t41]`
  - `resolveTracks({categoryId:'calm'})` → 11 首 calm；第一個是有 audioUrl 的 t41（playable 優先排序）
  - `resolveTracks({problemId:'stress'})` → recommendedCategoryId='calm' → 同上 calm 清單
  - `resolveTracks({})` → 全 44 首（playable 優先）
  - `playableTracks(resolveTracks({categoryId:'calm'}))` → 只剩有 audioUrl 的（1 首：t41）
  - `describeMusic({problemId:'stress',timerMin:30})` → 含「壓力」與「30 分」
- [ ] **Step 3:** 跑測試 fail。
- [ ] **Step 4:** 實作 musicTool.js（從 musicData 讀資料）讓測試綠。
- [ ] **Step 5:** `npm test -- musicTool.test` 綠。
- [ ] **Step 6:** commit `feat(slice-T): musicData (44 sleep tracks) + musicTool resolver + TDD`

### Task T-T4: BreathingTool.jsx + RTL

**Files:**
- Create: `web-app/src/components/tools/BreathingTool.jsx`（`'use client'`）
- Test: `web-app/src/__tests__/components/BreathingTool.test.jsx`

- [ ] **Step 1:** 測試（red，fake timers）：渲染顯示第一相位「吸氣」；點開始後用 `jest.advanceTimersByTime` 推進 → 相位推進到「憋氣」「吐氣」；跑完全部 cycles → `onComplete` 被呼叫一次。尊重 reduced-motion（測試可略，僅實作）。
- [ ] **Step 2:** fail。
- [ ] **Step 3:** 實作：依 `breathingPhases(config)` 跑相位，CSS scale 動畫圓（吸氣放大/吐氣縮小），輪數進度文字，開始/暫停/略過鈕（lucide Play/Pause/SkipForward），`prefers-reduced-motion` 時關動畫只留文字倒數。無 emoji。
- [ ] **Step 4:** 測試綠。
- [ ] **Step 5:** commit。

### Task T-T5: TimerTool.jsx + RTL

**Files:**
- Create: `web-app/src/components/tools/TimerTool.jsx`
- Test: `web-app/src/__tests__/components/TimerTool.test.jsx`

- [ ] **Step 1:** 測試（red, fake timers）：渲染顯示初始倒數（mm:ss）；開始後推進時間 → 倒數遞減；歸零 → `onComplete`；pomodoro 模式跑完 work 進入 break。
- [ ] **Step 2:** fail。
- [ ] **Step 3:** 實作：SVG 圓環進度 + mm:ss + 開始/暫停/重設（lucide Play/Pause/RotateCcw）；count 模式單段；pomodoro work/break 輪。結束 onComplete。無 emoji。
- [ ] **Step 4:** 綠。
- [ ] **Step 5:** commit。

### Task T-T6: MusicTool.jsx + RTL

**Files:**
- Create: `web-app/src/components/tools/MusicTool.jsx`
- Test: `web-app/src/__tests__/components/MusicTool.test.jsx`

- [ ] **Step 1:** 測試（red）。測試頂部 mock 媒體 API：
  ```js
  window.HTMLMediaElement.prototype.play = jest.fn().mockResolvedValue();
  window.HTMLMediaElement.prototype.pause = jest.fn();
  ```
  - 渲染 `config={problemId:'stress'}` → 顯示推薦曲（t41「Moss Room」）標題 + oneLiner
  - 點播放鈕 → `play` 被呼叫；再點 → `pause`
  - fake timers 推進到 `timerMin` 結束 → `onComplete` 被呼叫
  - 給一個無 audioUrl 的 track（如 categoryId 清單裡的 t1）→ 顯示「即將推出」標籤、播放鈕 disabled / 不呼叫 play
- [ ] **Step 2:** fail。
- [ ] **Step 3:** 實作：用 `resolveTracks(config)` 取清單、預設選第一首 playable；`<audio ref>` 控制；封面 + 標題 + oneLiner；播放/暫停（lucide Play/Pause）；剩餘倒數（mm:ss，到 0 淡出 onComplete）；下方清單（similar 模式可切下一首，無 audioUrl 顯示「即將推出」灰標、不可播）；playMode 切換 + timer 分鐘調整。無 emoji、尊重 reduced-motion。
- [ ] **Step 4:** 綠。
- [ ] **Step 5:** commit。

### Task T-T7: ToolModal.jsx + PhysicalToolsList.jsx

**Files:**
- Create: `web-app/src/components/tools/ToolModal.jsx`
- Create: `web-app/src/components/tools/PhysicalToolsList.jsx`
- Test: `web-app/src/__tests__/components/ToolModal.test.jsx`

- [ ] **Step 1:** 測試（red）：ToolModal `toolType='breathing'` 渲染 BreathingTool；`'timer'` → TimerTool；`'music'` → MusicTool；點關閉觸發 `onClose`；widget onComplete → ToolModal `onComplete` 轉呼叫。
- [ ] **Step 2:** fail。
- [ ] **Step 3:** 實作 ToolModal（overlay + 標題 `describeTool` + 關閉鈕 lucide X + 依 toolType switch 載 widget；傳 config、onComplete）。PhysicalToolsList（接 `items=[{name,url?}]`，lucide icon + 名稱；有 url 顯示外連 lucide ExternalLink，hover 微互動；空陣列回 null）。
- [ ] **Step 4:** 綠。
- [ ] **Step 5:** commit。

### Task T-T8: TaskCard ▶ 開始 + MainApp 接線 + 欄位 threading

**Files:**
- Modify: `web-app/src/components/TaskCard.jsx`
- Modify: `web-app/src/components/MainApp.jsx`
- Modify: `web-app/src/components/TaskLibraryModal.jsx`
- Test: 擴充 `web-app/src/__tests__/components/TaskCard.test.jsx`

- [ ] **Step 1:** 測試（red）：給 `task.toolType='breathing'` 的 TaskCard → 出現「開始」鈕（lucide Play）；點擊呼叫 `onStartTool(task)` 且**不**觸發 `onClick`（stopPropagation）。無 toolType 不顯示鈕。
- [ ] **Step 2:** fail。
- [ ] **Step 3:** TaskCard：`task.toolType` 有值時，在動作區加次要鈕「開始」（lucide Play，hover 微互動），`onClick={(e)=>{e.stopPropagation(); onStartTool?.(task);}}`。新增 `onStartTool` prop。
- [ ] **Step 4:** MainApp：
  - state `activeToolTask`；`handleStartTool(task)=>setActiveToolTask(task)`；render `<ToolModal>` when set。
  - ToolModal `onComplete`：依工具決定自動打卡——binary → `handleTaskUpdate(task,'toggle',...today)`；quantitative → `handleTaskUpdate(task,'add',1)`；music 看 `toolConfig.autoComplete`（預設 true）。完成後關 modal。
  - 把 `onStartTool={handleStartTool}` 傳給 TaskCard。
  - create payload（`sanitizedData` / `taskPayload`）threads `toolType` / `toolConfig`（仿既有 direction）。
- [ ] **Step 5:** TaskLibraryModal `emitPendingTask`：從 `habit.fiveT?.toolVirtual` 帶出 `toolType: habit.fiveT?.toolVirtual?.type ?? null` 與 `toolConfig: habit.fiveT?.toolVirtual?.params ?? null`（仿 line 147 direction）。
- [ ] **Step 6:** 測試綠 + 全測試不回歸。
- [ ] **Step 7:** commit。

### Task T-T9: TaskDetailModal 實體工具

**Files:**
- Modify: `web-app/src/components/TaskDetailModal.jsx`
- Modify: `web-app/src/components/TaskFormModal.jsx`（選配：手動指派工具的 UI，若時間允許；否則略，工具由 seed/library 給）

- [ ] **Step 1:** TaskDetailModal：若該 task 對應的 OfficialHabit 有 `fiveT.toolPhysical`，渲染 `<PhysicalToolsList items={...}/>`（資料來源：task 已帶的 officialHabit 關聯，或既有 fetch；若前端拿不到 fiveT，加最小 fetch 或在 task payload 帶上）。詳情頁也顯示「▶ 開始」入口（若 toolType 有值）。
- [ ] **Step 2:** 手動驗證渲染（無嚴格單元測試門檻，避免過度 mock）。
- [ ] **Step 3:** commit。

### Task T-T10: Seed — fiveT.toolVirtual / toolPhysical

**Files:**
- Create: `web-app/scripts/seed-tools-5t.js`（idempotent upsert，仿既有 seed 腳本）
- Reference: 既有 `scripts/seed-*.js`

- [ ] **Step 1:** 腳本：對庫裡明顯適用的 OfficialHabit 以 name 比對、補 `fiveT`：
  - breathing：含「4-7-8」「呼吸」「腹式」「睡前深呼吸」 → `{toolVirtual:{type:'breathing',params:defaultToolConfig('breathing')}}`
  - timer：含「番茄」「棒式/平板」「午睡」「冥想」「靜默」「放空」 → `{toolVirtual:{type:'timer',params:{...}}}`
  - music：含「睡前放鬆」「助眠」「睡眠」 → `{toolVirtual:{type:'music',params:{problemId:'stress'}}}`（依名稱挑分型）
  - toolPhysical：睡眠相關 → `[{name:'眼罩'}]`；伏地挺身/棒式 → `[{name:'伏地挺身架'}]`；補給相關 → `[{name:'保健品'}]`
  - 只 merge fiveT，不覆蓋既有其他欄位。找不到對應習慣就 skip（log）。
- [ ] **Step 2:** 載 env 跑腳本（共用 DB，僅 update fiveT，安全）：`set -a && . ./.env.local && set +a && node scripts/seed-tools-5t.js`，確認 log 顯示更新數。
- [ ] **Step 3:** commit。

### Task T-T11: Wrap — 測試 / build / smoke / PR

- [ ] **Step 1:** `npm test`（全綠，無回歸）。
- [ ] **Step 2:** `npm run build:local`（綠）。
- [ ] **Step 3:** rebase 到最新 origin/main（避免共用 DB schema drift；確認含其他 session 欄位）。
- [ ] **Step 4:** 開 PR（標題 `feat(slice-T): 5T Tool — breathing + timer + sleep music widgets`，body 列範圍 + 音檔 v1=4 Suno + 驗收）。
- [ ] **Step 5:** 兩階段 review（spec 合規 → code quality）→ holistic review → merge → 等部署 → 線上 smoke。

---

## 驗收（對應 spec §7）
- 呼吸習慣「開始」→ 動畫跑完 → 自動打卡。
- 番茄鐘「開始」→ 倒數 → 完成。
- 睡眠音樂習慣「開始」→ 載分型推薦曲（4 型各 1 首可播）→ 播放 → 倒數結束自動打卡。
- 詳情頁顯示實體工具。
- 全測試 + build 綠；未設工具的習慣無回歸。
