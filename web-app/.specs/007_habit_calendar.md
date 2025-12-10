# Feature Spec: 007 - 習慣日曆

## 1. Overview
提供週視圖和月視圖的習慣日曆，讓用戶追蹤習慣完成狀態。

## 2. 視圖模式

### 週視圖 (Week View) - 預設
- 顯示當前週的 7 天
- 時間軸 (24 小時)
- 任務以卡片形式顯示在對應時段

### 月視圖 (Month View)
- 顯示當前月的日曆格
- 每日顯示任務數量/完成率
- 點擊日期可展開詳情

## 3. 資料結構

### 任務日期關聯
使用 `TaskHistory` 記錄每日完成狀態：
```prisma
model TaskHistory {
  id        String   @id @default(cuid())
  taskId    String
  date      String   // YYYY-MM-DD
  completed Boolean
  value     Int      // 計量任務的數值
}
```

## 4. UI 元件

### HabitCalendar.jsx
主容器，管理視圖切換

### calendar/WeekView.jsx
週視圖元件：
- 時間軸 (0:00 - 23:00)
- 7 天欄位
- 任務卡片

### calendar/MonthView.jsx
月視圖元件：
- 月份標題 + 導航
- 週日標題列
- 日期格子 + 進度指示器

### calendar/CalendarTaskChip.jsx
任務在日曆上的迷你顯示卡片

## 5. 互動邏輯
1. 視圖切換 (週/月)
2. 日期導航 (前/後)
3. 點擊任務開啟詳情
4. 直接在日曆上標記完成

## 6. 進入方式
- 桌面版：側邊欄「日曆」按鈕
- 手機版：Header 日曆圖示（藍色）

## 7. 狀態
- [x] HabitCalendar 主元件
- [x] WeekView 週視圖
- [x] MonthView 月視圖
- [x] CalendarTaskChip 任務卡片
- [x] 手機版導航整合
- [ ] 完成度熱力圖
- [ ] 日期範圍選擇
