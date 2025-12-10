# Feature Spec: 006 - 用戶個人資料

## 1. Overview
允許用戶編輯自己的個人資料，包括暱稱、手機號碼和密碼。

## 2. 資料模型
使用現有 `User` 模型：
```prisma
model User {
  id          String   @id @default(cuid())
  nickname    String
  phone       String   @unique
  countryCode String?
  password    String?  // Hashed password
  email       String?
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
}
```

## 3. API 端點

### PUT /api/user/profile
更新用戶資料

**Request:**
```json
{
  "userId": "xxx",
  "nickname": "新暱稱",
  "phone": "0912345678",
  "oldPassword": "舊密碼",    // 僅修改密碼時需要
  "newPassword": "新密碼"     // 僅修改密碼時需要
}
```

**Response:**
```json
{
  "message": "資料已更新",
  "user": { "id", "nickname", "phone", "email" }
}
```

**錯誤碼:**
- 400: 缺少必要欄位 / 舊密碼不正確 / 手機已被使用
- 404: 用戶不存在

## 4. UI 元件

### ProfileModal.jsx
- 暱稱輸入框
- 手機輸入框
- 修改密碼區塊（可展開）
  - 舊密碼
  - 新密碼
  - 確認新密碼
- 儲存/取消按鈕

### 開啟方式
- 桌面版：點擊側邊欄用戶區塊
- 手機版：點擊 Header 用戶頭像

## 5. 商業邏輯
1. 暱稱/手機可單獨更新
2. 修改密碼必須提供正確的舊密碼
3. 新密碼至少 6 個字元
4. 手機號碼唯一性檢查
5. 更新後自動同步 localStorage

## 6. 狀態
- [x] API 端點 (`/api/user/profile`)
- [x] ProfileModal 元件
- [x] MainApp 整合
- [x] AppHeader 整合
- [x] 單元測試
