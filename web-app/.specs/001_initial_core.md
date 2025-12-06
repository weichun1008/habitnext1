# Spec: 001 - Core Habit System & Admin Dashboard

## 1. Background
目前專案已經完成核心的習慣追蹤與後台管理功能。此文件旨在回溯記錄這些已完成功能的規格，作為未來開發的基石。

## 2. Core Flows (User)
### 2.1 每日習慣追蹤
- **Goal**: 用戶每天進入 Dashboard 查看與執行習慣。
- **UI**: 
  - 上方 Summary Card 顯示今日健康分數 (0-100) 與圓環進度。
  - 下方列表顯示「今日行程」與「週期目標」。
- **Interaction**:
  - 點擊卡片圓圈可標記完成/取消。
  - 計量任務 (Quantitative) 可點擊 +/- 按鈕快速紀錄數值。
  - 點擊卡片本身可開啟詳細資訊 Modal，查看統計圖表與歷史紀錄。

### 2.2 探索與加入計畫
- **Goal**: 用戶從專家建立的模板中挑選適合的計畫。
- **Flow**: User -> 點擊「探索計畫」 -> 瀏覽模板列表 -> 點擊「加入」 -> 系統自動將模板內的任務複製給該用戶。

## 3. Core Flows (Admin/Expert)
### 3.1 模板管理 (Template Management)
- **Goal**: 專家建立可供用戶訂閱的習慣模板。
- **Features**:
  - 建立/編輯/刪除模板。
  - **Task Editor**: 支援完整任務設定，包含：
    - 類型：一般 (Binary)、計量 (Quantitative)、清單 (Checklist)。
    - 頻率：每日、每週 (固定星期/彈性次數)、每月。
    - 提醒：設定偏移時間 (如：前 10 分鐘)。

## 4. Data Models (Key Schemas)
- **User**: 一般用戶。
- **Expert**: 專家/管理員。
- **Template**: 習慣模板，包含 `tasks` (JSON) 定義。
- **Task**: 實例化的任務，連結 User。
- **TaskHistory**: 每日執行紀錄 (Value/Completed)。

## 5. Status
- [x] User Dashboard
- [x] Admin Dashboard
- [x] Template System (CRUD)
- [x] Public Template API
- [x] Advanced Recurrence Logic (Weekly/Monthly)
