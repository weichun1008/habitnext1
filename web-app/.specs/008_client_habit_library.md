# Feature Spec: 008 - 客戶端習慣庫

## 1. Overview
讓用戶從官方推薦習慣庫中選擇習慣加入，支援分類篩選和難度選擇。

## 2. 資料來源

### 後台管理
習慣由管理員在後台建立：
```prisma
model OfficialHabit {
  id           String   @id @default(cuid())
  name         String
  description  String?
  category     String   // 關聯 HabitCategory
  icon         String?
  difficulties Json     // { beginner, intermediate, challenge }
  isActive     Boolean  @default(true)
}

model HabitCategory {
  id    String @id @default(cuid())
  name  String @unique
  color String?
  order Int    @default(0)  // 控制顯示順序
}
```

## 3. API 端點

### GET /api/habits
公開 API，取得活躍習慣列表

**Response:**
```json
{
  "habits": [
    {
      "id": "xxx",
      "name": "每日喝水",
      "category": "健康",
      "difficulties": {
        "beginner": { "enabled": true, "label": "1500cc", ... },
        "intermediate": { "enabled": true, "label": "2000cc", ... }
      }
    }
  ],
  "categories": [
    { "id": "xxx", "name": "健康", "color": "#10b981", "order": 0 }
  ]
}
```

**排序規則:**
1. 按分類 `order` 升序
2. 同分類內按 `createdAt` 降序

## 4. UI 元件

### TaskLibraryModal.jsx
習慣選擇 Modal：
- 搜尋框
- 分類篩選 (橫向滾動)
- 習慣卡片列表
- 難度選擇按鈕
- 新增按鈕

### 習慣卡片
- 圖示 + 名稱
- 說明文字
- 難度選項 (入門/進階/挑戰)

## 5. 互動流程
1. 用戶點擊「建立習慣」
2. 顯示習慣庫 Modal
3. 可搜尋或按分類篩選
4. 選擇習慣和難度
5. 點擊「新增」建立任務

## 6. 難度轉換
選擇難度後，將 `difficulties[key]` 轉換為 Task：
```javascript
{
  title: config.label || habit.name,
  type: config.type || 'binary',
  dailyTarget: config.dailyTarget || 1,
  unit: config.unit || '次',
  recurrence: config.recurrence,
  ...
}
```

## 7. 狀態
- [x] API 端點 (`/api/habits`)
- [x] TaskLibraryModal 重寫
- [x] 搜尋功能
- [x] 分類篩選
- [x] 難度選擇
- [ ] 習慣詳情預覽
- [ ] 熱門排序選項
