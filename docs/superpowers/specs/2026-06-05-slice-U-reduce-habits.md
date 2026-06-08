# Slice U — 減量 / 戒除習慣（反向習慣）Design Spec

> 狀態：已定案待建 · 日期 2026-06-05
> PM 定案：完成結算採 **(c) 混合**（白天顯示剩餘額度 + 日界自動結算 + 隔天給「昨天守住了」回饋）。零懲罰是硬約束。

## 0. 一句話
讓習慣可以是「**越少越好**」：戒除（目標 0 次）或減量（≤ 上限）。做太多次 = 沒達標。例：戒菸、≤2 杯酒/週、≤1 次勉強社交/週。用**趨勢與「守住的天數」**驅動，不用羞辱、不一次破功歸零。

## 1. 範圍
### 做
- **方向（direction）**：任務新增 `direction`，`'increase'`（預設，既有行為）/ `'decrease'`（反向）。
- 兩子型（皆 decrease）：
  - **戒除 avoid**：上限 = 0。當天「沒記錄發生」＝達標 → 「N 天無○○」。
  - **減量 reduce**：上限 = N（用既有 `dailyTarget` 當上限）。記錄每次發生，期末 ≤ N ＝達標。
- **完成判定反轉**（decrease）：`達標 = value <= limit`。
- **(c) 混合結算**：白天顯示「剩餘額度 / 已用」；日界（換日）自動結算昨天是否達標；隔天於卡片/通知給「昨天守住了 ✦」或中性「昨天超過了，今天重新開始」。
- **UI**：操作不是「✓ 完成」，而是 **「+1 我做了」**（吃額度、顯示剩餘）；戒除型用「今天還守著 / 誠實記錄：我做了」。當天狀態徽章（額度內/超過）。
- **零懲罰文案**：強調「比上週少」「守住 N 天」；記錄發生＝誠實追蹤非失敗；破戒用趨勢、不暴力歸零。
- **TaskFormModal**：建立時可選「正向/反向（減量/戒除）」+ 設上限。
- **Seed**：加幾個官方反向習慣（降低抽菸 ≤N/日、降低喝酒 ≤N/週、減少勉強社交 ≤1/週）。

### 不做
- 複雜的成癮戒斷醫療流程、外部介入。
- 金錢節省試算等延伸。

## 2. 資料模型（additive）
```prisma
model Task {
  // ... 既有 ...
  direction  String?  // ★ Slice U — 'increase'(預設/視為 null) | 'decrease'
  // 減量上限沿用既有 dailyTarget（decrease 時語意 = 上限；avoid 時 = 0）
}
model OfficialHabit {
  direction  String?  // 同上，library 端
}
```
- nullable / 預設視為 increase；additive，既有任務不受影響。
- 記錄發生沿用 `TaskHistory.value`（decrease 時 = 當期已發生次數）。

## 3. lib（純函式 TDD）— `web-app/src/lib/reduceHabit.js`
- `isMetForDirection({direction, value, limit})` → bool（increase: value>=limit；decrease: value<=limit）。
- `remainingQuota({value, limit})` → max(0, limit - value)（decrease 用）。
- `dayStatus({direction, value, limit})` → `'on_track' | 'over' | 'met'`（白天/結算用文字）。
- `settleYesterday(history, date, direction, limit)` → `'kept' | 'exceeded'`（隔天回饋用）。

## 4. 接線
- `lib/utils.isCompletedOnDate`：decrease 任務改用 `isMetForDirection`（注意：reduce 的「達標」嚴格說要到日界；但為了與既有 partition/sort 相容，當日 `value<=limit` 視為「目前達標/on_track」，超過即 not met）。
- `MainApp.handleUpdateProgress`：decrease 的 `+1 我做了` 走 `action:'add', value:+1`；completed 用 `isMetForDirection`。
- `TaskCard`：decrease 時把完成控制換成「+1 我做了」+ 剩餘額度顯示 + 狀態徽章；avoid 顯示「今天守著」。
- **日界結算 (c)**：MainApp 載入/換日時，對 decrease 任務算昨天 `settleYesterday` → 顯示一次性「昨天守住了」非侵入提示（沿用既有 toast 或 banner）。
- `TaskFormModal`：方向選擇 + 上限輸入。

## 5. 與遊戲化/世界的關係
- 守住的天數可餵 streak / 世界完成數（decrease 達標日 = 完成日）。沿用既有 worldScope/journey 機制，達標日照算。

## 6. 測試（TDD）
- `reduceHabit.js`：isMetForDirection（increase/decrease 邊界，limit=0 avoid）、remainingQuota、dayStatus、settleYesterday。
- `isCompletedOnDate` decrease 分支：value<=limit met、>limit not met、avoid value=0 met / >0 not met。
- TaskCard RTL：decrease 顯示「+1 我做了」+ 剩餘額度，不顯示打勾框；點 +1 觸發 add。
- seed 不破壞既有測試。

## 7. 守則
- **零懲罰是第一原則**：文案、streak、結算全部避免羞辱；break 用趨勢非歸零。
- 無 emoji（lucide）；CTA hover；mobile parity。

## 8. 驗收
- 建立「≤3 根菸/日」→ 任務卡顯示「+1 我做了 · 剩 3」；按 3 次後狀態「額度內」，第 4 次「超過」。
- 建立「戒菸（0）」→「今天守著」；記錄一次 → 當天未達標。
- 換日後對昨天給「守住了/重新開始」回饋。
- 正向習慣（increase）行為完全不變（無回歸）。
- 全測試 + build 綠。
