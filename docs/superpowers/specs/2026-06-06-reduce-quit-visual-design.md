# 戒除 / 減低 任務視覺區隔 — 設計文件

- 日期：2026-06-06
- 範圍：客戶端 TaskCard —— 讓「減低 / 戒除」型(direction='decrease')任務與「養成」型有明顯視覺區隔。
- 互動原型：`.superpowers/brainstorm/.../reduce-quit-styles.html`(A+C 混搭已選定)。

## 背景

`Task.direction === 'decrease'` 已存在(Slice U)：**戒除 = 每日上限 0、減低 = dailyTarget 當上限**。功能(零懲罰記次、剩餘額度、隔日結算)完整,但視覺上與養成卡幾乎一樣,辨識度不足。

## 目標(已選定方案：A 色帶+標籤 為底 + C 的「守住 N 天」用於戒除)

1. 養成型卡片**完全不動**。
2. 減低/戒除卡片加上:**左側色帶 + 類型標籤(lucide 圖示)+ 淡底**。
   - 減低：琥珀 `#d97706`、標籤「減低」+ `TrendingDown`。
   - 戒除：玫紅 `#e11d48`、標籤「戒除」+ `Ban`。
3. **戒除**的右上狀態 pill 升級為 **「已守住 N 天」盾牌徽章**(`ShieldCheck`,玫紅),當日仍守著時顯示;當日已記錄發生則顯示「今天 N 次」(沿用現有)。減低維持「剩 N 次 / 超過額度」(沿用)。
4. 零懲罰語氣不變;行動裝置對等;hover 微互動。

## 實作

### lib/reduceHabit.js（新增純函式 + 測試）

```
keptStreak({ limit, dailyProgress, history, todayStr, startStr }) → number
```
- 從 `todayStr` 往回數連續「守住」的天數(value <= limit;無紀錄視為 0 次=守住),遇到超標即停;以 `startStr`(習慣起始日,取 createdAt 當日)為下界,避免新習慣誤報長天數;400 天上限防呆。
- 既有 `remainingQuota / dayStatus / settleYesterday / isMetForDirection` 不動。

### components/TaskCard.jsx

- 新增極性色彩：`isReduce = isDecrease && decLimit > 0`、`isQuit = isDecrease && decLimit === 0`；`polColor`(reduce=amber / quit=rose)、`polSoft`(淡底)。
- **左色帶**：isDecrease 時加一條 absolute 左側 5px 色帶(比照既有 visuallyDone 的 emerald rail；兩者互斥——decrease 不會 visuallyDone)。
- **淡底**：isDecrease 卡片背景改用 `polSoft`(取代 bg-white),邊框用極性淺色。
- **類型標籤**：標題列加一個 pill(色帶色 + lucide 圖示 + 「減低」/「戒除」)。
- **戒除盾牌**：decLimit===0 且當日守著(decValue===0)時,右上 pill 改為「已守住 {keptStreak} 天」(ShieldCheck，玫紅);decValue>0 維持「今天 N 次」。
- 其餘(減低剩餘額度 pill、底部記次按鈕、隔日結算行)不動。

## 測試

- `keptStreak`：連續守住計數、遇超標中止、無紀錄視為守住、startStr 下界、空輸入=0。
- TaskCard：減低卡顯示「減低」標籤;戒除卡顯示「戒除」標籤 + 「已守住 N 天」;養成卡不含這些標籤(快照/查詢)。

## 風險

- 僅前端視覺 + 一個純函式,**無 schema、無 API、無 DB 變更**(對共用 DB 零風險)。
- keptStreak 需正確以 createdAt 為下界,否則新戒除習慣會誤報長連續天數。
