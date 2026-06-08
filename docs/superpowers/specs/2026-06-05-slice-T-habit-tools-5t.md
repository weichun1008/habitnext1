# Slice T — 5T 地基 + 習慣輔助工具（Tool）Design Spec

> 狀態：已定案待建 · 日期 2026-06-05（音樂工具 2026-06-08 升級納入 v1）
> PM 定案：先打 **5T metadata 地基**；虛擬工具 v1 做 **呼吸引導 + 計時器/番茄鐘 + 睡眠音樂**（三工具一起）；實體工具做 metadata + 顯示。
> 音樂資料來源：sibling repo `gaia-t/sleepmusic`（44 首睡眠音樂、4 分類、4 分型）。音檔託管 v1 採 **A 案：直接用現有 4 首 Suno CDN**（每睡眠分型剛好 1 首可播，其餘 40 首顯示「即將推出」）；Vercel Blob 自託管排 v2。

## 0. 一句話
在習慣上長出「支援系統」——先鋪 5T metadata 地基（Train/Tool/Tiny/Tribe/Triumph），並讓 **Tool** 成為第一個落地的 T：有工具的習慣，任務卡多一個「▶ 開始」→ 打開 **呼吸引導 / 計時器 / 睡眠音樂** widget，跑完可自動打卡；實體工具（眼罩/伏地挺身架/保健品）在詳情頁列出。

## 1. 範圍
### 做（v1）
- **5T metadata 地基**：`OfficialHabit.fiveT Json?`（library 端），`Task.toolType` + `Task.toolConfig`（任務端的虛擬工具）。
- **三個虛擬工具**：
  - `BreathingTool`（吸/憋/吐動畫節拍器，可設 pattern + 循環數）
  - `TimerTool`（倒數 / 番茄鐘）
  - `MusicTool`（睡眠音樂播放器：依 problemId/categoryId/trackId 載曲、`<audio>` 播放、倒數計時自動停）
- **工具啟動 UI**：任務卡 / 詳情頁的「▶ 開始」→ `ToolModal` 載入對應 widget；widget 完成 → 可選自動完成該習慣（走既有 `onUpdate('toggle'/'add')`）。
- **實體工具顯示**：詳情頁列出 `fiveT.toolPhysical`（名稱 + 選填連結）。
- **音樂曲庫**：把 sleepmusic 的 `TRACKS / CATEGORIES / PROBLEMS`（44 首）搬進 `lib/musicData.js`（移除 TS 型別、ESM/CJS export）。其中 t41–t44（每分類各 1 首）有真實 `audioUrl`（Suno CDN）可播，其餘 40 首為 metadata-only（顯示「即將推出」、不可播）。
- **Seed**：為庫裡明顯適用的習慣填 `fiveT.toolVirtual`：
  - breathing → 4-7-8 呼吸、循環呼吸、腹式呼吸、睡前深呼吸
  - timer → 番茄鐘、棒式、午睡、冥想、靜默、5分鐘放空
  - music → 睡前放鬆、助眠、午睡（掛 `{type:'music', params:{problemId:...}}`）
  - `toolPhysical` → 眼罩、伏地挺身架、保健品

### 不做（留後）
- 音檔全量補齊（44 首）/ Vercel Blob 自託管（v2，需音檔 + 計費 + 法務）。
- sleepmusic 的 Recommendation / Explore / Favorites / Gemini 個人化推薦 view（5T tool 入口由任務 toolConfig 驅動，不需要這些探索 view）。
- 跨任務全域 mini player。
- Train(Skill 教學內容) / Tribe(社群) / Triumph(排行榜/Co幣)——`fiveT` 欄位預留結構，內容不填。
- 自訂工具編輯器（v1 工具設定由 seed/admin 給）。

## 2. 資料模型（additive）
```prisma
model OfficialHabit {
  // ... 既有 ...
  fiveT  Json?   // ★ Slice T — { skill?, toolVirtual?:{type:'breathing'|'timer'|'music', params}, toolPhysical?:[{name,url?}], tiny?, tribe?, triumph? }
}
model Task {
  // ... 既有 ...
  toolType    String?  // ★ Slice T — 'breathing' | 'timer' | 'music' | null（任務端啟用的虛擬工具）
  toolConfig  Json?    // 工具參數（見下）
}
```
toolConfig 形狀（依 type）：
- `breathing` = `{ inhale, hold, exhale, cycles }`
- `timer` = `{ seconds, mode:'count'|'pomodoro', rounds? }`
- `music` = `{ problemId?, categoryId?, trackId?, playMode?:'loop'|'similar', timerMin?, autoComplete? }`
  - `problemId` ∈ `stress|circadian|metabolic|hormonal`（對應 4 睡眠分型）
  - `categoryId` ∈ `calm|routine|guard|relax`（對應 4 類聲音）
  - 解析優先序：`trackId` → `categoryId` → `problemId`（推薦分類）→ 全曲庫

- 從 library 建立任務時，把 `OfficialHabit.fiveT.toolVirtual` 複製到 `Task.toolType/toolConfig`。
- 皆 nullable、additive，`prisma db push` 安全。

## 3. 元件
- `web-app/src/lib/tools.js`（CommonJS, TDD）：`defaultToolConfig(type)`（含 music 預設 `{ playMode:'similar', timerMin:30, autoComplete:true }`）、`describeTool(type,config)`（顯示文字，如「4-7-8 呼吸 × 5 輪」「番茄鐘 25 分」「壓力型睡眠音樂 · 30 分」）、breathing 相位序列產生器 `breathingPhases(config)`（純函式）。
- `web-app/src/lib/musicData.js`：`TRACKS / CATEGORIES / PROBLEMS`（44 首，由 sleepmusic data.ts 轉成 JS，CJS export 供測試）。
- `web-app/src/lib/musicTool.js`（CommonJS, TDD）：
  - `resolveTracks(config)` → 依 trackId/categoryId/problemId 解出播放清單（清單排序：有 audioUrl 的優先）
  - `playableTracks(list)` → 只回有 audioUrl 的
  - `describeMusic(config)` → 顯示文字
- `components/tools/BreathingTool.jsx`：吸→憋→吐 SVG/CSS 動畫圓（依 config 計時），輪數進度，結束 callback。零依賴、尊重 prefers-reduced-motion、無 emoji。
- `components/tools/TimerTool.jsx`：倒數圓環 + 開始/暫停/重設；pomodoro 模式（work/break 輪）。結束 callback。
- `components/tools/MusicTool.jsx`：
  - 上方：當前 track 封面 + 標題 + oneLiner
  - 中間：播放/暫停（lucide Play/Pause）、剩餘倒數時間
  - 下方：清單（similar 模式預覽同類下一首）、playMode 切換、timer 分鐘調整
  - `<audio ref>` 控制播放；倒數結束 → 淡出 → `onComplete()`
  - 無 audioUrl 的 track 顯示「即將推出」標籤、不可選播
  - 尊重 prefers-reduced-motion、無 emoji
- `components/tools/ToolModal.jsx`：依 `toolType` 載入對應 widget（breathing/timer/music）；標題、關閉、完成時 `onComplete()`。
- `components/tools/PhysicalToolsList.jsx`：詳情頁列實體工具（lucide icon + 名稱 + 選填外連）。

## 4. 接線
- `TaskCard`：`task.toolType` 有值 → 顯示「▶ 開始」次要鈕（lucide `Play`），點擊開 `ToolModal`（stopPropagation，不觸發詳情）。
- `MainApp`：`handleStartTool(task)` 開 ToolModal；`onComplete` → 視 config 決定是否自動 `handleTaskUpdate(task,'toggle'/'add'...)`（v1：breathing/timer 跑完自動打卡；music 依 `toolConfig.autoComplete`，預設 true）。
- `TaskDetailModal`：顯示 `PhysicalToolsList`（若 OfficialHabit.fiveT.toolPhysical 有值；任務經 officialHabitId 取）。

## 5. 測試（TDD）
- `tools.js`：defaultToolConfig 各型（含 music）、breathingPhases（4-7-8 → 正確相位序列/總時長）、describeTool 文字。
- `musicTool.js`：resolveTracks（trackId / categoryId / problemId / 空 config 各組合）、playableTracks 過濾、describeMusic 文字。
- `BreathingTool`/`TimerTool` RTL：渲染、開始→相位/倒數推進（fake timers）、完成觸發 onComplete。
- `MusicTool` RTL：渲染當前曲目、播放/暫停按鈕觸發 `<audio>` play/pause（mock HTMLMediaElement）、timer fake timers 推進到結束→onComplete、similar 模式下一首切換、無 audioUrl 顯示「即將推出」且不嘗試播放。
- ToolModal：依 toolType 載對應 widget（含 music case）。
- seed 不破壞既有測試。

## 6. 守則
- 無 emoji（lucide）；CTA hover；零懲罰（工具是輔助、跳過/提早結束零成本）；尊重 reduced-motion；純前端零外部依賴（`<audio>` 直接吃 Suno CDN URL，跨網域播放不需 CORS）。

## 7. 驗收
- 對「4-7-8 呼吸」習慣按「▶ 開始」→ 呼吸動畫跑 5 輪 → 自動打卡。
- 對「番茄鐘」按開始 → 倒數 → 完成。
- 對掛 music tool 的睡眠習慣按「▶ 開始」→ 載入該分型推薦曲（4 分型各有 1 首可播）→ 播放 → 倒數結束自動打卡。
- 詳情頁對有實體工具的習慣顯示建議物件。
- 全測試 + build 綠。
- 未設工具的習慣行為完全不變（無回歸）。

## 8. 未來接縫（v2+）
- 音檔全量：請 sleepmusic 同事補產 40 首 → Vercel Blob 自託管（`BLOB_READ_WRITE_TOKEN`），URL 永久可控、不依賴 Suno CDN 存活。
- sleepmusic 的個人化推薦（Gemini）/ 探索 view 可選擇性移植。
- Train(Skill) = `fiveT.skill`（教學 GIF/影片）顯示在詳情。
- 實體工具連結 → cofit 電商/聯盟（Triumph 實體獎勵）。
