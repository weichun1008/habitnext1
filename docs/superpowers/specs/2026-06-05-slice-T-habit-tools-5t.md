# Slice T — 5T 地基 + 習慣輔助工具（Tool）Design Spec

> 狀態：已定案待建 · 日期 2026-06-05
> PM 定案：先打 **5T metadata 地基**；虛擬工具 v1 先做**呼吸引導 + 計時器/番茄鐘**（Suno 音樂留 v2）；實體工具做 metadata + 顯示。

## 0. 一句話
在習慣上長出「支援系統」——先鋪 5T metadata 地基（Train/Tool/Tiny/Tribe/Triumph），並讓 **Tool** 成為第一個落地的 T：有工具的習慣，任務卡多一個「▶ 開始」→ 打開**呼吸引導 / 計時器** widget，跑完可自動打卡；實體工具（眼罩/伏地挺身架/保健品）在詳情頁列出。

## 1. 範圍
### 做（v1）
- **5T metadata 地基**：`OfficialHabit.fiveT Json?`（library 端），`Task.toolType` + `Task.toolConfig`（任務端的虛擬工具）。
- **虛擬工具**：`BreathingTool`（吸/憋/吐動畫節拍器，可設 pattern + 循環數）、`TimerTool`（倒數 / 番茄鐘）。
- **工具啟動 UI**：任務卡 / 詳情頁的「▶ 開始」→ `ToolModal` 載入對應 widget；widget 完成 → 可選自動完成該習慣（走既有 `onUpdate('toggle'/'add')`）。
- **實體工具顯示**：詳情頁列出 `fiveT.toolPhysical`（名稱 + 選填連結）。
- **Seed**：為庫裡明顯適用的習慣填 `fiveT.toolVirtual`（4-7-8 呼吸、循環呼吸、腹式呼吸、睡前深呼吸 → breathing；番茄鐘、棒式、午睡、冥想、靜默、5分鐘放空 → timer）+ 幾個 `toolPhysical`（眼罩、伏地挺身架、保健品）。

### 不做（留後）
- Suno 音樂播放器（v2，需音檔託管）。
- Train(Skill 教學內容) / Tribe(社群) / Triumph(排行榜/Co幣)——`fiveT` 欄位預留結構，內容不填。
- 自訂工具編輯器（v1 工具設定由 seed/admin 給）。

## 2. 資料模型（additive）
```prisma
model OfficialHabit {
  // ... 既有 ...
  fiveT  Json?   // ★ Slice T — { skill?, toolVirtual?:{type:'breathing'|'timer', params}, toolPhysical?:[{name,url?}], tiny?, tribe?, triumph? }
}
model Task {
  // ... 既有 ...
  toolType    String?  // ★ Slice T — 'breathing' | 'timer' | null（任務端啟用的虛擬工具）
  toolConfig  Json?    // 工具參數：breathing={inhale,hold,exhale,cycles}; timer={seconds,mode:'count'|'pomodoro',rounds?}
}
```
- 從 library 建立任務時，把 `OfficialHabit.fiveT.toolVirtual` 複製到 `Task.toolType/toolConfig`。
- 皆 nullable、additive，`prisma db push` 安全。

## 3. 元件
- `web-app/src/lib/tools.js`（CommonJS, TDD）：`defaultToolConfig(type)`、`describeTool(type,config)`（顯示文字，如「4-7-8 呼吸 × 5 輪」「番茄鐘 25 分」）、breathing 相位序列產生器 `breathingPhases(config)`（純函式，給動畫用）。
- `components/tools/BreathingTool.jsx`：吸→憋→吐 SVG/CSS 動畫圓（依 config 計時），輪數進度，結束 callback。零依賴、尊重 prefers-reduced-motion、無 emoji。
- `components/tools/TimerTool.jsx`：倒數圓環 + 開始/暫停/重設；pomodoro 模式（work/break 輪）。結束 callback。
- `components/tools/ToolModal.jsx`：依 `toolType` 載入對應 widget；標題、關閉、完成時 `onComplete()`。
- `components/tools/PhysicalToolsList.jsx`：詳情頁列實體工具（lucide icon + 名稱 + 選填外連）。

## 4. 接線
- `TaskCard`：`task.toolType` 有值 → 顯示「▶ 開始」次要鈕（lucide `Play`），點擊開 `ToolModal`（stopPropagation，不觸發詳情）。
- `MainApp`：`handleStartTool(task)` 開 ToolModal；`onComplete` → 視 config 決定是否自動 `handleTaskUpdate(task,'toggle'/'add'...)`（預設「跑完詢問/自動打卡」——v1 先自動打卡 binary、量化加一次）。
- `TaskDetailModal`：顯示 `PhysicalToolsList`（若 OfficialHabit.fiveT.toolPhysical 有值；任務經 officialHabitId 取）。

## 5. 測試（TDD）
- `tools.js`：defaultToolConfig 各型、breathingPhases（4-7-8 → 正確相位序列/總時長）、describeTool 文字。
- `BreathingTool`/`TimerTool` RTL：渲染、開始→相位/倒數推進（用 fake timers）、完成觸發 onComplete。
- ToolModal：依 toolType 載對應 widget。
- seed 不破壞既有測試。

## 6. 守則
- 無 emoji（lucide）；CTA hover；零懲罰（工具是輔助、跳過零成本）；尊重 reduced-motion；純前端零外部依賴。

## 7. 驗收
- 對「4-7-8 呼吸」習慣按「▶ 開始」→ 呼吸動畫跑 5 輪 → 自動打卡。
- 對「番茄鐘」按開始 → 倒數 → 完成。
- 詳情頁對有實體工具的習慣顯示建議物件。
- 全測試 + build 綠。
- 未設工具的習慣行為完全不變（無回歸）。

## 8. 未來接縫
- Suno 音樂 = `toolType:'music'` + 音檔（Vercel Blob / 音訊 CDN）。
- Train(Skill) = `fiveT.skill`（教學 GIF/影片）顯示在詳情。
- 實體工具連結 → cofit 電商/聯盟（Triumph 實體獎勵）。
