---
description: 開發常用指令（自動執行）
---

// turbo-all

## 開發時自動執行的命令

### 1. Git 操作
```bash
git add -A && git commit -m "訊息" && git push origin main
```

### 2. Prisma 操作
```bash
npx prisma generate
npx prisma db push
```

### 3. 開發伺服器
```bash
npm run dev
```

### 4. 測試 API
```bash
curl -s http://localhost:3000/api/xxx
```

### 5. 檢查狀態
```bash
git status
git log -n 5 --oneline
```

---

## 需要確認的命令（不自動執行）

以下命令因為有破壞性，需要用戶確認：

- `npx prisma db push --accept-data-loss`（可能刪除資料）
- `rm` 或 `del`（刪除檔案）
- 修改環境變數
- 安裝新的全域套件
